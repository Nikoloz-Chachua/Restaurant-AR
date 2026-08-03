-- 2026-08-03_fast_casual_debrand.sql
-- Strip Mugsy's identity from the Fast Casual demo tenant.
-- ROLLBACK by default; run with --commit.
--
-- The demo is sent cold to restaurants that are not our clients, so it has to
-- be a FICTIONAL restaurant rather than a copy of a real one. This removes the
-- three things the clone inherited that identify Mugsy:
--
--   logo_url         their logo mark
--   hero_image_url   their photograph of their room and their burger
--   mugsy_order_links / mugsy_locations   their live Wolt and Glovo pages and
--                    their two real street addresses
--
-- Clearing a key is not enough on its own: index.html falls back to Mugsy's
-- bundled assets so a half-configured CLIENT site still renders complete. The
-- accompanying code change makes premium_fast_casual fall back to nothing (for
-- assets), to invented addresses, and to delivery chips that render but do not
-- navigate. Both halves are required.
--
-- Deliberately NOT touched: menu_items. The dish photos are still Mugsy's and
-- are a separate pass.
--
-- Only ever touches the demo tenant; mugsy-main is not referenced.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM restaurants WHERE slug = 'fast-casual') THEN
    RAISE EXCEPTION 'fast-casual demo tenant not found';
  END IF;
END $$;

-- Delete rather than blank, so the code path sees "unset" and the CMS shows an
-- empty upload field instead of an empty string.
--
-- Matched on CONTENT, not on a hand-written key list. A first pass enumerated
-- keys and missed four: hero_images (a gallery of two more of their photos),
-- empty_copy, and the _ka variants of info_kicker and meta_description, which
-- name the restaurant in Georgian. On a demo tenant, any row that mentions them
-- or a delivery platform should go, whatever it is called.
DELETE FROM theme_config
WHERE restaurant_id = (SELECT id FROM restaurants WHERE slug = 'fast-casual')
  AND (
        key   ILIKE '%mugsy%'
     OR value ILIKE '%mugsy%'
     OR value ILIKE '%wolt%'
     OR value ILIKE '%glovo%'
     OR value ILIKE '%melikishvili%'
     OR value ILIKE '%pshavela%'
     OR key IN ('logo_url', 'hero_image_url', 'hero_image_url_day', 'hero_image_url_night',
                'hero_logo_url', 'hero_images',
                'info_title', 'info_text', 'info_kicker', 'info_kicker_ka',
                'info_map_query', 'info_map_link', 'venue_links',
                'meta_description', 'meta_description_ka',
                'empty_title', 'empty_copy')
  );

-- A fictional restaurant, not a placeholder: the page should read as a real
-- site for a place that does not exist.
INSERT INTO theme_config (restaurant_id, key, value) VALUES
  ((SELECT id FROM restaurants WHERE slug = 'fast-casual'), 'site_name', 'Restaurant'),
  ((SELECT id FROM restaurants WHERE slug = 'fast-casual'), 'site_name_ka', 'რესტორანი'),
  ((SELECT id FROM restaurants WHERE slug = 'fast-casual'), 'hero_kicker', 'Burgers in Tbilisi'),
  ((SELECT id FROM restaurants WHERE slug = 'fast-casual'), 'hero_kicker_ka', 'ბურგერები თბილისში'),
  ((SELECT id FROM restaurants WHERE slug = 'fast-casual'), 'hero_copy',
     'Burgers, boxes, sides and drinks — on an interactive BetaReal menu you can view in 3D and place on your own table.'),
  ((SELECT id FROM restaurants WHERE slug = 'fast-casual'), 'hero_copy_ka',
     'ბურგერები, ბოქსები, გარნირი და სასმელები — ინტერაქტიულ BetaReal-ის მენიუზე, სადაც კერძს 3D-ში ნახავთ და თქვენს მაგიდაზე განათავსებთ.'),
  ((SELECT id FROM restaurants WHERE slug = 'fast-casual'), 'hero_cta', 'See menu'),
  ((SELECT id FROM restaurants WHERE slug = 'fast-casual'), 'hero_cta_ka', 'მენიუს ნახვა')
ON CONFLICT (restaurant_id, key) DO UPDATE SET value = EXCLUDED.value;

-- Hard gate: refuse to commit if any trace survives.
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n
  FROM theme_config t
  WHERE t.restaurant_id = (SELECT id FROM restaurants WHERE slug = 'fast-casual')
    AND (t.key ILIKE '%mugsy%' OR t.value ILIKE '%mugsy%'
      OR t.value ILIKE '%wolt%' OR t.value ILIKE '%glovo%'
      OR t.value ILIKE '%melikishvili%' OR t.value ILIKE '%pshavela%');
  IF n > 0 THEN
    RAISE EXCEPTION 'de-branding incomplete: % theme_config row(s) still reference the source restaurant', n;
  END IF;
END $$;

-- Verify: nothing left on this tenant may mention Mugsy or point at a
-- delivery/maps URL, and the source tenant must be untouched.
SELECT r.slug,
       count(*) FILTER (WHERE t.value ILIKE '%mugsy%' OR t.key ILIKE '%mugsy%')        AS mentions_mugsy,
       count(*) FILTER (WHERE t.value ILIKE '%wolt%' OR t.value ILIKE '%glovo%')       AS delivery_urls,
       count(*) FILTER (WHERE t.value ILIKE '%melikishvili%' OR t.value ILIKE '%pshavela%') AS real_addresses,
       max(CASE WHEN t.key = 'site_name' THEN t.value END)                             AS site_name,
       count(*)                                                                        AS rows
FROM restaurants r JOIN theme_config t ON t.restaurant_id = r.id
WHERE r.slug IN ('fast-casual', 'mugsy-main')
GROUP BY r.slug ORDER BY r.slug;

ROLLBACK;
