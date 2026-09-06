# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**BetaReal / Restaurant-AR** — a shared multi-tenant WebAR restaurant menu platform. Burger Lions is tenant #1 and remains the live compatibility tenant; new restaurants should be created by database rows and served through the same customer template.

## Development Commands

```bash
npm install      # Install the `serve` package (only dev dependency)
npm run dev      # Serve static files at http://localhost:3000
```

`npm run build` is a no-op — this is a pure static project.

## Architecture

### Pages

**`index.html`** — the shared customer template. It resolves a restaurant from `location.hostname`, defaults the current `restaurant-ar.pages.dev` production URL to Burger Lions, then fetches live tenant data from Supabase (`restaurants`, `brands`, `menu_items`, `categories`, `theme_config`). It falls back to `foods/menu.json` only if Supabase is unreachable. AR button routing:

| Device | AR capability | Result |
|---|---|---|
| Android Chrome + ARCore | `webxr` detected | Three.js WebXR carousel — tap surface to place, swipe to cycle items |
| iOS Safari | `arkit` detected | Quick Look fires directly via a hidden pre-loaded `model-viewer` in index.html (`activateAR()`) — no page redirect |
| Android without WebXR | `none` | In-page 3D modal — button reads "VIEW IN 3D" |
| Desktop | `none` | In-page 3D modal — button reads "VIEW IN 3D" |

AR capability is cached in `localStorage` key `bl-ar-cap`. Theme and language are stored under `bl-theme` / `bl-lang`.

On iOS, both model files (`food.glb`, `Druidi.glb`) are pre-loaded into hidden launcher `model-viewer` elements on page load so `activateAR()` can fire synchronously from the tap gesture without losing the gesture context.

### Data

**Primary source**: Supabase tenant tables. `brands.plan` controls product entitlements; `restaurants` identifies branches; `menu_items`, `categories`, and `theme_config` are scoped by `restaurant_id`; analytics `events` carry both `brand_id` and `restaurant_id`. Admin changes in the Next.js admin panel immediately reflect on the live menu for new visitors (SW does not cache Supabase REST responses).

**`foods/menu.json`** — fallback only, used when Supabase is unreachable. Keep it roughly in sync but it is not the live source of truth.

### 3D assets

- `food.glb` — generic food model (local, pre-cached by SW)
- `Druidi.glb` — Druidi burger model (local, pre-cached by SW)
- Cloudflare R2 — target storage for GLB, USDZ, thumbnails, and other heavy assets. R2 keys must be prefixed by restaurant slug, for example `burger-lions-main/item.glb`.

All new heavy assets are served from Cloudflare R2. AR sessions show no name/price labels — clean, immersive model-only view.

### WebXR carousel

The carousel shows **all menu items** (full `menuItems` list), not category-scoped. Users can cycle through every item in AR.

**Exception — Food & Market (`food-market-main`):** this tenant is split into independent "kitchens" (Georgian & More / Thai / Japanese / Drinks), each with its own landing tile and theme. For this tenant only, `_fmActiveKitchenItems()`/`_scopedCatItems()` restrict the 3D modal and AR carousel to the active kitchen's items, so a Japanese sushi roll's 3D model can never surface while browsing the Georgian kitchen. See `_groupOf`, `_arEntriesForActiveGroup`, and `_mostOrderedEntries` in `index.html` for the same per-kitchen scoping applied to the "3D showcase" and "Most ordered" blocks.

## Deployment rule — MUST follow every time

**Whenever any of these files change, bump `CACHE_NAME` in `sw.js` in the same commit:**

| File changed | Why |
|---|---|
| `index.html` | App code/UI updated |
| `foods/menu.json` | Fallback menu data changed |
| `food.glb` / `Druidi.glb` | Local 3D models replaced |
| `sw.js` itself | SW logic changed |
| Any new file served to the browser | Needs to enter the cache |

How to bump: open `sw.js`, change `'bl-v13'` → `'bl-v14'` (then v15, v16, …).

If you forget, users who visited before will keep seeing the old cached version until they hard-refresh. The service worker will NOT deliver your update automatically.

Note: Supabase REST API calls (tenant, menu data, theme) are **never cached** by the SW — they always go to the network so admin changes are immediately visible. Heavy R2 assets are cache-first by URL.

Claude Code: this is your responsibility when committing on behalf of the user. Check whether any of the above files are in the diff before committing. If they are, bump the cache version in the same commit.

## Key design decisions

- Three.js is loaded **lazily** on first AR tap (not on page load) to avoid blocking the menu.
- Thumbnails are loaded **staggered** (150 ms apart) via IntersectionObserver to prevent competing WebGL context inits.
- AR labels (name, price) are intentionally absent from all AR flows — AR is for immersive 3D viewing only.
- SW allows R2 assets to be cached by URL after first request. Tenant/menu/theme REST calls remain network-first.
