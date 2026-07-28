-- Mugsy's Burgers official menu import — brand_id 53 / restaurant_id 59.
-- Sources: https://mugsy.ge/ka and https://mugsy.ge/en Inertia data-page JSON, extracted 2026-07-28.
-- Dashboard-safe variant: Georgian U+10A0-U+10FF and lari U+20BE characters inside JSON payloads are JSON \uXXXX escapes.
-- Default safety is ROLLBACK. To execute after review, change only the final line from ROLLBACK; to COMMIT;

BEGIN;

do $$
declare
  v_restaurant record;
begin
  select r.id, r.slug, r.name, r.brand_id, b.slug as brand_slug
    into v_restaurant
    from public.restaurants r
    join public.brands b on b.id = r.brand_id
   where r.id = 59
     and r.slug = 'mugsy-main'
     and r.brand_id = 53
     and b.slug = 'mugsy';

  if not found then
    raise exception 'Mugsy identity assertion failed for restaurant %, slug %, brand %, brand slug %',
      59, 'mugsy-main', 53, 'mugsy';
  end if;
end $$;

-- Import expects the current public menu schema used by tenant admin and the public renderer.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'menu_items' and column_name = 'price_old'
  ) then
    raise exception 'menu_items.price_old is missing — apply 2026-07-28_menu_item_price_old.sql first';
  end if;

  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'menu_items' and column_name = 'featured'
  ) then
    raise exception 'menu_items.featured is missing — apply 2026-07-28_menu_item_featured.sql first';
  end if;
end $$;

-- Destructive behavior is limited to Mugsy rows only: remove old imported Mugsy categories/items before replacing with official rows.
delete from public.menu_items where restaurant_id = 59;
delete from public.categories where restaurant_id = 59;

-- ── categories ──────────────────────────────────────────────────────────
with src as (
  select *
  from jsonb_to_recordset($mugsy_categories$[
  {
    "name_en": "Burgers",
    "name_ka": "\u10d1\u10e3\u10e0\u10d2\u10d4\u10e0\u10d4\u10d1\u10d8",
    "sort_order": 1
  },
  {
    "name_en": "Boxes",
    "name_ka": "\u10d1\u10dd\u10e5\u10e1\u10d4\u10d1\u10d8",
    "sort_order": 2
  },
  {
    "name_en": "Sides & Fries",
    "name_ka": "\u10e1\u10d0\u10d8\u10d3\u10d4\u10d1\u10d8",
    "sort_order": 3
  },
  {
    "name_en": "Drinks & Sauces",
    "name_ka": "\u10e1\u10d0\u10e1\u10db\u10d4\u10da\u10d4\u10d1\u10d8",
    "sort_order": 4
  }
]$mugsy_categories$::jsonb)
    as t(name_en text, name_ka text, sort_order int)
)
insert into public.categories (restaurant_id, name_en, name_ka, sort_order)
select 59, src.name_en, src.name_ka, src.sort_order
from src
on conflict (restaurant_id, name_en) do update
set name_ka = excluded.name_ka,
    sort_order = excluded.sort_order;

