-- Food & Market meeting sample menu (Unicode source).
-- User-supplied screenshots and burrata photo, 2026-08-26.
-- Review-first safety: this checked-in transaction always ends in ROLLBACK.
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.restaurants r
    JOIN public.brands b ON b.id = r.brand_id
    WHERE r.id = 73
      AND r.slug = 'food-market-main'
      AND r.brand_id = 67
      AND b.slug = 'food-market'
      AND b.name = 'Food & Market'
  ) THEN
    RAISE EXCEPTION 'Food & Market identity assertion failed; refusing to mutate data';
  END IF;
END $$;

-- Replace only this new tenant's empty/sample menu. Safe to rerun.
DELETE FROM public.menu_items WHERE restaurant_id = 73;
DELETE FROM public.categories WHERE restaurant_id = 73;

INSERT INTO public.categories (restaurant_id, name_en, name_ka, name_ru, sort_order) VALUES
  (73, 'Salads',   U&'\10E1\10D0\10DA\10D0\10D7\10D4\10D1\10D8',        U&'\0421\0430\043B\0430\0442\044B', 1),
  (73, 'Starters', U&'\10E1\10E2\10D0\10E0\10E2\10D4\10E0\10D4\10D1\10D8',      U&'\0417\0430\043A\0443\0441\043A\0438', 2),
  (73, 'Pizza',    U&'\10DE\10D8\10EA\10D0',            U&'\041F\0438\0446\0446\0430', 3),
  (73, 'Burgers',  U&'\10D1\10E3\10E0\10D2\10D4\10E0\10D4\10D1\10D8',       U&'\0411\0443\0440\0433\0435\0440\044B', 4),
  (73, 'Sushi',    U&'\10E1\10E3\10E8\10D8',            U&'\0421\0443\0448\0438', 5),
  (73, 'Wine',     U&'\10E6\10D5\10D8\10DC\10DD',           U&'\0412\0438\043D\043E', 6);

