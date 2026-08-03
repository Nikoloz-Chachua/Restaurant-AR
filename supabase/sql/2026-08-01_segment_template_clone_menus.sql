-- 2026-08-01_segment_template_clone_menus.sql
-- Clones Monday Greens -> Modern Cafe demo, and Mugsy -> Fast Casual demo.
-- ROLLBACK by default; run with --commit.
--
-- INDEPENDENT COPIES, not references. Every row inserted here is a new row
-- owned by the demo tenant, so editing the demo can never reach the client.
-- The sources are only ever read: there is no UPDATE or DELETE below that can
-- touch monday-greens or mugsy-main, and the DELETEs are pinned by slug to the
-- two demo tenants.
--
-- Nine items each, in the shape asked for: 3 with 3D models, 3 with a photo
-- only, 3 with neither. They are grouped so each category holds one kind —
-- the grid is align-items:start, so a short text card beside a tall photo card
-- leaves a hole under it.
--
-- site_name / site_name_ka are deliberately NOT copied. Everything else in
-- theme_config is, including the hero and logo URLs, because that is the
-- branding George wants to clear by hand from the admin panel. Copying the
-- client's NAME onto a page we email to prospects is the one part that should
-- not ship even temporarily, so it stays "Your Restaurant".

BEGIN;

DO $$
BEGIN
  IF (SELECT count(*) FROM restaurants WHERE slug IN ('cafe','fast-casual','monday-greens','mugsy-main')) <> 4 THEN
    RAISE EXCEPTION 'expected both demo tenants and both source tenants to exist';
  END IF;
END $$;

-- ── Clear the placeholder content from the two demo tenants ────────────────
-- Safe: these two were created by this branch and hold only generated demo
-- rows. Pinned by slug so it cannot reach a client tenant.
DELETE FROM menu_items WHERE restaurant_id IN
  (SELECT id FROM restaurants WHERE slug IN ('cafe','fast-casual'));
DELETE FROM categories WHERE restaurant_id IN
  (SELECT id FROM restaurants WHERE slug IN ('cafe','fast-casual'));

-- ── Theme tokens: copy the source look verbatim ────────────────────────────
INSERT INTO theme_config (restaurant_id, key, value)
SELECT (SELECT id FROM restaurants WHERE slug = 'cafe'), t.key, t.value
FROM theme_config t
WHERE t.restaurant_id = (SELECT id FROM restaurants WHERE slug = 'monday-greens')
  AND t.key NOT IN ('site_name', 'site_name_ka', 'template_key')