-- ── menu items ──────────────────────────────────────────────────────────
with src as (
  select *
  from jsonb_to_recordset($mugsy_items$[
  {
    "name_en": "Cheesy",
    "name_ka": "Cheesy",
    "description_en": "Bun, beef, tomato, lettuce, cheddar cheese, signature sauce",
    "description_ka": "\u10e4\u10e3\u10dc\u10d7\u10e3\u10e8\u10d0, \u10e1\u10d0\u10e5\u10dd\u10dc\u10da\u10d8\u10e1 \u10ee\u10dd\u10e0\u10ea\u10d8, \u10de\u10dd\u10db\u10d8\u10d3\u10dd\u10e0\u10d8, \u10e1\u10d0\u10da\u10d0\u10d7\u10d8\u10e1 \u10e4\u10dd\u10d7\u10dd\u10da\u10d8 \u10d0\u10d8\u10e1\u10d1\u10d4\u10e0\u10d2\u10d8, \u10e7\u10d5\u10d4\u10da\u10d8 \u10e9\u10d4\u10d3\u10d0\u10e0\u10d8, \u10e1\u10d0\u10e4\u10d8\u10e0\u10db\u10dd \u10e1\u10dd\u10e3\u10e1\u10d8",
    "price": "7.9 \u20be",
    "price_old": "",
    "category_name_en": "Burgers",
    "sort_order": 1,
    "visible": true,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1,
    "thumbnail_url": "./assets/mugsy/items-webp/cheesy.webp",
    "thumb_3d": false,
    "is_3d": false,
    "text_only": false,
    "featured": false,
    "addons": [],
    "variants": []
  },
  {
    "name_en": "Bacon Burger",
    "name_ka": "Bacon Smash",
    "description_en": "Bun, bacon, beef, cheddar cheese, signature sauce",
    "description_ka": "\u10e4\u10e3\u10dc\u10d7\u10e3\u10e8\u10d0, \u10d1\u10d4\u10d9\u10dd\u10dc\u10d8, \u10e1\u10d0\u10e5\u10dd\u10dc\u10da\u10d8\u10e1 \u10ee\u10dd\u10e0\u10ea\u10d8, \u10e7\u10d5\u10d4\u10da\u10d8 \u10e9\u10d4\u10d3\u10d0\u10e0\u10d8, \u10e1\u10d0\u10e4\u10d8\u10e0\u10db\u10dd \u10e1\u10dd\u10e3\u10e1\u10d8",
    "price": "10.6 \u20be",
    "price_old": "",
    "category_name_en": "Burgers",
    "sort_order": 2,
    "visible": true,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1,
    "thumbnail_url": "./assets/mugsy/items-webp/bacon-burger.webp",
    "thumb_3d": false,
    "is_3d": false,
    "text_only": false,
    "featured": false,
    "addons": [],
    "variants": []
  },
  {
    "name_en": "BBQ Smoker",
    "name_ka": "BBQ Smoker",
    "description_en": "Bun, BBQ sauce, lettuce, tomato, beef, cheddar slice, red BBQ smoky sauce",
    "description_ka": "\u10e4\u10e3\u10dc\u10d7\u10e3\u10e8\u10d0, \u10d1\u10d1\u10e5 \u10e1\u10dd\u10e3\u10e1\u10d8, \u10d0\u10d8\u10e1\u10d1\u10d4\u10e0\u10d2\u10d8, \u10de\u10dd\u10db\u10d8\u10d3\u10dd\u10e0\u10d8, \u10e1\u10d0\u10e5\u10dd\u10dc\u10da\u10d8\u10e1 \u10ee\u10dd\u10e0\u10ea\u10d8, \u10e9\u10d4\u10d3\u10d0\u10e0\u10d8\u10e1 \u10e4\u10d8\u10e0\u10e4\u10d8\u10e2\u10d0, \u10ec\u10d8\u10d7\u10d4\u10da\u10d8 \u10d1\u10d1\u10e5 \u10e1\u10db\u10dd\u10e3\u10e5\u10d8 \u10e1\u10dd\u10e3\u10e1\u10d8",
    "price": "9.4 \u20be",
    "price_old": "",
    "category_name_en": "Burgers",
    "sort_order": 3,
    "visible": true,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1,
    "thumbnail_url": "./assets/mugsy/items-webp/bbq-smoker.webp",
    "thumb_3d": false,
    "is_3d": false,
    "text_only": false,
    "featured": false,
    "addons": [],
    "variants": []
  },
  {
    "name_en": "Mugsys Signature",
    "name_ka": "Bacon Melt",
    "description_en": "Bun, BBQ sauce, crispy bacon, beef, cheddar slice, red BBQ smoky sauce, cheese sauce, fried mozzarella",
    "description_ka": "\u10e4\u10e3\u10dc\u10d7\u10e3\u10e8\u10d0, \u10d1\u10d1\u10e5 \u10e1\u10dd\u10e3\u10e1\u10d8, \u10e8\u10d4\u10db\u10ec\u10d5\u10d0\u10e0\u10d8 \u10d1\u10d4\u10d9\u10dd\u10dc\u10d8, \u10e1\u10d0\u10e5\u10dd\u10dc\u10da\u10d8\u10e1 \u10ee\u10dd\u10e0\u10ea\u10d8, \u10e9\u10d4\u10d3\u10d0\u10e0\u10d8\u10e1 \u10e4\u10d8\u10e0\u10e4\u10d8\u10e2\u10d0, \u10ec\u10d8\u10d7\u10d4\u10da\u10d8 \u10d1\u10d1\u10e5 \u10e1\u10db\u10dd\u10e3\u10e5\u10d8 \u10e1\u10dd\u10e3\u10e1\u10d8, \u10e7\u10d5\u10d4\u10da\u10d8\u10e1 \u10e1\u10dd\u10e3\u10e1\u10d8, \u10e8\u10d4\u10db\u10ec\u10d5\u10d0\u10e0\u10d8 \u10db\u10dd\u10ea\u10d0\u10e0\u10d4\u10da\u10d0",
    "price": "17.9 \u20be",
    "price_old": "",
    "category_name_en": "Burgers",
    "sort_order": 4,
    "visible": true,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1,
    "thumbnail_url": "./assets/mugsy/items-webp/bacon-melt.webp",
    "thumb_3d": false,
    "is_3d": false,
    "text_only": false,
    "featured": false,
    "addons": [],
    "variants": []
  },
  {
    "name_en": "Mozzarella",
    "name_ka": "Mozzarella",
    "description_en": "Bun, Mugsy's sauce, lettuce, tomato, fried mozzarella, cheese sauce",
    "description_ka": "\u10e4\u10e3\u10dc\u10d7\u10e3\u10e8\u10d0, \u10db\u10d0\u10d2\u10e1\u10d8\u10e1 \u10e1\u10dd\u10e3\u10e1\u10d8, \u10d0\u10d8\u10e1\u10d1\u10d4\u10e0\u10d2\u10d8, \u10de\u10dd\u10db\u10d8\u10d3\u10dd\u10e0\u10d8, \u10e8\u10d4\u10db\u10ec\u10d5\u10d0\u10e0\u10d8 \u10db\u10dd\u10ea\u10d0\u10e0\u10d4\u10da\u10d0, \u10e7\u10d5\u10d4\u10da\u10d8\u10e1 \u10e1\u10dd\u10e3\u10e1\u10d8",
    "price": "9.7 \u20be",
    "price_old": "",
    "category_name_en": "Burgers",
    "sort_order": 5,
    "visible": true,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1,
    "thumbnail_url": "./assets/mugsy/items-webp/mozzarella.webp",
    "thumb_3d": false,
    "is_3d": false,
    "text_only": false,
    "featured": false,
    "addons": [],
    "variants": []
  },
  {
    "name_en": "Chicken Cheesy",
    "name_ka": "Chicken Cheesy",
    "description_en": "Bun, chicken, tomato, lettuce, cheddar cheese, signature sauce",
    "description_ka": "\u10e4\u10e3\u10dc\u10d7\u10e3\u10e8\u10d0, \u10e5\u10d0\u10d7\u10db\u10d8\u10e1 \u10ee\u10dd\u10e0\u10ea\u10d8, \u10de\u10dd\u10db\u10d8\u10d3\u10dd\u10e0\u10d8, \u10e1\u10d0\u10da\u10d0\u10d7\u10d8\u10e1 \u10e4\u10dd\u10d7\u10dd\u10da\u10d8 \u10d0\u10d8\u10e1\u10d1\u10d4\u10e0\u10d2\u10d8, \u10e7\u10d5\u10d4\u10da\u10d8 \u10e9\u10d4\u10d3\u10d0\u10e0\u10d8, \u10e1\u10d0\u10e4\u10d8\u10e0\u10db\u10dd \u10e1\u10dd\u10e3\u10e1\u10d8",
    "price": "7.8 \u20be",
    "price_old": "",
    "category_name_en": "Burgers",
    "sort_order": 6,
    "visible": true,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1,
    "thumbnail_url": "./assets/mugsy/items-webp/chicken-cheesy.webp",
    "thumb_3d": false,
    "is_3d": false,
    "text_only": false,
    "featured": false,
    "addons": [],
    "variants": []
  },
  {
    "name_en": "Two Burger Box",
    "name_ka": "\u10dd\u10e0\u10d8 \u10d1\u10e3\u10e0\u10d2\u10d4\u10e0\u10d8\u10e1 \u10d1\u10dd\u10e5\u10e1\u10d8",
    "description_en": "Two classic burgers, nuggets, fries",
    "description_ka": "\u10dd\u10e0\u10d8 \u10d9\u10da\u10d0\u10e1\u10d8\u10d9\u10e3\u10e0\u10d8 \u10d1\u10e3\u10e0\u10d2\u10d4\u10e0\u10d8, \u10dc\u10d0\u10d2\u10d4\u10d7\u10e1\u10d8, \u10d9\u10d0\u10e0\u10e2\u10dd\u10e4\u10d8\u10da\u10d8 \u10e4\u10e0\u10d8",
    "price": "33.9 \u20be",
    "price_old": "",
    "category_name_en": "Boxes",
    "sort_order": 1,
    "visible": true,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1,
    "thumbnail_url": "./assets/mugsy/items-webp/two-burger-box.webp",
    "thumb_3d": false,
    "is_3d": false,
    "text_only": false,
    "featured": false,
    "addons": [],
    "variants": []
  },
  {
    "name_en": "Chicken Box",
    "name_ka": "\u10e5\u10d0\u10d7\u10db\u10d8\u10e1 \u10d1\u10dd\u10e5\u10e1\u10d8",
    "description_en": "Six chicken burgers, fries",
    "description_ka": "\u10d4\u10e5\u10d5\u10e1\u10d8 \u10e5\u10d0\u10d7\u10db\u10d8\u10e1 \u10d1\u10e3\u10e0\u10d2\u10d4\u10e0\u10d8, \u10d9\u10d0\u10e0\u10e2\u10dd\u10e4\u10d8\u10da\u10d8 \u10e4\u10e0\u10d8",
    "price": "54.9 \u20be",
    "price_old": "",
    "category_name_en": "Boxes",
    "sort_order": 2,
    "visible": true,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1,
    "thumbnail_url": "./assets/mugsy/items-webp/chicken-box.webp",
    "thumb_3d": false,
    "is_3d": false,
    "text_only": false,
    "featured": false,
    "addons": [],
    "variants": []
  },
  {
    "name_en": "Cheesy Box",
    "name_ka": "\u10e9\u10d8\u10d6\u10d8\u10e1 \u10d1\u10dd\u10e5\u10e1\u10d8",
    "description_en": "Cheesy box combo",
    "description_ka": "\u10e9\u10d8\u10d6\u10d8\u10e1 \u10d1\u10dd\u10e5\u10e1\u10d8",
    "price": "58.7 \u20be",
    "price_old": "",
    "category_name_en": "Boxes",
    "sort_order": 3,
    "visible": true,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1,
    "thumbnail_url": "./assets/mugsy/items-webp/cheesy-box.webp",
    "thumb_3d": false,
    "is_3d": false,
    "text_only": false,
    "featured": false,
    "addons": [],
    "variants": []
  },
  {
    "name_en": "Chicken Snack Box",
    "name_ka": "Chicken Snack Box",
    "description_en": "Fries, chicken popcorn, chicken nuggets, ketchup, cheese sauce",
    "description_ka": "\u10d9\u10d0\u10e0\u10e2\u10dd\u10e4\u10d8\u10da\u10d8 \u10e4\u10e0\u10d8, \u10e5\u10d0\u10d7\u10db\u10d8\u10e1 \u10de\u10dd\u10de\u10d9\u10dd\u10e0\u10dc\u10d8, \u10e5\u10d0\u10d7\u10db\u10d8\u10e1 \u10dc\u10d0\u10d2\u10d4\u10d7\u10e1\u10d8, \u10d9\u10d4\u10e9\u10e3\u10de\u10d8, \u10e7\u10d5\u10d4\u10da\u10d8\u10e1 \u10e1\u10dd\u10e3\u10e1\u10d8",
    "price": "29.8 \u20be",
    "price_old": "",
    "category_name_en": "Boxes",
    "sort_order": 4,
    "visible": true,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1,
    "thumbnail_url": "./assets/mugsy/items-webp/chicken-snack-box.webp",
    "thumb_3d": false,
    "is_3d": false,
    "text_only": false,
    "featured": false,
    "addons": [],
    "variants": []
  },
  {
    "name_en": "Fries with Bacon & Cheese Sauce",
    "name_ka": "\u10e4\u10e0\u10d8 \u10d1\u10d4\u10d9\u10dd\u10dc\u10d8\u10d7 \u10d3\u10d0 \u10e7\u10d5\u10d4\u10da\u10d8\u10e1 \u10e1\u10dd\u10e3\u10e1\u10d8\u10d7",
    "description_en": "Fries with bacon and cheese sauce",
    "description_ka": "\u10e4\u10e0\u10d8 \u10d1\u10d4\u10d9\u10dd\u10dc\u10d8\u10d7 \u10d3\u10d0 \u10e7\u10d5\u10d4\u10da\u10d8\u10e1 \u10e1\u10dd\u10e3\u10e1\u10d8\u10d7",
    "price": "10.4 \u20be",
    "price_old": "",
    "category_name_en": "Sides & Fries",
    "sort_order": 1,
    "visible": true,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1,
    "thumbnail_url": "./assets/mugsy/items-webp/fries-with-bacon-cheese-sauce.webp",
    "thumb_3d": false,
    "is_3d": false,
    "text_only": false,
    "featured": false,
    "addons": [],
    "variants": []
  },
  {
    "name_en": "Fries",
    "name_ka": "\u10e4\u10e0\u10d8",
    "description_en": "French fries",
    "description_ka": "\u10d9\u10d0\u10e0\u10e2\u10dd\u10e4\u10d8\u10da\u10d8 \u10e4\u10e0\u10d8",
    "price": "4.4 \u20be",
    "price_old": "",
    "category_name_en": "Sides & Fries",
    "sort_order": 2,
    "visible": true,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1,
    "thumbnail_url": "./assets/mugsy/items-webp/fries.webp",
    "thumb_3d": false,
    "is_3d": false,
    "text_only": false,
    "featured": false,
    "addons": [],
    "variants": []
  },
  {
    "name_en": "Fries with Jalapeño & Cheese Sauce",
    "name_ka": "\u10e4\u10e0\u10d8 \u10f0\u10d0\u10da\u10d0\u10de\u10d4\u10dc\u10d8\u10dd\u10d7\u10d8 \u10d3\u10d0 \u10e7\u10d5\u10d4\u10da\u10d8\u10e1 \u10e1\u10dd\u10e3\u10e1\u10d8\u10d7",
    "description_en": "Fries with jalapeño and cheese sauce",
    "description_ka": "\u10e4\u10e0\u10d8 \u10f0\u10d0\u10da\u10d0\u10de\u10d4\u10dc\u10d8\u10dd\u10d7\u10d8 \u10d3\u10d0 \u10e7\u10d5\u10d4\u10da\u10d8\u10e1 \u10e1\u10dd\u10e3\u10e1\u10d8\u10d7",
    "price": "9.9 \u20be",
    "price_old": "",
    "category_name_en": "Sides & Fries",
    "sort_order": 3,
    "visible": true,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1,
    "thumbnail_url": "./assets/mugsy/items-webp/fries-with-jalapeno-cheese-sauce.webp",
    "thumb_3d": false,
    "is_3d": false,
    "text_only": false,
    "featured": false,
    "addons": [],
    "variants": []
  },
  {
    "name_en": "Chicken Popcorn 50pcs",
    "name_ka": "\u10e5\u10d0\u10d7\u10db\u10d8\u10e1 \u10de\u10dd\u10de\u10d9\u10dd\u10e0\u10dc\u10d8 50\u10ea",
    "description_en": "Chicken popcorn 50 pieces",
    "description_ka": "\u10e5\u10d0\u10d7\u10db\u10d8\u10e1 \u10de\u10dd\u10de\u10d9\u10dd\u10e0\u10dc\u10d8 50 \u10ea\u10d0\u10da\u10d8",
    "price": "9.4 \u20be",
    "price_old": "",
    "category_name_en": "Sides & Fries",
    "sort_order": 4,
    "visible": true,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1,
    "thumbnail_url": "./assets/mugsy/items-webp/chicken-popcorn-50pcs.webp",
    "thumb_3d": false,
    "is_3d": false,
    "text_only": false,
    "featured": false,
    "addons": [],
    "variants": []
  },
  {
    "name_en": "Caesar with Chicken",
    "name_ka": "\u10ea\u10d4\u10d6\u10d0\u10e0\u10d8 \u10e5\u10d0\u10d7\u10db\u10d8\u10d7",
    "description_en": "Caesar salad with chicken",
    "description_ka": "\u10ea\u10d4\u10d6\u10d0\u10e0\u10d8 \u10e5\u10d0\u10d7\u10db\u10d8\u10d7",
    "price": "7.8 \u20be",
    "price_old": "",
    "category_name_en": "Sides & Fries",
    "sort_order": 5,
    "visible": true,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1,
    "thumbnail_url": "./assets/mugsy/items-webp/caesar-with-chicken.webp",
    "thumb_3d": false,
    "is_3d": false,
    "text_only": false,
    "featured": false,
    "addons": [],
    "variants": []
  },
  {
    "name_en": "Pepsi 0.33L",
    "name_ka": "\u10de\u10d4\u10de\u10e1\u10d8 0.33\u10da",
    "description_en": "Pepsi 0.33L",
    "description_ka": "\u10de\u10d4\u10de\u10e1\u10d8 0.33\u10da",
    "price": "3.7 \u20be",
    "price_old": "",
    "category_name_en": "Drinks & Sauces",
    "sort_order": 1,
    "visible": true,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1,
    "thumbnail_url": "./assets/mugsy/items-webp/pepsi-033l.webp",
    "thumb_3d": false,
    "is_3d": false,
    "text_only": false,
    "featured": false,
    "addons": [],
    "variants": []
  },
  {
    "name_en": "Pepsi 0.5L",
    "name_ka": "\u10de\u10d4\u10de\u10e1\u10d8 0.5\u10da",
    "description_en": "Pepsi 0.5L",
    "description_ka": "\u10de\u10d4\u10de\u10e1\u10d8 0.5\u10da",
    "price": "4.3 \u20be",
    "price_old": "",
    "category_name_en": "Drinks & Sauces",
    "sort_order": 2,
    "visible": true,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1,
    "thumbnail_url": "./assets/mugsy/items-webp/pepsi-0l.webp",
    "thumb_3d": false,
    "is_3d": false,
    "text_only": false,
    "featured": false,
    "addons": [],
    "variants": []
  },
  {
    "name_en": "Mugsy's Sauce",
    "name_ka": "\u10db\u10d0\u10d2\u10e1\u10d8\u10e1 \u10e1\u10dd\u10e3\u10e1\u10d8",
    "description_en": "Mugsy's signature sauce",
    "description_ka": "\u10db\u10d0\u10d2\u10e1\u10d8\u10e1 \u10e1\u10dd\u10e3\u10e1\u10d8",
    "price": "2.5 \u20be",
    "price_old": "",
    "category_name_en": "Drinks & Sauces",
    "sort_order": 3,
    "visible": true,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1,
    "thumbnail_url": "./assets/mugsy/items-webp/mugsys-sauce.webp",
    "thumb_3d": false,
    "is_3d": false,
    "text_only": false,
    "featured": false,
    "addons": [],
    "variants": []
  },
  {
    "name_en": "Large Cheese Sauce",
    "name_ka": "\u10d3\u10d8\u10d3\u10d8 \u10e7\u10d5\u10d4\u10da\u10d8\u10e1 \u10e1\u10dd\u10e3\u10e1\u10d8",
    "description_en": "Large cheese sauce",
    "description_ka": "\u10d3\u10d8\u10d3\u10d8 \u10e7\u10d5\u10d4\u10da\u10d8\u10e1 \u10e1\u10dd\u10e3\u10e1\u10d8",
    "price": "4.7 \u20be",
    "price_old": "",
    "category_name_en": "Drinks & Sauces",
    "sort_order": 4,
    "visible": true,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1,
    "thumbnail_url": "./assets/mugsy/items-webp/large-cheese-sauce.webp",
    "thumb_3d": false,
    "is_3d": false,
    "text_only": false,
    "featured": false,
    "addons": [],
    "variants": []
  },
  {
    "name_en": "Ketchup",
    "name_ka": "\u10d9\u10d4\u10e2\u10e9\u10e3\u10de\u10d8",
    "description_en": "Ketchup",
    "description_ka": "\u10d9\u10d4\u10e2\u10e9\u10e3\u10de\u10d8",
    "price": "2.5 \u20be",
    "price_old": "",
    "category_name_en": "Drinks & Sauces",
    "sort_order": 5,
    "visible": true,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1,
    "thumbnail_url": "./assets/mugsy/items-webp/ketchup.webp",
    "thumb_3d": false,
    "is_3d": false,
    "text_only": false,
    "featured": false,
    "addons": [],
    "variants": []
  },
  {
    "name_en": "Small Cheese Sauce",
    "name_ka": "\u10de\u10d0\u10e2\u10d0\u10e0\u10d0 \u10e7\u10d5\u10d4\u10da\u10d8\u10e1 \u10e1\u10dd\u10e3\u10e1\u10d8",
    "description_en": "Small cheese sauce",
    "description_ka": "\u10de\u10d0\u10e2\u10d0\u10e0\u10d0 \u10e7\u10d5\u10d4\u10da\u10d8\u10e1 \u10e1\u10dd\u10e3\u10e1\u10d8",
    "price": "3 \u20be",
    "price_old": "",
    "category_name_en": "Drinks & Sauces",
    "sort_order": 6,
    "visible": true,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1,
    "thumbnail_url": "./assets/mugsy/items-webp/small-cheese-sauce.webp",
    "thumb_3d": false,
    "is_3d": false,
    "text_only": false,
    "featured": false,
    "addons": [],
    "variants": []
  }
]$mugsy_items$::jsonb)
    as t(
      name_en text,
      name_ka text,
      description_en text,
      description_ka text,
      price text,
      price_old text,
      category_name_en text,
      sort_order integer,
      visible boolean,
      model text,
      model_usdz text,
      ar_scale numeric,
      thumbnail_url text,
      thumb_3d boolean,
      is_3d boolean,
      text_only boolean,
      featured boolean,
      addons jsonb,
      variants jsonb
    )
)
insert into public.menu_items (
  restaurant_id, name_en, name_ka, description_en, description_ka, price, price_old,
  category_id, model, model_usdz, sort_order, visible, ar_scale,
  thumbnail_url, thumb_3d, is_3d, text_only, featured, addons, variants
)
select
  59,
  src.name_en,
  src.name_ka,
  src.description_en,
  src.description_ka,
  src.price,
  nullif(src.price_old, ''),
  (
    select c.id
      from public.categories c
     where c.restaurant_id = 59
       and c.name_en = src.category_name_en
  ),
  src.model,
  src.model_usdz,
  src.sort_order,
  src.visible,
  src.ar_scale,
  src.thumbnail_url,
  src.thumb_3d,
  src.is_3d,
  src.text_only,
  src.featured,
  coalesce(src.addons, '[]'::jsonb),
  coalesce(src.variants, '[]'::jsonb)
