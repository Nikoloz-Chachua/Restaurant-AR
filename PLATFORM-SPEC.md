# PLATFORM-SPEC.md — BetaReal+ Build & Delegation Spec

> **Project: BetaReal+** — our new scalable, multi-tenant platform that runs
> _every_ restaurant (menus, admin, branches, roles, analytics, onboarding) from
> **one shared codebase, one database, and one deployment.** It is the evolution
> of the single-restaurant app ("Burger Lions") into a product that scales to
> hundreds of clients without per-client infrastructure.
>
> **What this is:** the **buildable, hand-to-a-teammate** specification for
> BetaReal+ — the admin system, the branch system, the roles, the onboarding
> automation, **where everything is hosted and why, and what tools we use.** A
> team member should be able to build the system from this document.
>
> **Relationship to other docs:**
> - [`MULTITENANCY.md`](MULTITENANCY.md) = the **architecture decision record**
>   (the _what_ and _why_ we chose, full schema + RLS SQL). This doc references it
>   instead of duplicating SQL.
> - [`BETAREAL.md`](BETAREAL.md) = company/product context, pricing, roadmap.
> - [`CLAUDE.md`](CLAUDE.md) = deploy rules for the existing customer app.
>
> **Status:** design complete, **not yet built.** Branch: `multitenancy`.
> **Drafted:** 2026-06-26. **Owner:** Temo (CEO). **Open items:** see §14.
>
> 🔑 **One-sentence goal:** _adding a new restaurant must be a form submission
> that creates database rows — never a code copy, a new Supabase, a new Vercel
> project, or a deploy._

---

## Table of Contents

