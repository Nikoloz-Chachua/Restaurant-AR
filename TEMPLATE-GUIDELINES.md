# TEMPLATE-GUIDELINES.md — How to build a menu template that plugs into the BetaReal CMS

> **Audience:** anyone (teammate or AI) creating a new customer-facing menu look for
> BetaReal+. **Goal:** a template a super-admin can assign to any tenant from the CMS,
> that recolors and rebrands itself from the database — **without touching code per
> client.**
>
> Read alongside [`MULTITENANCY.md`](MULTITENANCY.md) (schema + RLS),
> [`PLATFORM-SPEC.md`](PLATFORM-SPEC.md) (platform build), and
> [`CLAUDE.md`](CLAUDE.md) (deploy + cache rules).

---

## 1. What a "template" is here (read this first)

A template is **not a separate HTML file per restaurant.** There is **one shared
customer app** (`index.html`) served to every tenant. A template is:

1. A **`template_key`** (e.g. `warm_gold`, `fresh_glass`, `monday_greens`).
2. A **set of theme tokens** (colors, fonts, background images, card styles…) stored
   in the tenant's `theme_config` rows and applied as CSS variables at runtime.
3. Optionally, **structural CSS** in `index.html` scoped by
   `[data-template="<key>"]` for layout differences a token can't express.

At load, the app resolves the tenant (by hostname), reads its `theme_config` +
`brands` row, sets `data-template` on `<html>`, and paints the CSS variables. Same
code, different look. **A new template = a new preset object + (optional) scoped CSS,
never a new deploy.**

Presets live in **`admin-app/lib/themePresets.ts`**. Study `warm_gold` there as the
reference implementation before writing a new one.

---

## 2. The data contract a template may rely on

A template renders **only** from these sources. Do not hardcode restaurant-specific
content.

| Source | Table / field | Notes |
|---|---|---|
| Menu items | `menu_items` (`restaurant_id`-scoped) | bilingual `name_en/name_ka`, `description_*`, `price` (free text), `category_id`, `model`, `model_usdz`, `thumbnail_url`, `thumb_3d`, `ar_scale`, `visible`, `sort_order`, **`is_3d`** |
| Categories | `categories` | bilingual, `sort_order` |
| Look / branding | `theme_config` (key/value, `restaurant_id`-scoped) | all visual tokens (see §3) + `site_name`, `site_name_ka` |
| Brand identity | `brands` | `name`, `slug`, `plan`, **`logo_url`**, `primary_color`, `secondary_color` |
| 3D / images | Cloudflare **R2** | GLB/USDZ/WebP, keyed `<slug>/…`. Never Supabase Storage. |

**Hard rules the template must honor:**

- **Respect `is_3d`.** An item with `is_3d === false` (or no `model`) must render as a
  **plain photo/text card**: no 3D badge, no live-3D thumbnail, no "VIEW ON TABLE" /
  AR button, no 3D modal. Only items with `is_3d && model` get 3D/AR affordances.
- **No client model uploads.** GLB/USDZ come from us (super-admin). Never build an
  owner-facing model-upload path. Item photo thumbnails (WebP) are fine.
- **Bilingual.** Every label reads `_ka` when language is Georgian, English otherwise.
  Never bake in one restaurant's words.
- **Heavy assets from R2 only** (free egress). No `supabase.co/storage` URLs.
- **AR sessions show no name/price labels** — model-only, immersive (house style).

---

## 3. The theme-token vocabulary (what you can customize per tenant)

Tokens are `theme_config` keys. Each visual token has a `night_` and `day_` variant
(dark/light modes). A template preset supplies defaults for all of them; the CMS lets
a super-admin/owner override the highlighted ones per tenant.

**Palette (per mode):** `*_bg`, `*_bg2`, `*_card`, `*_card2`, `*_border`, `*_text`,
`*_dim`, `*_accent`, `*_accent2`, `*_accent_text`, `*_thumb_bg`, `*_modal_bg`,
`*_glow`, `*_glow2`, `*_shadow`.

**Surface / mood (per mode):** `*_bg_image`, `*_bg_size`, `*_bg_repeat`,
`*_card_bg`, `*_card_radius`, `*_card_blur`, `*_stage_bg`, `*_pill_bg`,
`*_pill_active_bg`, `*_cta_bg`, `*_cta_shadow`, `*_hero_color`, `*_hero_shadow`,
`*_divider_bg`, `*_accent_edge`, `*_thumb_vignette`, `*_item_shadow`,
`*_item_hover_shadow`, `*_modal_bg_image`.

**Typography:** `font_body`, `font_heading` (Google Font family names).

**Identity / structure:** `template_key`, `site_name`, `site_name_ka`,
`hero_image_url` *(background/hero art — see §4)*, and `brands.logo_url` for the logo.

