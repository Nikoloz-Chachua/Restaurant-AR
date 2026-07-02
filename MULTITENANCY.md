# MULTITENANCY.md — Multi-Tenant Platform Spec

> **Status:** Design blueprint (not yet built). Branch: `multitenancy`.
> **Author:** drafted with Claude, 2026-06-26. **Owner:** Temo (CEO).
> **Purpose:** the single approved blueprint for turning BetaReal from a
> one-restaurant app into a platform that serves many restaurants from one
> codebase, one database, and one deployment — where **adding a new client is a
> database insert, not a new project**.
>
> Read alongside [BETAREAL.md](BETAREAL.md) (company/product context) and
> [CLAUDE.md](CLAUDE.md) (deploy rules). Anything marked **🟡 OPEN** is undecided.

---

## 1. Goal & guiding principle

**The problem we are solving:** today, each restaurant = a forked repo + its own
Supabase + its own Vercel + its own Cloudflare project. That works for 1, hurts
at 5, and is impossible at 100 (Supabase alone caps free orgs at 2 projects).

**The principle:** **separate _code_ from _data_.** One codebase serves every
restaurant. Each restaurant's data lives in one shared database, logically
isolated by a `restaurant_id` on every row and enforced by Postgres Row-Level
Security (RLS). A restaurant is a **row**, not a deployment.

**What "easy replication" means after this:**

| Step | Before (today) | After (this spec) |
|---|---|---|
| Create a client | copy repo, new Supabase, new Vercel, new Cloudflare, wire env vars | insert one row in `restaurants` |
| Time / risk | hours, drift-prone | ~1 minute, zero deploy |
| Patch a bug | redeploy N repos | deploy once |

The only labor that does **not** disappear is the physical **3D scanning**
pipeline (~20 min/dish) — no architecture removes that until the AI moat does.

---

## 2. The two-axis model (roles vs plans)

Two independent things are often confused. Keep them separate or you get a
combinatorial role explosion and painful upsells.

- **Role** = _who is this person?_ — what actions they can take on data they can see.
- **Plan** = _what did this restaurant pay for?_ — which features are unlocked.

```
ROLES (auth / permissions)                PLANS (subscription / features)
─────────────────────────────            ────────────────────────────────
super_admin   → BetaReal team            ar_menu  (₾300)  menu editing only
brand_owner   → the client owner         full     (₾450)  + analytics + theme
branch_staff  → one branch only          premium  (₾900)  + unlimited items, extras
```

A ₾300 client's owner is still a full `brand_owner`. They simply log in and see
**only the menu editor**, because their brand's `plan = 'ar_menu'` hides
analytics and the theme editor. **Upsell = flip one field** (`plan → 'full'`),
no role change, no migration.

---

## 3. Schema

A **brand** owns one or more **branches** (`restaurants` rows). Each branch owns
its own **menu**. Branding/theme/plan live on the **brand** (shared across
branches). A single-location restaurant is just a brand with one branch.

> SQL below is the design target; exact types/constraints get finalized when the
> migration is applied to the fresh Supabase project.

