# Analytics Stats Reference

This documents every statistic shown in the two analytics dashboards, what it
measures, **how** it's computed, and **why** it exists.

There are two dashboards:

- **🍔 Restaurant (default)** — `admin.html`, served at `/dashboard` to every
  admin user. The lean, business-only view: _"is this making people order?"_
- **🛠 Developer (team-only)** — `dev-analytics.html`, served at `/dev-analytics`,
  gated by Supabase `app_metadata.role === 'dev'`. Everything the restaurant sees
  **plus** the technical/diagnostic layer: _"is the tech healthy, and on which
  devices?"_

Both read the same data and share the same render code; each only draws the
cards/charts whose markup exists in its own file.

---

## How the data works

Every visitor action writes **one row** to the Supabase `events` table. Each row
carries:

| Field | Meaning |
|---|---|
| `event` | action name (e.g. `page_load`, `ar_success`, `basket_add`) |
| `item_name` / `category` | which dish / menu section it happened on |
| `ar_cap` | device AR capability — `arkit` (iPhone AR) · `webxr` (Android AR) · `none` (no AR) |
| `platform` | `ios` · `android` · `desktop` (iPad folded into `ios`; `null` for rows before 2026-06-23) |
| `lang` / `theme` | `en`/`ka`, and `day`/`night` |
| `created_at` | timestamp (drives the date-range + hour/day filters) |
| `extra{}` | per-event detail — `after_ar`, `after_3d`, `duration_ms`, `source`, `from`, `to`, … |

Every stat below is just a **count**, **percentage**, or **average** over those
rows for the selected date range.

### Event types written by the app

`page_load` · `item_view` · `modal_close` · `ar_tap` · `ar_success` ·
`ar_placed` · `ar_duration` · `ar_fallback` · `basket_add` · `basket_remove` ·
`basket_open` · `category_filter` · `xr_nav` · `lang_change` · `theme_change`

---

## 🍔 Restaurant (default) dashboard

The view restaurant clients see. Revenue-focused only.

### KPIs — the 8 big numbers

| Stat | Measures | How | Why |
|---|---|---|---|
| **Sessions** | How many people opened the menu | count of `page_load` | Top-of-funnel traffic — the denominator for everything else |
| **3D Views** | How often a dish's 3D model was opened | count of `item_view` (modal opens) | Shows the 3D feature is actually used, not ignored |
| **AR Launches** | How often AR actually opened on a phone | count of `ar_success` | The headline "wow" feature firing in the real world |
| **Basket Adds** | Items added to an order | count of `basket_add` | Closest proxy to revenue intent |
| **AR→Basket** | Share of orders that happened *after* using AR | `% of basket_add where extra.after_ar = true` | **The money stat** — proves AR drives ordering, justifies the price |
| **3D→Basket** | Share of orders after viewing 3D | `% of basket_add where extra.after_3d = true` | Same argument for the lighter 3D feature |
| **Avg AR Duration** | Seconds a user stays in an AR session | average of `ar_duration` → `extra.duration_ms` | Engagement depth — long looks = genuine interest, not accidental taps |
| **AR Devices** | % of visitors whose phone *can* do AR | `(arkit + webxr sessions) ÷ all sessions` | Sets realistic expectations — explains why not everyone uses AR |

### Insights strip

| Stat | Measures | How | Why |
|---|---|---|---|
| **Most viewed / Most ordered / Most AR'd item** | The single top dish in each category | top item by count of `item_view` / `basket_add` / `ar_success` | Tells the restaurant which dish to feature, and where AR pays off |

### Charts

| Chart | Measures | How | Why |
|---|---|---|---|
| **Activity timeline** | Traffic over the date range | events grouped by date | Spot busy days / campaign spikes |
| **By hour of day** | When people browse | events bucketed by hour | Staffing & promo timing |
| **By day of week** | Which weekdays are busy | events bucketed by weekday | Weekly planning |
| **Top items — Views** | Most-opened dishes | `item_view` counted per `item_name` | What attracts attention |
| **Top items — Basket** | Best "sellers" | `basket_add` per item | What converts |
| **Top items — AR** | Most AR-viewed dishes | `ar_success` per item | Which dishes benefit most from AR |
| **Category engagement** | Interest per menu category | `category_filter` + `item_view` per category | Which sections pull weight |
| **Language split** | EN vs KA audience | `lang` field on sessions | Who the customers are |
| **Upsell table** | Dishes viewed/AR'd a lot but rarely ordered | high `item_view`/`ar_success` ÷ low `basket_add` | Concrete "push these" list — pure business value |

---

## 🛠 Developer dashboard (team-only)

Re-shows all 8 restaurant KPIs, then adds **4 more KPIs** and **~17 deeper charts**.

### Extra KPIs

| Stat | Measures | How | Why |
|---|---|---|---|
| **AR Taps** | Intent to launch AR | count of `ar_tap` (button press, before AR opens) | The "wanted AR" number vs. "got AR" |
| **AR Placed** | Models actually anchored to a surface | count of `ar_placed` | Confirms the hard part of AR succeeded |
| **AR Launch Rate** | Reliability of AR launching | `ar_success ÷ ar_tap` | **Health metric** — a low % means AR is breaking |
| **Avg 3D Duration** | Seconds in the 3D modal | average `modal_close` → `duration_ms` | Engagement depth for the non-AR path |

### Funnel & attribution

| Chart | Measures | How | Why |
|---|---|---|---|
| **AR funnel** | Drop-off tap → success → placed → order | counts at each stage | Pinpoints *where* users fall out |
| **Order attribution** | What drove each order | `basket_add` split: AR-only / AR+3D / 3D-only / direct | Credits the feature that actually converted |
| **First 3D / First AR** | Whether 3D or AR was the user's first interaction | first event per session | Understand discovery behavior |

### Real device breakdown

| Chart | Measures | How | Why |
|---|---|---|---|
| **Real device breakdown** | Genuine device mix | `platform × ar_cap` → 6 buckets: **iPhone–AR, iPhone–no-AR, Android–AR, Android–no-AR, Desktop/laptop, Unknown (pre-tracking data)** | Replaces the old chart that mislabeled all non-AR as "desktop" — the true picture of who visits |
| **AR-capable %** | Capable vs not | `arkit + webxr` vs `none` | Reach of the AR feature |
| **AR by platform** | iOS vs Android AR success | `ar_success` split by `ar_cap` | Catch platform-specific AR bugs |
| **Devices (ar_cap)** | Raw arkit/webxr/none split | `ar_cap` doughnut | Low-level device sanity check |

### Per-item depth & behavior

| Chart | Measures | How | Why |
|---|---|---|---|
| **Longest 3D / AR durations per item** | Which models hold attention | avg `duration_ms` per item | Spot best (or broken/slow) models |
| **AR source** | What triggered the AR tap | `ar_tap` → `extra.source` | Which UI entry point works |
| **Theme split / Theme switches / Lang switches** | Day vs night, and toggling behavior | `theme`/`lang` fields + `theme_change`/`lang_change` `from→to` | UX preference signals |
| **Summary / Hours-window** | Aggregate event mix & business-hours filtering | grouped counts | Dev overview & noise filtering |

---

## The split in one line

- **Restaurant view** answers _"is this driving orders?"_ — revenue stats only.
- **Developer view** adds _"is the tech healthy and on which devices?"_ — funnels,
  launch-rate, device truth, and per-model diagnostics.