> **Customer-editable via the CMS theme editor** (the fields the user asked to expose):
> **primary color, secondary color, logo, hero image, site name, fonts.** Everything
> else derives from the preset. `themePresetValuesWithAccents()` in `themePresets.ts`
> already regenerates gradients/borders/CTAs from primary+secondary — reuse it so a
> color change stays visually coherent instead of clashing.

---

## 4. Media fields: logo + hero image

- **Logo** → `brands.logo_url` (one per brand, shared across branches). The template
  renders it in the header; fall back to `site_name` text if empty.
- **Hero image** → a `theme_config` key (`hero_image_url`, optionally
  `hero_image_url_day`/`_night`). The template uses it as the hero/background art;
  fall back to the token-driven gradient background if empty.
- **Hero video** → `hero_video_url` (wide 16:9 cut), optionally
  `hero_video_mobile_url` (a squarer cut used below 640px, where `cover` throws away
  most of a wide frame) and `hero_video_poster_url` (the still; defaults to the first
  `hero_images` photo). A muted, looping clip layered over the poster inside the same
  `.mg-hero` band, so **no per-template CSS is needed** — a template that art-directs
  the photo hero gets the video for free.
- All are uploaded to **R2** through `/api/r2-presign` (WebP for images, MP4 for video)
  and stored as their public R2 URL. The presign route auto-prefixes the tenant slug.
  Video, like GLB/USDZ, is **super-admin only**: a photo the browser re-encodes to WebP
  can only get smaller, but nothing in the browser trims a clip straight off a phone.

A template **must** degrade gracefully when logo/hero are unset (new tenants start
empty) — show the gradient background and the text site name.

The hero video is deliberately never on the critical path, and a new template gets
that behaviour without doing anything: the band paints from the poster on the first
frame, and the clip is attached on idle afterwards. It is skipped entirely — poster
kept, nothing fetched — on Data Saver, on 2G, and under `prefers-reduced-motion`.
A configured clip also suppresses the `hero_images` crossfade, since two fades on one
band is a flicker. Budget: roughly 10 s, no audio, ~1 MB. `sw.js` deliberately lets
video bypass the Cache API — a byte-range request answered with a full 200 will not
play in Safari, and a 206 cannot be cached at all.

---

## 5. How to add a new template (step by step)

1. **Pick a `key`** (snake_case, e.g. `monday_greens`). Add it to `StarterTemplateKey`.
2. **Author the visual tokens** in `TEMPLATE_VISUAL_TOKENS[key]` (surface/mood tokens)
   and the palette + `template_key` in a new `TEMPLATE_PRESETS` entry. Set a sensible
   `primaryColor` / `secondaryColor`, `font_body`, `font_heading`, `label`,
   `description`.
3. **Only if the layout differs** from the base (spacing, hero shape, card grid), add
   scoped CSS in `index.html` under `[data-template="<key>"] …`. Keep it additive; the
   base template must still work if your block is removed.
4. **Confirm recolorability:** run the preset through
   `themePresetValuesWithAccents(preset, primary, secondary)` mentally — changing the
   two accent colors should not break contrast. Test dark + light.
5. **Wire it into the CMS:** the create-tenant wizard + theme editor read
   `TEMPLATE_PRESETS`, so a new entry appears automatically as a selectable template.
6. **Bump `CACHE_NAME` in `sw.js`** in the same commit if you touched `index.html`
   (see `CLAUDE.md`).

---

## 6. Non-negotiables (so it stays "one codebase, many tenants")

- ❌ No per-restaurant HTML files, no hardcoded names/prices/logos/colors.
- ❌ No build step in the customer app; AR libs load lazily from CDN on first AR tap.
- ✅ Everything visual comes from `theme_config` / `brands`; everything content comes
  from `menu_items` / `categories`.
- ✅ Works on modern Android (WebXR), iOS (Quick Look via USDZ), desktop (3D modal).
- ✅ Fast first paint: static poster thumbnails first, live 3D upgraded on interaction.
- ✅ Honors `is_3d`, plan item limits, and the no-client-model-upload rule.

---

## 7. "Is my template CMS-ready?" checklist

- [ ] Renders correctly for a tenant with **zero** items (empty menu) and with items
      that mix 3D and non-3D.
- [ ] Logo empty → text fallback; hero empty → gradient fallback.
- [ ] Dark + light both legible; contrast holds after a primary/secondary color swap.
- [ ] No restaurant-specific string, color, or asset hardcoded anywhere.
- [ ] Non-3D items show no 3D/AR affordance; 3D items show badge + AR button.
- [ ] All images/models load from R2 URLs.
- [ ] Appears as a selectable template in the create-tenant wizard + theme editor.
- [ ] `CACHE_NAME` bumped if `index.html`/`sw.js` changed.

---

*Keep this file updated when the token vocabulary or the theme editor changes.*
