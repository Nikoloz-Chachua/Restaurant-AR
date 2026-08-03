-- AUREVANE / MINGLEYARD showcase finish (Unicode source).
-- Review-first safety: this transaction always ends in ROLLBACK.
BEGIN;

CREATE TEMP TABLE _protected_before ON COMMIT DROP AS
SELECT r.id, r.slug, r.brand_id, b.slug AS brand_slug,
       (SELECT count(*) FROM public.menu_items m WHERE m.restaurant_id = r.id) AS menu_count,
       (SELECT count(*) FROM public.categories c WHERE c.restaurant_id = r.id) AS category_count,
       (SELECT count(*) FROM public.theme_config t WHERE t.restaurant_id = r.id) AS theme_count
FROM public.restaurants r
JOIN public.brands b ON b.id = r.brand_id
WHERE r.id IN (53, 62);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.restaurants r JOIN public.brands b ON b.id = r.brand_id
    JOIN public.theme_config t ON t.restaurant_id = r.id AND t.key = 'template_key'
    WHERE r.id = 67 AND r.slug = 'luxury' AND r.brand_id = 61
      AND b.slug = 'luxury-dining-template' AND t.value = 'luxury_dining'
  ) THEN RAISE EXCEPTION 'AUREVANE identity assertion failed'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.restaurants r JOIN public.brands b ON b.id = r.brand_id
    JOIN public.theme_config t ON t.restaurant_id = r.id AND t.key = 'template_key'
    WHERE r.id = 70 AND r.slug = 'social-dining' AND r.brand_id = 64
      AND b.slug = 'social-dining-template' AND t.value = 'social_dining'
  ) THEN RAISE EXCEPTION 'MINGLEYARD identity assertion failed'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.restaurants r JOIN public.brands b ON b.id = r.brand_id WHERE r.id = 53 AND r.slug = 'b-main' AND r.brand_id = 46 AND b.slug = 'b')
     OR NOT EXISTS (SELECT 1 FROM public.restaurants r JOIN public.brands b ON b.id = r.brand_id WHERE r.id = 62 AND r.slug = 'pipes-burger-main' AND r.brand_id = 56 AND b.slug = 'pipes-burger')
  THEN RAISE EXCEPTION 'protected source tenant identity assertion failed'; END IF;
  IF (SELECT count(*) FROM _protected_before) <> 2 THEN RAISE EXCEPTION 'protected source snapshot failed'; END IF;
  IF (SELECT count(*) FROM public.menu_items WHERE restaurant_id = 70) <> 6
     OR (SELECT count(*) FROM public.menu_items WHERE restaurant_id = 70 AND is_3d) <> 3
  THEN RAISE EXCEPTION 'MINGLEYARD baseline must remain 6 total / 3 3D'; END IF;
  IF (SELECT count(*) FROM public.menu_items WHERE restaurant_id = 67 AND is_3d) <> 2
  THEN RAISE EXCEPTION 'AUREVANE baseline must contain exactly two 3D dishes'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.menu_items
    WHERE restaurant_id = 67
      AND name_en NOT IN ('Seared Salmon', 'Ember Steak', 'Pumpkin Risotto', 'Cocoa Garden')
      AND NOT is_3d
  ) THEN RAISE EXCEPTION 'AUREVANE has an unexpected non-3D dish; refusing to alter it'; END IF;
END $$;

