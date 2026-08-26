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
   'Elarji Balls with Bazhe Sauce', 'ელარჯის ბურთები ბაჟეს სოუსში', 'Шарики эларджи с соусом баже',
   'Elarji balls served with Georgian walnut bazhe sauce.', 'ელარჯის ბურთები ბაჟეს სოუსით.', 'Шарики эларджи с грузинским ореховым соусом баже.'),
  ('chicken-balls.webp',
   'Chicken Balls in Shkmeruli Sauce', 'ქათმის ბურთები შქმერულ სოუსში', 'Куриные шарики в соусе шкмерули',
   'Chicken balls served in Shkmeruli sauce.', 'ქათმის ბურთები შქმერულ სოუსში.', 'Куриные шарики в соусе шкмерули.'),
  ('sammy-burger.webp',
   'Smash Burger', 'სმეშ ბურგერი', 'Смэш-бургер',
   'Burger bun, Angus beef, jalapeño, cheese sauce, pickles, onion, lettuce, and tomato.', 'ბურგერის პური, ანგუსის ხორცი, ჰალაპენიო, ყველის სოუსი, კიტრის მარინადი, ხახვი, სალათის ფოთოლი და პომიდორი.', 'Булочка, говядина Angus, халапеньо, сырный соус, маринованный огурец, лук, салат и томат.'),
  ('crab-maki.webp',
   'Shrimp Maki', 'კრევეტის მაკი', 'Маки с креветкой',
   'Nori, shrimp, rice, cream cheese, wasabi, pickled ginger, and tosazu sauce.', 'ნორი, კრევეტი, ბრინჯი, კრემ-ყველი, ვასაბი, ჯინჯერის მარინადი და ტოსას სოუსი.', 'Нори, креветка, рис, сливочный сыр, васаби, маринованный имбирь и соус тосадзу.'),
  ('saperavi-wine.webp',
   'Danieli, Saperavi', 'დანიელი, საფერავი', 'Даниели, Саперави',
   'Georgian dry red wine.', 'ქართული წითელი მშრალი ღვინო.', 'Грузинское сухое красное вино.'),
  ('saperavi-rose.webp',
   'Chelti, Saperavi Rosé', 'ჩელთი, საფერავი როზე', 'Челти, Саперави Розе',
   'Georgian semi-dry rosé wine.', 'ქართული ვარდისფერი ნახევრად მშრალი ღვინო.', 'Грузинское полусухое розовое вино.');

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