from src
on conflict (restaurant_id, name_en) do update
set name_ka = excluded.name_ka,
    description_en = excluded.description_en,
    description_ka = excluded.description_ka,
    price = excluded.price,
    price_old = excluded.price_old,
    category_id = excluded.category_id,
    model = excluded.model,
    model_usdz = excluded.model_usdz,
    sort_order = excluded.sort_order,
    visible = excluded.visible,
    ar_scale = excluded.ar_scale,
    thumbnail_url = excluded.thumbnail_url,
    thumb_3d = excluded.thumb_3d,
    is_3d = excluded.is_3d,
    text_only = excluded.text_only,
    featured = excluded.featured,
    addons = excluded.addons,
    variants = excluded.variants;

-- ── theme config ────────────────────────────────────────────────────────
with src as (
  select * from jsonb_to_recordset($mugsy_theme$[
  {
    "key": "template_key",
    "value": "mugsy_street_diner"
  },
  {
    "key": "default_theme",
    "value": "day"
  },
  {
    "key": "site_name",
    "value": "Mugsy's Burgers"
  },
  {
    "key": "site_name_ka",
    "value": "Mugsy's Burgers"
  },
  {
    "key": "logo_url",
    "value": "./assets/mugsy/logo.svg"
  },
  {
    "key": "hero_logo_url",
    "value": "./assets/mugsy/logo.svg"
  },
  {
    "key": "hero_image_url",
    "value": "./assets/mugsy/hero-burger.webp"
  },
  {
    "key": "hero_images",
    "value": "[\"./assets/mugsy/hero-burger.webp\",\"./assets/mugsy/hero-official.webp\"]"
  },
  {
    "key": "hero_kicker",
    "value": "Smash burgers in Tbilisi"
  },
  {
    "key": "hero_kicker_ka",
    "value": "\u10e1\u10db\u10d4\u10e8 \u10d1\u10e3\u10e0\u10d2\u10d4\u10e0\u10d4\u10d1\u10d8 \u10d7\u10d1\u10d8\u10da\u10d8\u10e1\u10e8\u10d8"
  },
  {
    "key": "hero_copy",
    "value": "Fast, saucy burgers, boxes, sides, drinks, and an interactive BetaReal menu experience."
  },
  {
    "key": "hero_copy_ka",
    "value": "\u10e1\u10ec\u10e0\u10d0\u10e4\u10d8, \u10e1\u10dd\u10e3\u10e1\u10d8\u10d0\u10dc\u10d8 \u10d1\u10e3\u10e0\u10d2\u10d4\u10e0\u10d4\u10d1\u10d8, \u10d1\u10dd\u10e5\u10e1\u10d4\u10d1\u10d8, \u10e1\u10d0\u10d8\u10d3\u10d4\u10d1\u10d8, \u10e1\u10d0\u10e1\u10db\u10d4\u10da\u10d4\u10d1\u10d8 \u10d3\u10d0 BetaReal-\u10d8\u10e1 \u10d8\u10dc\u10e2\u10d4\u10e0\u10d0\u10e5\u10e2\u10d8\u10e3\u10da\u10d8 \u10db\u10d4\u10dc\u10d8\u10e3\u10e1 \u10d2\u10d0\u10db\u10dd\u10ea\u10d3\u10d8\u10da\u10d4\u10d1\u10d0."
  },
  {
    "key": "hero_cta",
    "value": "See menu"
  },
  {
    "key": "hero_cta_ka",
    "value": "\u10db\u10d4\u10dc\u10d8\u10e3\u10e1 \u10dc\u10d0\u10ee\u10d5\u10d0"
  },
  {
    "key": "info_kicker",
    "value": "Find Mugsy"
  },
  {
    "key": "info_kicker_ka",
    "value": "\u10d8\u10de\u10dd\u10d5\u10d4 Mugsy"
  },
  {
    "key": "info_title",
    "value": "Two Tbilisi locations"
  },
  {
    "key": "info_title_ka",
    "value": "\u10dd\u10e0\u10d8 \u10da\u10dd\u10d9\u10d0\u10ea\u10d8\u10d0 \u10d7\u10d1\u10d8\u10da\u10d8\u10e1\u10e8\u10d8"
  },
  {
    "key": "info_text",
    "value": "8/2 Petre Melikishvili Street\n63 Vazha Pshavela Avenue"
  },
  {
    "key": "info_text_ka",
    "value": "\u10de\u10d4\u10e2\u10e0\u10d4 \u10db\u10d4\u10da\u10d8\u10e5\u10d8\u10e8\u10d5\u10d8\u10da\u10d8\u10e1 \u10e5\u10e3\u10e9\u10d0 8/2\n\u10d5\u10d0\u10df\u10d0-\u10e4\u10e8\u10d0\u10d5\u10d4\u10da\u10d0\u10e1 \u10d2\u10d0\u10db\u10d6\u10d8\u10e0\u10d8 63"
  },
  {
    "key": "mugsy_order_links",
    "value": "[{\"label\":\"Wolt\",\"url\":\"https://wolt.com/en/geo/tbilisi/restaurant/magsys-burger?srsltid=AfmBOor5reRoicmEFy72EUVGZI728ljsK4D7Hgb7NPpE_PPSjNq7Z9At\"},{\"label\":\"Glovo\",\"url\":\"https://glovoapp.com/en/ge/tbilisi/stores/mugsy-s-burger-tbi\"}]"
  },
  {
    "key": "mugsy_locations",
    "value": "[{\"label\":\"8/2 Petre Melikishvili Street\",\"label_ka\":\"\u10de\u10d4\u10e2\u10e0\u10d4 \u10db\u10d4\u10da\u10d8\u10e5\u10d8\u10e8\u10d5\u10d8\u10da\u10d8\u10e1 \u10e5\u10e3\u10e9\u10d0 8/2\",\"url\":\"https://www.google.com/maps/search/?api=1&query=8%2F2%20Petre%20Melikishvili%20Street%2C%20Tbilisi\"},{\"label\":\"63 Vazha Pshavela Avenue\",\"label_ka\":\"\u10d5\u10d0\u10df\u10d0-\u10e4\u10e8\u10d0\u10d5\u10d4\u10da\u10d0\u10e1 \u10d2\u10d0\u10db\u10d6\u10d8\u10e0\u10d8 63\",\"url\":\"https://www.google.com/maps/search/?api=1&query=63%20Vazha%20Pshavela%20Avenue%2C%20Tbilisi\"}]"
  },
  {
    "key": "empty_title",
    "value": "Menu is coming to BetaReal"
  },
  {
    "key": "empty_title_ka",
    "value": "\u10db\u10d4\u10dc\u10d8\u10e3 \u10db\u10d0\u10da\u10d4 \u10d2\u10d0\u10db\u10dd\u10e9\u10dc\u10d3\u10d4\u10d1\u10d0 BetaReal-\u10e8\u10d8"
  },
  {
    "key": "empty_copy",
    "value": "Mugsy has not published menu items here yet. When data is seeded, official dishes and prices appear automatically."
  },
  {
    "key": "empty_copy_ka",
    "value": "Mugsy-\u10e1 \u10d9\u10d4\u10e0\u10eb\u10d4\u10d1\u10d8 \u10d0\u10e5 \u10ef\u10d4\u10e0 \u10d2\u10d0\u10db\u10dd\u10e5\u10d5\u10d4\u10e7\u10dc\u10d4\u10d1\u10e3\u10da\u10d8 \u10d0\u10e0 \u10d0\u10e0\u10d8\u10e1. \u10db\u10dd\u10dc\u10d0\u10ea\u10d4\u10db\u10d4\u10d1\u10d8\u10e1 \u10e9\u10d0\u10e2\u10d5\u10d8\u10e0\u10d7\u10d5\u10d8\u10e1 \u10e8\u10d4\u10db\u10d3\u10d4\u10d2 \u10dd\u10e4\u10d8\u10ea\u10d8\u10d0\u10da\u10e3\u10e0\u10d8 \u10d9\u10d4\u10e0\u10eb\u10d4\u10d1\u10d8 \u10d3\u10d0 \u10e4\u10d0\u10e1\u10d4\u10d1\u10d8 \u10d0\u10d5\u10e2\u10dd\u10db\u10d0\u10e2\u10e3\u10e0\u10d0\u10d3 \u10d2\u10d0\u10db\u10dd\u10e9\u10dc\u10d3\u10d4\u10d1\u10d0."
  },
  {
    "key": "meta_description",
    "value": "Browse Mugsy's Burgers in Tbilisi with a mobile-first BetaReal digital menu."
  },
  {
    "key": "meta_description_ka",
    "value": "\u10d3\u10d0\u10d0\u10d7\u10d5\u10d0\u10da\u10d8\u10d4\u10e0\u10d4\u10d7 Mugsy's Burgers \u10d7\u10d1\u10d8\u10da\u10d8\u10e1\u10e8\u10d8 BetaReal-\u10d8\u10e1 \u10db\u10dd\u10d1\u10d8\u10da\u10e3\u10e0 \u10db\u10d4\u10dc\u10d8\u10e3\u10e8\u10d8."
  }
]$mugsy_theme$::jsonb) as x(key text, value text)
)
insert into public.theme_config (restaurant_id, key, value)
select 59, key, value from src
on conflict (restaurant_id, key) do update
set value = excluded.value;

