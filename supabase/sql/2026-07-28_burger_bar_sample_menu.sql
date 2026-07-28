-- Burger Bar sample menu — brand 51, branch "Kazbegi" (burger-bar-main, restaurant_id 57).
--
-- Source: wolt.com/en/geo/tbilisi/restaurant/burger-bar-saburtalo via Wolt's
-- public assortment API, pulled 2026-07-28.
--
-- ⚠ The source is the SABURTALO branch; this tenant is KAZBEGI. Deliberate —
-- this menu is a small outreach sample, not a verified per-branch price list.
-- Wolt prices may also carry a delivery margin over dine-in.
--
-- 9 items across 7 categories: three burgers plus one from each of the
-- other six. Wolt's 13 categories (six of them burger types) were consolidated.
-- Miami Burger and Jack Daniels Burger are flagged `featured`, so they render as
-- the signature hero cards; that is editable per item in the admin panel.
--
-- Photos ship in this repo under img/burger-bar/dishes/ and are served by
-- Cloudflare Pages. Deploy the branch BEFORE committing this, or the menu
-- renders with broken images.
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
     where id = 57 and slug = 'burger-bar-main' and brand_id = 51
  ) then
    raise exception 'Burger Bar identity assertion failed for restaurant %, slug %, brand %',
      57, 'burger-bar-main', 51;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'menu_items' and column_name = 'featured'
  ) then
    raise exception 'menu_items.featured is missing — apply 2026-07-28_menu_item_featured.sql first';
  end if;
end $$;

-- The tenant was created with an empty placeholder "Featured" category. Rename
-- it to the first real category rather than leaving a dead pill on the menu,
-- but only when nothing references it and the target name is free.
do $$
declare
  v_id bigint;
  v_refs integer;
begin
  select id into v_id from public.categories
   where restaurant_id = 57 and lower(name_en) = 'featured' limit 1;
  if v_id is not null then
    select count(*) into v_refs from public.menu_items
     where restaurant_id = 57 and category_id = v_id;
    if v_refs = 0 and not exists (
      select 1 from public.categories where restaurant_id = 57 and name_en = 'Burgers'
    ) then
      update public.categories
         set name_en = 'Burgers', name_ka = 'ბურგერები', sort_order = 1
       where id = v_id and restaurant_id = 57;
    end if;
  end if;
end $$;

-- ── categories ──────────────────────────────────────────────────────────
with src as (
  select * from jsonb_to_recordset($bb_categories$[
  {
    "name_en": "Burgers",
    "name_ka": "ბურგერები",
    "sort_order": 1
  },
  {
    "name_en": "Chicken",
    "name_ka": "ქათამი",
    "sort_order": 2
  },
  {
    "name_en": "Appetizers",
    "name_ka": "ცხელი კერძები",
    "sort_order": 3
  },
  {
    "name_en": "Salads",
    "name_ka": "სალათები",
    "sort_order": 4
  },
  {
    "name_en": "Soups",
    "name_ka": "სუპები",
    "sort_order": 5
  },
  {
    "name_en": "Sauces",
    "name_ka": "სოუსები",
    "sort_order": 6
  },
  {
    "name_en": "Drinks",
    "name_ka": "სასმელები",
    "sort_order": 7
  }
]$bb_categories$::jsonb)
    as t(name_en text, name_ka text, sort_order int)
)
insert into public.categories (restaurant_id, name_en, name_ka, sort_order)
select 57, src.name_en, src.name_ka, src.sort_order
from src
on conflict (restaurant_id, name_en) do update
set name_ka = excluded.name_ka,
    sort_order = excluded.sort_order;