INSERT INTO public.theme_config (restaurant_id, key, value) VALUES
  (67, 'hero_images', '["https://restaurant-ar.pages.dev/assets/showcase/aurevane/hero-wide.webp","https://restaurant-ar.pages.dev/assets/showcase/aurevane/hero-portrait.webp"]'),
  (67, 'hero_image_url', 'https://restaurant-ar.pages.dev/assets/showcase/aurevane/hero-wide.webp'),
  (67, 'info_kicker', 'Find AUREVANE'),
  (67, 'info_kicker_ka', 'იპოვეთ AUREVANE'),
  (67, 'info_title', '78A Vazha-Pshavela Avenue, Tbilisi 0186'),
  (67, 'info_title_ka', 'ვაჟა-ფშაველას გამზირი 78ა, თბილისი 0186'),
  (67, 'info_text', 'A fictional showcase dining room in Tbilisi. Use the map below to plan your route.'),
  (67, 'info_text_ka', 'გამოგონილი სადემონსტრაციო სივრცე თბილისში. მარშრუტის დასაგეგმად გამოიყენეთ ქვემოთ მოცემული რუკა.'),
  (67, 'info_directions_label', 'Get directions'),
  (67, 'info_directions_label_ka', 'მარშრუტის ნახვა'),
  (67, 'info_directions_url', 'https://www.google.com/maps/dir/?api=1&destination=41.723254266557774,44.730718867747115'),
  (67, 'info_map_query', '41.723254266557774,44.730718867747115'),
  (67, 'info_map_link', 'https://www.google.com/maps/dir/?api=1&destination=41.723254266557774,44.730718867747115'),
  (70, 'hero_images', '["https://restaurant-ar.pages.dev/assets/showcase/mingleyard/hero.webp"]'),
  (70, 'hero_image_url', 'https://restaurant-ar.pages.dev/assets/showcase/mingleyard/hero.webp'),
  (70, 'info_kicker', 'Find MINGLEYARD'),
  (70, 'info_kicker_ka', 'იპოვეთ MINGLEYARD'),
  (70, 'info_title', '78A Vazha-Pshavela Avenue, Tbilisi 0186'),
  (70, 'info_title_ka', 'ვაჟა-ფშაველას გამზირი 78ა, თბილისი 0186'),
  (70, 'info_text', 'A fictional showcase gathering place in Tbilisi. Use the map below to plan your route.'),
  (70, 'info_text_ka', 'გამოგონილი სადემონსტრაციო შეხვედრის ადგილი თბილისში. მარშრუტის დასაგეგმად გამოიყენეთ ქვემოთ მოცემული რუკა.'),
  (70, 'info_directions_label', 'Get directions'),
  (70, 'info_directions_label_ka', 'მარშრუტის ნახვა'),
  (70, 'info_directions_url', 'https://www.google.com/maps/dir/?api=1&destination=41.723254266557774,44.730718867747115'),
  (70, 'info_map_query', '41.723254266557774,44.730718867747115'),
  (70, 'info_map_link', 'https://www.google.com/maps/dir/?api=1&destination=41.723254266557774,44.730718867747115')
