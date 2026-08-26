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
  (73, 'Salads',   'სალათები',        'Салаты', 1),
  (73, 'Starters', 'სტარტერები',      'Закуски', 2),
  (73, 'Pizza',    'პიცა',            'Пицца', 3),
  (73, 'Burgers',  'ბურგერები',       'Бургеры', 4),
  (73, 'Sushi',    'სუში',            'Суши', 5),
  (73, 'Wine',     'ღვინო',           'Вино', 6);

WITH dishes(category_en, name_en, name_ka, name_ru, description_en, description_ka, description_ru, price, thumbnail_url, sort_order) AS (VALUES
  ('Salads', 'Burrata Salad', 'ბურატას სალათა', 'Салат с бурратой',
   'Burrata salad prepared in the Food & Market style.', 'ბურატას სალათა Food & Market-ის სტილში.', 'Салат с бурратой в стиле Food & Market.',
   'GEL 29.00', 'https://restaurant-ar.pages.dev/assets/food-market/items/burrata-salad.webp', 1),

  ('Starters', 'Cornmeal Balls with Jonjoli Sauce', 'ღომის ბურთები ჯონჯოლის სოუსში', 'Шарики из гоми с соусом джонджоли',
   'Crispy cornmeal balls served with jonjoli sauce.', 'ხრაშუნა ღომის ბურთები ჯონჯოლის სოუსით.', 'Хрустящие шарики из гоми с соусом джонджоли.',
   'GEL 35.00', 'https://restaurant-ar.pages.dev/assets/food-market/items/cornmeal-balls.webp', 1),
  ('Starters', 'Chicken Balls in Smoked Sauce', 'ქათმის ბურთები შებოლილ სოუსში', 'Куриные шарики в копчёном соусе',
   'Crispy chicken balls served in a smoked sauce.', 'ხრაშუნა ქათმის ბურთები შებოლილ სოუსში.', 'Хрустящие куриные шарики в копчёном соусе.',
   'GEL 35.00', 'https://restaurant-ar.pages.dev/assets/food-market/items/chicken-balls.webp', 2),

  ('Pizza', 'Pepperoni', 'პეპერონი', 'Пепперони',
   'Tomato sauce, mozzarella, and pepperoni.', 'ტომატის სოუსი, მოცარელა და პეპერონი.', 'Томатный соус, моцарелла и пепперони.',
   'GEL 42.50', 'https://restaurant-ar.pages.dev/assets/food-market/items/pepperoni-pizza.webp', 1),
  ('Pizza', 'Chef Pizza', 'პიცა შეფი', 'Пицца от шефа',
   'Cream sauce, ham, mushrooms, and mozzarella.', 'ნაღების სოუსი, ლორი, სოკო და მოცარელა.', 'Сливочный соус, ветчина, грибы и моцарелла.',
   'GEL 41.25', 'https://restaurant-ar.pages.dev/assets/food-market/items/chef-pizza.webp', 2),

  ('Burgers', 'Sammy Burger', 'სემი ბურგერი', 'Бургер Сэмми',
   'Beef burger with cheese, vegetables, fries, and house sauce.', 'საქონლის ბურგერი ყველით, ბოსტნეულით, კარტოფილი ფრით და საფირმო სოუსით.', 'Бургер с говядиной, сыром, овощами, картофелем фри и фирменным соусом.',
   'GEL 46.25', 'https://restaurant-ar.pages.dev/assets/food-market/items/sammy-burger.webp', 1),
  ('Burgers', 'Chef Burger', 'შეფ ბურგერი', 'Бургер от шефа',
   'Beef cutlet, bacon, jalapeño, iceberg, tomato, onion, fries, and house sauce.', 'საქონლის კატლეტი, ბეკონი, ჰალაპენიო, აისბერგი, პომიდორი, ხახვი, კარტოფილი ფრი და საფირმო სოუსი.', 'Говяжья котлета, бекон, халапеньо, айсберг, томат, лук, картофель фри и фирменный соус.',
   'GEL 48.75', 'https://restaurant-ar.pages.dev/assets/food-market/items/chef-burger.webp', 2),

  ('Sushi', 'Crab Maki', 'კრაბების მაკი', 'Маки с крабом',
   'Nori, crab, avocado, cream cheese, cucumber, and eel sauce.', 'ნორი, კრაბი, ავოკადო, კრემ-ყველი, კიტრი და უნაგის სოუსი.', 'Нори, краб, авокадо, сливочный сыр, огурец и соус унаги.',
   'GEL 26.25', 'https://restaurant-ar.pages.dev/assets/food-market/items/crab-maki.webp', 1),
  ('Sushi', 'Salmon Futomaki', 'ფუტომაკი ორაგული', 'Футомаки с лососем',
   'Nori, cucumber, salmon, cream cheese, tobiko, ginger, wasabi, and soy sauce.', 'ნორი, კიტრი, ორაგული, კრემ-ყველი, ტობიკო, ჯანჯაფილი, ვასაბი და სოიოს სოუსი.', 'Нори, огурец, лосось, сливочный сыр, тобико, имбирь, васаби и соевый соус.',
   'GEL 41.25', 'https://restaurant-ar.pages.dev/assets/food-market/items/salmon-futomaki.webp', 2),

  ('Wine', 'Darcheli Saperavi', 'დარჩელი საფერავი', 'Дарчели Саперави',
   'Georgian red wine.', 'ქართული წითელი ღვინო.', 'Грузинское красное вино.',
   'GEL 64.75', 'https://restaurant-ar.pages.dev/assets/food-market/items/saperavi-wine.webp', 1),
  ('Wine', 'Saperavi Rosé', 'საფერავი როზე', 'Саперави Розе',
   'Georgian rosé wine.', 'ქართული ვარდისფერი ღვინო.', 'Грузинское розовое вино.',
   'GEL 34.75', 'https://restaurant-ar.pages.dev/assets/food-market/items/saperavi-rose.webp', 2),
  ('Wine', 'Shavkapito Zedashe', 'შავკაპიტო ზედაშე', 'Шавкапито Зедаше',
   'Georgian red wine.', 'ქართული წითელი ღვინო.', 'Грузинское красное вино.',
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
