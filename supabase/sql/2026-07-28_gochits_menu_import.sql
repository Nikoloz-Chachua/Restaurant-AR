-- Gochit's Monster Burgers menu — brand 54, branch "gochit-s-burger-main" (restaurant_id 60).
--
-- Sources:
--   * 12 items from wolt.com/.../gochits-monster-burgers via Wolt's public
--     assortment API, pulled 2026-07-28. All have photos.
--   * 3 items named in the design brief (Chicken Fillet with Parmesan, Chicken
--     Roll, Chicken Bowl). These are NOT on their Wolt listing — prices are
--     taken on trust from the brief and they have no photo, so they import as
--     text_only rows.
--
-- 4 categories, only ones with items. The brief listed nine; Burger Combos,
-- Sauces, Drinks and Beer have nothing to put in them and an empty pill that
-- shows nothing when tapped reads as a broken menu.
--
-- "Specials" is not a category: the hero cards come from the `featured` flag,
-- so a dish is never duplicated between Specials and its real section.
-- Featured: The Monster, Giant Burger.
--
-- Photos ship in this repo under img/gochits/dishes/ and are served by
-- Cloudflare Pages. Deploy the branch BEFORE committing this.
--
-- Requires 2026-07-28_menu_item_featured.sql (already applied).
--
-- Default safety is ROLLBACK. To execute after review, change only the final
-- line from ROLLBACK; to COMMIT;

BEGIN;

do $$
begin
  if not exists (
    select 1 from public.restaurants
     where id = 60 and slug = 'gochit-s-burger-main' and brand_id = 54
  ) then
    raise exception 'Gochit identity assertion failed for restaurant %, slug %, brand %',
      60, 'gochit-s-burger-main', 54;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'menu_items' and column_name = 'featured'
  ) then
    raise exception 'menu_items.featured is missing';
  end if;
end $$;

-- Repair the empty placeholder "Featured" category the tenant wizard creates.
do $$
declare
  v_id bigint; v_refs integer;
begin
  select id into v_id from public.categories
   where restaurant_id = 60 and lower(name_en) = 'featured' limit 1;
  if v_id is not null then
    select count(*) into v_refs from public.menu_items
     where restaurant_id = 60 and category_id = v_id;
    if v_refs = 0 and not exists (
      select 1 from public.categories where restaurant_id = 60 and name_en = 'Burgers'
    ) then
      update public.categories
         set name_en = 'Burgers', name_ka = 'ბურგერები', sort_order = 1
       where id = v_id and restaurant_id = 60;
    end if;
  end if;
end $$;

with src as (
  select * from jsonb_to_recordset($gb_categories$[
  {
    "name_en": "Burgers",
    "name_ka": "ბურგერები",
    "sort_order": 1
  },
  {
    "name_en": "Wraps & Bowls",
    "name_ka": "რეპები და ბოულები",
    "sort_order": 2
  },
  {
    "name_en": "Chicken Wings",
    "name_ka": "ქათმის ფრთები",
    "sort_order": 3
  },
  {
    "name_en": "Sides",
    "name_ka": "გარნირი",
    "sort_order": 4
  }
]$gb_categories$::jsonb)
    as t(name_en text, name_ka text, sort_order int)
)
insert into public.categories (restaurant_id, name_en, name_ka, sort_order)
select 60, src.name_en, src.name_ka, src.sort_order
from src
on conflict (restaurant_id, name_en) do update
set name_ka = excluded.name_ka, sort_order = excluded.sort_order;