1. [System at a glance](#1-system-at-a-glance)
2. [Hosting & infrastructure — where & why](#2-hosting--infrastructure--where--why)
3. [Tech stack — what we use & why](#3-tech-stack--what-we-use--why)
4. [Data layer](#4-data-layer)
5. [The customer menu app](#5-the-customer-menu-app)
6. [The admin panel](#6-the-admin-panel)
7. [Roles & permissions matrix](#7-roles--permissions-matrix)
8. [Plan tiers & feature gating](#8-plan-tiers--feature-gating)
9. [Automation flows (step by step)](#9-automation-flows-step-by-step)
10. [Backend endpoints / APIs](#10-backend-endpoints--apis)
11. [Security checklist](#11-security-checklist)
12. [Build phases & task breakdown (delegation)](#12-build-phases--task-breakdown-delegation)
13. [Cost model](#13-cost-model)
14. [Open decisions](#14-open-decisions)
15. [Glossary & references](#15-glossary--references)

---

## 1. System at a glance

```
                         ┌──────────────────────────────────────────────┐
   Customer phone        │  CUSTOMER MENU APP  (static, no build)        │
   scans QR  ──────────► │  served by a Cloudflare WORKER                │
                         │  - reads hostname → resolves tenant           │
   bigsams-vake          │  - loads that tenant's menu/theme/models      │
   .betareal.app   OR    │  - Service Worker caches per-origin           │
   menu.bigsams.ge       └───────────────┬──────────────┬───────────────┘
                                         │ REST (read)   │ GLB/USDZ/webp
                                         │ events (write)│ (cache-first)
                                         ▼               ▼
                         ┌───────────────────────┐  ┌────────────────────┐
                         │ SUPABASE (one shared  │  │ CLOUDFLARE R2      │
                         │ Postgres + Auth)      │  │ one bucket,        │
                         │ brands, restaurants,  │  │ per-tenant prefixes│
                         │ categories, menu_items│  │ (free egress)      │
                         │ events, *_users       │  └─────────▲──────────┘
                         │ RLS isolates tenants  │            │ presigned PUT
                         └──────────▲────────────┘            │
                                    │ authed read/write       │
                                    │                         │
                         ┌──────────┴─────────────────────────┴──────────┐
                         │  ADMIN PANEL  (Next.js on Vercel)             │
                         │  - super-admin: create/manage all tenants     │
                         │  - brand owner: their menu/branches/theme/stats│
                         │  - branch staff: one branch                   │
                         │  - APIs: r2-presign, custom-hostname, invite  │
                         └───────────────────────────────────────────────┘
```

**Four moving parts:** (1) the customer menu app, (2) the shared Supabase DB,
(3) R2 model storage, (4) the admin panel. The same four serve **every**
restaurant. A restaurant is rows in Supabase + a folder prefix in R2 — nothing
is provisioned per client.

---

## 2. Hosting & infrastructure — where & why

| Component | Hosted on | Why there | Owned by |
|---|---|---|---|
| **Customer menu app** | **Cloudflare Workers** (Static Assets) | Static, global edge, cheap. **Workers (not Pages) because we need a _wildcard route_ `*.betareal.app` to serve every tenant from one deploy — Pages cannot do wildcard subdomains natively.** Also the clean fallback origin for Cloudflare for SaaS custom domains. | Temo |
| **Model/asset storage** | **Cloudflare R2** (one bucket) | **Zero egress fees** — the single most important infra fact for us. 3D models are multi-MB and downloaded by every visitor; on R2 that bandwidth is free. (This is what fixed the June Supabase egress overage.) | Temo |
| **Database + Auth** | **Supabase** (one shared project) | Postgres + RLS gives us true row-level tenant isolation; Auth gives us logins + roles via JWT. One project, many tenants. | Temo |
| **Admin panel** | **Vercel** (Next.js) | Already built there; SSR + API routes for presign/custom-hostname/invite; good DX. One deploy serves all tenants (tenant chosen by login). | George |
| **Custom domains** | **Cloudflare for SaaS** (Custom Hostnames) | Lets each restaurant use `menu.theirbrand.ge` against our one Worker, with auto-issued SSL, via API automation. | Temo |
| **DNS / wildcard** | **Cloudflare DNS** | Wildcard `*.betareal.app` → the Worker route. One-time setup. | Temo |

> ✅ **Subdomains ARE fully supported — and BetaReal+ stays on Cloudflare.**
> Common point of confusion: only the Cloudflare **Pages** product lacks wildcard
> subdomains. Cloudflare **Workers** (same account, same global edge, binds
> directly to R2) serves `*.betareal.app` natively. So we keep **R2 + Cloudflare**
> — the _only_ change from today is the menu app is served by a **Worker** instead
> of **Pages**. We do **NOT** move hosting providers, and we do **NOT** lose R2's
> free egress. Subdomains like `bigsams-vake.betareal.app` work from one deploy.

**Why one of each, not one-per-client:** the entire point of the overhaul. One
Worker, one DB, one bucket, one admin = a new client costs **0** new infra. The
old "fork repo + new Supabase + new Vercel + new Cloudflare per restaurant"
model is abandoned (it's also impossible on free Supabase — 2-project cap).

**Account hygiene (do this right):** keep all of it under **one** Supabase
account, organized into **organizations** — never spin up second accounts to
dodge quotas (ToS risk + bus-factor). Build the multi-tenant DB in a **fresh
Supabase org** (uses 1 of your 2 free-project slots; the live Burger Lions
project uses the other). Go **Supabase Pro ($25/mo)** only when real paying
traffic arrives — not before.

---

## 3. Tech stack — what we use & why

| Layer | Choice | Why |
|---|---|---|
| Customer app | **Plain HTML/JS/CSS, no build step** | Fast first paint, trivial to deploy/debug/hand off, nothing to break in CI. AR libs (model-viewer, Three.js) load lazily from CDN on first AR tap. |
| Customer app host | **Cloudflare Workers + Static Assets** | Wildcard subdomain routing + Cloudflare for SaaS fallback origin (see §2). |
| 3D / AR | **model-viewer** (iOS Quick Look + 3D modal), **Three.js** (Android WebXR carousel) | Already proven in the current app; keep. |
| Storage | **Cloudflare R2** (S3-compatible) | Free egress; presigned PUT uploads; high size limits. |
| DB / Auth | **Supabase** (Postgres + RLS + Auth, `@supabase/ssr`) | Tenant isolation via RLS; JWT-based roles. |
| Admin | **Next.js 16 / React 19 / Tailwind 4 / TypeScript** | Existing stack (`admin-app/`). ⚠️ Next 16 has breaking changes vs older docs — read `admin-app/AGENTS.md` before editing. |
| Custom domains | **Cloudflare for SaaS** Custom Hostnames API | Per-tenant domains + auto SSL. |

---

## 4. Data layer

The full schema and RLS policies live in **[`MULTITENANCY.md` §3–§4](MULTITENANCY.md)**.
Summary of the tables a builder needs to keep in mind:

```
brands             company/brand — owns branding, theme, PLAN. (e.g. "Big Sam's")
restaurants        a BRANCH/location — owns its menu; has slug (=subdomain + R2 prefix), custom_domain
categories         per branch
menu_items         per branch — model/model_usdz/thumbnail_url all point to R2
events             analytics — carries BOTH brand_id and restaurant_id
brand_users        user → brand   (role 'owner')   — sees all branches of the brand
restaurant_users   user → branch  (role 'staff')   — locked to one branch
super_admin        NOT a table — app_metadata.role='super_admin' on the auth user
```

**Mental model:** `1 brand → many branches → each branch has its own menu`.
Branding/theme/plan live on the **brand** (shared). A single-location restaurant
= 1 brand + 1 branch.

**Every tenant-scoped row carries `restaurant_id`** (and events also `brand_id`).
RLS uses these to isolate tenants. **Never** write a query or policy that can
return rows across `restaurant_id` boundaries for a non-super-admin.

---

## 5. The customer menu app

This is the existing `index.html`, made tenant-aware. **Changes required:**

### 5.1 Tenant resolution (the core change)
On load, the app must identify which restaurant it is:
1. Read `location.hostname`.
2. If it's `<slug>.betareal.app` → look up `restaurants` where `slug = <slug>`.
   If it's a custom domain → look up `restaurants` where `custom_domain = hostname`.
3. Get `restaurant_id` (+ `brand_id`, theme, branding) from that row.
4. **Every** subsequent menu/category/theme/model query filters by
   `restaurant_id`. Every analytics `track()` write includes `restaurant_id` and
   `brand_id`.

> The anon Supabase key is shared across all tenants (public, by design). RLS
> allows anon to **read visible menu/theme** and **insert events** only.

### 5.2 Subdomain serving (wildcard)
> ✅ **Subdomains work — via Cloudflare Workers, not Pages.** This is NOT a
> "no subdomains" situation and NOT a reason to leave Cloudflare. Workers does
> wildcard routing natively and binds to R2. Same provider, same R2, one extra
> capability.

- A **Cloudflare Worker** with route `*.betareal.app/*` serves the static app to
  every subdomain. (Cloudflare _Pages_ can't do wildcard — _Workers_ can; see §2.)
  Set up once.
- DNS: wildcard `*.betareal.app` (proxied) → the Worker.
- Use **flat** subdomains `brand-branch.betareal.app` — one wildcard cert covers
  one label; nested `branch.brand.betareal.app` would need a wildcard cert per
  brand. Avoid nesting.

### 5.3 Custom domain serving (Cloudflare for SaaS)
Verified end-to-end flow:
1. **One-time:** create a **fallback origin** (proxied DNS record → the Worker)
   and a friendly **CNAME target** (e.g. `cname.betareal.app`).
2. **Per client (automated, see §9C):** call the **Create Custom Hostname API**
   with the client's domain → response returns DCV validation tokens; Cloudflare
   issues SSL (two bundled certs) automatically.
3. **Client** adds **one CNAME**: `menu.theirbrand.ge → cname.betareal.app`.
4. Poll `result.status` and `result.ssl.status`; treat as live when both are
   `active`. The app resolves the tenant via the `custom_domain` column.

### 5.4 Service worker (`sw.js`)
- **Per-origin isolation is automatic:** each subdomain/custom-domain is a
  separate browser origin, so Cache Storage, the SW, and `localStorage` are
  isolated per tenant with **no manual namespacing**.
- **Change needed:** at install, precache **this tenant's** model list (resolved
  by hostname), not a hardcoded set.
- **Keep:** `CACHE_NAME` bump rule (global, per deploy) from `CLAUDE.md`;
  network-first navigation; never cache Supabase REST.

### 5.5 Asset rule (non-negotiable)
**All GLB / USDZ / thumbnails are served from R2.** Never Supabase Storage. This
is what keeps egress near zero at scale. Verify no `supabase.co/storage` URL ever
ends up in a `menu_items` row.

---

## 6. The admin panel

One Next.js app on Vercel. **The screen a user sees is determined by their role
(what they can touch) and their brand's plan (what features are unlocked).**

### 6.0 Auth & role resolution (build first)
- Login = Supabase email+password (`@supabase/ssr`), as today.
- On session, resolve the user's context:
  - `super_admin`? → `app_metadata.role === 'super_admin'`.
  - else find **brand_users** rows → brands they own (all branches).
  - else find **restaurant_users** rows → single branch.
- Store the resolved scope; gate every page/query by it. A user with no mapping
  sees nothing.

### 6.1 Super-admin area (BetaReal team only) — *this is the CMS / control tower*
The answer to "how do I keep track of 100 restaurants."
- **Tenant list:** every brand, with status, plan, # branches, live URL, quick
  links. Search/filter.
- **Create tenant wizard (the automation centerpiece, §9A):** form → brand name,
  slug, branding colors, logo upload, plan, first branch name → on submit,
  inserts `brands` + first `restaurants` row → **menu is instantly live at
  `slug.betareal.app`.**
- **Switch into any tenant:** open any brand/branch and manage it exactly as that
  client would (impersonation for support/setup).
- **User & role management:** create/invite logins, assign `brand_owner` /
  `branch_staff`, set `super_admin`.
- **Plan management:** set/raise a brand's `plan` (the upsell = one field).
- **Custom-domain management:** trigger the Cloudflare for SaaS flow (§9C),
  show status.

### 6.2 Brand owner area (the client)
- **Menu CRUD:** items, categories, prices, descriptions (EN/KA), per-item
  `ar_scale`, `visible`, `sort_order`, `thumb_3d`.
- **Asset upload:** GLB/USDZ → presigned PUT to R2 (auto-prefixed, §9D);
  thumbnail → client-side WebP → R2.
- **Branch management:** list the brand's branches; add a branch; per-branch
  edit.
- **Brand-wide edit (fan-out, §9F):** edit once → apply to **all** branches.
  Role-gated to owner; **hard confirmation that names the branches.**
- **Theme editor:** day/night palettes, Google Fonts, branding name → writes the
  brand's `theme`. _(Gated: hidden on `ar_menu` plan.)_
- **Analytics dashboard:** the existing `admin.html` (restaurant view), scoped to
  this brand's `events`. _(Gated: hidden on `ar_menu` plan.)_

### 6.3 Branch staff area
- Same menu CRUD as 6.2 **but locked to one branch**. No branch management, no
  brand-wide edit, no theme, no analytics unless plan + role allow.

---

## 7. Roles & permissions matrix

| Capability | super_admin | brand_owner | branch_staff |
|---|:--:|:--:|:--:|
| Create / delete tenants | ✅ | ❌ | ❌ |
| See all brands | ✅ | ❌ | ❌ |
| Edit their brand's menu (any branch) | ✅ | ✅ | ❌ |
| Edit one branch's menu | ✅ | ✅ | ✅ (their branch) |
| Brand-wide fan-out edit | ✅ | ✅ | ❌ |
| Add/remove branches | ✅ | ✅ | ❌ |
| Manage users/roles | ✅ | 🟡 own brand (later) | ❌ |
| Set plan / billing | ✅ | ❌ | ❌ |
| Trigger custom domain | ✅ | 🟡 (later) | ❌ |
| Theme editor | ✅ | ✅ *(if plan ≥ full)* | ❌ |
| Analytics | ✅ | ✅ *(if plan ≥ full)* | 🟡 *(if granted)* |

Enforced by **RLS at the DB** (writes), not just UI. See §11.

---

## 8. Plan tiers & feature gating

Plan lives on the **brand** (`brands.plan`). It is a **separate axis from role**
(see MULTITENANCY.md §2). Upsell = flip one field, no role change.

| Plan | ₾/mo | Menu editing | Analytics | Theme editor | Items |
|---|---|:--:|:--:|:--:|---|
| `ar_menu` | 300 | ✅ | ❌ | ❌ | 5 |
| `full` | 450 | ✅ | ✅ | ✅ | 5 |
| `premium` | 900 | ✅ | ✅ | ✅ | unlimited |

**Enforcement:** UI hides the gated tabs **and** (target state) RLS blocks the
`events` read / `theme` write for under-plan brands. **Ship UI-gating first;** add
the RLS plan-check before there's a paying `ar_menu` client motivated to bypass
it (low priority — an average owner won't bypass UI).

---

## 9. Automation flows (step by step)

### 9A — Create a new tenant (super-admin)
```
Super-admin fills wizard (name, slug, branding, logo, plan, first branch)
  → INSERT brands (slug, name, theme, plan, logo_url)
  → INSERT restaurants (brand_id, name, slug=<brand>-<branch>)
  → (logo uploaded to R2 under <slug>/)
  → DONE. Menu live at <slug>.betareal.app immediately (no deploy).
```
Irreducible manual work afterward: physical 3D scanning + menu data entry. No
infra work.

### 9B — Subdomain (automatic, zero per-client work)
```
One-time: wildcard *.betareal.app (proxied) → Cloudflare Worker route *.betareal.app/*
Per client: NOTHING. The restaurants.slug row makes <slug>.betareal.app resolve.
```

### 9C — Custom domain (automated handshake)
```
One-time: fallback origin + CNAME target (cname.betareal.app) in Cloudflare
Per client:
  1. Admin enters client's domain → POST /api/custom-hostname
  2. Server calls Cloudflare Create Custom Hostname API → stores hostname id,
     saves custom_domain on the restaurants row, returns CNAME instructions
  3. Client adds CNAME: menu.theirbrand.ge → cname.betareal.app  (their only step)
  4. Cloudflare auto-issues SSL; admin polls status until status+ssl.status='active'
```

### 9D — Model / thumbnail upload (auto-prefixed)
```
1. Admin (authed) requests upload → POST /api/r2-presign {filename, type}
2. Server derives the tenant slug from the user's mapping → builds key "<slug>/<filename>"
   (validates .glb/.usdz/.webp), returns short-lived presigned PUT URL + public URL
3. Browser PUTs the file directly to R2 (bypasses the server — no size limit)
4. Admin saves the returned R2 public URL into menu_items.model/model_usdz/thumbnail_url
```
The slug is **never typed by a human** — it's derived from who's logged in.

### 9E — User invite + role
```
Super-admin: create/invite Supabase auth user → INSERT brand_users (or restaurant_users)
mapping with role. (Optionally set app_metadata.role for super_admin.)
```

### 9F — Branch fan-out edit
```
Brand owner in "Edit whole brand" mode saves a change
  → confirmation lists the exact branches ("ALL 5: Vake, Saburtalo, ...")
  → on confirm, UPDATE the change across every branch row of the brand (one transaction)
Per-branch edit instead = update only that restaurant_id.
```

---

## 10. Backend endpoints / APIs

All in the Next.js admin app (`admin-app/app/api/...`), all **authenticated via
Supabase** and authorized by role:

| Endpoint | Method | Does | Auth |
|---|---|---|---|
| `/api/r2-presign` | POST | returns presigned R2 PUT URL, key auto-prefixed by tenant slug; validates extension | authed; user mapped to that tenant |
| `/api/custom-hostname` | POST | calls Cloudflare Create Custom Hostname; saves `custom_domain`; returns CNAME + status | super_admin (later: brand_owner) |
| `/api/custom-hostname/status` | GET | polls Cloudflare hostname + SSL status | super_admin |
| `/api/invite` | POST | creates/invites a Supabase user + inserts mapping row | super_admin |

Cloudflare API calls need server-side secrets (Cloudflare API token, zone id,
account id) in Vercel env vars — **never** exposed to the browser. R2 secrets
(`R2_ACCESS_KEY_ID`, etc.) already exist in Vercel.

---

## 11. Security checklist

The protection model (full policies in MULTITENANCY.md §4). A builder must verify:

- [ ] **RLS enabled on every tenant table** (`brands`, `restaurants`,
      `categories`, `menu_items`, `events`, `*_users`).
- [ ] **Anon can only:** read `visible` menu/theme, `insert` events. No anon
      writes to menu/theme/brands.
- [ ] **Writes locked to ownership:** a `brand_owner`/`branch_staff` can only
      modify rows in brands/branches they're mapped to. Cross-tenant write =
      refused by Postgres, not just hidden in UI.
- [ ] **Analytics reads** scoped to the user's brand(s); (target) gated by plan.
- [ ] **Mapping tables** (`brand_users`, `restaurant_users`) writable only by
      super_admin; a user may read only their own rows.
- [ ] **Server secrets** (Cloudflare token, R2 keys) only in Vercel env, never
      client-side. Supabase anon key is public by design (RLS is the guard).
- [ ] **Egress rule:** no heavy asset served from Supabase Storage — all on R2.
- [ ] Accept the documented nuance: public **menus** are readable cross-tenant
      via the API (they're public by nature); what's sealed is writes, analytics,
      and theme.

---

## 12. Build phases & task breakdown (delegation)

Ordered so nothing touches the live demo until cutover. Each task has an
acceptance check.

### Phase A — Foundation (no live changes)
- [ ] Create fresh Supabase org + project. **Done when:** project exists, URL +
      keys recorded.
- [ ] Apply schema (MULTITENANCY.md §3) + indexes. **Done when:** all tables
      exist; a single-location test brand+branch can be inserted.
- [ ] Apply RLS (MULTITENANCY.md §4). **Done when:** anon can read a visible item
      and insert an event, but cannot update a menu_item (verified with the anon
      key).
- [ ] R2: confirm one bucket; update presign to auto-prefix `<slug>/`. **Done
      when:** an upload lands at `<slug>/file.glb` and returns a working public URL.

### Phase B — Customer app, tenant-aware
- [ ] Cloudflare **Worker** serving the static app on `*.betareal.app/*`. **Done
      when:** two different test subdomains load the app.
- [ ] Hostname → tenant resolution; all queries filter by `restaurant_id`. **Done
      when:** `a.betareal.app` and `b.betareal.app` show different menus from one
      deploy.
- [ ] `sw.js` precaches the current tenant's models. **Done when:** offline reload
      of a tenant shows its own models only.

### Phase C — Admin, multi-tenant
- [ ] Auth role resolution (super_admin / brand_owner / branch_staff).
- [ ] Super-admin: tenant list + **create-tenant wizard** (§9A). **Done when:**
      creating a tenant in the UI makes its subdomain live with no deploy.
- [ ] Super-admin: switch-into-tenant; user/role management; plan management.
- [ ] Brand owner: menu/category CRUD scoped to brand; branch management;
      **fan-out edit + confirmation** (§9F).
- [ ] Plan-based **UI gating** (hide analytics/theme on `ar_menu`).

### Phase D — Migrate Burger Lions as tenant #1
- [ ] Export current Burger Lions data → import as brand `burger-lions` / branch
      `main`. Move any `supabase.co/storage` assets to R2.
- [ ] **Done when:** `burger-lions.betareal.app` renders identically to the
      current live demo, off the new stack.

### Phase E — Cutover & harden
- [ ] Buy domain; wildcard DNS + Worker route in production.
- [ ] Cloudflare for SaaS: fallback origin + CNAME target + `/api/custom-hostname`
      automation (§9C).
- [ ] Point QR/sales at the new stack; pause the old free project (frees the slot).
- [ ] Upgrade Supabase to Pro before real customer traffic.
- [ ] Add RLS plan-enforcement (deferred from Phase C).

---

## 13. Cost model

| Item | Cost now (build) | At ~10 paying clients |
|---|---|---|
| Cloudflare Workers | Free tier likely fine | ~$5/mo (Workers paid) |
| Cloudflare R2 | Free (<10 GB) | a few $/mo (storage; egress free) |
| Cloudflare for SaaS custom hostnames | — | small per-hostname fee (check current Cloudflare pricing 🟡) |
| Supabase | **Free** (we're at <6% of every quota) | **Pro $25/mo** |
| Vercel | Free/Hobby now | Pro if needed |
| **Total** | **~₾0** | **~$30–40/mo** vs ₾3,000+/mo revenue at 10×₾300 |

Infra is a rounding error against revenue. Stay free until paying traffic; then
Pro. **Do not pay for anything before the first client.**

---

## 14. Open decisions 🟡

- **Domain & TLD** — `betareal.app` / `.io` / `.ge`? Not owned yet. Blocks
  go-live, not the build.
- **USDZ strategy** — store USDZ per item or keep GLB-only + let model-viewer
  handle iOS? Affects upload UI + storage.
- **Brand-owner self-service** — can owners invite their own branch_staff and
  trigger their own custom domain, or super-admin-only at first? (matrix marks
  these 🟡.)
- **RLS plan-enforcement timing** — UI-gate now, RLS-enforce before first
  `ar_menu` client.
- **Training-data capture** — R2 prefix/layout for the (photos → model) pairs
  that feed the future AI (BETAREAL.md §14). Decide before scanning at volume.
- **Cloudflare for SaaS pricing** — confirm current per-custom-hostname cost.
- **Billing/subscription mechanics** — how monthly fees + per-location +
  annual-prepay are actually invoiced (out of scope here; product/ops decision).

---

## 15. Glossary & references

**Tenant** = one restaurant brand (and its branches) on the shared platform.
**Brand** = the company. **Branch** = one physical location (`restaurants` row).
**Fan-out edit** = a brand-wide change written to every branch at once.
**Fallback origin** (Cloudflare for SaaS) = the single backend all custom
hostnames route to (our Worker). **DCV** = Domain Control Validation for SSL.
**RLS** = Postgres Row-Level Security — the per-tenant data guard.

**References:**
- [`MULTITENANCY.md`](MULTITENANCY.md) — architecture + full schema/RLS SQL.
- [`BETAREAL.md`](BETAREAL.md) — company, pricing, roadmap.
- [`CLAUDE.md`](CLAUDE.md) — customer-app deploy rules + cache bump.
- Cloudflare for SaaS — Get started: https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/start/getting-started/
- Cloudflare Pages wildcard limitation (use a Worker): https://community.cloudflare.com/t/wildcard-subdomains-for-pages-in-2026/908010
- Supabase Billing FAQ (quotas/fair-use): https://supabase.com/docs/guides/platform/billing-faq

---

*This is the build spec. Update it as decisions in §14 land.*
