-- Pipes Burger official menu import - brand_id 56 / restaurant_id 62.
-- Sources: checked-in Wolt legacy assortment snapshots in data/research/pipes, used for menu content provenance only.
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
   where r.id = 62
     and r.slug = 'pipes-burger-main'
     and r.brand_id = 56
     and b.slug = 'pipes-burger';

  if not found then
    raise exception 'PIPES identity assertion failed for restaurant %, slug %, brand %, brand slug %',
      62, 'pipes-burger-main', 56, 'pipes-burger';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'menu_items' and column_name = 'price_old'
  ) then
    raise exception 'menu_items.price_old is missing - apply 2026-07-28_menu_item_price_old.sql first';
  end if;

  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'menu_items' and column_name = 'featured'
  ) then
    raise exception 'menu_items.featured is missing - apply 2026-07-28_menu_item_featured.sql first';
  end if;
end $$;

delete from public.menu_items where restaurant_id = 62;
delete from public.categories where restaurant_id = 62;

with src as (
  select *
  from jsonb_to_recordset($pipes_categories$[
  {
    "name_en": "Burgers",
    "name_ka": "\u10d1\u10e3\u10e0\u10d2\u10d4\u10e0\u10d4\u10d1\u10d8",
    "sort_order": 1
  },
  {
    "name_en": "Soup",
    "name_ka": "\u10e1\u10e3\u10de\u10d8",
    "sort_order": 2
  },
  {
    "name_en": "Sides",
    "name_ka": "\u10e1\u10d0\u10d8\u10d3\u10d8",
    "sort_order": 3
  },
  {
    "name_en": "Sauces",
    "name_ka": "\u10e1\u10dd\u10e3\u10e1\u10d4\u10d1\u10d8",
    "sort_order": 4
  },
  {
    "name_en": "Drinks",
    "name_ka": "\u10e1\u10d0\u10e1\u10db\u10d4\u10da\u10d8",
    "sort_order": 5
  }
]$pipes_categories$::jsonb)
    as t(name_en text, name_ka text, sort_order int)
)
insert into public.categories (restaurant_id, name_en, name_ka, sort_order)
select 62, src.name_en, src.name_ka, src.sort_order
from src
on conflict (restaurant_id, name_en) do update
set name_ka = excluded.name_ka,
    sort_order = excluded.sort_order;

