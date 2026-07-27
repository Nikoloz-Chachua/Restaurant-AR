-- Burger Lions menu import — brand "Burger Lions" (burgerlions, brand_id 50),
-- branch "Vazha Pshavela 78a" (burgervazha, restaurant_id 56).
--
-- Source: https://burgerlions.com/menu-tabs/ via their public WooCommerce Store
-- API, exported 2026-07-28. All 66 prices were cross-checked against the
-- rendered page: zero mismatches.
--
-- What this does:
--   1. Asserts it is pointed at the right tenant, and aborts otherwise.
--   2. Repairs the unused placeholder "Featured" category into "Burgers".
--   3. Upserts 5 categories and 66 menu items.
--   4. Applies the burger_lions (Grill House) theme to this tenant only.
--
-- Notes:
--   - Every item is a PHOTO card: is_3d=false, no model. Burger Lions has no GLB
--     scans yet, so no item shows a 3D badge or an AR button.
--   - 27 items carry price_old — their site is running a discount on
--     those. The card shows the old price struck through beside the new one.
--     Requires 2026-07-28_menu_item_price_old.sql to have been applied first.
--   - Photos are served from this repo (img/burgervazha/) through Cloudflare
--     Pages, the same arrangement BAOMA uses. Nothing to upload; they ship with
--     the branch. Pages egress is free, so this does not reintroduce the
--     Supabase-Storage egress problem the R2 rule exists to prevent.
--     To move them to R2 later, upload the folder and run:
--       update public.menu_items
--          set thumbnail_url = replace(thumbnail_url,
--                'https://restaurant-ar.pages.dev/img/burgervazha/dishes',
--                '<R2 public base>/burgervazha')
--        where restaurant_id = 56;
--     plus the same replace on theme_config.hero_image_url / hero_images /
--     logo_url / hero_logo_url.
--
-- Default safety is ROLLBACK. To execute after review, change only the final
-- line from ROLLBACK; to COMMIT;

BEGIN;

do $$
declare
  v_restaurant record;
begin
  select r.id, r.slug, r.brand_id, b.slug as brand_slug
    into v_restaurant
    from public.restaurants r
    join public.brands b on b.id = r.brand_id
   where r.id = 56
     and r.slug = 'burgervazha'
     and r.brand_id = 50
     and b.slug = 'burgerlions';

  if not found then
    raise exception 'Burger Lions identity assertion failed for restaurant %, slug %, brand %, brand slug %',
      56, 'burgervazha', 50, 'burgerlions';
  end if;
end $$;

-- price_old must exist before the item upsert references it.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'menu_items' and column_name = 'price_old'
  ) then
    raise exception 'menu_items.price_old is missing — apply 2026-07-28_menu_item_price_old.sql first';
  end if;
end $$;

-- The tenant was created with a placeholder "Featured" category. Rename it to the
-- first real category rather than leaving an empty pill on the menu, but only if
-- nothing references it and the target name is not already taken.
do $$
declare
  v_featured_id bigint;
  v_refs integer;
begin
  select id into v_featured_id
    from public.categories
   where restaurant_id = 56
     and lower(name_en) = 'featured'
   limit 1;

  if v_featured_id is not null then
    select count(*) into v_refs
      from public.menu_items
     where restaurant_id = 56
       and category_id = v_featured_id;

    if v_refs = 0 and not exists (
      select 1 from public.categories where restaurant_id = 56 and name_en = 'Burgers'
    ) then
      update public.categories
         set name_en = 'Burgers',
             name_ka = 'ბურგერი',
             sort_order = 1
       where id = v_featured_id
         and restaurant_id = 56;
    end if;
  end if;
end $$;

-- ── categories ──────────────────────────────────────────────────────────
with src as (
  select *
  from jsonb_to_recordset($bl_categories$[
  {
    "name_en": "Burgers",
    "name_ka": "ბურგერი",
    "sort_order": 1
  },
  {
    "name_en": "Sides & Sauces",
    "name_ka": "გარნირი | სოუსები",
    "sort_order": 2
  },
  {
    "name_en": "Drinks",
    "name_ka": "სასმელები",
    "sort_order": 3
  },
  {
    "name_en": "Desserts",
    "name_ka": "ტკბილეული",
    "sort_order": 4
  },
  {
    "name_en": "Coffee",
    "name_ka": "ყავა",
    "sort_order": 5
  }
]$bl_categories$::jsonb)
    as t(name_en text, name_ka text, sort_order int)
)
insert into public.categories (restaurant_id, name_en, name_ka, sort_order)
select 56, src.name_en, src.name_ka, src.sort_order
from src
on conflict (restaurant_id, name_en) do update
set name_ka = excluded.name_ka,
    sort_order = excluded.sort_order;

