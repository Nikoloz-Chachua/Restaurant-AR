# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Burger Lions** — a WebAR restaurant menu app. Customers browse a 14-item menu with live 3D thumbnails, then place dishes in Augmented Reality before ordering. No build step; all AR libraries load from CDN.

## Development Commands

```bash
npm install      # Install the `serve` package (only dev dependency)
npm run dev      # Serve static files at http://localhost:3000
```

`npm run build` is a no-op — this is a pure static project.

## Architecture

### Pages

**`index.html`** — the full menu app. Loads `foods/menu.json`, renders 14 items across 5 categories (Burgers, Sides, Drinks, Desserts, Coffee) with lazy 3D thumbnails and a full 3D modal. AR button routing:

| Device | AR capability | Result |
|---|---|---|
| Android Chrome + ARCore | `webxr` detected | Three.js WebXR carousel — tap surface to place, swipe to cycle items |
| iOS Safari | `arkit` detected | Quick Look fires directly via a hidden pre-loaded `model-viewer` in index.html (`activateAR()`) — no page redirect |
| Android without WebXR | `none` | In-page 3D modal — button reads "VIEW IN 3D" |
| Desktop | `none` | In-page 3D modal — button reads "VIEW IN 3D" |

AR capability is cached in `localStorage` key `bl-ar-cap`. Theme and language are stored under `bl-theme` / `bl-lang`.

On iOS, both model files (`food.glb`, `Druidi.glb`) are pre-loaded into hidden launcher `model-viewer` elements on page load so `activateAR()` can fire synchronously from the tap gesture without losing the gesture context.

**`advanced-ar.html`** — standalone model-viewer AR page accessible at `?item=N` (global menu index). Not linked from `index.html`'s AR routing — it is an independent page. Has prev/next navigation through all 32 items, `ar-modes="webxr scene-viewer quick-look"`, and syncs EN/KA language and Day/Night theme via the same localStorage keys as index.html.

### Data

**`foods/menu.json`** — array of 14 items across 5 categories. Each item has: `name`, `name_ka`, `category`, `category_ka`, `description`, `description_ka`, `price`, `model` (filename of the GLB to load).

### 3D assets

- `food.glb` — generic food model (placeholder for most items)
- `Druidi.glb` — Druidi burger model (used for the Druidi item and as a second placeholder)

Both files are in the project root. AR sessions show no name/price labels — clean, immersive model-only view.

## Deployment rule — MUST follow every time

**Whenever any of these files change, bump `CACHE_NAME` in `sw.js` in the same commit:**

| File changed | Why |
|---|---|
| `index.html` | App code/UI updated |
| `foods/menu.json` | Menu items/prices changed |
| `food.glb` / `Druidi.glb` | 3D models replaced |
| Any new file served to the browser | Needs to enter the cache |

How to bump: open `sw.js`, change `'bl-v1'` → `'bl-v2'` (then v3, v4, …).

If you forget, users who visited before will keep seeing the old cached version until they hard-refresh. The service worker will NOT deliver your update automatically.

Claude Code: this is your responsibility when committing on behalf of the user. Check whether any of the above files are in the diff before committing. If they are, bump the cache version in the same commit.

## Key design decisions

- Three.js is loaded **lazily** on first AR tap (not on page load) to avoid blocking the menu.
- Thumbnails are loaded **staggered** (150 ms apart) via IntersectionObserver to prevent competing WebGL context inits.
- The WebXR carousel in index.html is **category-scoped** — only items in the same category as the tapped item appear in the carousel.
- `advanced-ar.html` navigates through **all 14 items** (simple prev/next), not category-scoped. It is not used by `index.html`'s AR routing — access it directly via URL if needed.
- AR labels (name, price) are intentionally absent from all AR flows — AR is for immersive 3D viewing only.