with src as (
  select * from jsonb_to_recordset($gb_items$[
  {
    "name_en": "The Monster",
    "name_ka": "The Monster",
    "description_en": "Buns, special sauce,100% natural fresh beef patties 300g, triple cheddar cheese, bacon,  iceberg lettuce and french fries",
    "description_ka": "სპეც სოუსი, ნატურალური\nსაქონლის ხორცი 300 გრ, ყველი\nჩედარი აისბერგი, ხახვი,ბეკონი,\nკიტრის მარინადი და კარტოფილი ფრი",
    "price": "28.00 ₾",
    "category_name_en": "Burgers",
    "sort_order": 1,
    "featured": true,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/gochits/dishes/the-monster.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Giant Burger",
    "name_ka": "Giant Burger",
    "description_en": "Buns, special sauce,100% natural fresh beef patties 500g,  cheddar cheese, iceberg lettuce, bacon and french fries",
    "description_ka": "სპეც სოუსი, ნატურალური\nსაქონლის ხორცი 500 გრ, ყველი\nჩედარი აისბერგი, ხახვი,ბეკონი,\nკიტრის მარინადი და კარტოფილი ფრი",
    "price": "43.50 ₾",
    "category_name_en": "Burgers",
    "sort_order": 2,
    "featured": true,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/gochits/dishes/giant-burger.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Gochits Burger",
    "name_ka": "Gochits Burger",
    "description_en": "Buns, special sauce,100% natural fresh beef patty, cheddar cheese, iceberg lettuce",
    "description_ka": "სპეც სოუსი, ნატურალური\nსაქონლის ხორცი 100 გრ, ყველი\nჩედარი აისბერგი, ხახვი, კიტრის\nმარინადი",
    "price": "14.50 ₾",
    "category_name_en": "Burgers",
    "sort_order": 3,
    "featured": false,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/gochits/dishes/gochits-burger.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Double Smashed",
    "name_ka": "Double Smashed",
    "description_en": "Buns, special sauce,100% natural fresh beef patties 200g, double cheddar cheese, iceberg lettuce",
    "description_ka": "სპეც სოუსი, ნატურალური\nსაქონლის ხორცი 200 გრ, ყველი\nჩედარი აისბერგი, ხახვი, კიტრის\nმარინადი",
    "price": "19.00 ₾",
    "category_name_en": "Burgers",
    "sort_order": 4,
    "featured": false,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/gochits/dishes/double-smashed.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Jalapeño Burger",
    "name_ka": "Jalapeno Triple",
    "description_en": "420 gr beef patty, potato patty, cheddar cheese, bacon, jalapeno, special sauce, Iceberg lettuce, onion topped with Tobasco sauce, french fries",
    "description_ka": "სპეც სოუსი, ნატურალური\nსაქონლის ხორცი 420 გრ, ყველი\nჩედარი ორმაგი,აისბერგი,\nჰალაპენიო,ხახვი, კიტრი და კარტოფილი ფრი",
    "price": "31.50 ₾",
    "category_name_en": "Burgers",
    "sort_order": 5,
    "featured": false,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/gochits/dishes/jalapeno-burger.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "BBQ",
    "name_ka": "BBQ",
    "description_en": "280 gr Bacon and Beef Patty mix, potato roll, cheddar, barbecue sauce, special sauce, onion, french fries",
    "description_ka": "სპეც სოუსი,ბარბექიუს სოუსი\nნატურალური საქონლის ხორცი\n280 გრ შერეული მოხრაკულ\nბეკონში, ყველი ჩედარი\nაისბერგი, ხახვი, ბეკონი,კიტრის\nმარინადი და კარტოფილი ფრი",
    "price": "35.00 ₾",
    "category_name_en": "Burgers",
    "sort_order": 6,
    "featured": false,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/gochits/dishes/bbq.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Mexican",
    "name_ka": "Mexican Hot",
    "description_en": "280 gr Beef,  bacon, patty, cheddar, Tobasco sauce, mustard, potato roll, onion, jalapeno, french fries",
    "description_ka": "ტკბილი მდოგვი,სპეც სოუსი,\nჰალაპენიო,ტობასკო,\nნატურალური საქონლის ხორცი\n280 გრ, ყველი ჩედარი აისბერგი,\nხახვი, კიტრის მარინადი და კარტოფილი ფრი",
    "price": "29.00 ₾",
    "category_name_en": "Burgers",
    "sort_order": 7,
    "featured": false,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/gochits/dishes/mexican.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "2 X Chicken Burger",
    "name_ka": "2 X Chicken Burger",
    "description_en": "Chicken burger\nSpecial sauce\nIn chicken barley shield\nCheddar cheese\nIceberg\nOnions\nCucumber marinade\ntomato",
    "description_ka": "ქათმის ბურგერი\nსპეც სოუსი\nქათმის ბარკლის ფარში\nყველი ჩედარი\nაიზბერგი\nხახვი\nკიტრის მარინადი\nპომიდორი",
    "price": "15.70 ₾",
    "category_name_en": "Burgers",
    "sort_order": 8,
    "featured": false,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/gochits/dishes/2-x-chicken-burger.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Chicken Wings 6pcs",
    "name_ka": "ქათმის ფრთები ცხარე 6 ცალი",
    "description_en": "",
    "description_ka": "",
    "price": "10.50 ₾",
    "category_name_en": "Chicken Wings",
    "sort_order": 1,
    "featured": false,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/gochits/dishes/chicken-wings-6pcs.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Chicken Wings 12pcs",
    "name_ka": "ქათმის ფრთები ცხარე 12 ცალი",
    "description_en": "",
    "description_ka": "",
    "price": "18.50 ₾",
    "category_name_en": "Chicken Wings",
    "sort_order": 2,
    "featured": false,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/gochits/dishes/chicken-wings-12pcs.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "French Fries",
    "name_ka": "კარტოფილი ფრი პატარა 200გრ.",
    "description_en": "",
    "description_ka": "",
    "price": "5.00 ₾",
    "category_name_en": "Sides",
    "sort_order": 1,
    "featured": false,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/gochits/dishes/french-fries.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "French fries large 350g.",
    "name_ka": "კარტოფილი ფრი დიდი 350გრ.",
    "description_en": "",
    "description_ka": "",
    "price": "8.00 ₾",
    "category_name_en": "Sides",
    "sort_order": 2,
    "featured": false,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/gochits/dishes/french-fries-large-350g.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Chicken Fillet with Parmesan",
    "name_ka": "ქათმის ფილე პარმეზანით",
    "description_en": "",
    "description_ka": "",
    "price": "24.00 ₾",
    "category_name_en": "Wraps & Bowls",
    "sort_order": 1,
    "featured": false,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "",
    "thumb_3d": false,
    "text_only": true
  },
  {
    "name_en": "Chicken Roll",
    "name_ka": "ჩიქენ როლი",
    "description_en": "",
    "description_ka": "",
    "price": "16.50 ₾",
    "category_name_en": "Wraps & Bowls",
    "sort_order": 2,
    "featured": false,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "",
    "thumb_3d": false,
    "text_only": true
  },
  {
    "name_en": "Chicken Bowl",
    "name_ka": "ჩიქენ ბოული",
    "description_en": "",
    "description_ka": "",
    "price": "17.50 ₾",
    "category_name_en": "Wraps & Bowls",
    "sort_order": 3,
    "featured": false,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "",
    "thumb_3d": false,
    "text_only": true
  }
]$gb_items$::jsonb)
    as t(
      name_en text, name_ka text, description_en text, description_ka text,
      price text, category_name_en text, sort_order int, featured boolean,
      visible boolean, is_3d boolean, model text, model_usdz text,
      ar_scale numeric, thumbnail_url text, thumb_3d boolean, text_only boolean
    )
)
insert into public.menu_items (
  restaurant_id, name_en, name_ka, description_en, description_ka, price,
  category_id, model, model_usdz, sort_order, visible, ar_scale,
  thumbnail_url, thumb_3d, is_3d, text_only, featured
)
select
  60, src.name_en, src.name_ka, src.description_en, src.description_ka, src.price,
  (select c.id from public.categories c
    where c.restaurant_id = 60 and c.name_en = src.category_name_en),
  src.model, src.model_usdz, src.sort_order, src.visible, src.ar_scale,
  src.thumbnail_url, src.thumb_3d, src.is_3d, src.text_only, src.featured
