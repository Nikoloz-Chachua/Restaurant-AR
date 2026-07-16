# ARCHITECTURE-DEBT.md — known problems we are deliberately NOT fixing yet

> **Status:** parked backlog. **Owner:** Temo. **Opened:** 2026-07-17.
> **Baseline:** verified against `origin/cloudflare` @ 59adab7 (= what is live on
> `restaurant-ar.pages.dev`, `sw.js` `bl-v115`). If you are reading this much later, re-verify
> before acting — Niko ships to this branch directly.
>
> **Why this file exists.** A full read of the `cloudflare` branch (2026-07-17) turned up
> the issues below. None of them hurt our one live client (**Monday Greens**), so we are
> **not** fixing them now — client-facing work comes first, then we pivot. This file
> exists so they are not rediscovered from scratch or, worse, forgotten until one of
> them bites in front of a paying customer.
>
> **Rules for this file:**
> - Do **not** fix anything here as a side quest. Each item has a **Trigger** — the
>   event that turns it from "parked" into "do it now".
> - When an item is fixed, delete it from this file (git history keeps the record).
> - Read alongside [`BETAREAL.md`](BETAREAL.md), [`PLATFORM-SPEC.md`](PLATFORM-SPEC.md),
>   [`MULTITENANCY.md`](MULTITENANCY.md), [`CLAUDE.md`](CLAUDE.md).

---

## 1. 🔴 Plaintext client passwords in the database

**What:** `admin_initial_passwords` stores tenant admins' real login passwords in
cleartext. `supabase/sql/2026-07-03_admin_initial_passwords.sql` defines
`initial_password text not null`; `admin-app/lib/adminAccounts.ts` (`storeInitialPassword`)
writes it; `/api/tenants` and `/api/account-log` read it back and return it to any
super-admin.

**Why it exists:** operational convenience — we hand a client their login and need to
be able to read it back. The table header already calls itself temporary.

**Why it's bad:** passwords are never rotated or cleared after first login, and people
reuse passwords across services. This is the single worst thing in the repo. The blast
radius is a client's *other* accounts, not just ours. It's mitigated only by
`grant all ... to service_role` + RLS — one misconfigured grant or one leaked service
key turns it into a credential dump.

**Fix sketch:** delete the table and the read paths. Replace with the flow that already
exists: `account-log/route.ts` `service.auth.resetPasswordForEmail(...)` +
`app/reset-password/page.tsx`. Onboard clients by sending a set-password link, never by
telling them a password we stored. If a "show the client their temp password once" step
is genuinely needed, show it **once** at creation time from the POST response
(`oneTimePassword` is already returned) and never persist it.

**Trigger:** before onboarding client #2, or immediately if the service-role key is ever
suspected exposed. **Do not carry this into the pivot.**

---

## 2. 🟠 The branch-creation entitlement is bypassable

> Re-verified against `origin/cloudflare` @ 59adab7 (2026-07-17). Niko's
> `b29b21f feat: gate tenant branch creation` **improved** the gate — it is now an
> explicit per-tenant `brands.can_create_branches` flag
> (`supabase/sql/2026-07-13_branch_creation_entitlement.sql`) instead of a `plan = 'premium'`
> check, defaulting to `false`. **The bypass below is unaffected and still open** — and now
> bypasses an explicit entitlement, which makes it a sharper bug than before, not a softer one.

**What:** `create_platform_branch()` correctly refuses branch creation unless super-admin,
or a `brand_owner` whose brand has `can_create_branches = true`. But that check lives
**only inside the `security definer` function**. The `restaurants_admin_write` policy
(`supabase/sql/2026-06-29_multitenant_platform_foundation.sql:389`) is still
`for all using (public.can_manage_brand(brand_id)) with check (public.can_manage_brand(brand_id))`,
and `authenticated` still holds `insert` on `restaurants`. So any `brand_owner` — entitlement
flag `false` or not — can skip the RPC and `POST /rest/v1/restaurants` directly to create
unlimited branches.