-- ── menu items ──────────────────────────────────────────────────────────
with src as (
  select * from jsonb_to_recordset($bb_items$[
  {
    "name_en": "Miami Burger",
    "name_ka": "მაიამი ბურგერი",
    "description_en": "Burger bun, mixed meat cutlet, tomato, cheese, iceberg, pineapple, special sauce.",
    "description_ka": "ბურგერის ფუნთუშა ,შერეული ხორცის კატლეტი,პომიდორი,ხახცი,აიზბერგი,ანანასი,სპეც სოუსი.",
    "price": "24.90 ₾",
    "category_name_en": "Burgers",
    "sort_order": 1,
    "featured": true,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burger-bar/dishes/miami-burger.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Jack Daniels Burger",
    "name_ka": "ჯეკ დენიელსი",
    "description_en": "Meat, iceberg, tomato, Jack Daniels sauce, cheese sauce, bacon, mustard",
    "description_ka": "ბურგერის ფუნთუშა,შერეული ხორცის კატლეტი,აიზბერგი,პომიდორი ,ხახვის რგოლები ,ჯეკ დენიელსის სოუსი, ყველის სოუსი ,შემწვარი ბეკონი",
    "price": "34.90 ₾",
    "category_name_en": "Burgers",
    "sort_order": 2,
    "featured": true,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burger-bar/dishes/jack-daniels-burger.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Classic Cheeseburger",
    "name_ka": "კლასიკ ჩიზბურგერი",
    "description_en": "Meat, tomato, cucumber, sour cucumber, onion, iceberg salad, cheese cheddar, special sauce",
    "description_ka": "ბურგერის ფუნთუშა,შერეული ხორცის კატლეტი,აიზბერგი,პომიდორი ,ხახვი,კალსიკური სოუსი ,ჩედარი, მჟავე კიტრი.",
    "price": "28.90 ₾",
    "category_name_en": "Burgers",
    "sort_order": 3,
    "featured": false,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burger-bar/dishes/classic-cheeseburger.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Chicken Burger",
    "name_ka": "ქათმის ბურგერი",
    "description_en": "Burger bun, chicken fillet, tomato, cheese, iceberg, cream cheese, special sauce",
    "description_ka": "ბურგერის ფუნთუშა ,ქათმის ფილე,პომიდორი,ხახცი,აიზბერგი,ნაღების ყველი,სპეც სოუსი",
    "price": "24.90 ₾",
    "category_name_en": "Chicken",
    "sort_order": 1,
    "featured": false,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burger-bar/dishes/chicken-burger.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Chicken Nuggets",
    "name_ka": "ქათმის ნაგეთსი",
    "description_en": "",
    "description_ka": "",
    "price": "26.90 ₾",
    "category_name_en": "Appetizers",
    "sort_order": 1,
    "featured": false,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burger-bar/dishes/chicken-nuggets.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Chicken Caesar",
    "name_ka": "ცეზარი ქათმის",
    "description_en": "Iceberg, chicken fillet, caesar dressing, parmesan, croutons",
    "description_ka": "აიზბერგი,ქათმის ფილე,ცეზარის დრესინგი,პარმეზანი,კრუტონები",
    "price": "33.90 ₾",
    "category_name_en": "Salads",
    "sort_order": 1,
    "featured": false,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burger-bar/dishes/chicken-caesar.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Cheese Soup",
    "name_ka": "ყველის სუპი",
    "description_en": "Gouda, cream cheese, cream, Parmesan, cheese sauce. Croutons are included",
    "description_ka": "გაუდა,ნაღების ყველი,ნაღები,პარმეზანი,ყველის სოუსი.მოყვება კრუტონები",
    "price": "29.90 ₾",
    "category_name_en": "Soups",
    "sort_order": 1,
    "featured": false,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burger-bar/dishes/cheese-soup.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Cheese Sauce",
    "name_ka": "ყველის სოუსი",
    "description_en": "",
    "description_ka": "",
    "price": "6.00 ₾",
    "category_name_en": "Sauces",
    "sort_order": 1,
    "featured": false,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burger-bar/dishes/cheese-sauce.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Water 0.5 L",
    "name_ka": "წყალი 0.5 L",
    "description_en": "",
    "description_ka": "",
    "price": "2.90 ₾",
    "category_name_en": "Drinks",
    "sort_order": 1,
    "featured": false,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burger-bar/dishes/water-0-5-l.webp",
    "thumb_3d": false,
    "text_only": false
  }
]$bb_items$::jsonb)
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
  57, src.name_en, src.name_ka, src.description_en, src.description_ka, src.price,
  (select c.id from public.categories c
    where c.restaurant_id = 57 and c.name_en = src.category_name_en),
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

-- ── validation: inspect before switching to COMMIT ───────────────────────
select json_build_object(
  'categories',      (select count(*) from public.categories where restaurant_id = 57),
  'category_names',  (select json_agg(name_en order by sort_order) from public.categories where restaurant_id = 57),
  'items',           (select count(*) from public.menu_items where restaurant_id = 57),
  'with_photo',      (select count(*) from public.menu_items where restaurant_id = 57 and coalesce(thumbnail_url,'') <> ''),
  'featured',        (select json_agg(name_en) from public.menu_items where restaurant_id = 57 and featured),
  'any_3d',          (select count(*) from public.menu_items where restaurant_id = 57 and coalesce(is_3d,false)),
  'dupes',           (select count(*) from (select name_en from public.menu_items where restaurant_id = 57 group by name_en having count(*) > 1) d),
  'orphans',         (select count(*) from public.menu_items mi left join public.categories c on c.id = mi.category_id
                        where mi.restaurant_id = 57 and (mi.category_id is null or c.id is null or c.restaurant_id <> 57)),
  'blank_names',     (select count(*) from public.menu_items where restaurant_id = 57
                        and (coalesce(trim(name_en),'') = '' or coalesce(trim(name_ka),'') = ''))
) as validation;

-- COMMIT switch: replace the next line with COMMIT; after validation.
ROLLBACK;