```sql
-- ── BRANDS: the company (e.g. "Big Sam's") ──────────────────────────────
create table brands (
  id            bigint generated always as identity primary key,
  slug          text unique not null,              -- "big-sams"
  name          text not null,                     -- "Big Sam's"
  logo_url      text,                              -- R2 url
  theme         jsonb not null default '{}',       -- colors, fonts, branding
  plan          text not null default 'ar_menu',   -- 'ar_menu'|'full'|'premium'
  created_at    timestamptz not null default now()
);

-- ── RESTAURANTS = BRANCHES: one row per physical location ────────────────
create table restaurants (
  id            bigint generated always as identity primary key,
  brand_id      bigint not null references brands(id) on delete cascade,
  name          text not null,                     -- "Vake"
  slug          text unique not null,              -- "big-sams-vake" (= R2 folder + subdomain)
  custom_domain text unique,                       -- "menu.bigsams.ge" (nullable)
  visible       boolean not null default true,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);

-- ── CATEGORIES ──────────────────────────────────────────────────────────
create table categories (
  id            bigint generated always as identity primary key,
  restaurant_id bigint not null references restaurants(id) on delete cascade,
  name_en       text, name_ka text,
  sort_order    int not null default 0
);

-- ── MENU ITEMS ──────────────────────────────────────────────────────────
create table menu_items (
  id             bigint generated always as identity primary key,
  restaurant_id  bigint not null references restaurants(id) on delete cascade,
  category_id    bigint references categories(id) on delete set null,
  name_en        text, name_ka text,
  description_en text, description_ka text,
  price          text,                             -- free-form, e.g. "14 ₾"
  model          text,                             -- R2 url (GLB)
  model_usdz     text,                             -- R2 url (USDZ, iOS) 🟡 see §11
  thumbnail_url  text,                             -- R2 url (WebP)
  thumb_3d       boolean not null default false,
  ar_scale       numeric not null default 1.0,
  visible        boolean not null default true,
  sort_order     int not null default 0
);

-- ── EVENTS: analytics (brand- AND branch-level) ─────────────────────────
create table events (
  id             bigint generated always as identity primary key,
  brand_id       bigint references brands(id) on delete cascade,
  restaurant_id  bigint references restaurants(id) on delete cascade,
  session_id     text, visitor_id text,
  event          text not null,
  item_name      text, category text,
  lang           text, ar_cap text, platform text,
  extra          jsonb,
  created_at     timestamptz not null default now()
);

-- ── ACCESS CONTROL ──────────────────────────────────────────────────────
create table brand_users (        -- owners: see ALL branches of a brand
  user_id    uuid not null references auth.users(id) on delete cascade,
  brand_id   bigint not null references brands(id) on delete cascade,
  role       text not null default 'owner',
  primary key (user_id, brand_id)
);

create table restaurant_users (   -- staff: locked to ONE branch
  user_id        uuid not null references auth.users(id) on delete cascade,
  restaurant_id  bigint not null references restaurants(id) on delete cascade,
  role           text not null default 'staff',
  primary key (user_id, restaurant_id)
);

-- super_admin (BetaReal) is NOT a table row — it's app_metadata.role='super_admin'
-- on the Supabase auth user (same pattern already used for dev-analytics).
```

Helpful indexes: `menu_items(restaurant_id)`, `categories(restaurant_id)`,
`events(restaurant_id, created_at)`, `events(brand_id, created_at)`,
`restaurants(brand_id)`, `restaurants(custom_domain)`.

---

## 4. RLS / security model — how client data is protected

Protection comes from **the database**, not from hiding UI. Three guarantees:

1. **Writes are locked to ownership.** A `brand_owner` can only change rows in
   brands/branches they're mapped to. Big Sam's owner physically cannot edit
   Sam's menu — Postgres refuses it regardless of what the client sends.
2. **Anon (public menu) is read-only + events-insert-only.** The public anon key
   (shared, public by design) may read *visible* menu/theme and *insert* events —
   nothing else. No anon can edit any menu or theme.
3. **Honest nuance:** RLS sees the JWT, not the HTTP `Host`. So a curious anon
   could query *another* restaurant's **menu** via the API. That's acceptable —
   **menus are public by nature** (anyone can scan the QR). What's sealed is what
   matters: **no cross-tenant writes, no reading another tenant's analytics, no
   editing another tenant's theme.**

```sql
-- helper: is the caller a BetaReal super admin?
create or replace function is_super_admin() returns boolean
language sql stable as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin', false);
$$;

-- helper: restaurant ids the caller may manage (via brand ownership OR branch staff)
create or replace function my_restaurant_ids() returns setof bigint
language sql stable as $$
  select r.id from restaurants r
    join brand_users bu on bu.brand_id = r.brand_id
   where bu.user_id = auth.uid()
  union
  select restaurant_id from restaurant_users where user_id = auth.uid();
$$;

alter table menu_items enable row level security;

-- public can READ visible items (any tenant — menus are public)
create policy menu_public_read on menu_items
  for select to anon, authenticated
  using (visible = true);

-- only owners/staff of that branch (or super_admin) can WRITE
create policy menu_owner_write on menu_items
  for all to authenticated
  using (is_super_admin() or restaurant_id in (select my_restaurant_ids()))
  with check (is_super_admin() or restaurant_id in (select my_restaurant_ids()));

-- events: anyone may INSERT (telemetry); only owners/super_admin may READ,
-- and reading is gated by the brand's PLAN (analytics = full/premium only).
alter table events enable row level security;
create policy events_insert on events for insert to anon, authenticated with check (true);
create policy events_read on events
  for select to authenticated
  using (
    is_super_admin()
    or exists (
      select 1 from brands b
      join brand_users bu on bu.brand_id = b.id
      where bu.user_id = auth.uid()
        and b.id = events.brand_id
        and b.plan in ('full','premium')      -- 🟡 plan-enforcement (ship after UI gating)
    )
  );
```