with src as (
  select *
  from jsonb_to_recordset($pipes_items$[
  {
    "name_en": "Cheeseburger",
    "name_ka": "\u10e9\u10d8\u10d6\u10d1\u10e3\u10e0\u10d2\u10d4\u10e0\u10d8",
    "description_en": "With marinated onions, cheddar cheese, tomato, lettuce, gherkins and spicy homemade mayo",
    "description_ka": "\u10ee\u10d0\u10ee\u10d5\u10d8\u10e1 \u10db\u10d0\u10e0\u10d8\u10dc\u10d0\u10d3\u10d8, \u10de\u10dd\u10db\u10d8\u10d3\u10dd\u10e0\u10d8, \u10e7\u10d5\u10d4\u10da\u10d8 \u10e9\u10d4\u10d3\u10d0\u10e0\u10d8 \u10e1\u10d0\u10da\u10d0\u10d7\u10d8\u10e1 \u10e4\u10dd\u10d7\u10dd\u10da\u10d8, \u10db\u10df\u10d0\u10d5\u10d4 \u10d9\u10d8\u10e2\u10e0\u10d8, \u10d0\u10d3\u10d2\u10d8\u10da\u10d6\u10d4 \u10d3\u10d0\u10db\u10d6\u10d0\u10d3\u10d4\u10d1\u10e3\u10da\u10d8 \u10ea\u10ee\u10d0\u10e0\u10d4 \u10e1\u10d0\u10e4\u10d8\u10e0\u10db\u10dd \u10db\u10d0\u10d8\u10dd\u10dc\u10d4\u10d6\u10d8",
    "price": "16.39 \u20be",
    "price_old": "",
    "category_name_en": "Burgers",
    "sort_order": 1,
    "visible": true,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1,
    "thumbnail_url": "./assets/pipes/items-webp/cheeseburger.webp",
    "thumb_3d": false,
    "is_3d": false,
    "text_only": false,
    "featured": false,
    "addons": [],
    "variants": []
  },
  {
    "name_en": "Uptown Burger",
    "name_ka": "\u10d0\u10e4\u10d7\u10d0\u10e3\u10dc\u10d8",
    "description_en": "With pepper cream sauce, topped with cheddar, lettuce, tomato and onion jam and gherkins",
    "description_ka": "\u10de\u10d8\u10da\u10de\u10d8\u10da\u10d8\u10e1 \u10d3\u10d0 \u10dc\u10d0\u10e6\u10d4\u10d1\u10d8\u10e1 \u10e1\u10dd\u10e3\u10e1\u10d8, \u10e7\u10d5\u10d4\u10da\u10d8 \u10e9\u10d4\u10d3\u10d0\u10e0\u10d8, \u10e1\u10d0\u10da\u10d0\u10d7\u10d8\u10e1 \u10e4\u10dd\u10d7\u10dd\u10da\u10d8, \u10db\u10df\u10d0\u10d5\u10d4 \u10d9\u10d8\u10e2\u10e0\u10d8",
    "price": "17.05 \u20be",
    "price_old": "",
    "category_name_en": "Burgers",
    "sort_order": 2,
    "visible": true,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1,
    "thumbnail_url": "./assets/pipes/items-webp/uptown-burger.webp",
    "thumb_3d": false,
    "is_3d": false,
    "text_only": false,
    "featured": false,
    "addons": [],
    "variants": []
  },
  {
    "name_en": "Caesar Burger",
    "name_ka": "\u10ea\u10d4\u10d6\u10d0\u10e0\u10d8",
    "description_en": "Chicken patty topped with parmigiano reggiano flakes, proper caesar sauce, romaine lettuce and tomato",
    "description_ka": "\u10e5\u10d0\u10d7\u10db\u10d8\u10e1 \u10de\u10d4\u10e2\u10d8, \u10de\u10d0\u10e0\u10db\u10d4\u10d6\u10d0\u10dc\u10d8, \u10ea\u10d4\u10d6\u10d0\u10e0\u10d8\u10e1 \u10e1\u10dd\u10e3\u10e1\u10d8, \u10e0\u10dd\u10db\u10d0\u10dc\u10dd, \u10de\u10dd\u10db\u10d8\u10d3\u10dd\u10e0\u10d8",
    "price": "16.5 \u20be",
    "price_old": "",
    "category_name_en": "Burgers",
    "sort_order": 3,
    "visible": true,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1,
    "thumbnail_url": "./assets/pipes/items-webp/caesar-burger.webp",
    "thumb_3d": false,
    "is_3d": false,
    "text_only": false,
    "featured": false,
    "addons": [],
    "variants": []
  },
  {
    "name_en": "Stakehouse",
    "name_ka": "\u10e1\u10e2\u10d4\u10d8\u10d9\u10f0\u10d0\u10e3\u10e1\u10d8",
    "description_en": "Cheddar cheese, mushrooms, bacon, baked garlic mayo and onion rings",
    "description_ka": "\u10e7\u10d5\u10d4\u10da\u10d8 \u10e9\u10d4\u10d3\u10d0\u10e0\u10d8, \u10db\u10dd\u10d7\u10e3\u10e8\u10e3\u10da\u10d8 \u10e1\u10dd\u10d9\u10dd, \u10d1\u10d4\u10d9\u10dd\u10dc\u10d8, \u10d2\u10d0\u10db\u10dd\u10db\u10ea\u10ee\u10d5\u10d0\u10e0\u10d8 \u10dc\u10d8\u10d5\u10e0\u10d8\u10e1 \u10db\u10d0\u10d8\u10dd\u10dc\u10d4\u10d6\u10d8 \u10d3\u10d0 \u10ee\u10e0\u10d0\u10e8\u10e3\u10dc\u10d0 \u10ee\u10d0\u10ee\u10d5\u10d8\u10e1 \u10e0\u10d2\u10dd\u10da\u10d4\u10d1\u10d8",
    "price": "18.59 \u20be",
    "price_old": "",
    "category_name_en": "Burgers",
    "sort_order": 4,
    "visible": true,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1,
    "thumbnail_url": "./assets/pipes/items-webp/stakehouse.webp",
    "thumb_3d": false,
    "is_3d": false,
    "text_only": false,
    "featured": false,
    "addons": [],
    "variants": []
  },
  {
    "name_en": "Pipes Signature Burger",
    "name_ka": "\u10de\u10d0\u10d8\u10de\u10e1\u10d8 \u10e1\u10d0\u10e4\u10d8\u10e0\u10db\u10dd \u10d1\u10e3\u10e0\u10d2\u10d4\u10e0\u10d8",
    "description_en": "Cheddar cheese inside a half-pound patty, topped with bacon, onion jam, gherkins, lettuce and tomato with pipes sauce on a bun",
    "description_ka": "\u10e7\u10d5\u10d4\u10da\u10d8 \u10e9\u10d4\u10d3\u10d0\u10e0\u10d8 230 \u10d2\u10e0\u10d0\u10db\u10d8\u10d0\u10dc\u10d8 \u10de\u10d4\u10e2\u10d8\u10e1 \u10e8\u10e3\u10d0\u10d2\u10e3\u10da\u10e8\u10d8, \u10ee\u10d0\u10ee\u10d5\u10d8\u10e1 \u10ef\u10d4\u10db\u10d8, \u10db\u10df\u10d0\u10d5\u10d4 \u10d9\u10d8\u10e2\u10e0\u10d8, \u10d1\u10d4\u10d9\u10dd\u10dc\u10d8, \u10e1\u10d0\u10da\u10d0\u10d7\u10d8\u10e1 \u10e4\u10dd\u10d7\u10dd\u10da\u10d8, \u10de\u10dd\u10db\u10d8\u10d3\u10dd\u10e0\u10d8, \u10de\u10d0\u10d8\u10de\u10e1 \u10db\u10d0\u10d8\u10dd\u10dc\u10d4\u10d6\u10d8",
    "price": "20.79 \u20be",
    "price_old": "",
    "category_name_en": "Burgers",
    "sort_order": 5,
    "visible": true,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1,
    "thumbnail_url": "./assets/pipes/items-webp/pipes-signature-burger.webp",
    "thumb_3d": false,
    "is_3d": false,
    "text_only": false,
    "featured": true,
    "addons": [],
    "variants": []
  },
  {
    "name_en": "Burgazm",
    "name_ka": "\u10d1\u10e3\u10e0\u10d2\u10d0\u10d6\u10db\u10d8",
    "description_en": "Cheddar cheese inside a half-pound patty, topped with bacon marmalade, grilled onion, jalape\u00f1os (spicy pepper), lettuce and tomato, brushed With homemade PIPES\u00a9 BBQ sauce",
    "description_ka": "\u10e7\u10d5\u10d4\u10da\u10d8 \u10e9\u10d4\u10d3\u10d0\u10e0\u10d8 230 \u10d2\u10e0\u10d0\u10db\u10d8\u10d0\u10dc\u10d8\u10e1 \u10de\u10d4\u10e2\u10d8\u10e1 \u10e8\u10e3\u10d0\u10d2\u10e3\u10da\u10e8\u10d8, \u10d1\u10d4\u10d9\u10dd\u10dc\u10d8\u10e1 \u10db\u10d0\u10e0\u10db\u10d4\u10da\u10d0\u10e2\u10d8, \u10d2\u10e0\u10d8\u10da\u10d6\u10d4 \u10e8\u10d4\u10db\u10ec\u10d5\u10d0\u10e0\u10d8 \u10ee\u10d0\u10ee\u10d5\u10d8, \u10ee\u10d0\u10da\u10d0\u10de\u10d4\u10dc\u10d8\u10dd (\u10ea\u10ee\u10d0\u10e0\u10d4 \u10ec\u10d8\u10ec\u10d0\u10d9\u10d0), \u10de\u10dd\u10db\u10d8\u10d3\u10dd\u10e0\u10d8 \u10d3\u10d0 \u10de\u10d0\u10d8\u10de\u10e1\u10d8\u10e1 \u10d1\u10d1\u10e5 \u10e1\u10dd\u10e3\u10e1\u10d8",
    "price": "20.35 \u20be",
    "price_old": "",
    "category_name_en": "Burgers",
    "sort_order": 6,
    "visible": true,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1,
    "thumbnail_url": "./assets/pipes/items-webp/burgazm.webp",
    "thumb_3d": false,
    "is_3d": false,
    "text_only": false,
    "featured": true,
    "addons": [],
    "variants": []
  },
  {
    "name_en": "Kimchi Burger",
    "name_ka": "\u10d9\u10d8\u10db\u10e9\u10d8",
    "description_en": "Cheddar cheese, lettuce and tomato, with homemade KIMCHI on top",
    "description_ka": "\u10e9\u10d4\u10d3\u10d0\u10e0\u10d8 \u10e7\u10d5\u10d4\u10da\u10d8, \u10e1\u10d0\u10da\u10d0\u10d7\u10d8\u10e1 \u10e4\u10dd\u10d7\u10dd\u10da\u10d8, \u10de\u10dd\u10db\u10d8\u10d3\u10dd\u10e0\u10d8 \u10d3\u10d0 \u10de\u10d0\u10d8\u10de\u10e1\u10d8\u10e1 \u10e1\u10d0\u10e4\u10d8\u10e0\u10db\u10dd \u10d9\u10d8\u10db\u10e9\u10d8",
    "price": "17.6 \u20be",
    "price_old": "",
    "category_name_en": "Burgers",
    "sort_order": 7,
    "visible": true,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1,
    "thumbnail_url": "./assets/pipes/items-webp/kimchi-burger.webp",
    "thumb_3d": false,
    "is_3d": false,
    "text_only": false,
    "featured": false,
    "addons": [],
    "variants": []
  },
  {
    "name_en": "Aloha",
    "name_ka": "\u10d0\u10da\u10dd\u10f0\u10d0",
    "description_en": "Cheddar cheese, lettuce and tomato, with grilled pineapple and PIPES\u00a9 teriyaki sauce!",
    "description_ka": "\u10e7\u10d5\u10d4\u10da\u10d8 \u10e9\u10d4\u10d3\u10d0\u10e0\u10d8, \u10e1\u10d0\u10da\u10d0\u10d7\u10d8\u10e1 \u10e4\u10dd\u10d7\u10dd\u10da\u10d8, \u10de\u10dd\u10db\u10d8\u10d3\u10dd\u10e0\u10d8, \u10d2\u10e0\u10d8\u10da\u10d6\u10d4 \u10e8\u10d4\u10db\u10ec\u10d0\u10d5\u10d0\u10e0\u10d8 \u10d0\u10dc\u10d0\u10dc\u10d0\u10e1\u10d8, \u10e1\u10d0\u10e4\u10d8\u10e0\u10db\u10dd \u10e2\u10d4\u10e0\u10d8\u10d0\u10d9\u10d8\u10e1 \u10e1\u10dd\u10e3\u10e1\u10d8",
    "price": "18.59 \u20be",
    "price_old": "",
    "category_name_en": "Burgers",
    "sort_order": 8,
    "visible": true,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1,
    "thumbnail_url": "./assets/pipes/items-webp/aloha.webp",
    "thumb_3d": false,
    "is_3d": false,
    "text_only": false,
    "featured": false,
    "addons": [],
    "variants": []
  },
  {
    "name_en": "Genovese",
    "name_ka": "\u10ef\u10d4\u10dc\u10dd\u10d5\u10d4\u10d6\u10d4",
    "description_en": "Cheddar cheese, marinated capers and sun dried tomato aioli, arugula, topped with wild cherry tomato and PIPES\u00a9 lemon basil pesto!",
    "description_ka": "\u10e9\u10d4\u10d3\u10d0\u10e0\u10d8\u10e1 \u10e7\u10d5\u10d4\u10da\u10d8, \u10d9\u10d0\u10de\u10d4\u10e0\u10e1\u10d4\u10d1\u10d8\u10e1 \u10d3\u10d0 \u10db\u10d6\u10d4\u10d6\u10d4 \u10d2\u10d0\u10db\u10dd\u10db\u10e8\u10e0\u10d0\u10da\u10d8 \u10de\u10dd\u10db\u10d8\u10d3\u10dd\u10e0\u10d8\u10e1 \u10d0\u10d8\u10dd\u10da\u10d8, \u10e0\u10e3\u10d9\u10dd\u10da\u10d0, \u10de\u10dd\u10db\u10d8\u10d3\u10dd\u10e0\u10d8 \u10e9\u10d4\u10e0\u10d8, \u10e1\u10d0\u10e4\u10d8\u10e0\u10db\u10dd \u10da\u10d8\u10db\u10dc\u10d8\u10e1\u10d0 \u10d3\u10d0 \u10d1\u10d0\u10d6\u10d8\u10da\u10d8\u10d9\u10d8\u10e1 \u10de\u10d4\u10e1\u10e2\u10dd",
    "price": "19.25 \u20be",
    "price_old": "",
    "category_name_en": "Burgers",
    "sort_order": 9,
    "visible": true,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1,
    "thumbnail_url": "./assets/pipes/items-webp/genovese.webp",
    "thumb_3d": false,
    "is_3d": false,
    "text_only": false,
    "featured": false,
    "addons": [],
    "variants": []
  },
  {
    "name_en": "Falafel Burger",
    "name_ka": "\u10e4\u10d0\u10da\u10d0\u10e4\u10d4\u10da \u10d1\u10e3\u10e0\u10d2\u10d4\u10e0\u10d8",
    "description_en": "With falafel patty, homemade HUMMUS on bun, romaine lettuce, tomato, cucumber and tzatziki sauce",
    "description_ka": "\u10e4\u10d0\u10da\u10d0\u10e4\u10d4\u10da\u10d8\u10e1 \u10de\u10d4\u10e2\u10d8, \u10e1\u10d0\u10e4\u10d8\u10e0\u10db\u10dd \u10f0\u10e3\u10db\u10e3\u10e1\u10d8, \u10e0\u10dd\u10db\u10d0\u10dc\u10dd, \u10de\u10dd\u10db\u10d8\u10d3\u10dd\u10e0\u10d8 \u10d3\u10d0 \u10ea\u10d0\u10ea\u10d8\u10d9\u10d8\u10e1 \u10e1\u10dd\u10e3\u10e1\u10d8.",
    "price": "14.3 \u20be",
    "price_old": "",
    "category_name_en": "Burgers",
    "sort_order": 10,
    "visible": true,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1,
    "thumbnail_url": "./assets/pipes/items-webp/falafel-burger.webp",
    "thumb_3d": false,
    "is_3d": false,
    "text_only": false,
    "featured": false,
    "addons": [],
    "variants": []
  },
  {
    "name_en": "Veggie Burger",
    "name_ka": "\u10d5\u10d4\u10ef\u10d8",
    "description_en": "Red bean patty covered with tempura topped with salsa, jalape\u00f1os (spicy pepper), cheddar cheese, lettuce, tomato and homemade mayo",
    "description_ka": "\u10e2\u10d4\u10db\u10de\u10e3\u10e0\u10d0\u10e8\u10d8 \u10d0\u10db\u10dd\u10d5\u10da\u10d4\u10d1\u10e3\u10da\u10d8 \u10da\u10dd\u10d1\u10d8\u10dd\u10e1 \u10de\u10d4\u10e2\u10d8, \u10e1\u10d0\u10da\u10e1\u10d0\u10d7\u10d8 \u10ee\u10d0\u10da\u10d0\u10de\u10d4\u10dc\u10d8\u10dd (\u10ea\u10ee\u10d0\u10e0\u10d4 \u10ec\u10d8\u10ec\u10d0\u10d9\u10d0), \u10e7\u10d5\u10d4\u10da\u10d8 \u10e9\u10d4\u10d3\u10d0\u10e0\u10d8, \u10e1\u10d0\u10da\u10d0\u10d7\u10d8\u10e1 \u10e4\u10dd\u10d7\u10dd\u10da\u10d8 \u10d3\u10d0 \u10e1\u10d0\u10e4\u10d8\u10e0\u10db\u10dd \u10db\u10d0\u10d8\u10dd\u10dc\u10d4\u10d6\u10d8",
    "price": "16.5 \u20be",
    "price_old": "",
    "category_name_en": "Burgers",
    "sort_order": 11,
    "visible": true,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1,
    "thumbnail_url": "./assets/pipes/items-webp/veggie-burger.webp",
    "thumb_3d": false,
    "is_3d": false,
    "text_only": false,
    "featured": false,
    "addons": [],
    "variants": []
  },
  {
    "name_en": "Quesadilla",
    "name_ka": "\u10d9\u10d4\u10e1\u10d0\u10d3\u10d8\u10d0",
    "description_en": "With pulled chicken, homemade BBQ sauce, cheddar cheese, salsa and sour cream",
    "description_ka": "\u10d3\u10d0\u10eb\u10d4\u10dc\u10eb\u10d8\u10da\u10d8 \u10e5\u10d0\u10d7\u10db\u10d8\u10d7 \u10d0\u10dc \u10e9\u10d8\u10da\u10d8 \u10d9\u10dd\u10dc \u10d9\u10d0\u10e0\u10dc\u10d4\u10d7\u10d8, \u10e1\u10d0\u10e4\u10d8\u10e0\u10db\u10dd BBQ \u10e1\u10dd\u10e3\u10e1\u10d8, \u10e9\u10d4\u10d3\u10d0\u10e0\u10d8, \u10e1\u10d0\u10da\u10e1\u10d0 \u10d3\u10d0 \u10d0\u10e0\u10d0\u10df\u10d0\u10dc\u10d8",
    "price": "14.3 \u20be",
    "price_old": "",
    "category_name_en": "Burgers",
    "sort_order": 12,
    "visible": true,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1,
    "thumbnail_url": "./assets/pipes/items-webp/quesadilla.webp",
    "thumb_3d": false,
    "is_3d": false,
    "text_only": false,
    "featured": false,
    "addons": [],
    "variants": []
  },
  {
    "name_en": "Tex-mex Burger",
    "name_ka": "\u10e2\u10d4\u10e5\u10e1-\u10db\u10d4\u10e5\u10e1\u10d8",
    "description_en": "With guacamole, topped with cheddar cheese, tortilla chips, salsa, jalape\u00f1os (spicy pepper)",
    "description_ka": "\u10d2\u10e3\u10d0\u10d9\u10d0\u10db\u10dd\u10da\u10d4, \u10e7\u10d5\u10d4\u10da\u10d8 \u10e9\u10d4\u10d3\u10d0\u10e0\u10d8, \u10e2\u10dd\u10e0\u10e2\u10d8\u10da\u10d0\u10e1 \u10e9\u10d8\u10e4\u10e1\u10d8, \u10e1\u10d0\u10da\u10d0\u10d7\u10d8\u10e1 \u10e4\u10dd\u10d7\u10dd\u10da\u10d8, \u10e1\u10d0\u10da\u10e1\u10d0, \u10ee\u10d0\u10da\u10d0\u10de\u10d4\u10dc\u10dd\u10e1 \u10db\u10d0\u10e0\u10d8\u10dc\u10d0\u10d3\u10d8 (\u10ea\u10ee\u10d0\u10e0\u10d4 \u10ec\u10d8\u10ec\u10d0\u10d9\u10d0)",
    "price": "17.49 \u20be",
    "price_old": "",
    "category_name_en": "Burgers",
    "sort_order": 13,
    "visible": true,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1,
    "thumbnail_url": "./assets/pipes/items-webp/tex-mex-burger.webp",
    "thumb_3d": false,
    "is_3d": false,
    "text_only": false,
    "featured": false,
    "addons": [],
    "variants": []
  },
  {
    "name_en": "Hot Chicken Soup",
    "name_ka": "\u10e5\u10d0\u10d7\u10db\u10d8\u10e1 \u10ea\u10ee\u10d0\u10e0\u10d4 \u10e1\u10e3\u10de\u10d8",
    "description_en": "With mushrooms, lots of pepper, ginger, lemongrass and coconut milk",
    "description_ka": "\u10e1\u10dd\u10d9\u10dd, \u10d1\u10d4\u10d5\u10e0\u10d8 \u10ec\u10d8\u10ec\u10d0\u10d9\u10d0, \u10da\u10d4\u10db\u10dd\u10dc\u10d2\u10e0\u10d0\u10e1\u10d8, \u10d9\u10dd\u10ed\u10d0 \u10d3\u10d0 \u10e5\u10dd\u10e5\u10dd\u10e1\u10d8\u10e1 \u10e0\u10eb\u10d4",
    "price": "8.3 \u20be",
    "price_old": "",
    "category_name_en": "Soup",
    "sort_order": 14,
    "visible": true,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1,
    "thumbnail_url": "./assets/pipes/items-webp/hot-chicken-soup.webp",
    "thumb_3d": false,
    "is_3d": false,
    "text_only": false,
    "featured": false,
    "addons": [],
    "variants": []
  },
  {
    "name_en": "French Fries",
    "name_ka": "\u10d9\u10d0\u10e0\u10e2\u10dd\u10e4\u10d8\u10da\u10d8 \u10e4\u10e0\u10d8",
    "description_en": "",
    "description_ka": "",
    "price": "4.4 \u20be",
    "price_old": "",
    "category_name_en": "Sides",
    "sort_order": 15,
    "visible": true,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1,
    "thumbnail_url": "",
    "thumb_3d": false,
    "is_3d": false,
    "text_only": true,
    "featured": false,
    "addons": [],
    "variants": []
  },
  {
    "name_en": "Onion Rings",
    "name_ka": "\u10ee\u10d0\u10ee\u10d5\u10d8\u10e1 \u10e0\u10d2\u10dd\u10da\u10d4\u10d1\u10d8",
    "description_en": "",
    "description_ka": "",
    "price": "7.7 \u20be",
    "price_old": "",
    "category_name_en": "Sides",
    "sort_order": 16,
    "visible": true,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1,
    "thumbnail_url": "",
    "thumb_3d": false,
    "is_3d": false,
    "text_only": true,
    "featured": false,
    "addons": [],
    "variants": []
  },
  {
    "name_en": "Ketchup",
    "name_ka": "\u10d9\u10d4\u10e2\u10e9\u10e3\u10de\u10d8",
    "description_en": "",
    "description_ka": "",
    "price": "2.2 \u20be",
    "price_old": "",
    "category_name_en": "Sauces",
    "sort_order": 17,
    "visible": true,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1,
    "thumbnail_url": "",
    "thumb_3d": false,
    "is_3d": false,
    "text_only": true,
    "featured": false,
    "addons": [],
    "variants": []
  },
  {
    "name_en": "Mayonnaise",
    "name_ka": "\u10db\u10d0\u10d8\u10dd\u10dc\u10d4\u10d6\u10d8",
    "description_en": "",
    "description_ka": "",
    "price": "2.2 \u20be",
    "price_old": "",
    "category_name_en": "Sauces",
    "sort_order": 18,
    "visible": true,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1,
    "thumbnail_url": "",
    "thumb_3d": false,
    "is_3d": false,
    "text_only": true,
    "featured": false,
    "addons": [],
    "variants": []
  },
  {
    "name_en": "BBQ sauce",
    "name_ka": "BBQ",
    "description_en": "",
    "description_ka": "",
    "price": "2.75 \u20be",
    "price_old": "",
    "category_name_en": "Sauces",
    "sort_order": 19,
    "visible": true,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1,
    "thumbnail_url": "",
    "thumb_3d": false,
    "is_3d": false,
    "text_only": true,
    "featured": false,
    "addons": [],
    "variants": []
  },
  {
    "name_en": "Mustard",
    "name_ka": "\u10db\u10d3\u10dd\u10d2\u10d5\u10d8",
    "description_en": "",
    "description_ka": "",
    "price": "2.75 \u20be",
    "price_old": "",
    "category_name_en": "Sauces",
    "sort_order": 20,
    "visible": true,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1,
    "thumbnail_url": "",
    "thumb_3d": false,
    "is_3d": false,
    "text_only": true,
    "featured": false,
    "addons": [],
    "variants": []
  },
  {
    "name_en": "Coca Cola 0.33 L",
    "name_ka": "\u10d9\u10dd\u10d9\u10d0 \u10d9\u10dd\u10da\u10d0 0.33 L",
    "description_en": "",
    "description_ka": "",
    "price": "2.75 \u20be",
    "price_old": "",
    "category_name_en": "Drinks",
    "sort_order": 21,
    "visible": true,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1,
    "thumbnail_url": "",
    "thumb_3d": false,
    "is_3d": false,
    "text_only": true,
    "featured": false,
    "addons": [],
    "variants": []
  },
  {
    "name_en": "Water 0.5 L",
    "name_ka": "\u10ec\u10e7\u10d0\u10da\u10d8 0.5 L",
    "description_en": "",
    "description_ka": "",
    "price": "1.65 \u20be",
    "price_old": "",
    "category_name_en": "Drinks",
    "sort_order": 22,
    "visible": true,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1,
    "thumbnail_url": "",
    "thumb_3d": false,
    "is_3d": false,
    "text_only": true,
    "featured": false,
    "addons": [],
    "variants": []
  },
  {
    "name_en": "Mineral water 0.5 L",
    "name_ka": "\u10db\u10d8\u10dc\u10d4\u10e0\u10d0\u10da\u10e3\u10e0\u10d8 \u10ec\u10e7\u10d0\u10da\u10d8 0.5 L",
    "description_en": "",
    "description_ka": "",
    "price": "2.2 \u20be",
    "price_old": "",
    "category_name_en": "Drinks",
    "sort_order": 23,
    "visible": true,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1,
    "thumbnail_url": "",
    "thumb_3d": false,
    "is_3d": false,
    "text_only": true,
    "featured": false,
    "addons": [],
    "variants": []
  },
  {
    "name_en": "Argo Beer 0.5 L",
    "name_ka": "\u10da\u10e3\u10d3\u10d8 \u10d0\u10e0\u10d2\u10dd 0.5 L",
    "description_en": "Wheat, malt, water, alcohol 4.8%",
    "description_ka": "\u10e1\u10d5\u10d8\u10d0, \u10d0\u10da\u10d0\u10dd, \u10ec\u10e7\u10d0\u10da\u10d8. \u10d0\u10da\u10d9\u10dd\u10f0\u10dd\u10da\u10d8\u10e1 \u10e8\u10d4\u10db\u10ea\u10d5\u10d4\u10da\u10dd\u10d1\u10d0: 4.8%",
    "price": "5.5 \u20be",
    "price_old": "",
    "category_name_en": "Drinks",
    "sort_order": 24,
    "visible": true,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1,
    "thumbnail_url": "",
    "thumb_3d": false,
    "is_3d": false,
    "text_only": true,
    "featured": false,
    "addons": [],
    "variants": []
  },
  {
    "name_en": "Sprite 0.33 L",
    "name_ka": "\u10e1\u10de\u10e0\u10d0\u10d8\u10e2\u10d8 0.33 L",
    "description_en": "",
    "description_ka": "",
    "price": "2.75 \u20be",
    "price_old": "",
    "category_name_en": "Drinks",
    "sort_order": 25,
    "visible": true,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1,
    "thumbnail_url": "",
    "thumb_3d": false,
    "is_3d": false,
    "text_only": true,
    "featured": false,
    "addons": [],
    "variants": []
  },
  {
    "name_en": "Fanta 0.33 L",
    "name_ka": "\u10e4\u10d0\u10dc\u10e2\u10d0 0.33 L",
    "description_en": "",
    "description_ka": "",
    "price": "2.75 \u20be",
    "price_old": "",
    "category_name_en": "Drinks",
    "sort_order": 26,
    "visible": true,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1,
    "thumbnail_url": "",
    "thumb_3d": false,
    "is_3d": false,
    "text_only": true,
    "featured": false,
    "addons": [],
    "variants": []
  },
  {
    "name_en": "Coca Cola Zero 0.33 L",
    "name_ka": "\u10d9\u10dd\u10d9\u10d0 \u10d9\u10dd\u10da\u10d0 \u10d6\u10d4\u10e0\u10dd 0.33 L",
    "description_en": "",
    "description_ka": "",
    "price": "2.75 \u20be",
    "price_old": "",
    "category_name_en": "Drinks",
    "sort_order": 27,
    "visible": true,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1,
    "thumbnail_url": "",
    "thumb_3d": false,
    "is_3d": false,
    "text_only": true,
    "featured": false,
    "addons": [],
    "variants": []
  }
]$pipes_items$::jsonb)
    as t(
      name_en text,
      name_ka text,
      description_en text,
      description_ka text,
      price text,
      price_old text,
      category_name_en text,
      sort_order int,
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
  restaurant_id,
  name_en,
  name_ka,
  description_en,
  description_ka,
  price,
  price_old,
  category_id,
  sort_order,
  visible,
  model,
  model_usdz,
  ar_scale,
  thumbnail_url,
  thumb_3d,
  is_3d,
  text_only,
  featured,
  addons,
  variants
)
select
  62,
  src.name_en,
  src.name_ka,
  src.description_en,
  src.description_ka,
  src.price,
  src.price_old,
  c.id,
  src.sort_order,
  src.visible,
  src.model,
  src.model_usdz,
  src.ar_scale,
  src.thumbnail_url,
  src.thumb_3d,
  src.is_3d,
  src.text_only,
  src.featured,
  src.addons,
  src.variants
from src
join public.categories c
  on c.restaurant_id = 62
 and c.name_en = src.category_name_en
on conflict (restaurant_id, name_en) do update
set name_ka = excluded.name_ka,
    description_en = excluded.description_en,
    description_ka = excluded.description_ka,
    price = excluded.price,
    price_old = excluded.price_old,
    category_id = excluded.category_id,
    sort_order = excluded.sort_order,
    visible = excluded.visible,
    model = excluded.model,
    model_usdz = excluded.model_usdz,
    ar_scale = excluded.ar_scale,
    thumbnail_url = excluded.thumbnail_url,
    thumb_3d = excluded.thumb_3d,
    is_3d = excluded.is_3d,
    text_only = excluded.text_only,
    featured = excluded.featured,
    addons = excluded.addons,
    variants = excluded.variants;

with src as (
  select *
  from jsonb_to_recordset($pipes_theme$[
  {
    "key": "template_key",
    "value": "pipes_fabrika"
  },
  {
    "key": "default_theme",
    "value": "day"
  },
  {
    "key": "site_name",
    "value": "Pipes Burger"
  },
  {
    "key": "site_name_ka",
    "value": "\u10de\u10d0\u10d8\u10de\u10e1 \u10d1\u10e3\u10e0\u10d2\u10d4\u10e0\u10d8"
  },
  {
    "key": "hero_kicker",
    "value": "Fabrika burger joint"
  },
  {
    "key": "hero_kicker_ka",
    "value": "\u10d1\u10e3\u10e0\u10d2\u10d4\u10e0\u10d4\u10d1\u10d8 \u10e4\u10d0\u10d1\u10e0\u10d8\u10d9\u10d0\u10e8\u10d8"
  },
  {
    "key": "hero_copy",
    "value": "BURGERS. FRIENDS. FABRIKA."
  },
  {
    "key": "hero_copy_ka",
    "value": "\u10d1\u10e3\u10e0\u10d2\u10d4\u10e0\u10d8. \u10db\u10d4\u10d2\u10dd\u10d1\u10e0\u10d4\u10d1\u10d8. \u10e4\u10d0\u10d1\u10e0\u10d8\u10d9\u10d0."
  },
  {
    "key": "hero_cta",
    "value": "Menu"
  },
  {
    "key": "hero_cta_ka",
    "value": "\u10db\u10d4\u10dc\u10d8\u10e3"
  },
  {
    "key": "info_kicker",
    "value": "Location"
  },
  {
    "key": "info_kicker_ka",
    "value": "\u10da\u10dd\u10d9\u10d0\u10ea\u10d8\u10d0"
  },
  {
    "key": "info_title",
    "value": "Find us in Fabrika"
  },
  {
    "key": "info_title_ka",
    "value": "\u10d2\u10d5\u10d8\u10de\u10dd\u10d5\u10d4 \u10e4\u10d0\u10d1\u10e0\u10d8\u10d9\u10d0\u10e8\u10d8"
  },
  {
    "key": "location_address",
    "value": "Fabrika, 8 Egnate Ninoshvili Street, Tbilisi"
  },
  {
    "key": "location_address_ka",
    "value": "\u10e4\u10d0\u10d1\u10e0\u10d8\u10d9\u10d0, \u10d4\u10d2\u10dc\u10d0\u10e2\u10d4 \u10dc\u10d8\u10dc\u10dd\u10e8\u10d5\u10d8\u10da\u10d8\u10e1 \u10e5\u10e3\u10e9\u10d0 8, \u10d7\u10d1\u10d8\u10da\u10d8\u10e1\u10d8"
  },
  {
    "key": "info_text",
    "value": "PIPES Burger Joint at Fabrika. Compact casual seating with warm brick, concrete, wood and black metal."
  },
  {
    "key": "info_text_ka",
    "value": "PIPES Burger Joint \u10e4\u10d0\u10d1\u10e0\u10d8\u10d9\u10d0\u10e8\u10d8. \u10d7\u10d1\u10d8\u10da\u10d8 \u10d0\u10d2\u10e3\u10e0\u10d8, \u10d1\u10d4\u10e2\u10dd\u10dc\u10d8, \u10ee\u10d4 \u10d3\u10d0 \u10e8\u10d0\u10d5\u10d8 \u10db\u10d4\u10e2\u10d0\u10da\u10d8\u10e1 \u10d3\u10d4\u10e2\u10d0\u10da\u10d4\u10d1\u10d8."
  },
  {
    "key": "info_directions_label",
    "value": "Directions"
  },
  {
    "key": "info_directions_label_ka",
    "value": "\u10db\u10d8\u10db\u10d0\u10e0\u10d7\u10e3\u10da\u10d4\u10d1\u10d0"
  },
  {
    "key": "info_directions_url",
    "value": "https://www.google.com/maps/dir/?api=1&destination=41.7095131,44.8025001&destination_place_id=PIPES%20Burger%20Joint"
  },
  {
    "key": "hero_image_url",
    "value": "./assets/pipes/items-webp/pipes-signature-burger.webp"
  },
  {
    "key": "document_title_suffix",
    "value": "Fabrika Menu"
  },
  {
    "key": "document_title_suffix_ka",
    "value": "\u10e4\u10d0\u10d1\u10e0\u10d8\u10d9\u10d8\u10e1 \u10db\u10d4\u10dc\u10d8\u10e3"
  }
]$pipes_theme$::jsonb)
    as t(key text, value text)
)
insert into public.theme_config (restaurant_id, key, value)
select 62, src.key, src.value
from src
on conflict (restaurant_id, key) do update
set value = excluded.value;

do $$
declare
  v_category_count int;
  v_item_count int;
  v_image_count int;
begin
  select count(*) into v_category_count from public.categories where restaurant_id = 62;
  select count(*) into v_item_count from public.menu_items where restaurant_id = 62;
  select count(*) into v_image_count from public.menu_items where restaurant_id = 62 and coalesce(thumbnail_url, '') <> '';

  if v_category_count <> 5 then
    raise exception 'expected 5 PIPES categories, found %', v_category_count;
  end if;
  if v_item_count <> 27 then
    raise exception 'expected 27 PIPES menu items, found %', v_item_count;
  end if;
  if v_image_count <> 14 then
    raise exception 'expected 14 PIPES image-backed items, found %', v_image_count;
  end if;
end $$;

ROLLBACK;