WITH dishes(category_en, name_en, name_ka, name_ru, description_en, description_ka, description_ru, price, thumbnail_url, sort_order) AS (VALUES
  ('Salads', 'Burrata Salad', U&'\10D1\10E3\10E0\10D0\10E2\10D0\10E1 \10E1\10D0\10DA\10D0\10D7\10D0', U&'\0421\0430\043B\0430\0442 \0441 \0431\0443\0440\0440\0430\0442\043E\0439',
   'Burrata salad prepared in the Food & Market style.', U&'\10D1\10E3\10E0\10D0\10E2\10D0\10E1 \10E1\10D0\10DA\10D0\10D7\10D0 Food & Market-\10D8\10E1 \10E1\10E2\10D8\10DA\10E8\10D8.', U&'\0421\0430\043B\0430\0442 \0441 \0431\0443\0440\0440\0430\0442\043E\0439 \0432 \0441\0442\0438\043B\0435 Food & Market.',
   'GEL 29.00', 'https://restaurant-ar.pages.dev/assets/food-market/items/burrata-salad.webp', 1),

  ('Starters', 'Elarji Balls with Bazhe Sauce', U&'\10D4\10DA\10D0\10E0\10EF\10D8\10E1 \10D1\10E3\10E0\10D7\10D4\10D1\10D8 \10D1\10D0\10DF\10D4\10E1 \10E1\10DD\10E3\10E1\10E8\10D8', U&'\0428\0430\0440\0438\043A\0438 \044D\043B\0430\0440\0434\0436\0438 \0441 \0441\043E\0443\0441\043E\043C \0431\0430\0436\0435',
   'Elarji balls served with Georgian walnut bazhe sauce.', U&'\10D4\10DA\10D0\10E0\10EF\10D8\10E1 \10D1\10E3\10E0\10D7\10D4\10D1\10D8 \10D1\10D0\10DF\10D4\10E1 \10E1\10DD\10E3\10E1\10D8\10D7.', U&'\0428\0430\0440\0438\043A\0438 \044D\043B\0430\0440\0434\0436\0438 \0441 \0433\0440\0443\0437\0438\043D\0441\043A\0438\043C \043E\0440\0435\0445\043E\0432\044B\043C \0441\043E\0443\0441\043E\043C \0431\0430\0436\0435.',
   'GEL 35.00', 'https://restaurant-ar.pages.dev/assets/food-market/items/cornmeal-balls.webp', 1),
  ('Starters', 'Chicken Balls in Shkmeruli Sauce', U&'\10E5\10D0\10D7\10DB\10D8\10E1 \10D1\10E3\10E0\10D7\10D4\10D1\10D8 \10E8\10E5\10DB\10D4\10E0\10E3\10DA \10E1\10DD\10E3\10E1\10E8\10D8', U&'\041A\0443\0440\0438\043D\044B\0435 \0448\0430\0440\0438\043A\0438 \0432 \0441\043E\0443\0441\0435 \0448\043A\043C\0435\0440\0443\043B\0438',
   'Chicken balls served in Shkmeruli sauce.', U&'\10E5\10D0\10D7\10DB\10D8\10E1 \10D1\10E3\10E0\10D7\10D4\10D1\10D8 \10E8\10E5\10DB\10D4\10E0\10E3\10DA \10E1\10DD\10E3\10E1\10E8\10D8.', U&'\041A\0443\0440\0438\043D\044B\0435 \0448\0430\0440\0438\043A\0438 \0432 \0441\043E\0443\0441\0435 \0448\043A\043C\0435\0440\0443\043B\0438.',
   'GEL 35.00', 'https://restaurant-ar.pages.dev/assets/food-market/items/chicken-balls.webp', 2),

  ('Pizza', 'Pepperoni', U&'\10DE\10D4\10DE\10D4\10E0\10DD\10DC\10D8', U&'\041F\0435\043F\043F\0435\0440\043E\043D\0438',
   'Tomato sauce, mozzarella, and pepperoni.', U&'\10E2\10DD\10DB\10D0\10E2\10D8\10E1 \10E1\10DD\10E3\10E1\10D8, \10DB\10DD\10EA\10D0\10E0\10D4\10DA\10D0 \10D3\10D0 \10DE\10D4\10DE\10D4\10E0\10DD\10DC\10D8.', U&'\0422\043E\043C\0430\0442\043D\044B\0439 \0441\043E\0443\0441, \043C\043E\0446\0430\0440\0435\043B\043B\0430 \0438 \043F\0435\043F\043F\0435\0440\043E\043D\0438.',
   'GEL 42.50', 'https://restaurant-ar.pages.dev/assets/food-market/items/pepperoni-pizza.webp', 1),
  ('Pizza', 'Chef Pizza', U&'\10DE\10D8\10EA\10D0 \10E8\10D4\10E4\10D8', U&'\041F\0438\0446\0446\0430 \043E\0442 \0448\0435\0444\0430',
   'Cream sauce, ham, mushrooms, and mozzarella.', U&'\10DC\10D0\10E6\10D4\10D1\10D8\10E1 \10E1\10DD\10E3\10E1\10D8, \10DA\10DD\10E0\10D8, \10E1\10DD\10D9\10DD \10D3\10D0 \10DB\10DD\10EA\10D0\10E0\10D4\10DA\10D0.', U&'\0421\043B\0438\0432\043E\0447\043D\044B\0439 \0441\043E\0443\0441, \0432\0435\0442\0447\0438\043D\0430, \0433\0440\0438\0431\044B \0438 \043C\043E\0446\0430\0440\0435\043B\043B\0430.',
   'GEL 41.25', 'https://restaurant-ar.pages.dev/assets/food-market/items/chef-pizza.webp', 2),

  ('Burgers', 'Smash Burger', U&'\10E1\10DB\10D4\10E8 \10D1\10E3\10E0\10D2\10D4\10E0\10D8', U&'\0421\043C\044D\0448-\0431\0443\0440\0433\0435\0440',
   U&'Burger bun, Angus beef, jalape\00F1o, cheese sauce, pickles, onion, lettuce, and tomato.', U&'\10D1\10E3\10E0\10D2\10D4\10E0\10D8\10E1 \10DE\10E3\10E0\10D8, \10D0\10DC\10D2\10E3\10E1\10D8\10E1 \10EE\10DD\10E0\10EA\10D8, \10F0\10D0\10DA\10D0\10DE\10D4\10DC\10D8\10DD, \10E7\10D5\10D4\10DA\10D8\10E1 \10E1\10DD\10E3\10E1\10D8, \10D9\10D8\10E2\10E0\10D8\10E1 \10DB\10D0\10E0\10D8\10DC\10D0\10D3\10D8, \10EE\10D0\10EE\10D5\10D8, \10E1\10D0\10DA\10D0\10D7\10D8\10E1 \10E4\10DD\10D7\10DD\10DA\10D8 \10D3\10D0 \10DE\10DD\10DB\10D8\10D3\10DD\10E0\10D8.', U&'\0411\0443\043B\043E\0447\043A\0430, \0433\043E\0432\044F\0434\0438\043D\0430 Angus, \0445\0430\043B\0430\043F\0435\043D\044C\043E, \0441\044B\0440\043D\044B\0439 \0441\043E\0443\0441, \043C\0430\0440\0438\043D\043E\0432\0430\043D\043D\044B\0439 \043E\0433\0443\0440\0435\0446, \043B\0443\043A, \0441\0430\043B\0430\0442 \0438 \0442\043E\043C\0430\0442.',
   'GEL 46.25', 'https://restaurant-ar.pages.dev/assets/food-market/items/sammy-burger.webp', 1),
  ('Burgers', 'Chef Burger', U&'\10E8\10D4\10E4 \10D1\10E3\10E0\10D2\10D4\10E0\10D8', U&'\0411\0443\0440\0433\0435\0440 \043E\0442 \0448\0435\0444\0430',
   U&'Beef cutlet, bacon, jalape\00F1o, iceberg, tomato, onion, fries, and house sauce.', U&'\10E1\10D0\10E5\10DD\10DC\10DA\10D8\10E1 \10D9\10D0\10E2\10DA\10D4\10E2\10D8, \10D1\10D4\10D9\10DD\10DC\10D8, \10F0\10D0\10DA\10D0\10DE\10D4\10DC\10D8\10DD, \10D0\10D8\10E1\10D1\10D4\10E0\10D2\10D8, \10DE\10DD\10DB\10D8\10D3\10DD\10E0\10D8, \10EE\10D0\10EE\10D5\10D8, \10D9\10D0\10E0\10E2\10DD\10E4\10D8\10DA\10D8 \10E4\10E0\10D8 \10D3\10D0 \10E1\10D0\10E4\10D8\10E0\10DB\10DD \10E1\10DD\10E3\10E1\10D8.', U&'\0413\043E\0432\044F\0436\044C\044F \043A\043E\0442\043B\0435\0442\0430, \0431\0435\043A\043E\043D, \0445\0430\043B\0430\043F\0435\043D\044C\043E, \0430\0439\0441\0431\0435\0440\0433, \0442\043E\043C\0430\0442, \043B\0443\043A, \043A\0430\0440\0442\043E\0444\0435\043B\044C \0444\0440\0438 \0438 \0444\0438\0440\043C\0435\043D\043D\044B\0439 \0441\043E\0443\0441.',
   'GEL 48.75', 'https://restaurant-ar.pages.dev/assets/food-market/items/chef-burger.webp', 2),

  ('Sushi', 'Shrimp Maki', U&'\10D9\10E0\10D4\10D5\10D4\10E2\10D8\10E1 \10DB\10D0\10D9\10D8', U&'\041C\0430\043A\0438 \0441 \043A\0440\0435\0432\0435\0442\043A\043E\0439',
   'Nori, shrimp, rice, cream cheese, wasabi, pickled ginger, and tosazu sauce.', U&'\10DC\10DD\10E0\10D8, \10D9\10E0\10D4\10D5\10D4\10E2\10D8, \10D1\10E0\10D8\10DC\10EF\10D8, \10D9\10E0\10D4\10DB-\10E7\10D5\10D4\10DA\10D8, \10D5\10D0\10E1\10D0\10D1\10D8, \10EF\10D8\10DC\10EF\10D4\10E0\10D8\10E1 \10DB\10D0\10E0\10D8\10DC\10D0\10D3\10D8 \10D3\10D0 \10E2\10DD\10E1\10D0\10E1 \10E1\10DD\10E3\10E1\10D8.', U&'\041D\043E\0440\0438, \043A\0440\0435\0432\0435\0442\043A\0430, \0440\0438\0441, \0441\043B\0438\0432\043E\0447\043D\044B\0439 \0441\044B\0440, \0432\0430\0441\0430\0431\0438, \043C\0430\0440\0438\043D\043E\0432\0430\043D\043D\044B\0439 \0438\043C\0431\0438\0440\044C \0438 \0441\043E\0443\0441 \0442\043E\0441\0430\0434\0437\0443.',
   'GEL 26.25', 'https://restaurant-ar.pages.dev/assets/food-market/items/crab-maki.webp', 1),
  ('Sushi', 'Salmon Futomaki', U&'\10E4\10E3\10E2\10DD\10DB\10D0\10D9\10D8 \10DD\10E0\10D0\10D2\10E3\10DA\10D8', U&'\0424\0443\0442\043E\043C\0430\043A\0438 \0441 \043B\043E\0441\043E\0441\0435\043C',
   'Nori, cucumber, salmon, cream cheese, tobiko, ginger, wasabi, and soy sauce.', U&'\10DC\10DD\10E0\10D8, \10D9\10D8\10E2\10E0\10D8, \10DD\10E0\10D0\10D2\10E3\10DA\10D8, \10D9\10E0\10D4\10DB-\10E7\10D5\10D4\10DA\10D8, \10E2\10DD\10D1\10D8\10D9\10DD, \10EF\10D0\10DC\10EF\10D0\10E4\10D8\10DA\10D8, \10D5\10D0\10E1\10D0\10D1\10D8 \10D3\10D0 \10E1\10DD\10D8\10DD\10E1 \10E1\10DD\10E3\10E1\10D8.', U&'\041D\043E\0440\0438, \043E\0433\0443\0440\0435\0446, \043B\043E\0441\043E\0441\044C, \0441\043B\0438\0432\043E\0447\043D\044B\0439 \0441\044B\0440, \0442\043E\0431\0438\043A\043E, \0438\043C\0431\0438\0440\044C, \0432\0430\0441\0430\0431\0438 \0438 \0441\043E\0435\0432\044B\0439 \0441\043E\0443\0441.',
   'GEL 41.25', 'https://restaurant-ar.pages.dev/assets/food-market/items/salmon-futomaki.webp', 2),

  ('Wine', 'Danieli, Saperavi', U&'\10D3\10D0\10DC\10D8\10D4\10DA\10D8, \10E1\10D0\10E4\10D4\10E0\10D0\10D5\10D8', U&'\0414\0430\043D\0438\0435\043B\0438, \0421\0430\043F\0435\0440\0430\0432\0438',
   'Georgian red wine.', U&'\10E5\10D0\10E0\10D7\10E3\10DA\10D8 \10EC\10D8\10D7\10D4\10DA\10D8 \10E6\10D5\10D8\10DC\10DD.', U&'\0413\0440\0443\0437\0438\043D\0441\043A\043E\0435 \043A\0440\0430\0441\043D\043E\0435 \0432\0438\043D\043E.',
   'GEL 64.75', 'https://restaurant-ar.pages.dev/assets/food-market/items/saperavi-wine.webp', 1),
  ('Wine', U&'Chelti, Saperavi Ros\00E9', U&'\10E9\10D4\10DA\10D7\10D8, \10E1\10D0\10E4\10D4\10E0\10D0\10D5\10D8 \10E0\10DD\10D6\10D4', U&'\0427\0435\043B\0442\0438, \0421\0430\043F\0435\0440\0430\0432\0438 \0420\043E\0437\0435',
   U&'Georgian ros\00E9 wine.', U&'\10E5\10D0\10E0\10D7\10E3\10DA\10D8 \10D5\10D0\10E0\10D3\10D8\10E1\10E4\10D4\10E0\10D8 \10E6\10D5\10D8\10DC\10DD.', U&'\0413\0440\0443\0437\0438\043D\0441\043A\043E\0435 \0440\043E\0437\043E\0432\043E\0435 \0432\0438\043D\043E.',
   'GEL 34.75', 'https://restaurant-ar.pages.dev/assets/food-market/items/saperavi-rose.webp', 2),
  ('Wine', 'Shavkapito Zedashe', U&'\10E8\10D0\10D5\10D9\10D0\10DE\10D8\10E2\10DD \10D6\10D4\10D3\10D0\10E8\10D4', U&'\0428\0430\0432\043A\0430\043F\0438\0442\043E \0417\0435\0434\0430\0448\0435',
   'Georgian red wine.', U&'\10E5\10D0\10E0\10D7\10E3\10DA\10D8 \10EC\10D8\10D7\10D4\10DA\10D8 \10E6\10D5\10D8\10DC\10DD.', U&'\0413\0440\0443\0437\0438\043D\0441\043A\043E\0435 \043A\0440\0430\0441\043D\043E\0435 \0432\0438\043D\043E.',
   'GEL 54.00', 'https://restaurant-ar.pages.dev/assets/food-market/items/shavkapito-zedashe.webp', 3)
)
INSERT INTO public.menu_items (
  restaurant_id, category_id,
  name_en, name_ka, name_ru,
  description_en, description_ka, description_ru,
  price, model, model_usdz, thumbnail_url,
  is_3d, ar_scale, thumb_3d, text_only, featured, sort_order, visible
)
SELECT
  73, c.id,
  d.name_en, d.name_ka, d.name_ru,
  d.description_en, d.description_ka, d.description_ru,
  d.price, '', '', d.thumbnail_url,
  false, 1, false, false, d.name_en = 'Burrata Salad', d.sort_order, true