Analogous policies apply to `brands`, `restaurants`, `categories` (public read of
visible; owner/super_admin write). `brand_users` / `restaurant_users` are
super_admin-managed (a user may read only their own mapping rows).

> ⚠️ **Plan-enforcement in RLS is deliberately lower priority.** Ship UI-gating
> first (hide tabs); add the `plan in (...)` check in RLS before there is a
> paying ₾300 client motivated to bypass it. An average owner cannot bypass UI.

---

## 5. Tenant resolution (how a phone knows which menu to load)

One deployment serves every restaurant. The app reads the URL to identify the
tenant.

- **Default — flat subdomain:** `big-sams-vake.betareal.app`. A **single
  wildcard** DNS record `*.betareal.app → the app` is set up **once, ever**.
  After that, a new restaurant is live the instant its `restaurants` row exists —
  the app reads `location.hostname`, matches `slug`, loads that tenant. **No
  per-client DNS step.**
  - Use **flat** subdomains (`brand-branch`), **not** nested (`branch.brand`):
    one wildcard cert `*.betareal.app` covers one label only; nested needs a
    wildcard cert per brand (cert-management overhead).
- **Upgrade — custom domain:** `menu.bigsams.ge` via **Cloudflare for SaaS /
  Custom Hostnames API**. Flow built into onboarding: client enters domain →
  our system registers the hostname via API → client adds one CNAME → Cloudflare
  auto-issues SSL → live. Resolved via the `custom_domain` column. Good upsell.
- **Service worker:** each subdomain is a **separate browser origin**, so SW
  caches, Cache Storage, and `localStorage` are **isolated per tenant
  automatically** — no manual cache namespacing needed. The only SW change: at
  install, precache **this tenant's** model list (resolved by hostname), not a
  hardcoded set. `CACHE_NAME` bump rule still applies globally.

---

## 6. Storage (R2) + the egress rule

- **One R2 bucket, per-tenant key prefixes:** `big-sams-vake/druidi.glb`,
  `sams-main/burger.glb`. No per-restaurant buckets — R2 has no per-tenant limit
  you'll hit for years (100 clients ≈ a few GB), and separate buckets add a
  provisioning step to every onboarding.
- **Auto-prefixing:** `/api/r2-presign` derives the prefix from the
  authenticated user's restaurant `slug` — **no human types the prefix**. One
  small change to the existing route.
- **🔴 HARD RULE — all heavy assets on R2, never Supabase Storage.** GLB, USDZ,
  and thumbnails are served from R2 (free egress). This is what caused the
  Supabase egress overage (June 2026): heavy assets served from Supabase Storage
  (5 GB/mo free tier) × many visitors loading 3D thumbnails = 30+ GB. At 100
  tenants this would be fatal. Supabase serves **only** REST JSON + auth.
- **Training-data capture (the AI moat — BETAREAL.md §14):** the served GLB alone
  can't train the model; we need the **(input photos → finished model) pairs**.
  Reserve a prefix for the raw lightbox photo sets per dish so the training
  corpus is captured from day one, not thrown away. 🟡 Exact layout TBD.

---

## 7. Branch editing (Model 1 + fan-out)

Each branch is its own `restaurants` row under a `brand_id`. "Edit one vs edit
all" is a **write-scope choice in the UI**, not a different schema:

| Mode | Who | Writes |
|---|---|---|
| **Edit this branch** | branch_staff, brand_owner, super_admin | one branch's rows |
| **Edit whole brand** | **brand_owner + super_admin only** | **fans out to ALL branches** of the brand |

- **Implementation = fan-out write** (write the change to every branch row in a
  transaction), **not** an inheritance/override engine. Reason: menus are
  normally identical across branches, you have zero chain clients today, and
  inheritance is premature complexity. Upgrade to overrides only if
  divergent-menu chains become common.
- **Safety:** brand-edit is role-gated, and saving triggers a confirmation that
  **names the branches**: _"This overwrites the menu for ALL 5 branches: Vake,
  Saburtalo, … Continue?"_ — no accidental fan-out.