notify pgrst, 'reload schema';

-- Validation queries: inspect these before switching to COMMIT.
select 'mugsy_category_count' as check_name, count(*) as value
  from public.categories
 where restaurant_id = 59;

select 'mugsy_visible_menu_item_count' as check_name, count(*) as value
  from public.menu_items
 where restaurant_id = 59
   and visible = true;

select 'mugsy_photo_item_count' as check_name, count(*) as value
  from public.menu_items
 where restaurant_id = 59
   and visible = true
   and coalesce(thumbnail_url, '') <> '';

select 'mugsy_3d_item_count' as check_name, count(*) as value
  from public.menu_items
 where restaurant_id = 59
   and visible = true
   and (coalesce(is_3d, false) = true
        or coalesce(thumb_3d, false) = true
        or coalesce(model, '') <> ''
        or coalesce(model_usdz, '') <> '');

select restaurant_id, name_en, count(*) as duplicate_count
  from public.menu_items
 where restaurant_id = 59
 group by restaurant_id, name_en
having count(*) > 1;

select mi.id, mi.name_en, mi.category_id
  from public.menu_items mi
  left join public.categories c
    on c.id = mi.category_id
 where mi.restaurant_id = 59
   and (mi.category_id is null or c.id is null);

select mi.id, mi.name_en, mi.category_id, c.restaurant_id as category_restaurant_id
  from public.menu_items mi
  join public.categories c on c.id = mi.category_id
 where mi.restaurant_id = 59
   and c.restaurant_id <> 59;

-- COMMIT switch: replace the next line with COMMIT; after validation and approval.
ROLLBACK;