FROM dishes d
JOIN public.categories c
  ON c.restaurant_id = 73 AND c.name_en = d.category_en;

DO $$
BEGIN
  IF (SELECT count(*) FROM public.categories WHERE restaurant_id = 73) <> 6 THEN
    RAISE EXCEPTION 'Food & Market validation failed: expected 6 categories';
  END IF;
  IF (SELECT count(*) FROM public.menu_items WHERE restaurant_id = 73) <> 12 THEN
    RAISE EXCEPTION 'Food & Market validation failed: expected 12 items';
  END IF;
  IF (SELECT count(*) FROM public.menu_items WHERE restaurant_id = 73 AND is_3d) <> 0 THEN
    RAISE EXCEPTION 'Food & Market validation failed: models must remain disabled until real GLB/USDZ files are uploaded';
  END IF;
  IF (SELECT count(*) FROM public.menu_items WHERE restaurant_id = 73 AND thumbnail_url LIKE 'https://restaurant-ar.pages.dev/assets/food-market/items/%.webp') <> 12 THEN
    RAISE EXCEPTION 'Food & Market validation failed: expected 12 tenant-scoped thumbnails';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.menu_items m
    JOIN public.categories c ON c.id = m.category_id
    WHERE m.restaurant_id = 73 AND c.restaurant_id <> 73
  ) THEN
    RAISE EXCEPTION 'Food & Market cross-tenant category assignment detected';
  END IF;
END $$;

SELECT name_en, name_ka, name_ru, sort_order
FROM public.categories
WHERE restaurant_id = 73
ORDER BY sort_order;

SELECT name_en, name_ka, name_ru, price, thumbnail_url, is_3d, featured, sort_order
FROM public.menu_items
WHERE restaurant_id = 73
ORDER BY category_id, sort_order;

ROLLBACK;