---

## 8. Onboarding flow (full-service)

When BetaReal signs a new client:

1. **Super-admin form:** name, slug, branding/theme, logo, plan → inserts a
   `brands` row + first `restaurants` (branch) row. **Menu is live (empty) at
   `slug.betareal.app` immediately.** (~1 min)
2. **Scan & build** the GLBs (the physical pipeline — unchanged, ~20 min/dish).
3. **Admin panel (logged into that brand):** add items, prices, descriptions,
   upload GLBs (auto-prefixed to R2) + thumbnails. (data entry + client comms/
   consulting — the real time cost, but no infra work)
4. **Done** — no repo copy, no new Supabase/Vercel/Cloudflare, no deploy.

The super-admin panel doubles as the **CMS / control tower**: list every brand,
their status/plan, create new, and click into any tenant to manage it.

---

## 9. Rollout — strangler pattern (zero risk to the live demo)

The live demo at `3darmenu.pages.dev` is the only sales asset; it must not go
dark mid-refactor.

- **Build the multi-tenant stack alongside the current one.** The old single-
  tenant app keeps running, untouched, the entire time.
- **Fresh Supabase project in a NEW organization** (same account — do **not**
  create a second account to dodge quota; that fragments infra and risks
  flagging). Clean schema/RLS, no legacy baggage. The current blown org does not
  host it.
- **Burger Lions migrates in as tenant #1** — one brand (`burger-lions`), one
  branch (`main`) — exercising the brand/branch tables and proving the whole path
  with data we already trust.
- **Cutover:** when `burger-lions.betareal.app` renders identically off the new
  stack, point sales/QR at it. Rollback = don't flip. Zero downtime.
- **Go Pro ($25/mo, 250 GB egress) before real customer traffic.** At ₾300–900/
  client, $25 infra to end the egress/quota class of problem is a rounding error.

---

## 10. Phased build sequence

```
Phase A — Scaffold (no live changes)
  [ ] New Supabase org + project (fresh, clean)
  [ ] Apply schema (§3) + indexes
  [ ] Apply RLS policies (§4) — writes locked, anon read/insert only
  [ ] Verify R2 bucket + per-tenant prefix presign change (§6)

Phase B — Customer app goes tenant-aware
  [ ] index.html resolves tenant by hostname (subdomain → restaurants.slug)
  [ ] All menu/theme/model queries filter by restaurant_id
  [ ] sw.js precaches THIS tenant's model list at install
  [ ] Wildcard *.betareal.app → app (one-time DNS)

Phase C — Admin goes multi-tenant
  [ ] brand_users / restaurant_users mapping + super_admin role
  [ ] Super-admin: list brands, create tenant, switch into any
  [ ] brand_owner: scoped to their brand; branch_staff: one branch
  [ ] Branch fan-out edit + confirmation (§7)
  [ ] Plan-based UI gating (analytics/theme hidden for ar_menu)

Phase D — Migrate Burger Lions as tenant #1 + prove
  [ ] Export current data → import as brand 'burger-lions' / branch 'main'
  [ ] Move any remaining Supabase-Storage assets to R2 (kills egress)
  [ ] Verify burger-lions.betareal.app == current demo

Phase E — Cutover & harden
  [ ] Buy domain; point QR/sales at new stack
  [ ] Cloudflare for SaaS custom-domain automation (§5)
  [ ] Upgrade Supabase to Pro
  [ ] RLS plan-enforcement (deferred from Phase C)
```

---

## 11. Open items 🟡

- **Domain TLD** — `betareal.app` / `.io` / `.ge`? Not owned yet. Blocks go-live,
  not the build.
- **USDZ strategy** — currently ship GLB only (model-viewer handles iOS). If we
  store USDZ too, that's a second file per dish to manage; decide deliberately.
- **RLS plan-enforcement timing** — UI-gate first, RLS-enforce before a paying
  ₾300 client (§4).
- **Training-corpus layout** — exact R2 prefix/structure for the photo↔model
  pairs (§6).
- **Multi-tenancy edge cases** — branch_staff invite flow (owner-initiated vs
  super-admin-only); annual-prepay / per-location billing mechanics.

---

*This is the blueprint. We build against it; update it as decisions land.*
