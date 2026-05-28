# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Burger Lions** — a WebAR restaurant menu app. Customers browse a 16-item menu with live 3D thumbnails, then place dishes in Augmented Reality before ordering. No build step; all AR libraries load from CDN.

## Development Commands

```bash
npm install      # Install the `serve` package (only dev dependency)
npm run dev      # Serve static files at http://localhost:3000
```

`npm run build` is a no-op — this is a pure static project.

## Architecture

### Pages

**`index.html`** — the full menu app. Fetches live menu data from Supabase (`menu_items` + `categories` tables) as primary source, falls back to `foods/menu.json` only if Supabase is unreachable. Renders items across 5 categories (Burgers, Sides, Drinks, Desserts, Coffee) with lazy 3D thumbnails and a full 3D modal. AR button routing:

| Device | AR capability | Result |
|---|---|---|
| Android Chrome + ARCore | `webxr` detected | Three.js WebXR carousel — tap surface to place, swipe to cycle items |
| iOS Safari | `arkit` detected | Quick Look fires directly via a hidden pre-loaded `model-viewer` in index.html (`activateAR()`) — no page redirect |
| Android without WebXR | `none` | In-page 3D modal — button reads "VIEW IN 3D" |
| Desktop | `none` | In-page 3D modal — button reads "VIEW IN 3D" |

AR capability is cached in `localStorage` key `bl-ar-cap`. Theme and language are stored under `bl-theme` / `bl-lang`.

On iOS, both model files (`food.glb`, `Druidi.glb`) are pre-loaded into hidden launcher `model-viewer` elements on page load so `activateAR()` can fire synchronously from the tap gesture without losing the gesture context.

### Data

**Primary source**: Supabase `menu_items` table (joined with `categories`). Admin changes in the Next.js admin panel immediately reflect on the live menu for new visitors (SW does not cache Supabase REST responses).

**`foods/menu.json`** — fallback only, used when Supabase is unreachable. Keep it roughly in sync but it is not the live source of truth.

### 3D assets

- `food.glb` — generic food model (local, pre-cached by SW)
- `Druidi.glb` — Druidi burger model (local, pre-cached by SW)
- Supabase Storage `models` bucket — custom per-item GLBs uploaded via admin panel. These are pre-cached by the SW at install time by fetching the model URL list from the DB.

All GLB files are served from either the project root or Supabase Storage public CDN. AR sessions show no name/price labels — clean, immersive model-only view.

### WebXR carousel

The carousel shows **all menu items** (full `menuItems` list), not category-scoped. Users can cycle through every item in AR.

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

Note: Supabase REST API calls (menu data, theme) are **never cached** by the SW — they always go to the network so admin changes are immediately visible. Only Supabase Storage GLBs (stable URLs) are cached.

Claude Code: this is your responsibility when committing on behalf of the user. Check whether any of the above files are in the diff before committing. If they are, bump the cache version in the same commit.

## Key design decisions

- Three.js is loaded **lazily** on first AR tap (not on page load) to avoid blocking the menu.
- Thumbnails are loaded **staggered** (150 ms apart) via IntersectionObserver to prevent competing WebGL context inits.
- AR labels (name, price) are intentionally absent from all AR flows — AR is for immersive 3D viewing only.
- SW pre-caches Supabase Storage GLBs at install time by calling the Supabase REST API with the anon key.