**Why it's bad:** the paid gate lives only in a function nobody is forced to call. Extra
locations are a priced product (BETAREAL.md §15: each extra location ≈ ½–⅔ of base). The
new `can_create_branches` column is currently an *honour system*.

**Fix sketch:** split the policy — keep `select`/`update`/`delete` on
`can_manage_brand(brand_id)`, but restrict `insert` to `is_super_admin()`, forcing all branch
creation through `create_platform_branch()` where the entitlement check lives. Alternative:
a `before insert` trigger on `restaurants` that re-checks `can_create_branches`. The trigger
is the safer of the two — it can't be forgotten by a future policy edit.

**Trigger:** first non-premium client with more than one location, or any client technical
enough to use the API directly.

---

## 3. 🟠 Plan item limits are UI-only

**What:** `admin-app/lib/usePlan.ts` computes `itemLimit`; `app/(admin)/menu/page.tsx`
enforces it in React. Nothing in SQL counts items, and `menu_items_auth_write` lets any
`brand_owner` write freely to their own restaurant. An `ar_menu` client can add 50 AR
items via PostgREST.

**Why it exists:** documented, deliberate deferral — PLATFORM-SPEC.md §8 and
MULTITENANCY.md §4 both say "ship UI-gating first; add the RLS plan-check before there is
a paying ₾300 client motivated to bypass it." That reasoning still holds.

**Why to revisit:** the 5-item cap is the *entire* difference between ₾300 and ₾900
(BETAREAL.md §15 — the cap is deliberate artificial scarcity). It is our only paid
boundary with zero server-side enforcement.

**Fix sketch:** `before insert or update` trigger on `menu_items` counting
`is_3d and visible` rows per `restaurant_id` against `brands.plan`. Do it in the DB, not
in another API route — the API is not the only writer.

**Also note:** `usePlan.ts` gives `full` an item limit of **7**; PLATFORM-SPEC.md §8 and
BETAREAL.md §15 both say **5**. One of them is wrong — decide which before enforcing it
in SQL, or we'll enforce the wrong number.

**Trigger:** together with #2, before client #2 on a non-premium plan.

---

## 4. 🟡 Dead Aurora demo is precached for every tenant

