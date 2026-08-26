-- Food & Market official Wolt menu-text correction.
-- The official photos are deployed at the existing tenant-scoped URLs, so this
-- transaction only fixes names/descriptions that were misread from screenshots.
-- Review-first safety: checked-in source always ends in ROLLBACK.
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
    RAISE EXCEPTION 'Food & Market identity assertion failed; refusing to update menu text';
  END IF;
END $$;

CREATE TEMP TABLE _food_market_corrections (
  thumbnail_suffix text,
  name_en text,
  name_ka text,
  name_ru text,
  description_en text,
  description_ka text,
  description_ru text
);

INSERT INTO _food_market_corrections
  (thumbnail_suffix, name_en, name_ka, name_ru, description_en, description_ka, description_ru)
VALUES
  ('cornmeal-balls.webp',
   'Elarji Balls with Bazhe Sauce', U&'\10D4\10DA\10D0\10E0\10EF\10D8\10E1 \10D1\10E3\10E0\10D7\10D4\10D1\10D8 \10D1\10D0\10DF\10D4\10E1 \10E1\10DD\10E3\10E1\10E8\10D8', U&'\0428\0430\0440\0438\043A\0438 \044D\043B\0430\0440\0434\0436\0438 \0441 \0441\043E\0443\0441\043E\043C \0431\0430\0436\0435',
   'Elarji balls served with Georgian walnut bazhe sauce.', U&'\10D4\10DA\10D0\10E0\10EF\10D8\10E1 \10D1\10E3\10E0\10D7\10D4\10D1\10D8 \10D1\10D0\10DF\10D4\10E1 \10E1\10DD\10E3\10E1\10D8\10D7.', U&'\0428\0430\0440\0438\043A\0438 \044D\043B\0430\0440\0434\0436\0438 \0441 \0433\0440\0443\0437\0438\043D\0441\043A\0438\043C \043E\0440\0435\0445\043E\0432\044B\043C \0441\043E\0443\0441\043E\043C \0431\0430\0436\0435.'),
  ('chicken-balls.webp',
   'Chicken Balls in Shkmeruli Sauce', U&'\10E5\10D0\10D7\10DB\10D8\10E1 \10D1\10E3\10E0\10D7\10D4\10D1\10D8 \10E8\10E5\10DB\10D4\10E0\10E3\10DA \10E1\10DD\10E3\10E1\10E8\10D8', U&'\041A\0443\0440\0438\043D\044B\0435 \0448\0430\0440\0438\043A\0438 \0432 \0441\043E\0443\0441\0435 \0448\043A\043C\0435\0440\0443\043B\0438',
   'Chicken balls served in Shkmeruli sauce.', U&'\10E5\10D0\10D7\10DB\10D8\10E1 \10D1\10E3\10E0\10D7\10D4\10D1\10D8 \10E8\10E5\10DB\10D4\10E0\10E3\10DA \10E1\10DD\10E3\10E1\10E8\10D8.', U&'\041A\0443\0440\0438\043D\044B\0435 \0448\0430\0440\0438\043A\0438 \0432 \0441\043E\0443\0441\0435 \0448\043A\043C\0435\0440\0443\043B\0438.'),
  ('sammy-burger.webp',
   'Smash Burger', U&'\10E1\10DB\10D4\10E8 \10D1\10E3\10E0\10D2\10D4\10E0\10D8', U&'\0421\043C\044D\0448-\0431\0443\0440\0433\0435\0440',
   U&'Burger bun, Angus beef, jalape\00F1o, cheese sauce, pickles, onion, lettuce, and tomato.', U&'\10D1\10E3\10E0\10D2\10D4\10E0\10D8\10E1 \10DE\10E3\10E0\10D8, \10D0\10DC\10D2\10E3\10E1\10D8\10E1 \10EE\10DD\10E0\10EA\10D8, \10F0\10D0\10DA\10D0\10DE\10D4\10DC\10D8\10DD, \10E7\10D5\10D4\10DA\10D8\10E1 \10E1\10DD\10E3\10E1\10D8, \10D9\10D8\10E2\10E0\10D8\10E1 \10DB\10D0\10E0\10D8\10DC\10D0\10D3\10D8, \10EE\10D0\10EE\10D5\10D8, \10E1\10D0\10DA\10D0\10D7\10D8\10E1 \10E4\10DD\10D7\10DD\10DA\10D8 \10D3\10D0 \10DE\10DD\10DB\10D8\10D3\10DD\10E0\10D8.', U&'\0411\0443\043B\043E\0447\043A\0430, \0433\043E\0432\044F\0434\0438\043D\0430 Angus, \0445\0430\043B\0430\043F\0435\043D\044C\043E, \0441\044B\0440\043D\044B\0439 \0441\043E\0443\0441, \043C\0430\0440\0438\043D\043E\0432\0430\043D\043D\044B\0439 \043E\0433\0443\0440\0435\0446, \043B\0443\043A, \0441\0430\043B\0430\0442 \0438 \0442\043E\043C\0430\0442.'),
  ('crab-maki.webp',
   'Shrimp Maki', U&'\10D9\10E0\10D4\10D5\10D4\10E2\10D8\10E1 \10DB\10D0\10D9\10D8', U&'\041C\0430\043A\0438 \0441 \043A\0440\0435\0432\0435\0442\043A\043E\0439',
   'Nori, shrimp, rice, cream cheese, wasabi, pickled ginger, and tosazu sauce.', U&'\10DC\10DD\10E0\10D8, \10D9\10E0\10D4\10D5\10D4\10E2\10D8, \10D1\10E0\10D8\10DC\10EF\10D8, \10D9\10E0\10D4\10DB-\10E7\10D5\10D4\10DA\10D8, \10D5\10D0\10E1\10D0\10D1\10D8, \10EF\10D8\10DC\10EF\10D4\10E0\10D8\10E1 \10DB\10D0\10E0\10D8\10DC\10D0\10D3\10D8 \10D3\10D0 \10E2\10DD\10E1\10D0\10E1 \10E1\10DD\10E3\10E1\10D8.', U&'\041D\043E\0440\0438, \043A\0440\0435\0432\0435\0442\043A\0430, \0440\0438\0441, \0441\043B\0438\0432\043E\0447\043D\044B\0439 \0441\044B\0440, \0432\0430\0441\0430\0431\0438, \043C\0430\0440\0438\043D\043E\0432\0430\043D\043D\044B\0439 \0438\043C\0431\0438\0440\044C \0438 \0441\043E\0443\0441 \0442\043E\0441\0430\0434\0437\0443.'),
  ('saperavi-wine.webp',
   'Danieli, Saperavi', U&'\10D3\10D0\10DC\10D8\10D4\10DA\10D8, \10E1\10D0\10E4\10D4\10E0\10D0\10D5\10D8', U&'\0414\0430\043D\0438\0435\043B\0438, \0421\0430\043F\0435\0440\0430\0432\0438',
   'Georgian dry red wine.', U&'\10E5\10D0\10E0\10D7\10E3\10DA\10D8 \10EC\10D8\10D7\10D4\10DA\10D8 \10DB\10E8\10E0\10D0\10DA\10D8 \10E6\10D5\10D8\10DC\10DD.', U&'\0413\0440\0443\0437\0438\043D\0441\043A\043E\0435 \0441\0443\0445\043E\0435 \043A\0440\0430\0441\043D\043E\0435 \0432\0438\043D\043E.'),
  ('saperavi-rose.webp',
   U&'Chelti, Saperavi Ros\00E9', U&'\10E9\10D4\10DA\10D7\10D8, \10E1\10D0\10E4\10D4\10E0\10D0\10D5\10D8 \10E0\10DD\10D6\10D4', U&'\0427\0435\043B\0442\0438, \0421\0430\043F\0435\0440\0430\0432\0438 \0420\043E\0437\0435',
   U&'Georgian semi-dry ros\00E9 wine.', U&'\10E5\10D0\10E0\10D7\10E3\10DA\10D8 \10D5\10D0\10E0\10D3\10D8\10E1\10E4\10D4\10E0\10D8 \10DC\10D0\10EE\10D4\10D5\10E0\10D0\10D3 \10DB\10E8\10E0\10D0\10DA\10D8 \10E6\10D5\10D8\10DC\10DD.', U&'\0413\0440\0443\0437\0438\043D\0441\043A\043E\0435 \043F\043E\043B\0443\0441\0443\0445\043E\0435 \0440\043E\0437\043E\0432\043E\0435 \0432\0438\043D\043E.');