ON CONFLICT (restaurant_id, key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO public.categories (restaurant_id, name_en, name_ka, sort_order)
VALUES (67, 'Chef''s Selection', 'შეფის არჩევანი', 4)
ON CONFLICT (restaurant_id, name_en) DO UPDATE
SET name_ka = EXCLUDED.name_ka, sort_order = EXCLUDED.sort_order;

WITH chef_category AS (
  SELECT id FROM public.categories WHERE restaurant_id = 67 AND name_en = 'Chef''s Selection'
), dishes(name_en, name_ka, description_en, description_ka, price, thumbnail_url, sort_order) AS (VALUES
  ('Seared Salmon', 'შემწვარი ორაგული', 'Seared salmon with citrus butter, tender greens, and a bright herb finish.', 'შემწვარი ორაგული ციტრუსის კარაქით, ნაზი მწვანილით და არომატული ბალახებით.', '32 ₾', 'https://restaurant-ar.pages.dev/assets/showcase/aurevane/dishes/salmon.webp', 1),
  ('Ember Steak', 'ემბერ სტეიკი', 'Flame-seared steak with smoked shallot jus and crisp garden leaves.', 'ცეცხლზე შემწვარი სტეიკი შებოლილი შალოტის სოუსით და ხრაშუნა ბაღის ფოთლებით.', '38 ₾', 'https://restaurant-ar.pages.dev/assets/showcase/aurevane/dishes/steak.webp', 2),
  ('Pumpkin Risotto', 'გოგრის რიზოტო', 'Creamy pumpkin risotto with toasted seeds, sage, and aged cheese.', 'ნაღების გოგრის რიზოტო მოხალული თესლით, სალბით და დავარგებული ყველით.', '24 ₾', 'https://restaurant-ar.pages.dev/assets/showcase/aurevane/dishes/risotto.webp', 3),
  ('Cocoa Garden', 'კაკაოს ბაღი', 'Dark cocoa cream with orchard fruit, crisp cacao, and a delicate floral note.', 'შავი კაკაოს კრემი ბაღის ხილით, ხრაშუნა კაკაოთი და ნაზი ყვავილოვანი არომატით.', '18 ₾', 'https://restaurant-ar.pages.dev/assets/showcase/aurevane/dishes/dessert.webp', 4)
)
INSERT INTO public.menu_items
  (restaurant_id, category_id, name_en, name_ka, description_en, description_ka,
   price, model, model_usdz, thumbnail_url, is_3d, ar_scale, thumb_3d, text_only,
   featured, sort_order, visible)
SELECT 67, chef_category.id, d.name_en, d.name_ka, d.description_en, d.description_ka,
       d.price, '', '', d.thumbnail_url, false, 1, false, false, false, d.sort_order, true
FROM dishes d CROSS JOIN chef_category
ON CONFLICT (restaurant_id, name_en) DO UPDATE SET
  category_id = EXCLUDED.category_id, name_ka = EXCLUDED.name_ka,
  description_en = EXCLUDED.description_en, description_ka = EXCLUDED.description_ka,
  price = EXCLUDED.price, model = '', model_usdz = '', thumbnail_url = EXCLUDED.thumbnail_url,
  is_3d = false, ar_scale = 1, thumb_3d = false, text_only = false,
  featured = false, sort_order = EXCLUDED.sort_order, visible = true;

DO $$
BEGIN
  IF (SELECT count(*) FROM public.menu_items WHERE restaurant_id = 67) <> 6
     OR (SELECT count(*) FROM public.menu_items WHERE restaurant_id = 67 AND is_3d) <> 2
     OR (SELECT count(*) FROM public.menu_items WHERE restaurant_id = 67 AND NOT is_3d) <> 4
  THEN RAISE EXCEPTION 'AUREVANE validation failed: expected 6 total / 2 3D / 4 photo-only'; END IF;
  IF (SELECT count(*) FROM public.menu_items WHERE restaurant_id = 70) <> 6
     OR (SELECT count(*) FROM public.menu_items WHERE restaurant_id = 70 AND is_3d) <> 3
     OR (SELECT count(*) FROM public.menu_items WHERE restaurant_id = 70 AND NOT is_3d) <> 3
  THEN RAISE EXCEPTION 'MINGLEYARD validation failed: expected 6 total / 3 3D / 3 photo-only'; END IF;
  IF (SELECT count(*) FROM public.menu_items WHERE restaurant_id = 67 AND NOT is_3d
      AND model = '' AND model_usdz = '' AND thumbnail_url LIKE 'https://restaurant-ar.pages.dev/assets/showcase/aurevane/dishes/%.webp') <> 4
  THEN RAISE EXCEPTION 'AUREVANE photo-only asset validation failed'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.menu_items m JOIN public.categories c ON c.id = m.category_id
    WHERE m.restaurant_id IN (67, 70) AND c.restaurant_id <> m.restaurant_id
  ) THEN RAISE EXCEPTION 'cross-tenant category assignment detected'; END IF;
  IF EXISTS (
    SELECT 1 FROM _protected_before p
    FULL JOIN (
      SELECT r.id, r.slug, r.brand_id, b.slug AS brand_slug,
             (SELECT count(*) FROM public.menu_items m WHERE m.restaurant_id = r.id) AS menu_count,
             (SELECT count(*) FROM public.categories c WHERE c.restaurant_id = r.id) AS category_count,
             (SELECT count(*) FROM public.theme_config t WHERE t.restaurant_id = r.id) AS theme_count
      FROM public.restaurants r JOIN public.brands b ON b.id = r.brand_id WHERE r.id IN (53, 62)
    ) a USING (id, slug, brand_id, brand_slug, menu_count, category_count, theme_count)
    WHERE p.id IS NULL OR a.id IS NULL
  ) THEN RAISE EXCEPTION 'protected BAOMA/Pipes identity or counts changed'; END IF;
END $$;

SELECT restaurant_id, count(*) AS total,
       count(*) FILTER (WHERE is_3d) AS three_d,
       count(*) FILTER (WHERE NOT is_3d) AS photo_only
FROM public.menu_items WHERE restaurant_id IN (67, 70)
GROUP BY restaurant_id ORDER BY restaurant_id;

ROLLBACK;