from src
on conflict (restaurant_id, name_en) do update
set name_ka = excluded.name_ka,
    description_en = excluded.description_en,
    description_ka = excluded.description_ka,
    price = excluded.price,
    category_id = excluded.category_id,
    sort_order = excluded.sort_order,
    visible = excluded.visible,
    thumbnail_url = excluded.thumbnail_url,
    is_3d = excluded.is_3d,
    text_only = excluded.text_only,
    featured = excluded.featured;

select json_build_object(
  'categories',     (select count(*) from public.categories where restaurant_id = 60),
  'category_names', (select json_agg(name_en order by sort_order) from public.categories where restaurant_id = 60),
  'items',          (select count(*) from public.menu_items where restaurant_id = 60),
  'with_photo',     (select count(*) from public.menu_items where restaurant_id = 60 and coalesce(thumbnail_url,'') <> ''),
  'text_only',      (select count(*) from public.menu_items where restaurant_id = 60 and text_only),
  'featured',       (select json_agg(name_en) from public.menu_items where restaurant_id = 60 and featured),
  'any_3d',         (select count(*) from public.menu_items where restaurant_id = 60 and coalesce(is_3d,false)),
  'dupes',          (select count(*) from (select name_en from public.menu_items where restaurant_id = 60 group by name_en having count(*) > 1) d),
  'orphans',        (select count(*) from public.menu_items mi left join public.categories c on c.id = mi.category_id
                       where mi.restaurant_id = 60 and (mi.category_id is null or c.id is null or c.restaurant_id <> 60)),
  'blank_names',    (select count(*) from public.menu_items where restaurant_id = 60
                       and (coalesce(trim(name_en),'') = '' or coalesce(trim(name_ka),'') = ''))
) as validation;

-- COMMIT switch: replace the next line with COMMIT; after validation.
ROLLBACK;