-- ── menu items ──────────────────────────────────────────────────────────
with src as (
  select *
  from jsonb_to_recordset($bl_items$[
  {
    "name_en": "Jalapeño Burger",
    "name_ka": "ჰალაპენიუ ბურგერი",
    "description_en": "300g beef, 4 slices cheddar, caramelised jalapeño with bacon, house sauce, burger bun, Saperavi-marinated onion, iceberg lettuce, pickles.",
    "description_ka": "შემადგენლობა: ხორცი 300 გრ, ყველი ჩედარი 4 ფენ, კარამელიზირებული ჰალაპენიო ბეკონით, სპეც სოუსი, ბურგერის ფუნთუშა, ხახვი (საფერავში დამარინადებული), აისბერგი, მჟავე კიტრი.",
    "price": "31.80 ₾",
    "price_old": "33.80 ₾",
    "category_name_en": "Burgers",
    "sort_order": 1,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/halapeniu-burgeri-3240.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "5 Cheese Burger",
    "name_ka": "5 ყველის ბურგერი",
    "description_en": "300g beef, 4 slices cheddar, parmesan, mimolette, cheese sauce, pickles, iceberg lettuce, burger bun, house sauce.",
    "description_ka": "საქონლის ხორცი 300გრ, ყველი ჩედარი 4 ფენა,პარმეზანი, ყველი მიმოლეტე. ყველის სოუსი, მჟავე კიტრი, აისბერგი, ბურგერის ფუნთუშა, სპეც სოუსი.",
    "price": "33.80 ₾",
    "price_old": "35.80 ₾",
    "category_name_en": "Burgers",
    "sort_order": 2,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/5-yvelis-burgeri-3250.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "White Lion",
    "name_ka": "თეთრი ლომი",
    "description_en": "300g beef, 4 slices emmental, melted cheese with bacon, 1 slice bacon, 4 slices camembert, Saperavi-marinated onion, iceberg lettuce, burger bun.",
    "description_ka": "ხორცი 300 გრ. თეთრი ყველი ემენტალი 4 ფენა, მდნარი ყველი ბეკონით, ბეკონი 1 ფენა, ყველი კამემბერი 4 ფენა, საფერავში დამარინადებული ხახვი, აისბერგი, ბურგერის ფუნთუშა.",
    "price": "29.80 ₾",
    "price_old": "31.80 ₾",
    "category_name_en": "Burgers",
    "sort_order": 3,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/tetri-lomi-3252.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Zeus",
    "name_ka": "ზევსი",
    "description_en": "300g beef, house sauce, bacon, 3 slices cheddar, cheese sauce, parmesan, mimolette, Saperavi-marinated onion, pickles, iceberg lettuce, burger bun.",
    "description_ka": "საქონლის ხორცი 300გრ, სპეც სოუსი, ბეკონი, ყველი ჩედარი 3 ფენა, ყველის სოუსი, ყველი პარმეზანი, ყველი მიმოლეტე, საფერავში დამარინადებული ხახვი, მჟავე კიტრი, აისბერგი, ბურგერის ფუნთუშა.",
    "price": "34.80 ₾",
    "price_old": "37.80 ₾",
    "category_name_en": "Burgers",
    "sort_order": 4,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/zevsi-3254.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Sphinx (Mtsvadi Burger)",
    "name_ka": "სფინქსი (მწვადბურგერი)",
    "description_en": "300g beef, 4 slices cheddar, parmesan, 200g minced pork (mildly spicy), jalapeño sauce, cheese sauce, BBQ sauce, house sauce, burger bun, Saperavi-marinated onion, iceberg lettuce, pickles.",
    "description_ka": "ხორცი 300 გრ, ყველი ჩედარი 4 ფენა, ყველი პარმეზანი, ღორის ხორცი დაკეპილი (მსუბუქად ცხარე) 200 გრ,ჰალაპენიოს სოუსი, ყველის სოუსი, ბარბექიუს სოუსი, სპეც სოუსი, ბურგერის ფუნთუშა,საფერავში დამარინადებული ხახვი, აისბერგი, მჟავე კიტრი.",
    "price": "36.80 ₾",
    "price_old": "39.80 ₾",
    "category_name_en": "Burgers",
    "sort_order": 5,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/spinqsi-mtsvadburgeri-3256.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Everest",
    "name_ka": "ევერესტი",
    "description_en": "450g beef, cheddar, parmesan, BBQ sauce, jalapeño, house sauce, cheese sauce, Saperavi-marinated onion, pickles, iceberg lettuce, oregano, burger bun.",
    "description_ka": "450 გრ. საქონლის ხორცი, ყველი ჩედარი, ყველი პარმეზანი, ბარბექიუს სოუსი, ჰალაპენიუ, სპეც სოუსი, ყველის სოუსი, საფერავში დამარინადებული ხახვი, მჟავე კიტრი, აისბერგი, ორეგანო,ბურგერის ფუნთუშა.",
    "price": "36.80 ₾",
    "price_old": "39.80 ₾",
    "category_name_en": "Burgers",
    "sort_order": 6,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/everesti-3258.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Steak Burger",
    "name_ka": "სტეიკ ბურგერი",
    "description_en": "300g beef, cheddar, Saperavi-marinated onion, pickles, iceberg lettuce, pork steak, house sauce, burger bun.",
    "description_ka": "საქონლის ხორცი 300 გრ. ყველი ჩედარი, ხახვი (საფერავში დამარინადებული), მჟავე კიტრი, აისბერგი, ღორის სტეიკი, სპეც სოუსი, ბურგერის ფუნთუშა.",
    "price": "47.50 ₾",
    "price_old": "49.50 ₾",
    "category_name_en": "Burgers",
    "sort_order": 7,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/steik-burgeri-3261.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Idée Fixe",
    "name_ka": "იდეაფიქსი",
    "description_en": "150g beef, house sauce, 2 slices cheddar, bread, Saperavi-marinated onion, iceberg lettuce, pickles, parmesan, BBQ sauce.",
    "description_ka": "შემადგენლობა: საქონლის ხორცი 150 გრ, სპეც სოუსი, ყველი ჩედარი 2 ფენა, პური, ხახვი (საფერავში დამარინადებლი), აისბერგი, მჟავე კიტრი,პარმეზანი,ბარბიქიუს სოუსი",
    "price": "19.80 ₾",
    "price_old": "21.80 ₾",
    "category_name_en": "Burgers",
    "sort_order": 8,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/ideapiqsi-3263.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Idée Fixe (+)",
    "name_ka": "იდეაფიქსი (+)",
    "description_en": "150g beef, house sauce, 3 slices cheddar, Saperavi-marinated onion, iceberg lettuce, pickles, 1 slice bacon, parmesan, BBQ sauce, burger bun.",
    "description_ka": "შემადგენლობა: საქონლის ხორცი 150 გრ, სპეცსოუსი, ყველი ჩედარი 3 ფენა, ხახვი (საფერავში დამარინადებული), აისბერგი, მჟავე კიტრი, ბეკონი 1 ფენა,პარმეზანი,ბარბიქიოს სოუსი, ბურგერის ფუნთუშა",
    "price": "21.50 ₾",
    "price_old": "23.50 ₾",
    "category_name_en": "Burgers",
    "sort_order": 9,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/ideapiqsi-3265.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Obelix",
    "name_ka": "ობელიქსი",
    "description_en": "300g beef, 3 slices cheddar, house sauce, burger bun, Saperavi-marinated onion, iceberg lettuce, pickles.",
    "description_ka": "შემადგენლობა: საქონლის ხორცი 300 გრ, ყველი ჩედარი 3 ფენა, სპეცსოუსი, ბურგერის ფუნთუშა, ხახვი (საფერავში დამარინადებლი), აისბერგი, მჟავე კიტრი",
    "price": "25.80 ₾",
    "price_old": "27.80 ₾",
    "category_name_en": "Burgers",
    "sort_order": 10,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/obeliqsi-3268.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Asterix",
    "name_ka": "ასტერიქსი",
    "description_en": "450g beef, 4 slices cheddar, 2 slices bacon, house sauce, burger bun, Saperavi-marinated onion, iceberg lettuce, pickles.",
    "description_ka": "შემადგენლობა: ხორცი 450 გრ., ყველი ჩედარი 4 ფენა, ბეკონი 2 ფენა, სპეცსოუსი, ბურგერის ფუნთუშა, ხახვი (საფერავში დამარინადებლი), აისბერგი, მჟავე კიტრი.",
    "price": "33.50 ₾",
    "price_old": "35.50 ₾",
    "category_name_en": "Burgers",
    "sort_order": 11,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/asteriqsi-3270.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Obelix (+)",
    "name_ka": "ობელიქსი (+)",
    "description_en": "300g beef, 4 slices cheddar, 1 slice bacon, house sauce, burger bun, Saperavi-marinated onion, iceberg lettuce, pickles.",
    "description_ka": "შემადგენლობა: საქონლის ხორცი 300 გრ., ყველი ჩედარი 4 ფენა, ბეკონი 1 ფენა, სპეცსოუსი, ბურგერის ფუნთუშა, ხახვი (საფერავში დამარინადებლი), აისბერგი, მჟავე კიტრი",
    "price": "29.50 ₾",
    "price_old": "31.50 ₾",
    "category_name_en": "Burgers",
    "sort_order": 12,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/obeliqsi-3273.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Druid",
    "name_ka": "დრუიდი",
    "description_en": "600g beef, 5 slices cheddar, 2 slices bacon, house sauce, burger bun, Saperavi-marinated onion, iceberg lettuce, pickles.",
    "description_ka": "შემადგენლობა: ხორცი 600 გრ., ყველი ჩედარი 5 ფენა, ბეკონი 2 ფენა, სპეცსოუსი, ბურგერის ფუნთუშა, ხახვი (საფერავში დამარინადებლი), აისბერგი, მჟავე კიტრი.",
    "price": "36.80 ₾",
    "price_old": "38.80 ₾",
    "category_name_en": "Burgers",
    "sort_order": 13,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/druidi-3275.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Julius",
    "name_ka": "იულიუსი",
    "description_en": "750g beef, 6 slices cheddar, 2 slices bacon, house sauce, burger bun, Saperavi-marinated onion, iceberg lettuce, pickles.",
    "description_ka": "შემადგენლობა: ხორცი 750 გრ., ყველი ჩედარი 6 ფენა, ბეკონი 2 ფენა, სპეცსოუსი, ბურგერის ფუნთუშა, ხახვი (საფერავში დამარინადებლი), აისბერგი, მჟავე კიტრი.",
    "price": "39.80 ₾",
    "price_old": "42.70 ₾",
    "category_name_en": "Burgers",
    "sort_order": 14,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/iuliusi-3277.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Double Trouble",
    "name_ka": "ორმაგი პრობლემა",
    "description_en": "300g beef, 3 slices cheddar, ketchup, burger bun, Saperavi-marinated onion, iceberg lettuce, pickles.",
    "description_ka": "შემადგენლობა: ხორცი 300 გრ., ყველი ჩედარი 3 ფენა, კეტჩუპი, ბურგერის ფუნთუშა, ხახვი (საფერავში დამარინადებული), აისბერგი, მჟავე კიტრი",
    "price": "26.80 ₾",
    "price_old": "29.80 ₾",
    "category_name_en": "Burgers",
    "sort_order": 15,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/ormagi-problema-3279.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Bacon Burger",
    "name_ka": "ბეკონ-ბურგერი",
    "description_en": "300g beef, 3 slices cheddar, 5 slices bacon, BBQ sauce, house sauce, burger bun, Saperavi-marinated onion, iceberg lettuce, pickles.",
    "description_ka": "შემადგენლობა: ხორცი 300 გრ., ყველი ჩედარი 3 ფენა, ბეკონი 5 ფენა, ბარბექიუ სოუსი, სპეცსოუსი, ბურგერის ფუნთუშა, ხახვი (საფერავში დამარინადებლი), აისბერგი, მჟავე კიტრი.",
    "price": "32.50 ₾",
    "price_old": "35.50 ₾",
    "category_name_en": "Burgers",
    "sort_order": 16,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/bekon-burgeri-3281.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Cheeseburger",
    "name_ka": "ჩიზბურგერი",
    "description_en": "150g beef, 3 slices cheddar, parmesan, cheese sauce, house sauce, burger bun, iceberg lettuce, pickles, mimolette.",
    "description_ka": "შემადგენლობა: ხორცი 150 გრ., ყველი ჩედარი 3 ფენა, პარმეზანი, ყველის სოუსი , სპეც სოუსი, ბურგერის ფუნთუშა, აისბერგი, მჟავე კიტრი, მიმოლეტე",
    "price": "19.80 ₾",
    "price_old": "21.80 ₾",
    "category_name_en": "Burgers",
    "sort_order": 17,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/chizburgeri-3283.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Gladiator",
    "name_ka": "გლადიატორი",
    "description_en": "750g beef, 4 slices bacon, cheddar, house sauce, pickles, Saperavi-marinated onion, iceberg lettuce, burger bun, cheese sauce.",
    "description_ka": "ხორცი 750გრ, ბეკონი 4 ფენა, ყველი ჩედარი, სპეც სოუსი, მჟავე კიტრი, ხახვი (საფერავში დამარინადებული), აისბერგი, ბურგერის ფუნთუშა, ყველის სოუსი",
    "price": "42.50 ₾",
    "price_old": "45.50 ₾",
    "category_name_en": "Burgers",
    "sort_order": 18,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/gladiatori-3285.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Big Bang",
    "name_ka": "დიდი აფეთქება",
    "description_en": "300g beef, parmesan, emmental, cheddar, jalapeño sauce, house sauce, iceberg lettuce, Saperavi-marinated onion, burger bun, pickles, oregano.",
    "description_ka": "300 გრ. საქონლის ხორცი, ყველი პარმეზანი,ყველი ემენტალი, ყველი ჩედარი, ჰალაპენიოს სოუსი, სპეც სოუსი, აისბერგი, ხახვი (საფერავში დამარინადებული), ბურგერის ფუნთუშა,მჟავე კიტრი,ორეგანო",
    "price": "33.80 ₾",
    "price_old": "35.80 ₾",
    "category_name_en": "Burgers",
    "sort_order": 19,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/didi-apetqeba-3287.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Smash Burger 2X",
    "name_ka": "სმეშ ბურგერი 2X",
    "description_en": "300g beef, cheddar, house sauce, Saperavi-marinated onion, pickles, iceberg lettuce, burger bun.",
    "description_ka": "საქონლის ხორცი 300 გრ, ყველი ჩედარი, სპეც სოუსი, საფერავში დამარინადებული ხახვი, მჟავე კიტრი, აისბერგი, ბურგერის ფუნთუშა.",
    "price": "29.60 ₾",
    "price_old": "31.80 ₾",
    "category_name_en": "Burgers",
    "sort_order": 20,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/smesh-burgeri-2x-3289.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Smash Burger 4X",
    "name_ka": "სმეშ ბურგერი 4X",
    "description_en": "600g beef, cheddar, house sauce, Saperavi-marinated onion, pickles, iceberg lettuce, burger bun.",
    "description_ka": "საქონლის ხორცი 600 გრ., ყველი ჩედარი, სპეც სოუსი, საფერავში დამარინადებული ხახვი, მჟავე კიტრი, აისბერგი, ბურგერის ფუნთუშა.",
    "price": "37.80 ₾",
    "price_old": "39.80 ₾",
    "category_name_en": "Burgers",
    "sort_order": 21,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/smesh-burgeri-4x-3291.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Bacon Burger Cake",
    "name_ka": "ბეკონ ბურგერის ტორტი",
    "description_en": "2kg beef, cheese sauce, bacon, giant burger bun, Saperavi-marinated onion, pickles, iceberg lettuce, cheddar, house sauce. Served with fries, cheese sauce, ketchup and jalapeño.",
    "description_ka": "საქონლის ხორცი 2 კგ, ყველის სოუსი, ბეკონი, ბურგერის გიგანტური ფუნთუშა, საფერავში დამარინადებული ხახვი, მჟავე კიტრი, აისბერიგი, ყველი ჩედარი, სპეც სოუსი. მოყვება: კარტოფილი ფრი, ყველის სოუსი, კეტჩუპი, ჰალაპენიო.",
    "price": "165.00 ₾",
    "price_old": "170.00 ₾",
    "category_name_en": "Burgers",
    "sort_order": 22,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/bekon-burgeris-torti-3293.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Five Cheese Burger Cake",
    "name_ka": "ხუთი ყველის ბურგერის ტორტი",
    "description_en": "2kg beef, giant burger bun, Saperavi-marinated onion, pickles, iceberg lettuce, cheddar, parmesan, mimolette, mozzarella, cheese sauce, house sauce. Served with fries, cheese sauce, ketchup and jalapeño.",
    "description_ka": "საქონლის ხორცი 2 კგ., ბურგერის გიგანტური ფუნთუშა, საფერავში დამარინადებული ხახვი, მჟავე კიტრი, აისბერგი, ყველი ჩედარი, ყველი პარმეზანი, ყველი მიმოლეტე, ყველი მოცარელა, ყველის სოუსი, სპეც სოუსი. მოყვება: კარტოფილი ფრი, ყველის სოუსი, კეტჩუპი, ჰალაპენიო.",
    "price": "175.00 ₾",
    "price_old": "180.00 ₾",
    "category_name_en": "Burgers",
    "sort_order": 23,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/khuti-yvelis-burgeris-torti-3295.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Asteroid",
    "name_ka": "ასტეროიდი",
    "description_en": "900g beef, burger bun, house sauce, BBQ sauce, cheese sauce, cheddar, parmesan, mimolette, 3 slices bacon, pickles, Saperavi-marinated onion, iceberg lettuce.",
    "description_ka": "საქონლის ხორცი 900 გრ., ბურგერის ფუნთუშა, სპეც სოუსი, ბარბექიუს სოუსი, ყველის სოუსი, ყველი ჩედარი, ყველი პარმეზანი, ყველი მიმოლეტე, ბეკონი 3 ფენა, მჟავე კიტრი, ხახვი(საფერავის მარინადში), აისბერგი.",
    "price": "44.80 ₾",
    "price_old": "49.30 ₾",
    "category_name_en": "Burgers",
    "sort_order": 24,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/asteroidi-3297.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Lion's Roar",
    "name_ka": "ლომის ღრიალი",
    "description_en": "Smashed burger bun, 600g smashed beef, pickles, iceberg lettuce, Saperavi-marinated onion, house sauce, 8 slices cheddar, mozzarella, parmesan.",
    "description_ka": "დასმეშილი ბურგერის ფუნთუშა, საქონლის დასმეშილი ხორცი 600 გრ, მჟავე კიტრი, აისბერგი, საფერავში დამარინადებული ხახვი, სპეც სოუსი, 8 ფენა ჩედარის ყველი, მოცარელა, პარმეზანი",
    "price": "45.80 ₾",
    "price_old": "47.80 ₾",
    "category_name_en": "Burgers",
    "sort_order": 25,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/lomis-ghriali-3299.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Black Lion",
    "name_ka": "შავი ლომი",
    "description_en": "450g beef, burger bun, 5 slices bacon, 5 slices cheddar, parmesan, mozzarella, cucumber, Saperavi-marinated onion, iceberg lettuce, house sauce.",
    "description_ka": "საქონლის ხორცი 450გრ, ბურგერის ფუნთუშა, ბეკონი 5 ფენა, ყველი ჩედარი 5 ფენა,პარმეზანი,მოცარელა, კიტრი, ხახვი საფერავში დამარინადებული, აისბერგი, სპეც სოუსი.",
    "price": "39.80 ₾",
    "price_old": "43.80 ₾",
    "category_name_en": "Burgers",
    "sort_order": 26,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/shavi-lomi-3301.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Lions Sauce with Nuggets",
    "name_ka": "ლომების სოუსი ნაგეთსით",
    "description_en": "Fries, cheese sauce, nuggets, iceberg lettuce, jalapeño.",
    "description_ka": "კარტოფილი ფრი, ყველის სოუსი, ნაგეთსი, აისბერგი, ჰალაპენიო.",
    "price": "21.80 ₾",
    "price_old": "",
    "category_name_en": "Sides & Sauces",
    "sort_order": 1,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/lomebis-sousi-nagetsit-3310.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Lions Sauce Extra",
    "name_ka": "ლომების სოუსი ექსტრა",
    "description_en": "Fries, cheese sauce, jalapeño, beef, bacon, onion, parmesan, cheddar, iceberg lettuce.",
    "description_ka": "ფრი, ყველის სოუსი , ჰალაპენიუ ,საქონლის ხორცი, ბეკონი, ხახვი, პარმეზანი, ჩედარი, აისბერი.",
    "price": "29.80 ₾",
    "price_old": "",
    "category_name_en": "Sides & Sauces",
    "sort_order": 2,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/lomebis-sousi-eqstra-3312.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Large Fries with Nuggets",
    "name_ka": "დიდი ფრი ნაგეთსით",
    "description_en": "",
    "description_ka": "",
    "price": "28.00 ₾",
    "price_old": "",
    "category_name_en": "Sides & Sauces",
    "sort_order": 3,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/didi-pri-nagetsit-3314.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Large Fries",
    "name_ka": "დიდი ფრი",
    "description_en": "",
    "description_ka": "",
    "price": "19.80 ₾",
    "price_old": "",
    "category_name_en": "Sides & Sauces",
    "sort_order": 4,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/didi-pri-3316.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Fries with Jalapeño & Cheese Sauce (250g)",
    "name_ka": "კარტოფილი ფრი ჰალაპენიუთი და ყველის სოუსით (250 გრ.)",
    "description_en": "",
    "description_ka": "",
    "price": "14.80 ₾",
    "price_old": "",
    "category_name_en": "Sides & Sauces",
    "sort_order": 5,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/kartopili-pri-halapeniuti-da-yvelis-sousit-250-gr-3318.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Special Fries (400g)",
    "name_ka": "სპეც. კარტოფილი ფრი (400 გრ.)",
    "description_en": "",
    "description_ka": "",
    "price": "7.50 ₾",
    "price_old": "",
    "category_name_en": "Sides & Sauces",
    "sort_order": 6,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/spets-kartopili-pri-400-gr-3321.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Small Fries",
    "name_ka": "პატარა კარტოფილი ფრი",
    "description_en": "",
    "description_ka": "",
    "price": "6.80 ₾",
    "price_old": "",
    "category_name_en": "Sides & Sauces",
    "sort_order": 7,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/patara-kartopili-pri-3323.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Cheese Sauce",
    "name_ka": "ყველის სოუსი",
    "description_en": "",
    "description_ka": "",
    "price": "5.00 ₾",
    "price_old": "",
    "category_name_en": "Sides & Sauces",
    "sort_order": 8,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/yvelis-sousi-3325.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Large Cheese Sauce",
    "name_ka": "დიდი ყველის სოუსი",
    "description_en": "",
    "description_ka": "",
    "price": "15.00 ₾",
    "price_old": "",
    "category_name_en": "Sides & Sauces",
    "sort_order": 9,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/didi-yvelis-sousi-3327.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "BBQ Sauce 30g",
    "name_ka": "ბარბექიუ სოუსი 30gr",
    "description_en": "",
    "description_ka": "",
    "price": "2.50 ₾",
    "price_old": "",
    "category_name_en": "Sides & Sauces",
    "sort_order": 10,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/barbeqiu-sousi-30gr-3328.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Jalapeño 30g (sharing)",
    "name_ka": "ჰალაპენიო 30gr გაზიარება",
    "description_en": "",
    "description_ka": "",
    "price": "1.50 ₾",
    "price_old": "",
    "category_name_en": "Sides & Sauces",
    "sort_order": 11,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/halapenio-30gr-gaziareba-3330.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Small Cheese Sauce with Bacon",
    "name_ka": "პატარა ყველის სუსი ბეკონით",
    "description_en": "",
    "description_ka": "",
    "price": "7.00 ₾",
    "price_old": "",
    "category_name_en": "Sides & Sauces",
    "sort_order": 12,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/patara-yvelis-susi-bekonit-3711.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Medium Cheese Sauce with Bacon",
    "name_ka": "საშუალო ყველის სუსი ბეკონით",
    "description_en": "",
    "description_ka": "",
    "price": "15.00 ₾",
    "price_old": "",
    "category_name_en": "Sides & Sauces",
    "sort_order": 13,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/sashualo-yvelis-susi-bekonit-3713.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Large Cheese Sauce with Bacon",
    "name_ka": "დიდი ყველის სუსი ბეკონით",
    "description_en": "",
    "description_ka": "",
    "price": "18.00 ₾",
    "price_old": "",
    "category_name_en": "Sides & Sauces",
    "sort_order": 14,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/didi-yvelis-susi-bekonit-3715.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Sweet & Spicy Sauce Extra",
    "name_ka": "ტკბილ–ცხარე სოუსი ექსტრა",
    "description_en": "",
    "description_ka": "",
    "price": "2.50 ₾",
    "price_old": "",
    "category_name_en": "Sides & Sauces",
    "sort_order": 15,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/tkbiltskhare-sousi-eqstra-3720.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Lions Sauce with Bacon",
    "name_ka": "ლომების სოუსი ბეკონით",
    "description_en": "Fries, cheese sauce, bacon, iceberg lettuce, jalapeño.",
    "description_ka": "კარტოფილი ფრი, ყველის სოუსი, ბეკონი, აისბერგი, ჰალაპენიო.",
    "price": "19.80 ₾",
    "price_old": "",
    "category_name_en": "Sides & Sauces",
    "sort_order": 16,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/lomebis-sousi-bekonit-3722.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Medium Fries",
    "name_ka": "საშუალო კარტოფილი ფრი",
    "description_en": "",
    "description_ka": "",
    "price": "7.80 ₾",
    "price_old": "",
    "category_name_en": "Sides & Sauces",
    "sort_order": 17,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/sashualo-kartopili-pri-3761.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Coca-Cola (0.33)",
    "name_ka": "კოკა კოლა (0.33)",
    "description_en": "",
    "description_ka": "",
    "price": "3.50 ₾",
    "price_old": "",
    "category_name_en": "Drinks",
    "sort_order": 1,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/koka-kola-0-33-3335.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Coca-Cola on tap (0.4)",
    "name_ka": "ჩამოსასხმელი კოკა–კოლა (0.4)",
    "description_en": "",
    "description_ka": "",
    "price": "4.00 ₾",
    "price_old": "",
    "category_name_en": "Drinks",
    "sort_order": 2,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/chamosaskhmeli-kokakola-0-4-3337.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Coca-Cola Zero (0.33)",
    "name_ka": "კოკა კოლა ზერო (0.33)",
    "description_en": "",
    "description_ka": "",
    "price": "3.50 ₾",
    "price_old": "",
    "category_name_en": "Drinks",
    "sort_order": 3,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/koka-kola-zero-0-33-3339.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Fanta (0.33)",
    "name_ka": "ფანტა (0.33)",
    "description_en": "",
    "description_ka": "",
    "price": "3.50 ₾",
    "price_old": "",
    "category_name_en": "Drinks",
    "sort_order": 4,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/panta-0-33-3341.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Red Bull (0.25)",
    "name_ka": "რედბული / red bull (0.25)",
    "description_en": "",
    "description_ka": "",
    "price": "6.00 ₾",
    "price_old": "",
    "category_name_en": "Drinks",
    "sort_order": 5,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/redbuli-red-bull-0-25-3343.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Black Lion APA (0.5)",
    "name_ka": "შავი ლომი APA (0.5)",
    "description_en": "",
    "description_ka": "",
    "price": "9.50 ₾",
    "price_old": "",
    "category_name_en": "Drinks",
    "sort_order": 6,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/shavi-lomi-apa-0-5-3345.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Kombucha",
    "name_ka": "კომბუჩა",
    "description_en": "An unpasteurised, fermented sparkling drink made by a Japanese method older than the common era, rich in beneficial bacteria. No additives or preservatives.",
    "description_ka": "ჩვენს წელთაღრიცხვამდე არსებული იაპონური ტექნოლოგიით დამზადებული არაპასტერიზებული, ფერმენტირებული, შუშხუნა სასმელი, გაჯერებული კეთილშობილი ბაქტერიებით. დანამატების და კონსერვანტების გარეშე",
    "price": "8.00 ₾",
    "price_old": "12.00 ₾",
    "category_name_en": "Drinks",
    "sort_order": 7,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/kombucha-3347.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Likani 0.6",
    "name_ka": "ლიკანი 0.6",
    "description_en": "",
    "description_ka": "",
    "price": "3.00 ₾",
    "price_old": "",
    "category_name_en": "Drinks",
    "sort_order": 8,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/likani-0-6-3349.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Mtis Mineral Water 0.5",
    "name_ka": "მინერ. წყალი მთის 0.5",
    "description_en": "",
    "description_ka": "",
    "price": "2.00 ₾",
    "price_old": "",
    "category_name_en": "Drinks",
    "sort_order": 9,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/miner-tsyali-mtis-0-5-3353.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Borjomi 0.5",
    "name_ka": "ბორჯომი 0.5",
    "description_en": "",
    "description_ka": "",
    "price": "3.50 ₾",
    "price_old": "",
    "category_name_en": "Drinks",
    "sort_order": 10,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/borjomi-0-5-3355.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Re-Fresh Lemonade",
    "name_ka": "რე-ფრეშის ლიმონათი",
    "description_en": "",
    "description_ka": "",
    "price": "7.00 ₾",
    "price_old": "",
    "category_name_en": "Drinks",
    "sort_order": 11,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/re-preshis-limonati-3357.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Fresh Orange Juice",
    "name_ka": "ფორთოხლის ფრეში",
    "description_en": "",
    "description_ka": "",
    "price": "11.00 ₾",
    "price_old": "",
    "category_name_en": "Drinks",
    "sort_order": 12,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/portokhlis-preshi-3730.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Tiramisu",
    "name_ka": "ტირამისუ",
    "description_en": "",
    "description_ka": "",
    "price": "10.00 ₾",
    "price_old": "",
    "category_name_en": "Desserts",
    "sort_order": 1,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/tiramisu-3360.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Lion's Sweets / Czech Baklava",
    "name_ka": "Lion’s Sweets /ჩეხური ფახლავა",
    "description_en": "",
    "description_ka": "",
    "price": "7.80 ₾",
    "price_old": "",
    "category_name_en": "Desserts",
    "sort_order": 2,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/lions-sweets-chekhuri-pakhlava-3740.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Papyrus / Walnut Cigar",
    "name_ka": "Papyrus/სიგარა ნიგვზიანი",
    "description_en": "",
    "description_ka": "",
    "price": "5.00 ₾",
    "price_old": "",
    "category_name_en": "Desserts",
    "sort_order": 3,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/papyrus-sigara-nigvziani-3743.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Cafe Mondial - Strawberry",
    "name_ka": "Cafe Mondial-strawberry",
    "description_en": "",
    "description_ka": "",
    "price": "18.00 ₾",
    "price_old": "",
    "category_name_en": "Coffee",
    "sort_order": 1,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/cafe-mondial-strawberry-3362.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Cafe Mondial - Chocolate",
    "name_ka": "Cafe Mondial-Chocolate",
    "description_en": "",
    "description_ka": "",
    "price": "18.00 ₾",
    "price_old": "",
    "category_name_en": "Coffee",
    "sort_order": 2,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/cafe-mondial-chocolate-3364.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Espresso",
    "name_ka": "ესპრესო",
    "description_en": "",
    "description_ka": "",
    "price": "5.50 ₾",
    "price_old": "",
    "category_name_en": "Coffee",
    "sort_order": 3,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/espreso-3367.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Americano",
    "name_ka": "ამერიკანო",
    "description_en": "",
    "description_ka": "",
    "price": "5.50 ₾",
    "price_old": "",
    "category_name_en": "Coffee",
    "sort_order": 4,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/amerikano-3369.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Cappuccino",
    "name_ka": "კაპუჩინო",
    "description_en": "",
    "description_ka": "",
    "price": "6.50 ₾",
    "price_old": "",
    "category_name_en": "Coffee",
    "sort_order": 5,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/kapuchino-3371.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Latte",
    "name_ka": "ლატე",
    "description_en": "",
    "description_ka": "",
    "price": "6.50 ₾",
    "price_old": "",
    "category_name_en": "Coffee",
    "sort_order": 6,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/late-3373.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Iced Coffee with Ice Cream",
    "name_ka": "ცივი ყავა ნაყინით",
    "description_en": "",
    "description_ka": "",
    "price": "10.00 ₾",
    "price_old": "",
    "category_name_en": "Coffee",
    "sort_order": 7,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/tsivi-yava-nayinit-3732.webp",
    "thumb_3d": false,
    "text_only": false
  },
  {
    "name_en": "Latte Macchiato",
    "name_ka": "ლატე მაკიატო",
    "description_en": "",
    "description_ka": "",
    "price": "6.50 ₾",
    "price_old": "",
    "category_name_en": "Coffee",
    "sort_order": 8,
    "visible": true,
    "is_3d": false,
    "model": "",
    "model_usdz": "",
    "ar_scale": 1.0,
    "thumbnail_url": "https://restaurant-ar.pages.dev/img/burgervazha/dishes/late-makiato-3736.webp",
    "thumb_3d": false,
    "text_only": false
  }
]$bl_items$::jsonb)
    as t(
      name_en text, name_ka text, description_en text, description_ka text,
      price text, price_old text, category_name_en text, sort_order int,
      visible boolean, is_3d boolean, model text, model_usdz text,
      ar_scale numeric, thumbnail_url text, thumb_3d boolean, text_only boolean
    )
)
insert into public.menu_items (
  restaurant_id, name_en, name_ka, description_en, description_ka, price, price_old,
  category_id, model, model_usdz, sort_order, visible, ar_scale,
  thumbnail_url, thumb_3d, is_3d, text_only
)
select
  56,
  src.name_en,
  src.name_ka,
  src.description_en,
  src.description_ka,
  src.price,
  nullif(src.price_old, ''),
  (
    select c.id
      from public.categories c
     where c.restaurant_id = 56
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
  src.text_only
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
    text_only = excluded.text_only;

-- ── theme (this tenant only) ────────────────────────────────────────────
with src as (
  select *
  from jsonb_to_recordset($bl_theme$[
  {
    "key": "template_key",
    "value": "burger_lions"
  },
  {
    "key": "site_name",
    "value": "Burger Lions"
  },
  {
    "key": "site_name_ka",
    "value": "Burger Lions"
  },
  {
    "key": "default_theme",
    "value": "night"
  },
  {
    "key": "font_body",
    "value": "Nunito"
  },
  {
    "key": "font_heading",
    "value": "Oswald"
  },
  {
    "key": "hero_image_url",
    "value": "https://restaurant-ar.pages.dev/img/burgervazha/hero-1.webp"
  },
  {
    "key": "hero_images",
    "value": "[\"https://restaurant-ar.pages.dev/img/burgervazha/hero-1.webp\"]"
  },
  {
    "key": "logo_url",
    "value": "https://restaurant-ar.pages.dev/img/burgervazha/logo.webp"
  },
  {
    "key": "hero_logo_url",
    "value": "https://restaurant-ar.pages.dev/img/burgervazha/logo.webp"
  },
  {
    "key": "night_bg",
    "value": "#141211"
  },
  {
    "key": "night_bg2",
    "value": "#0c0b0a"
  },
  {
    "key": "night_card",
    "value": "#1e1b1a"
  },
  {
    "key": "night_card2",
    "value": "#262220"
  },
  {
    "key": "night_border",
    "value": "rgba(232,163,61,0.16)"
  },
  {
    "key": "night_text",
    "value": "#f7f2e9"
  },
  {
    "key": "night_dim",
    "value": "#a89f95"
  },
  {
    "key": "night_accent",
    "value": "#e8514a"
  },
  {
    "key": "night_accent2",
    "value": "#f0b657"
  },
  {
    "key": "night_accent_text",
    "value": "#ffffff"
  },
  {
    "key": "night_thumb_bg",
    "value": "#0f0d0c"
  },
  {
    "key": "night_modal_bg",
    "value": "#100e0d"
  },
  {
    "key": "night_glow",
    "value": "rgba(232,163,61,0.13)"
  },
  {
    "key": "night_glow2",
    "value": "rgba(178,41,41,0.16)"
  },
  {
    "key": "night_shadow",
    "value": "rgba(0,0,0,0.62)"
  },
  {
    "key": "night_price_color",
    "value": "#f0b657"
  },
  {
    "key": "night_add_btn_color",
    "value": "#e8514a"
  },
  {
    "key": "night_bg_image",
    "value": "radial-gradient(78% 44% at 50% -6%, rgba(178,41,41,0.20) 0%, transparent 62%), radial-gradient(64% 40% at 88% 26%, rgba(232,163,61,0.10) 0%, transparent 70%), linear-gradient(178deg, #141211 0%, #100e0d 54%, #0c0b0a 100%)"
  },
  {
    "key": "night_bg_size",
    "value": "auto, auto, auto"
  },
  {
    "key": "night_bg_repeat",
    "value": "no-repeat, no-repeat, no-repeat"
  },
  {
    "key": "night_card_bg",
    "value": "linear-gradient(168deg, #221e1c 0%, #1a1716 100%)"
  },
  {
    "key": "night_card_radius",
    "value": "14px"
  },
  {
    "key": "night_card_blur",
    "value": "0px"
  },
  {
    "key": "night_stage_bg",
    "value": "#0f0d0c"
  },
  {
    "key": "night_pill_bg",
    "value": "rgba(34,30,28,0.94)"
  },
  {
    "key": "night_pill_active_bg",
    "value": "#b22929"
  },
  {
    "key": "night_cta_bg",
    "value": "#b22929"
  },
  {
    "key": "night_cta_shadow",
    "value": "0 6px 18px rgba(178,41,41,0.34)"
  },
  {
    "key": "night_hero_color",
    "value": "#e8514a"
  },
  {
    "key": "night_hero_shadow",
    "value": "none"
  },
  {
    "key": "night_divider_bg",
    "value": "linear-gradient(90deg, transparent, #f0b657, transparent)"
  },
  {
    "key": "night_accent_edge",
    "value": "linear-gradient(180deg, #b22929, #f0b657)"
  },
  {
    "key": "night_thumb_vignette",
    "value": "linear-gradient(180deg, transparent 56%, rgba(12,11,10,0.42))"
  },
  {
    "key": "night_item_shadow",
    "value": "0 4px 16px rgba(0,0,0,0.52)"
  },
  {
    "key": "night_item_hover_shadow",
    "value": "0 14px 32px rgba(0,0,0,0.62)"
  },
  {
    "key": "night_modal_bg_image",
    "value": "radial-gradient(70% 46% at 50% 32%, rgba(178,41,41,0.20) 0%, transparent 64%), linear-gradient(180deg, #1a1716 0%, #0c0b0a 100%)"
  },
  {
    "key": "day_bg",
    "value": "#f6f1e8"
  },
  {
    "key": "day_bg2",
    "value": "#e9e1d3"
  },
  {
    "key": "day_card",
    "value": "#ffffff"
  },
  {
    "key": "day_card2",
    "value": "#f4ece0"
  },
  {
    "key": "day_border",
    "value": "rgba(60,40,24,0.16)"
  },
  {
    "key": "day_text",
    "value": "#191614"
  },
  {
    "key": "day_dim",
    "value": "#6d6259"
  },
  {
    "key": "day_accent",
    "value": "#b22929"
  },
  {
    "key": "day_accent2",
    "value": "#8a5a12"
  },
  {
    "key": "day_accent_text",
    "value": "#ffffff"
  },
  {
    "key": "day_thumb_bg",
    "value": "#ece3d5"
  },
  {
    "key": "day_modal_bg",
    "value": "#fbf7f0"
  },
  {
    "key": "day_glow",
    "value": "rgba(178,41,41,0.10)"
  },
  {
    "key": "day_glow2",
    "value": "rgba(138,90,18,0.08)"
  },
  {
    "key": "day_shadow",
    "value": "rgba(60,40,24,0.16)"
  },
  {
    "key": "day_price_color",
    "value": "#8a5a12"
  },
  {
    "key": "day_add_btn_color",
    "value": "#b22929"
  },
  {
    "key": "day_bg_image",
    "value": "radial-gradient(78% 44% at 50% -8%, rgba(178,41,41,0.09) 0%, transparent 62%), radial-gradient(64% 40% at 88% 26%, rgba(138,90,18,0.08) 0%, transparent 70%), linear-gradient(178deg, #f6f1e8 0%, #efe7da 56%, #fbf7f0 100%)"
  },
  {
    "key": "day_bg_size",
    "value": "auto, auto, auto"
  },
  {
    "key": "day_bg_repeat",
    "value": "no-repeat, no-repeat, no-repeat"
  },
  {
    "key": "day_card_bg",
    "value": "linear-gradient(168deg, #ffffff 0%, #f7f1e7 100%)"
  },
  {
    "key": "day_card_radius",
    "value": "14px"
  },
  {
    "key": "day_card_blur",
    "value": "0px"
  },
  {
    "key": "day_stage_bg",
    "value": "#ece3d5"
  },
  {
    "key": "day_pill_bg",
    "value": "rgba(255,255,255,0.88)"
  },
  {
    "key": "day_pill_active_bg",
    "value": "#b22929"
  },
  {
    "key": "day_cta_bg",
    "value": "#b22929"
  },
  {
    "key": "day_cta_shadow",
    "value": "0 6px 16px rgba(178,41,41,0.22)"
  },
  {
    "key": "day_hero_color",
    "value": "#b22929"
  },
  {
    "key": "day_hero_shadow",
    "value": "none"
  },
  {
    "key": "day_divider_bg",
    "value": "linear-gradient(90deg, transparent, #8a5a12, transparent)"
  },
  {
    "key": "day_accent_edge",
    "value": "linear-gradient(180deg, #b22929, #8a5a12)"
  },
  {
    "key": "day_thumb_vignette",
    "value": "linear-gradient(180deg, transparent 58%, rgba(60,40,24,0.10))"
  },
  {
    "key": "day_item_shadow",
    "value": "0 4px 14px rgba(60,40,24,0.12)"
  },
  {
    "key": "day_item_hover_shadow",
    "value": "0 12px 28px rgba(60,40,24,0.18)"
  },
  {
    "key": "day_modal_bg_image",
    "value": "radial-gradient(70% 46% at 50% 32%, rgba(178,41,41,0.10) 0%, transparent 64%), linear-gradient(180deg, #f6f1e8 0%, #fbf7f0 100%)"
  }
]$bl_theme$::jsonb)
    as t(key text, value text)
)
insert into public.theme_config (restaurant_id, key, value)
select 56, src.key, src.value
from src
on conflict (restaurant_id, key) do update
set value = excluded.value;

-- Brand colours drive the admin colour pickers; keep them in step with the preset.
update public.brands
   set primary_color = '#b22929',
       secondary_color = '#e8a33d',
       logo_url = 'https://restaurant-ar.pages.dev/img/burgervazha/logo.webp'
 where id = 50
   and slug = 'burgerlions';

-- ── validation: inspect these before switching to COMMIT ────────────────
select 'category_count' as check_name, count(*) as value
  from public.categories where restaurant_id = 56;

select 'visible_item_count' as check_name, count(*) as value
  from public.menu_items where restaurant_id = 56 and visible = true;

select 'items_with_photo' as check_name, count(*) as value
  from public.menu_items
 where restaurant_id = 56 and coalesce(thumbnail_url, '') <> '';

select 'items_on_sale' as check_name, count(*) as value
  from public.menu_items
 where restaurant_id = 56 and coalesce(price_old, '') <> '';

-- must return zero rows: duplicate names
select name_en, count(*) as duplicate_count
  from public.menu_items where restaurant_id = 56
 group by name_en having count(*) > 1;

-- must return zero rows: item pointing at a missing or foreign category
select mi.id, mi.name_en, mi.category_id
  from public.menu_items mi
  left join public.categories c on c.id = mi.category_id
 where mi.restaurant_id = 56
   and (mi.category_id is null or c.id is null or c.restaurant_id <> 56);

-- must return zero rows: nothing here is 3D yet
select id, name_en from public.menu_items
 where restaurant_id = 56 and coalesce(is_3d, false) = true;

-- eyeball the discounted rows
select name_ka, price_old, price
  from public.menu_items
 where restaurant_id = 56 and coalesce(price_old, '') <> ''
 order by sort_order limit 10;

-- COMMIT switch: replace the next line with COMMIT; after validation and approval.
ROLLBACK;