DO $$
BEGIN
  IF (
    SELECT count(*)
    FROM public.menu_items m
    JOIN _food_market_corrections c ON m.thumbnail_url LIKE '%/' || c.thumbnail_suffix
    WHERE m.restaurant_id = 73
  ) <> 6 THEN
    RAISE EXCEPTION 'Food & Market correction expected exactly 6 matched items';
  END IF;
END $$;

UPDATE public.menu_items m
SET name_en = c.name_en,
    name_ka = c.name_ka,
    name_ru = c.name_ru,
    description_en = c.description_en,
    description_ka = c.description_ka,
    description_ru = c.description_ru
FROM _food_market_corrections c
WHERE m.restaurant_id = 73
  AND m.thumbnail_url LIKE '%/' || c.thumbnail_suffix;

DO $$
BEGIN
  IF (
    SELECT count(*)
    FROM public.menu_items m
    JOIN _food_market_corrections c
      ON m.thumbnail_url LIKE '%/' || c.thumbnail_suffix
     AND m.name_en = c.name_en
     AND m.name_ka = c.name_ka
    WHERE m.restaurant_id = 73
  ) <> 6 THEN
    RAISE EXCEPTION 'Food & Market correction validation failed';
  END IF;
END $$;

DROP TABLE _food_market_corrections;

SELECT name_en, name_ka, price, thumbnail_url
FROM public.menu_items
WHERE restaurant_id = 73
ORDER BY category_id, sort_order;

ROLLBACK;