**What:** `aurora-cafe.html` (159 KB) points at `https://xctoxhaahxtcicfgnmme.supabase.co`
— the **retired** single-tenant project (BETAREAL.md §11: *"retired — do not migrate or
edit it"*). It carries that project's old-format JWT anon key, its `theme_config` query
has no `restaurant_id` filter (it predates multi-tenancy), and its analytics events are
written to a dead database. `aurora-cafe/index.html` is a byte-identical duplicate of it
except `./img/` → `../img/`.

`sw.js` `PRECACHE` lists `./aurora-cafe.html`, `./aurora-cafe/`, and
`./foods/aurora-cafe-menu.json` — so **every visitor to every tenant downloads ~320 KB of
dead demo on service-worker install**, pointing at a retired DB.

**Why it's bad:** this is the exact failure mode the file's own comment says the model
precache was removed to avoid ("saturating mobile bandwidth before the menu could even
paint"). It is pure cost on Monday Greens' cold load today.

**Also:** `./aurora-cafe/` in PRECACHE is the same latent 308-redirect trap that already
broke `addAll` once for `waiter.html` (fixed in 19aa44a) — Cloudflare 308s
`/aurora-cafe.html` → `/aurora-cafe`, and the Cache API rejects redirected responses.

**Fix sketch:** delete `aurora-cafe.html`, `aurora-cafe/index.html`,
`foods/aurora-cafe-menu.json`, and their three `PRECACHE` entries. Bump `CACHE_NAME`.
Cheapest real win in the repo — but it touches `sw.js`, so it is not a free side quest
while we are shipping client changes.

**Trigger:** next time we touch `sw.js` for another reason, or any cold-load perf work.

---

## 5. 🟡 Per-restaurant HTML forks contradict our own rule

**What:** `TEMPLATE-GUIDELINES.md` §6 states as non-negotiable: *"❌ No per-restaurant HTML
files, no hardcoded names/prices/logos/colors."* The repo has four:

| File | Size | State |
|---|---|---|
| `index.html` | 230 KB | the real shared template |
| `big-sams.html` | 218 KB | fork of `index.html` — 88% identical, ~551 lines diverged, edited same-day as index |
| `aurora-cafe.html` | 159 KB | fork, retired DB (see #4) |
| `aurora-cafe/index.html` | 159 KB | byte-duplicate of the above |

**Why it's bad:** `big-sams.html` and `index.html` are both live and both being edited.
Every fix to one now needs hand-porting to the other, silently, forever. This is how the
"one codebase, many tenants" promise dies — not by decision, but by drift.

**Fix sketch:** fold `big-sams.html`'s 551 diverged lines back into `index.html` behind
`[data-template="…"]` scoped CSS + `theme_config` tokens, per TEMPLATE-GUIDELINES §5.
Delete the Aurora pair outright (#4).

**Trigger:** the pivot. Do not fork a fifth file in the meantime — if Monday Greens needs
a structural change, put it behind `[data-template="monday_greens"]` in `index.html`.

---

## 6. 🟡 postMessage origin allowlist trusts all of `*.vercel.app`

**What:** `admin.html:456` and `dev-analytics.html:590`:
`_ADMIN_ORIGINS.includes(e.origin) || e.origin.endsWith('.vercel.app')`. Any Vercel-hosted
page can iframe our analytics dashboard and drive it, including handing it an
attacker-chosen `supabaseUrl`/`supabaseKey` via `supabaseConfigFromParent()`.

**Severity is genuinely low:** the token flows *in*, not out — the iframe carries no
session of its own, so there is little to steal. Logged for correctness, not panic.

**The real problem is why the wildcard can't just be deleted:** the named origin in
`_ADMIN_ORIGINS` is `https://burger-lions-admin.vercel.app`, but the dashboard actually
posts from `betareal-admin.vercel.app` (`app/(admin)/dashboard/page.tsx` `ANALYTICS_ORIGIN`).
The stale entry is what makes the wildcard load-bearing.

**Fix sketch:** replace the stale entry with the real origin(s), then drop the
`.endsWith('.vercel.app')` clause. Keep localhost entries for dev.

**Trigger:** free to do any time we touch `admin.html`; must be done before any third
party can point a Vercel deploy at us.

---

## 7. 🟡 Docs drift — the specs no longer describe reality

The docs are good, which is exactly why the stale parts are dangerous: they read as
authoritative.

| Doc says | Reality |
|---|---|
| `CLAUDE.md` / `BETAREAL.md`: SW cache `bl-v13` / `bl-v55` | **`bl-v111`** in `sw.js` |
| `README.md`: single-restaurant GitHub Pages app, edit `foods/menu.json` | two architectures out of date; `foods/menu.json` is fallback-only |
| `PLATFORM-SPEC.md` §8: `full` = 5 items | `usePlan.ts` = **7** (see #3) |
| `PLATFORM-SPEC.md` / `MULTITENANCY.md`: `*.betareal.app` via a **Cloudflare Worker**, wildcard DNS, "a new restaurant is live the instant its row exists — no per-client DNS step" | `betareal.ge` on **Pages**; wildcard does **not** work (see #8) |
| `PLATFORM-SPEC.md` / `MULTITENANCY.md`: "Status: design complete, **not yet built**" | most of it is built and live |
| `BETAREAL.md` §1/§2: #1 goal = acceptance into 2080 Ventures + GITA | we applied and were **not accepted**; #1 goal is now the first paying client (see #9) |

**Fix sketch:** one pass over the headers and quick-reference blocks. Cheap. The
`CACHE_NAME` number in docs will drift again — consider deleting the specific version
from prose and pointing at `sw.js` as the source of truth.

**Trigger:** before handing any doc to an accelerator, investor, or new teammate — and
before an AI assistant reads them as fact.

---

## 8. 🟡 The wildcard-subdomain promise is currently false

**What:** `app/api/tenants/route.ts` and `app/(admin)/tenants/page.tsx` both hardcode
`WORKING_TENANT_SUBDOMAINS = new Set(['rhythm', 'monday-greens'])`. Every other
`*.betareal.ge` subdomain returns Cloudflare **error 1014 (CNAME Cross-User Banned)**
because the DNS zone and the Pages project live on different Cloudflare accounts. Each new
tenant needs manual whitelisting as a Pages Custom Domain.

**Why it's bad:** onboarding is documented (PLATFORM-SPEC.md §9A/§9B) as "insert a row →
live, zero per-client work". Today it is "insert a row → then a human adds a custom domain
on Niko's Cloudflare account". The automation centerpiece is a manual step. It works fine
at 1 client; it does not survive 10.

**Fix sketch:** the root fix is the registrar/account move already diagnosed separately —
get the `betareal.ge` zone and the Pages project under one account, or move the customer
app to a **Worker** with a `*.betareal.ge/*` route as PLATFORM-SPEC.md §2 originally
specified (Pages cannot do wildcard subdomains; Workers can).

**Trigger:** client #2. This is the hard blocker on the "adding a client is a database
insert" story, and it's the one item here that is infrastructure, not code.

---

## 9. 🔴 Business-critical facts live only on one laptop (ACT ON THIS)

**What:** the stale clone at `C:\Users\temot\Restaurant-AR` (48 commits behind
`niko/cloudflare`) holds **uncommitted, unbacked** work that exists nowhere else:

- `FINAL_OFFER.md` (9.6 KB) — untracked
- `SALES_BATTLECARD.md` (7 KB) — untracked
- ~77 lines of `BETAREAL.md` edits — unstaged

Those edits record a material fact this branch does not know:

> *"We applied to 2080 Ventures and GITA in 2026 and were not accepted — we plan to
> reapply with traction."* — with the `#1 goal` changed from accelerator acceptance to
> **land the first paying client**.

**Why it's bad:** the `cloudflare` branch's `BETAREAL.md` — a document whose stated purpose
is *"the first thing a new member or AI should read"* — still says the #1 company goal is
getting into accelerators we were already rejected from. Anyone onboarding, human or AI,
reads the wrong strategy and plans against it. And it is one `git clean` from gone.

**Fix sketch:** salvage the three files off the stale clone and commit them here. This is
the one item in this file that is *not* safe to leave parked — it is unbacked work, not
technical debt.

**Trigger:** now.

---

## Not debt — things that are right

Recorded so nobody "fixes" them by mistake:

- **`current_app_role()` reads `app_metadata` only.** It originally fell back to
  `user_metadata.role`, which is user-writable — any authenticated user could have made
  themselves `super_admin` with one `updateUser()` call.
  `supabase/sql/2026-06-29_tenant_user_plan_upload_fixes.sql` closed it and stripped stale
  `role`/`plan` keys from existing users. **Never reintroduce a `user_metadata` fallback.**
- **`sw.js` does not mass-precache models.** It fired a parallel download of every visible
  GLB on cold load, racing the page's own fetches. The comment explaining this is load-bearing.
- **No `@supabase/supabase-js` in the customer app.** Raw PostgREST fetches, deliberately —
  saves 51 KB and ~1.3 s of CPU on first paint.
- **`scripts/check-models.mjs`** exists because R2 objects silently vanished on 2026-06-23
  while Supabase looked healthy. Keep it; run it when the menu looks broken.
- **GLB/USDZ upload is super-admin only**, enforced server-side in
  `app/api/r2-presign/route.ts` via the `is_super_admin` RPC — not just hidden in the UI.