ON CONFLICT (restaurant_id, key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO theme_config (restaurant_id, key, value)
SELECT (SELECT id FROM restaurants WHERE slug = 'fast-casual'), t.key, t.value
FROM theme_config t
WHERE t.restaurant_id = (SELECT id FROM restaurants WHERE slug = 'mugsy-main')
  AND t.key NOT IN ('site_name', 'site_name_ka', 'template_key')
ON CONFLICT (restaurant_id, key) DO UPDATE SET value = EXCLUDED.value;

-- The demo keeps its OWN template key. This is what makes the copy
-- independent: the CSS that styles it is a duplicated block scoped to this
-- key, so a later tweak to the demo cannot repaint the client's site.
INSERT INTO theme_config (restaurant_id, key, value) VALUES
  ((SELECT id FROM restaurants WHERE slug = 'cafe'), 'template_key', 'modern_cafe'),
  ((SELECT id FROM restaurants WHERE slug = 'fast-casual'), 'template_key', 'premium_fast_casual')
ON CONFLICT (restaurant_id, key) DO UPDATE SET value = EXCLUDED.value;

-- ══ MODERN CAFE  <-  MONDAY GREENS ════════════════════════════════════════
INSERT INTO categories (restaurant_id, name_en, name_ka, sort_order)
SELECT (SELECT id FROM restaurants WHERE slug = 'cafe'), c.name_en, c.name_ka,
       CASE c.name_en WHEN 'Breakfast' THEN 1 WHEN 'Salads & Bowls' THEN 2 ELSE 3 END
FROM categories c
WHERE c.restaurant_id = (SELECT id FROM restaurants WHERE slug = 'monday-greens')
  AND c.name_en IN ('Breakfast', 'Salads & Bowls', 'Tea');

INSERT INTO menu_items
  (restaurant_id, category_id, name_en, name_ka, description_en, description_ka,
   price, price_old, model, model_usdz, thumbnail_url, is_3d, ar_scale, thumb_3d,
   text_only, featured, visible, sort_order, addons, variants)
SELECT
  (SELECT id FROM restaurants WHERE slug = 'cafe'),
  (SELECT id FROM categories d
     WHERE d.restaurant_id = (SELECT id FROM restaurants WHERE slug = 'cafe')
       AND d.name_en = sc.name_en),
  m.name_en, m.name_ka, m.description_en, m.description_ka,
  m.price, m.price_old, m.model, m.model_usdz, m.thumbnail_url,
  m.is_3d, m.ar_scale, m.thumb_3d, m.text_only,
  false, true,
  row_number() OVER (ORDER BY sc.name_en, m.name_en),
  m.addons, m.variants
FROM menu_items m
JOIN categories sc ON sc.id = m.category_id
WHERE m.restaurant_id = (SELECT id FROM restaurants WHERE slug = 'monday-greens')
  AND m.name_en IN (
    -- 3 with models
    'Benedict with Bacon and Cheese',
    'Chia Pudding with Fruits',
    'GAZPACHO',
    -- 3 with a photo only
    'Quinoa Salad',
    'Burrata Salad',
    'Chicken Caesar Salad',
    -- 3 with neither
    'peach tea',
    'strawberry tea',
    'mint tea'
  );

-- ══ FAST CASUAL  <-  MUGSY ════════════════════════════════════════════════
INSERT INTO categories (restaurant_id, name_en, name_ka, sort_order)
SELECT (SELECT id FROM restaurants WHERE slug = 'fast-casual'), c.name_en, c.name_ka, c.sort_order
FROM categories c
WHERE c.restaurant_id = (SELECT id FROM restaurants WHERE slug = 'mugsy-main')
  AND c.name_en IN ('Burgers', 'Sides & Fries', 'Drinks & Sauces');

INSERT INTO menu_items
  (restaurant_id, category_id, name_en, name_ka, description_en, description_ka,
   price, price_old, model, model_usdz, thumbnail_url, is_3d, ar_scale, thumb_3d,
   text_only, featured, visible, sort_order, addons, variants)
SELECT
  (SELECT id FROM restaurants WHERE slug = 'fast-casual'),
  (SELECT id FROM categories d
     WHERE d.restaurant_id = (SELECT id FROM restaurants WHERE slug = 'fast-casual')
       AND d.name_en = sc.name_en),
  m.name_en, m.name_ka, m.description_en, m.description_ka,
  m.price, m.price_old,
  -- Mugsy has exactly ONE 3D item (BigBurger), so two more model cards have to
  -- be sourced. Bacon Burger and Mugsys Signature get the shared BetaReal
  -- druidi burger — the same mesh BigBurger already uses, but served from our
  -- own bucket rather than Mugsy's, so the demo does not depend on a client
  -- path. All three are burgers, so the model is plausible on each.
  CASE WHEN m.name_en IN ('Bacon Burger', 'Mugsys Signature')
       THEN 'https://pub-3c68559de18f4aee94d127e180937bdd.r2.dev/druidi_balanced_30k_2k.glb'
       ELSE m.model END,
  CASE WHEN m.name_en IN ('Bacon Burger', 'Mugsys Signature')
       THEN 'https://pub-3c68559de18f4aee94d127e180937bdd.r2.dev/druidi_balanced_30k_2k.usdz'
       ELSE m.model_usdz END,
  -- Every Mugsy item ships with a photo, so the three "neither" cards are real
  -- Mugsy items with the thumbnail deliberately dropped.
  CASE WHEN m.name_en IN ('Pepsi 0.33L', 'Ketchup', 'Mugsy''s Sauce')
       THEN '' ELSE m.thumbnail_url END,
  CASE WHEN m.name_en IN ('Bacon Burger', 'Mugsys Signature') THEN true ELSE m.is_3d END,
  -- BigBurger is tuned to 1 on this mesh; match it on the two clones.
  CASE WHEN m.name_en IN ('Bacon Burger', 'Mugsys Signature') THEN 1 ELSE m.ar_scale END,
  m.thumb_3d,
  CASE WHEN m.name_en IN ('Pepsi 0.33L', 'Ketchup', 'Mugsy''s Sauce') THEN true ELSE m.text_only END,
  false, true,
  row_number() OVER (ORDER BY sc.sort_order, m.sort_order),
  m.addons, m.variants
FROM menu_items m
JOIN categories sc ON sc.id = m.category_id
WHERE m.restaurant_id = (SELECT id FROM restaurants WHERE slug = 'mugsy-main')
  AND m.name_en IN (
    'BigBurger', 'Bacon Burger', 'Mugsys Signature',
    'Fries', 'Fries with Bacon & Cheese Sauce', 'Chicken Popcorn 50pcs',
    'Pepsi 0.33L', 'Ketchup', 'Mugsy''s Sauce'
  );

-- ── Verify: 9 items each, split 3 / 3 / 3, and the sources untouched ───────
SELECT r.slug,
       count(*) AS items,
       count(*) FILTER (WHERE m.is_3d)                                AS with_model,
       count(*) FILTER (WHERE NOT m.is_3d AND m.thumbnail_url <> '')  AS photo_only,
       count(*) FILTER (WHERE NOT m.is_3d AND m.thumbnail_url =  '')  AS plain,
       (SELECT count(*) FROM categories c WHERE c.restaurant_id = r.id) AS cats
FROM restaurants r JOIN menu_items m ON m.restaurant_id = r.id
WHERE r.slug IN ('cafe', 'fast-casual', 'monday-greens', 'mugsy-main')
GROUP BY r.slug, r.id ORDER BY r.slug;

ROLLBACK;
