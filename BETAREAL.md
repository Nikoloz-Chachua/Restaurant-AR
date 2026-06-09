# BetaReal — Master Company & Product Document

> **Single source of truth.** This document exists to onboard new team members and to give AI assistants full context about BetaReal in one place. It covers the company, the product, the technical architecture, the 3D production pipeline, the AI strategy, the business model, go-to-market, the team, finances/legal status, and the roadmap.
>
> **Status:** Living document. Last major update: **2026-06-09**.
> **Maintainer:** Temo Tkeshelashvili (CEO).
> **How to use it:** Read top-to-bottom for the full picture, or jump via the table of contents. Anything marked **🟡 TBD / OPEN** is an unresolved decision — do not treat it as settled fact. Anything marked **⚠️ RISK** is a known weakness to manage.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Company Snapshot](#2-company-snapshot)
3. [The Problem](#3-the-problem)
4. [The Solution & Product](#4-the-solution--product)
5. [How It Works (Customer Journey)](#5-how-it-works-customer-journey)
6. [Product Surfaces & Live URLs](#6-product-surfaces--live-urls)
7. [Technical Architecture](#7-technical-architecture)
8. [Data Model (Supabase)](#8-data-model-supabase)
9. [Storage Strategy](#9-storage-strategy)
10. [Analytics & Telemetry](#10-analytics--telemetry)
11. [Hosting, Accounts & Ownership](#11-hosting-accounts--ownership)
12. [Deployment Rules](#12-deployment-rules)
13. [The 3D Production Pipeline](#13-the-3d-production-pipeline)
14. [The AI Strategy — Our Moat](#14-the-ai-strategy--our-moat)
15. [Business Model & Pricing](#15-business-model--pricing)
16. [Rough Unit Economics](#16-rough-unit-economics)
17. [Market & Competition](#17-market--competition)
18. [Go-To-Market Strategy](#18-go-to-market-strategy)
19. [Traction & Validation](#19-traction--validation)
20. [The Team](#20-the-team)
21. [Legal, Equity & Finances](#21-legal-equity--finances)
22. [Roadmap & Next Steps](#22-roadmap--next-steps)
23. [Goals](#23-goals)
24. [Risks & Open Questions](#24-risks--open-questions)
25. [Quick-Reference Facts](#25-quick-reference-facts)
26. [Appendix: Repository Map](#26-appendix-repository-map)
27. [Glossary](#27-glossary)

---

## 1. Executive Summary

**BetaReal** is a Tbilisi-based technology startup building a **WebAR menu platform for restaurants**. We turn real dishes into high-quality interactive 3D models that customers can rotate, inspect, and place on their own table in Augmented Reality — directly in the phone browser, **with no app download**. A customer scans a QR code on the table, the menu opens instantly, and they can see the true size, layering, and presentation of a dish before ordering.

The product is **not** a one-off menu for a single restaurant. It is a **reusable template/platform** designed to be deployed for any restaurant. Our current showcase ("Burger Lions") is built on the real menu of a burger restaurant near our workspace, used as our first real-world test subject to prove and demonstrate the system.

Our long-term advantage — the "moat" — is a **data flywheel**: every restaurant we onboard produces pairs of *(dish photos → finished 3D model)*. Once we accumulate enough of these (we estimate **~3,000 high-quality models** to cover most of the Georgian food market), we fine-tune an open-source image-to-3D AI model so we can generate new dish models from just a few photos. That collapses our production cost and time, which lets us undercut and out-scale anyone doing this manually.

**Stage:** Pre-revenue. Working MVP built and live. No legal entity or paying clients yet. Immediate goal is to get into two accelerators (**2080 Ventures** and **GITA**), then land our first client.

---

## 2. Company Snapshot

| Field | Value |
|---|---|
| **Company name** | BetaReal |
| **Brand / logo** | Created ~2026-06-07 (very new). Public product still labeled "3D AR Menu" because it's self-explanatory and a survey was already sent under that wording. |
| **What we sell** | WebAR restaurant menu platform (interactive 3D + AR), full-service (we scan, build, host, maintain). |
| **HQ / market** | Tbilisi, Georgia. Expansion path: Tbilisi → Georgia → international. |
| **Founded** | ~May 2026 (≈1 month of focused work as of this doc). |
| **Founders** | 5 active (all CS students, Ivane Javakhishvili Tbilisi State University / TSU). |
| **Legal entity** | ❌ None yet (not registered). |
| **Revenue** | ₾0 (pre-revenue). |
| **Funding** | Bootstrapped. ~₾300–400 spent on equipment, from CEO's leftover prize money from a previous accelerator. |
| **Current #1 goal** | Acceptance into **2080 Ventures** and **GITA collaborative accelerator**. |
| **Showcase / demo** | "Burger Lions" — built on a real nearby burger restaurant's menu; **not a client**, used as the demo dataset. |
| **Live demo URL** | https://3darmenu.pages.dev |

---

## 3. The Problem

Traditional and "digital" restaurant menus share the same core weakness — **the customer can't actually see what they're ordering**:

- Static photos misrepresent real portion size, layering, and presentation.
- Most "QR menus" today are just **PDF replacements** — no real innovation.
- **Tourists and international visitors** struggle to understand unfamiliar dishes (a big factor in Georgia's tourism-heavy hospitality market).
- Restaurants have very few ways to create a **memorable, shareable, differentiated** experience.
- Modern customers increasingly expect **interactive, visual, social-media-friendly** experiences.

Net effect: lower ordering confidence, weaker upsell, fewer "wow" moments, and no differentiation between competing restaurants.

---

## 4. The Solution & Product

BetaReal provides a **complete WebAR menu ecosystem** — restaurants need zero technical knowledge:

1. **We scan & build.** We photograph each dish in a lightbox and convert it into an optimized interactive 3D model (GLB).
2. **We deploy a custom digital menu** accessible via a QR code on the table.
3. **Customers browse, inspect in 3D, and place dishes in AR** on their real table — straight from the browser.
4. **Restaurants self-manage** items, prices, descriptions, theme, and visibility from an admin panel — no reprinting menus.
5. **We host, maintain, and improve** the platform, and provide analytics on customer behavior.

**Core product qualities:** premium UI/UX, lightweight & fast, multilingual (Georgian/English today), no app install, works on modern Android and iOS.

### Feature checklist (what exists today)

- ✅ Interactive 3D inspection of every dish (rotate, zoom, realistic lighting).
- ✅ Web-based AR placement on the real table (Android WebXR + iOS Quick Look).
- ✅ QR-based, app-free access.
- ✅ Bilingual interface (Georgian / English) with live language switching.
- ✅ Day/Night theme toggle.
- ✅ **Live 3D thumbnails** and an optional uploaded image thumbnail per item.
- ✅ A **basket/cart** that lets customers tally a desired order locally (see note below).
- ✅ Self-service **admin panel**: menu items, categories, pricing, per-item AR scale, visibility, sort order, thumbnails.
- ✅ Self-service **theme editor**: day/night color palettes, Google Fonts, branding name.
- ✅ Full **analytics dashboard** (session funnel, AR usage, per-item engagement, peak hours).

> **Note on the basket:** it currently builds an order summary *on the customer's device only*. It does **not** yet transmit the order to restaurant staff or a POS. Turning it into real ordering is a roadmap item, not a current feature.

---

## 5. How It Works (Customer Journey)

```
Customer sits down
      │
      ▼
Scans QR code on the table
      │
      ▼
Browser opens 3darmenu.pages.dev  (no app, ~instant)
      │
      ▼
Menu renders: categories, prices, live 3D thumbnails
      │
      ├─ Taps a dish ─────────────► Fullscreen 3D preview (rotate / zoom)
      │
      ├─ Taps "VIEW ON TABLE" ────► AR placement (device-dependent, see below)
      │
      └─ Adds items to basket ────► Local order tally (not sent to staff yet)
```

### AR routing (device-dependent)

The app detects the device's AR capability once and caches it in `localStorage` (`bl-ar-cap`):

| Device | Detected capability | Experience | Button label |
|---|---|---|---|
| **Android Chrome + ARCore** | `webxr` | Custom **Three.js WebXR carousel** — tap a surface to place, drag to move, twist/pinch to scale, swipe to cycle through **all** menu items | "VIEW ON TABLE" |
| **iOS Safari** | `arkit` | **ARKit Quick Look** fired via a hidden pre-loaded `model-viewer` (`activateAR()`) — no page redirect, fires synchronously from the tap | "VIEW ON TABLE" |
| **Android without WebXR** | `none` | In-page fullscreen 3D modal | "VIEW IN 3D" |
| **Desktop / unsupported** | `none` | In-page fullscreen 3D modal | "VIEW IN 3D" |

**iOS detail:** because Quick Look must fire synchronously from a user gesture, all models are pre-loaded into hidden launcher `model-viewer` elements at page load so the AR tap never loses gesture context.

**AR philosophy:** AR sessions intentionally show **no name/price labels** — clean, immersive, model-only viewing. AR is for "see it on your table," not for reading.

---

## 6. Product Surfaces & Live URLs

We run **three** distinct front-ends:

| Surface | What it is | Where it lives | Who uses it |
|---|---|---|---|
| **Customer menu app** | `index.html` — the WebAR menu | **Cloudflare Pages** → https://3darmenu.pages.dev | Restaurant guests |
| **Admin panel** | `admin-app/` — Next.js app to manage menu + theme + view analytics | **Vercel** (George's account) | Restaurant staff / us |
| **Analytics dashboard** | `admin.html` — Chart.js dashboard | Served from Cloudflare Pages, **embedded via iframe** inside the admin panel's Dashboard page | Restaurant owners / us |

The admin panel's Dashboard page embeds `https://3darmenu.pages.dev/admin.html` in an iframe and securely passes the admin's language, theme, and Supabase access token via `postMessage` (locked to the exact origin, never `*`).

---

## 7. Technical Architecture

### 7.1 High-level diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                          CUSTOMER (phone browser)                      │
│   index.html (static)  +  Service Worker (sw.js, offline + precache)   │
│   AR: model-viewer (iOS) · Three.js WebXR (Android) · 3D modal (rest)  │
└───────────────┬──────────────────────────────────┬───────────────────┘
                │ reads menu/theme (REST)           │ loads .glb models
                │ writes analytics events           │
                ▼                                   ▼
      ┌───────────────────────┐          ┌────────────────────────┐
      │  SUPABASE (Postgres)  │          │  CLOUDFLARE R2 (models) │
      │  menu_items           │          │  + Supabase Storage     │
      │  categories           │          │    (legacy models,      │
      │  theme_config         │          │     thumbnails as WebP) │
      │  events               │          └────────────────────────┘
      │  Auth (admin login)   │                     ▲
      └─────────▲─────────────┘                     │ presigned PUT upload
                │ reads/writes (authed)              │
                │                                    │
      ┌─────────┴───────────────────────────────────┴───────────────┐
      │            ADMIN PANEL — Next.js 16 / React 19 (Vercel)       │
      │  Menu CRUD · Categories · Theme editor · Analytics (iframe)   │
      │  /api/r2-presign  → issues presigned R2 upload URLs (authed)  │
      └──────────────────────────────────────────────────────────────┘
```

### 7.2 Customer app (`index.html`)

- **Pure static** single HTML file (~142 KB), **no build step**. All AR libraries (model-viewer, Three.js) load from CDN, **lazily on first AR tap** to avoid blocking the menu.
- **Primary data source:** Supabase `menu_items` + `categories` (live). Falls back to `foods/menu.json` only if Supabase is unreachable.
- **Service worker (`sw.js`, cache `bl-v55`):**
  - Pre-caches the page shell + `foods/menu.json`.
  - At install, fetches the list of visible model URLs from Supabase and **pre-caches all GLB models** so AR is instant.
  - **Navigation requests** are network-first with `cache: 'no-store'` (bypasses browser + Cloudflare edge cache) so updates reach users on the very next reload.
  - **Supabase REST/auth** is always network (never cached) so menu/theme changes appear immediately.
  - **Models, JSON, fonts, CDN modules** are cache-first (instant once cached).
- **Client state keys:**
  - `localStorage`: `bl-ar-cap` (AR capability), `bl-theme`, `bl-lang`, `bl-vid` (persistent visitor ID).
  - `sessionStorage`: `bl-sid` (per-session ID).
- **Thumbnails** load staggered (150 ms apart) via `IntersectionObserver` to avoid simultaneous WebGL context-init spikes.

### 7.3 Admin panel (`admin-app/`)

- **Stack:** Next.js **16**, React **19**, Tailwind CSS **4**, TypeScript. Auth via `@supabase/ssr`.
  - ⚠️ This Next.js version has breaking changes vs. older training data — see `admin-app/AGENTS.md`. Check `node_modules/next/dist/docs/` before writing admin code.
- **Pages:**
  - `/login` — Supabase email+password sign-in.
  - `/dashboard` — analytics (embeds `admin.html` via iframe, passes prefs + token via `postMessage`).
  - `/menu` — items + categories CRUD; GLB upload (presigned to R2), thumbnail upload (client-side WebP conversion → Supabase Storage), per-item `ar_scale`, `visible`, `sort_order`, `thumb_3d`.
  - `/theme` — day/night color palettes, body/heading Google Fonts, branding name (writes `theme_config`).
- **API route `/api/r2-presign`:** authenticates the user via Supabase, validates the file is `.glb`, then returns a short-lived (5 min) presigned **PUT** URL to Cloudflare R2 plus the resulting public URL. The browser uploads **directly to R2**, bypassing Next.js entirely (no request-size limit — this fixed an earlier 413 error).
- **i18n:** the admin panel itself is bilingual (English/Georgian) via `lib/i18n.ts` + `lib/useLang.ts`.

### 7.4 Why this architecture

- **No build step on the customer app** = trivial to deploy, debug, and hand off; nothing to break in CI.
- **CDN-loaded AR libs, lazily** = fast first paint on the menu (the thing 90% of users actually use).
- **Supabase as live source** = restaurant edits appear instantly for new visitors.
- **Direct-to-R2 uploads** = no server bottleneck for large 3D files.

---

## 8. Data Model (Supabase)

**Project:** "Restaurant AR Claude version" · **Project ID:** `xctoxhaahxtcicfgnmme` · **URL:** `https://xctoxhaahxtcicfgnmme.supabase.co`

### Tables

**`menu_items`** — the live menu (primary source for the app)
| Column | Type | Notes |
|---|---|---|
| `id` | int (PK) | |
| `name_en`, `name_ka` | text | Bilingual name |
| `description_en`, `description_ka` | text | Bilingual description |
| `price` | text | Free-form (e.g., `"14 ₾"`) — stored as text, not numeric |
| `category_id` | int (FK → categories) | |
| `model` | text (URL) | Full URL to the GLB (R2 or Supabase Storage) |
| `thumbnail_url` | text (URL) | Optional uploaded WebP thumbnail |
| `thumb_3d` | bool | If true, thumbnail shows live 3D instead of the image |
| `ar_scale` | numeric | Per-item AR scale multiplier (default 1.0) |
| `visible` | bool | Hidden items don't render on the live menu |
| `sort_order` | int | Ordering within a category |

**`categories`** — `id`, `name_en`, `name_ka`, `sort_order`.

**`theme_config`** — key/value store driving the customer app's look:
- `night_*` / `day_*` color keys: `bg`, `card`, `card2`, `border`, `text`, `dim`, `accent`, `accent_text`, `thumb_bg`, `modal_bg`.
- `font_body`, `font_heading` (Google Font names).
- `site_name`, `site_name_ka` (branding).

**`events`** — analytics (see §10): `session_id`, `visitor_id`, `event`, `item_index`, `item_name`, `category`, `lang`, `ar_cap`, `extra` (JSON), `created_at`.

**Auth** — Supabase Auth (email+password) gates the admin panel.

> **Current live data is a work-in-progress demo set**, not the polished 16-item `menu.json`. As of this writing it contains a handful of real scanned items (BigBurger, Hot Dog, Croissant, Donut) plus duplicate/hidden test rows. Categories: Burgers, Sides, Drinks, Desserts, Coffee.
>
> ⚠️ **Security to verify:** the Supabase anon key is public **by design** (it's embedded in the client). What matters is **Row-Level Security**: anonymous users must be able to *read* visible menu/theme and *insert* events, but must **not** be able to modify `menu_items`, `categories`, or `theme_config`. **Confirm RLS policies enforce this.**

---

## 9. Storage Strategy

| Asset | Where | Notes |
|---|---|---|
| **3D models (GLB)** | **Cloudflare R2** (going-forward standard) | Public bucket `pub-3c68559de18f4aee94d127e180937bdd.r2.dev`. Chosen for speed + high upload limit. Uploaded via presigned PUT from the admin panel. |
| **Legacy 3D models** | Supabase Storage `models` bucket | Older items (hot dog, croissant, donut) still here. **Migrate to R2.** |
| **Thumbnails** | Supabase Storage `thumbnails` bucket | Uploaded images are converted **client-side to WebP** (quality 0.88) before upload. |

**Decision (2026-06-09): R2 is the standard for models.** Migrate remaining Supabase-hosted models to R2 so there's one storage system to reason about.

**Real model sizes today (uncompressed):** ~5.8–8.6 MB each (hot dog 5.9 MB, donut 6.3 MB, croissant 8.2 MB, burger 8.6 MB).

**Why no Draco compression:** Draco requires the browser to download a decoder, and for our model sizes the decoder download costs more time than it saves. We optimize size in Blender instead and ship plain GLB. (If we ever ship Draco, do it across *all* models at once so the decoder is amortized.)

---

## 10. Analytics & Telemetry

Every customer session is tracked into the `events` table via a `track(event, itemIndex, extra)` function. Each row carries a **session ID** (`bl-sid`, per session) and a **persistent visitor ID** (`bl-vid`, survives across sessions), plus language and AR capability. Return visitors are detected by the presence of `bl-vid`.

### Tracked events

| Event | Meaning |
|---|---|
| `page_load` | Page opened (with `return_visitor` flag) |
| `first_interaction` | First meaningful action + ms-to-first-interaction |
| `scroll_depth` | 25/50/75/100% scroll milestones |
| `item_view` | Opened a dish's 3D preview (+ repeat flag) |
| `modal_close` | Closed the 3D preview (+ dwell time) |
| `category_filter` | Tapped a category filter |
| `ar_tap` | Tapped the AR button |
| `ar_success` | AR session started |
| `ar_placed` | Placed a model on a surface |
| `ar_duration` | AR session length (ms) |
| `ar_fallback` | AR unavailable → fell back to 3D modal |
| `xr_nav` | Swiped between items inside the WebXR carousel |
| `basket_add` / `basket_remove` / `basket_open` / `basket_clear` | Basket actions (with `after_ar` / `after_3d` attribution) |
| `lang_change` / `theme_change` | UI preference changes |

### Dashboard (`admin.html`)

Chart.js visualizations: event-count overview, sessions & basket-adds per day, visits by hour, **AR funnel** (where users drop off), basket-add attribution (after-AR vs after-3D), top items by 3D views / basket adds / AR success / dwell time, average AR & 3D durations per item, category interest, and peak hours.

This is a genuine product differentiator: **most QR menus give the restaurant zero behavioral data.** We give them a full funnel.

---

## 11. Hosting, Accounts & Ownership

> ⚠️ **Bus-factor risk — read this.** Critical infrastructure is spread across personal accounts. Document credentials in a shared password manager and plan to migrate to company-owned accounts once a legal entity exists.

| Thing | Provider | Owned by | Notes |
|---|---|---|---|
| Customer app + analytics dashboard | **Cloudflare Pages** | Temo | Deploys from the **`cloudflare`** git branch |
| Model storage | **Cloudflare R2** | Temo | Public bucket |
| Admin panel | **Vercel** | **George** | Next.js app — **deploys from the `main` git branch** |

> ⚠️ **Two branches drive two deploys** (they have diverged — don't assume they're in sync):
> - **`cloudflare`** → Cloudflare Pages → **customer app** (`index.html`, `sw.js`, `admin.html`, `foods/`).
> - **`main`** → Vercel → **admin app** (`admin-app/`).
>
> So: customer-app changes go on `cloudflare`; **admin-app changes must go on `main`** to actually deploy. A commit to one branch does **not** affect the other deploy.
| Database, Auth, thumbnails, legacy models | **Supabase** | Temo (personal org) | Project `xctoxhaahxtcicfgnmme` |
| "Everything hosted via my device" | Local (Temo) | Temo | ⚠️ Single point of failure |

**Admin app environment variables (Vercel):** `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`, plus Supabase URL + anon key.

**Note (from memory):** the GSStudio Supabase org has 2 projects (free-tier limit) — do **not** touch `oaqoxndnmltvajdtfrcu`. Our project lives in Temo's personal org.

---

## 12. Deployment Rules

**MUST follow every time** (this is in `CLAUDE.md` too):

1. **Two deploy branches — pick the right one:**
   - **Customer app** (`index.html`, `sw.js`, `admin.html`, `foods/`) → commit to **`cloudflare`** (Cloudflare Pages).
   - **Admin app** (`admin-app/`) → commit to **`main`** (Vercel).
   - A commit to one branch does **not** deploy the other. The branches have diverged — don't assume parity.
2. **Bump `CACHE_NAME` in `sw.js`** (`bl-v55` → `bl-v56` → …) in the **same commit** whenever any of these change:
   - `index.html`, `foods/menu.json`, `sw.js` itself, any local GLB, or any new file served to the browser.
   - If you forget, returning visitors keep seeing the **old cached version** until a hard refresh.
3. Supabase REST calls (menu/theme/events) are **never cached** — admin changes are immediately visible. Only stable-URL model files are cached.
4. The admin panel deploys independently on Vercel (no cache-bump concern).

---

## 13. The 3D Production Pipeline

This is our **core operational process today** — turning a real dish into a shippable 3D model.

```
Real dish  →  Lightbox photoshoot  →  KIRI Engine  →  Blender  →  GLB upload (admin → R2)
            (pro camera, hi-res)     (photo→3D)      (scale +     (live on menu)
                                                      cleanup +
                                                      size optimize)
```

**Steps:**
1. **Photoshoot** the dish in a **lightbox** with a professional camera (high-quality, well-sized — not overly huge — source photos). Consistent lighting is key to model quality.
2. **Photogrammetry via KIRI Engine** to generate the raw 3D model from the photos.
3. **Blender cleanup:** scale the model correctly, make minor edits if needed, and **minimize file size** without Draco (we optimize geometry/textures instead of relying on a runtime decoder).
4. **Upload** the GLB through the admin panel → stored on R2 → instantly live on the menu.

**Current throughput:** roughly **~20 minutes of pictures per dish** (CEO calls this a high/conservative estimate). Photography is the bottleneck step; the rest is processing.

**Current asset state:** we have **one** truly high-quality finished model (a Burger Lions burger) that we keep refining to track our quality/size target, plus finished photo sets. The legacy demo models `food.glb` / `Druidi.glb` are **deprecated** — everything now flows through the admin panel to R2.

**Roles:** Ilia leads photoshoots + 3D asset creation + AR integration; Davit leads 3D model processing & optimization.

---

## 14. The AI Strategy — Our Moat

**The thesis:** manual photogrammetry is slow and doesn't scale. The winner in this space is whoever can produce **good 3D food models the fastest and cheapest**. Our plan is to make that an AI capability we own.

**The flywheel:**
```
Land clients → capture (dish photos → finished 3D model) pairs
      ▲                                          │
      │                                          ▼
  cheaper, faster        ◄── train/fine-tune AI to generate
  production wins                  3D models from a few photos
  more clients
```

**Intended approach (current best thinking — 🟡 not yet started):**
- Take an **open-source 3D-generation / image-to-3D model** and **fine-tune it on our own dish dataset** (food-specific).
- **Rent GPU compute from the cloud** for training rather than buying hardware.
- We have **pivoted away from Gaussian splatting** — not our current direction.

**Data requirement:**
- Training a *good* model needs **variety**, not repetition — many *different* burgers, not one burger many times. And that's just burgers.
- To cover food broadly (Georgian traditional dishes + general cuisine), we estimate **~3,000 high-quality models** would cover **most of the Georgian market**.
- **Current dataset: 1 high-quality model + finished photos.** Everything else is ahead of us. This is why **client acquisition is also data acquisition** — every paid scan grows the training set.

**Status:** Aspirational / Phase 3. No training has started. The near-term value of the pipeline is the paid service; the AI is the long-term cost/scale moat.

**Team on AI:** George (training infrastructure / data engineering), Nikoloz (AI development + model fine-tuning), Ilia (AI-related development).

---

## 15. Business Model & Pricing

**Model: B2B SaaS** with three revenue components:
1. **One-time onboarding/setup fee** → immediate implementation revenue.
2. **Per-item 3D production** → scalable production revenue.
3. **Monthly subscription** → predictable recurring revenue (MRR) + retention.

All prices in **Georgian Lari (₾)**. (Rough USD for reference only: ₾100 ≈ $37.)

### Onboarding
- **₾500 one-time** (≈ $185). Includes setup, QR integration, deployment, initial optimization, and the **first 5 AR items**.

### Subscription tiers (monthly)

| Tier | Price/mo | Included AR items | What you get |
|---|---|---|---|
| **AR Menu** | **₾300** (≈$110) | 5 | The interactive 3D + AR menu. Can edit dishes/menu via admin. **No analytics, no theme editor.** |
| **Full** | **₾450** (≈$165) | 5 | Everything we have today — **analytics + theme customization** included. |
| **Premium / Unlimited** | **₾900** (≈$330) | Unlimited | Unlimited models, a **strategy consultation** from our team (menu layout & upsell advice), **custom models**, and optionally **custom animations** (🟡 concept only — no current capability). |

### Extra AR items
- Beyond the included 5, each additional AR item costs **₾50–70** (≈$18–26).
- **Decided:** charged as a **recurring monthly fee per extra item** (not a one-time charge). ⚠️ ₾50–70/item/month is on the high side; pressure-test willingness-to-pay with the first clients.
- **All tiers** pay for extras.

### The 5-item cap — deliberate strategy
The 5-AR-item cap is **intentional artificial scarcity**. Only some dishes get a 3D model, which **concentrates customer attention and orders on those dishes**. We pitch this to restaurants as a feature: *"Pick your 5 highest-margin / signature dishes — AR will drive their sales."* It also caps our production load per client at launch.

### Contract terms (decided 2026-06-09)
- **Month-to-month, no lock-in.** Lowest barrier to the first "yes."
- **Annual prepay discount** offered: e.g., **pay for 10 months, get 12** (~17% off) — improves cash flow and retention without forcing commitment.

### Multi-location pricing (decided 2026-06-09)
- **Priced per location.** Each **additional** location of the same brand is **discounted to ~½–⅔ of the base price** — a volume discount that rewards chains while revenue still scales with footprint. (E.g., location 1 at full price, each further location at roughly 50–66% of it.)

### Pricing open questions 🟡
- **Delivery-app / partnership pricing:** must be **custom** (see §18) — different value and volume.

---

## 16. Rough Unit Economics

> 🟡 Illustrative only — not validated. Built from current stated prices.

**Per client (Full tier, 5 items, year 1):**
- Onboarding: ₾500 (one-time)
- Subscription: ₾450 × 12 = ₾5,400
- **Year-1 gross: ~₾5,900** before any extra items.

**Production cost (our COGS):** primarily **labor + a little compute**. Direct cash cost per dish is low today (photography time ~20 min + processing); equipment is a sunk ~₾300–400. The real cost is **founder time**, which the AI strategy (§14) is meant to eliminate.

**Why the model is attractive:** high gross margin once the menu is built (hosting on Cloudflare/Supabase is cheap), recurring MRR, and a production cost curve that **bends down over time** as AI takes over scanning.

**What to validate next:** willingness-to-pay at these price points (survey + first sales calls), realistic items-per-client, churn, and true hours-per-dish at scale.

---

## 17. Market & Competition

### Market
- **Georgia / Tbilisi first.** Tourism-heavy hospitality sector → strong fit for the "help tourists understand unfamiliar dishes" angle.
- **No known direct WebAR-menu competitor in Georgia** → genuine **first-mover advantage** locally.

### Global competitors (for benchmarking — they validate the model)
- **QReal (formerly Kabaq)** — the clear global leader. Restaurants submit dish photography; QReal builds photorealistic models via photogrammetry; app-free WebAR via QR. Reports **+20–26% average order value** within 90 days across **800+ restaurants**, and AR-prompted upsells **3.4× more effective** than verbal staff upsells. Also offers a meal-builder. **This is our north-star comparable** — it proves the AOV uplift story we'll sell.
- **Onirix** (Spain) — WebAR platform; used by restaurant groups (e.g., La Tagliatella).
- **Jarit** — AR menu app using photogrammetry.
- **AR Code** — AR QR + object-capture 3D scanning.
- **MenuAR** — WebAR 3D models for restaurants/cafés.
- **Reliefs** (France) — https://reliefsapp.com (see `/en#ar-demo`; site has anti-bot protection) — WebAR 3D menu with its **own scanning app** and a strong landing page. The closest European comparable to study for product, scanning UX, and positioning.

### Our differentiation
1. **Local, full-service, in-Georgian** — we scan, build, host, maintain; the restaurant does nothing technical.
2. **Tourist + Georgian-language focus** tuned to this market.
3. **Built-in analytics funnel** — most competitors don't hand restaurants behavioral data.
4. **White-label theming** — each restaurant's menu matches its brand.
5. **The AI cost moat (future)** — own the cheapest production pipeline in the region.

---

## 18. Go-To-Market Strategy

> 🟡 GTM is the **least-developed** part of the business and the **#1 thing to fix**. We have a product and no sales motion yet. The CEO is actively learning B2B sales (Alex Hormozi material + mentorship from a strong B2C salesman friend + roleplay with team/AIs).

### Lighthouse first client
- **Target: Burger Lions** (the demo restaurant) — great for **team morale**, it's nearby, and the demo already uses their menu.
- ⚠️ **We have no contact there yet and no sales script.** Needs: a named contact, a one-page offer, a live in-person demo on their own dishes, and a clear ask.

### Recommended near-term motion
1. **Build a tight offer + demo flow** (Hormozi-style "grand slam offer"): lead with the **QReal AOV stat** (+20–26%), show *their own* dish in AR on the table, and make the first month risk-free (month-to-month, no lock-in).
2. **Land a few lighthouse clients fast** (even at a discount) to generate **case studies, testimonials, and — critically — training data**.
3. **Door-to-door / warm Tbilisi outreach** to premium burger spots, cafés/dessert shops, fine dining, tourist-focused restaurants, and hotels (our stated target segments).
4. **Build the BetaReal landing page** (see roadmap) to convert inbound and look credible.

### Channel idea: online-ordering / delivery partnerships 🟡
The CEO sees strong value in AR for **at-home ordering** ("see the dish on your table before you order delivery"). Potential partners: **Wolt, Glovo, Bolt Food, Hotcard**, and healthy meal-prep companies. Pricing for these would be **custom** (different value, different volume). Treat as an exploratory channel, **after** the direct-to-restaurant motion is working.

### Segments (priority order)
Premium burger restaurants → cafés & dessert shops → fast-casual chains → fine dining → tourist-focused restaurants → hotels/hospitality → entertainment dining.

---

## 19. Traction & Validation

**Honest current status: pre-revenue, MVP live, validation in progress.**

### Engagement telemetry (the funnel works)
Over ~2 weeks (2026-05-26 → 2026-06-09) the live app recorded:
- **1,182** page loads · **598** sessions · **262** "unique" visitors
- **3,057** item views · **587** AR taps · **247** AR successes · **287** AR placements
- **77** basket adds

> ⚠️ **Caveat (be honest in any external use):** this traffic is **mostly the team testing** (incognito/multiple devices inflate the "unique visitor" count) plus **one day of early survey traffic** (survey launched **Mon 2026-06-08**). It proves the **system works end-to-end and the AR funnel is real**; it is **not** yet validated external demand.

### Survey — first results (n = 23)

Bilingual (Georgian/English) survey; first responses **2026-06-05**, wider distribution from **2026-06-08**. Raw data is kept **out of git** in the local `survey stats not for github/` folder (it contains respondent contacts). **Small, early, warm-audience sample — directional, not conclusive.**

**Device split:** ~61% Android (14) · ~39% iPhone (9).

**Problem is real (strong validation):**
- **100%** have had a dish arrive looking different than expected; **74%** said it *bothered* them.
- **78%** hesitate before ordering at least *sometimes* because they can't judge the real size (52% "almost every time").
- **#1 cited problem: portion size** ("hard to determine portion sizes"), then "food looks different from photos," then "no photos available" and "unclear ingredients" (one respondent also wanted calories).

**The value prop resonates:**
- **"View on table" rating: avg ~4.3/5** — 77% gave 4–5★ (1 respondent didn't try the AR feature).
- **91%** said seeing the dish in 3D made them **more likely to order** than a photo (**43% "significantly more"**).
- **91%** said it would change how they order if it replaced a normal QR menu (**52%** "yes — I'd try dishes I wouldn't normally order").

**⚠️ Most important product insight (from a critical respondent):** 3D/AR alone **does not reliably convey true size** — a small dish can look big on screen, same as a photo. Suggestion: show the dish **next to a common reference object** (or display **real dimensions**). This directly attacks the #1 surveyed pain (portion size) and is cheap to build → see roadmap. Take it seriously; it's the sharpest feedback we have.

**Leads:** 0 genuine restaurant leads so far (the one contact left is a team member). The "leave your contact" CTA is **underused** — strengthen it.

> **Implication:** the *problem* and the *appeal* are validated even in a warm sample; the open questions are real external demand at scale, willingness-to-pay, and closing the size-perception gap. Re-run analysis here as more responses arrive.
- Distribution opportunity: a university Dean offered access to **~20,000 people** (per project notes) — a major validation channel. 🟡 Confirm final reach + exactly what the survey measures (interest, willingness-to-pay, preferred features).

### Credibility / wins
- CEO is a **winner of the TSU Higgs Cleverton Collaborative Accelerator** (prior program).
- Working, deployed MVP with three real AR rendering paths and a self-service admin + analytics stack — built by the founders in ~1 month.

---

## 20. The Team

5 active founders — Computer Science students at **Ivane Javakhishvili Tbilisi State University (TSU)**, friends for 3+ years, ~30–35 hrs/week each on BetaReal over the past month.

> **Important nuance:** the role titles below are the **accelerator-facing presentation** (programs like clean role distinctions). **Operationally the team is flat** — everyone does a bit of everything and the team rallies around whatever the current bottleneck is. The CEO is the most involved; **2 members are currently lighter** due to other responsibilities and are **expected to ramp up over the summer**.

| Founder | Title (official) | Primary responsibilities |
|---|---|---|
| **Temo Tkeshelashvili** | **CEO** | Business strategy, customer discovery, sales, marketing, WebAR development, financial management. Winner of TSU Higgs Cleverton accelerator. Most involved; currently full-time (no other job). Hosts/owns most infra. |
| **George Tchitchinadze** | Web Platform / Data / AI Infra | Web platform development, data engineering, AI training infrastructure. Owns the Vercel account. |
| **Nikoloz Chachua** | Sales / Marketing / AI | Sales, customer outreach, marketing, AI development + model fine-tuning. |
| **Ilia Nozadze** | 3D / AR / Finance | Food-item photoshoots, 3D asset creation, AR integration, financial planning, AI-related development. |
| **Davit Jincharadze** | 3D Optimization | 3D model processing & optimization (real dishes → optimized interactive assets). |

**Departed 6th member:** the team originally had 6. One member left amicably — he didn't believe in the project. **No hard feelings**: he remains a close friend and still collaborates with the CEO on **other** projects (not BetaReal). He is **not** an active stakeholder here. ⚠️ Because equity was never formalized, **document explicitly that he holds no claim** when the entity/cap table is set up (see §21).

**Combined skills:** software development, WebAR, AI, 3D content creation, business development.

---

## 21. Legal, Equity & Finances

**Legal entity:** ❌ **None registered yet** (we're new). ⚠️ **Register a Georgian entity before taking client money or accelerator funds**, and set the cap table at the same time.

**Equity:** **Informal, equal split** among the 5. No formal/legal agreement exists. The CEO's stated principle: *"no one gets anything until a year is up"* — this refers to **equity/dividends, not salaries** (there are no salaries). Mindset is **abundance + fairness**: reward those who actually did the work, without souring genuine friendships. 🟡 **OPEN & important:** formalize a founders' agreement with **vesting** (e.g., standard 4-year vest / 1-year cliff) so contribution maps to ownership and the departed member's status is unambiguous.

**Finances:**
- **Bootstrapped.** ~**₾300–400** spent on equipment so far (food isn't counted — we eat the dishes after photographing them).
- Funded from the **CEO's leftover prize money** from a previous accelerator.
- **CEO currently has no other job** (full-time on BetaReal).
- **Infra costs** are currently near-zero (free/cheap tiers on Cloudflare + Supabase + Vercel).

**What we want from accelerators:**
- **2080 Ventures:** primarily **network, guidance, and mentorship — especially in sales & marketing** (our weakest area).
- **GITA collaborative accelerator:** acceptance + support.
- 🟡 Confirm specific terms (equity taken / grant amounts / program length) for each as applications progress.

---

## 22. Roadmap & Next Steps

**Phase 0 — Now (validate + apply)**
- [ ] Polish the Burger Lions demo (clean up duplicate/hidden DB rows; finalize a tight showcase menu).
- [ ] Collect and analyze **survey results**.
- [ ] Submit **2080 Ventures** and **GITA** applications. ← *current #1 goal*
- [ ] Migrate legacy Supabase-hosted models to **R2** (single storage standard).
- [ ] **Verify Supabase RLS** (anon can read visible menu + insert events only; no anon writes to menu/theme).
- [ ] Centralize credentials in a shared password manager (reduce bus-factor).

**Phase 1 — First revenue**
- [ ] **Solve the size-perception gap** (from survey): show each dish at **true scale** in AR and/or alongside a **common reference object** (or display real dimensions). This is the sharpest piece of user feedback and directly addresses the #1 pain (portion size) — cheap, high-impact, and reinforces the core value prop.
- [ ] **Strengthen the "leave your contact" CTA** so the menu itself generates restaurant leads.
- [ ] Build a **sales playbook**: offer one-pager, demo script, objection handling, pricing sheet.
- [ ] **Land first paying client** (target: Burger Lions) → first case study + testimonial.
- [ ] **Register the legal entity**; sign a **founders' agreement with vesting**.
- [ ] Buy a **custom domain** + build the **BetaReal landing page** (qualities, stats, partners, accomplishments).

**Phase 2 — Multi-tenant scale**
- [ ] Build **multi-tenancy** (see decision below) so many restaurants run off one system.
- [ ] **Custom domain per client.**
- [ ] Onboard several clients; **systematize the production pipeline**; grow the dish photo↔model **dataset**.

**Phase 3 — The AI moat**
- [ ] Reach **~3,000 high-quality models** (food coverage for the Georgian market).
- [ ] **Fine-tune an open-source image-to-3D model** on our dataset using **rented cloud GPUs**.
- [ ] Deploy **AI-assisted production** → collapse cost/time per dish.

**Phase 4 — Expand the platform**
- [ ] Real **online ordering** (basket → kitchen/POS) + **delivery-app partnerships** (Wolt/Glovo/Bolt Food/Hotcard).
- [ ] More languages (e.g., **Russian** for tourists).
- [ ] Analytics as a paid product; loyalty; multi-location management; AI recommendations; marketplace/franchise plays.

### 🟡 Architecture decision needed: multi-tenancy
Current system is **single-tenant** (one menu, one DB). The CEO's leaning: **one shared database + an internal CMS connected to all clients, with a separate deploy + custom domain per client.**

**Recommendation to evaluate:** keep **one shared Supabase database** with a `restaurant_id` on every row and **RLS-enforced isolation**, serve all clients from **one customer-app codebase**, and select the tenant by **domain/subdomain**. This avoids maintaining N separate deployments while still giving each client their own domain and theme. Decide between *(a)* this row-level multi-tenancy vs *(b)* separate-deploy-per-client **before** onboarding client #2.

---

## 23. Goals

In priority order, as stated by the CEO:

1. **Get into 2080 Ventures and the GITA collaborative accelerator.** ← immediate focus
2. **Get the first client** (ideally Burger Lions).
3. **Gather enough clients and data** to make the AI viable (~3,000 models).
4. **Train the AI** to generate 3D models from a few photos — the endgame that makes production cheap and scalable.

Long-term vision: become **the leading interactive restaurant-tech platform in Georgia**, then expand internationally — building the largest WebAR food-visualization network in the region and making immersive dining the industry standard.

---

## 24. Risks & Open Questions

**Risks ⚠️**
- **No legal entity / informal equity** — formalize before money changes hands.
- **No sales motion yet** — best product loses to better distribution; GTM is the gap.
- **Bus factor** — infra spread across personal accounts; CEO hosts "everything" on his device.
- **Traction is mostly internal** — external demand unproven until survey + first sales calls.
- **Pricing unvalidated** — ₾50–70/item/month may be steep; per-location rule undecided.
- **AI is far off** — needs ~3,000 models + GPU budget; we have 1 model today.
- **Concentration** — heavy reliance on one CEO doing most of the work; 2 members under-committed (until summer).
- **Verify RLS** — make sure the public anon key can't be used to alter menu/theme data.

**Open questions 🟡**
- Multi-tenancy architecture: shared-DB-with-RLS vs separate-deploy-per-client?
- Exact survey scope/reach and what it's measuring? (Results to be dropped in the repo root as they come in — only a few answers so far.)
- Full competitor map beyond the known players (QReal, Reliefs, Onirix, Jarit, AR Code, MenuAR)?
- Accelerator terms (equity/grants) for 2080 Ventures and GITA?
- Delivery-app / partnership pricing model?

---

## 25. Quick-Reference Facts

```
Company:          BetaReal  (brand new; logo ~2026-06-07)
Product (public): "3D AR Menu"  (kept for clarity; survey already sent under this)
Demo:             "Burger Lions" — real nearby burger place, used as demo (NOT a client)
Stage:            Pre-revenue, MVP live, validation in progress
Team:             5 active founders (CS students, TSU); originally 6 (1 left amicably)
Market:           Tbilisi → Georgia → international
Live customer app:  https://3darmenu.pages.dev        (Cloudflare Pages, branch `cloudflare`)
Admin panel:        Next.js 16 / React 19 on Vercel (George's account)
Analytics:          admin.html (Chart.js), embedded in admin via iframe
Database:           Supabase project xctoxhaahxtcicfgnmme ("Restaurant AR Claude version")
Tables:             menu_items, categories, theme_config, events  (+ Auth)
Model storage:      Cloudflare R2 (standard) + legacy Supabase Storage (migrate)
Thumbnails:         Supabase Storage, client-side WebP
SW cache version:   bl-v55  (BUMP on index.html / sw.js / menu.json / GLB changes)
Production:         Lightbox photos → KIRI Engine → Blender → GLB → admin → R2  (~20 min/dish)
Model sizes:        ~5.8–8.6 MB, no Draco (decoder download not worth it)
AI plan:            Fine-tune open-source image-to-3D on ~3,000 dish models, rented cloud GPU
Pricing (₾/mo):     300 (AR only) · 450 (full+analytics+theme) · 900 (unlimited+consult)
Onboarding:         ₾500 one-time (incl. 5 items)
Extra items:        ₾50–70 each, recurring monthly; 5 included per tier
Multi-location:     Priced per location; each extra location ~½–⅔ of base price
Contract:           Month-to-month, no lock-in + annual prepay discount
Funding:            Bootstrapped; ~₾300–400 spent; from CEO's prior prize money
Legal:              No entity yet; equity informal & equal; no salaries
#1 goal:            Get into 2080 Ventures + GITA accelerator
Competitor north star: QReal/Kabaq (+20–26% AOV, 800+ restaurants)
```

---

## 26. Appendix: Repository Map

```
Restaurant-AR/
├── index.html              # Customer WebAR menu app (static, ~142 KB) — THE product
├── sw.js                   # Service worker (offline + model precache); cache = bl-v55
├── admin.html              # Analytics dashboard (Chart.js), embedded in admin panel
├── metadata.json           # App metadata (name/description/camera permission)
├── _headers                # Cloudflare Pages cache headers (no-cache HTML + sw.js)
├── foods/menu.json         # FALLBACK menu only (used if Supabase unreachable)
├── stress-test.js          # Load/stress testing helper
├── package.json            # Root: `serve` dev server + gltf-pipeline compress script
├── CLAUDE.md               # AI/dev guidance for the customer app
├── README.md               # Public-facing readme (note: some details now outdated)
├── BETAREAL.md             # ← THIS document (master internal doc)
└── admin-app/              # Admin panel (Next.js 16 / React 19 / Tailwind 4)
    ├── app/
    │   ├── (admin)/dashboard/page.tsx   # Analytics (iframe + postMessage)
    │   ├── (admin)/menu/page.tsx        # Menu + category CRUD, GLB/thumbnail upload
    │   ├── (admin)/theme/page.tsx       # Theme editor (colors/fonts/branding)
    │   ├── (admin)/layout.tsx           # Admin shell
    │   ├── login/page.tsx               # Supabase auth login
    │   └── api/r2-presign/route.ts      # Presigned R2 upload URLs (auth-gated)
    ├── lib/
    │   ├── supabase/{client,server}.ts  # Supabase SSR clients
    │   ├── i18n.ts, useLang.ts          # Admin bilingual strings
    ├── components/{AdminShell,Sidebar}.tsx
    ├── AGENTS.md            # ⚠️ "This is NOT the Next.js you know" — read before editing
    └── CLAUDE.md            # → @AGENTS.md

Note: `Userstemotmap3d/` is an unrelated nested project (a 3D map/car configurator),
not part of BetaReal. Ignore it for this product.
```

**Useful commands:**
```bash
# Customer app (root)
npm run dev            # serve static files at http://localhost:3000

# Admin panel
cd admin-app && npm run dev    # Next.js dev server
```

---

## 27. Glossary

| Term | Meaning |
|---|---|
| **WebAR** | Augmented Reality that runs in the phone **browser** — no app install. |
| **WebXR** | Browser API powering AR on Android Chrome (with ARCore). |
| **ARKit Quick Look** | Apple's native AR viewer, triggered from Safari via `model-viewer`. |
| **GLB** | Binary glTF — the 3D model file format we ship. |
| **model-viewer** | Google web component that renders 3D/AR; used for iOS AR + the 3D modal. |
| **Three.js** | 3D library powering the custom Android WebXR carousel. |
| **Photogrammetry** | Building a 3D model from many photographs (we use **KIRI Engine**). |
| **Draco** | A GLB mesh-compression scheme (we deliberately **don't** use it). |
| **Supabase** | Hosted Postgres + Auth + Storage; our live backend. |
| **R2** | Cloudflare's S3-compatible object storage; where we keep models. |
| **RLS** | Postgres Row-Level Security; what protects our data given a public anon key. |
| **MRR** | Monthly Recurring Revenue. |
| **AOV** | Average Order Value (the metric AR menus are proven to lift). |
| **GITA** | Georgia's Innovation and Technology Agency (accelerator we're applying to). |
| **₾ / GEL** | Georgian Lari (currency). |

---

*End of document. Keep this file updated as decisions are made — it's the first thing a new member or AI should read.*
