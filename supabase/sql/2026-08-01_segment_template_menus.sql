-- 2026-08-01_segment_template_menus.sql
-- Demo menu content for the four segment template tenants.
-- ROLLBACK by default; run with --commit.
--
-- REFUSES to run if any of the four already has menu items. Re-running an
-- import over a live tenant is how the Burger Bar 3D models got reset to
-- is_3d = false once already; this guard makes that impossible here.
BEGIN;

DO $$
BEGIN
  IF (SELECT count(*) FROM restaurants WHERE slug IN ('luxury', 'cafe', 'fast-casual', 'social-dining')) <> 4 THEN
    RAISE EXCEPTION 'expected all four template tenants to exist';
  END IF;
  IF EXISTS (SELECT 1 FROM menu_items WHERE restaurant_id IN
             (SELECT id FROM restaurants WHERE slug IN ('luxury', 'cafe', 'fast-casual', 'social-dining'))) THEN
    RAISE EXCEPTION 'a template tenant already has menu items — refusing to re-import';
  END IF;
END $$;

-- ══ luxury ══════════════════════════════════════════════════════
INSERT INTO categories (restaurant_id, name_en, name_ka, sort_order) VALUES
  ((SELECT id FROM restaurants WHERE slug = 'luxury'), 'Starters', 'დამწყები კერძები', 1),
  ((SELECT id FROM restaurants WHERE slug = 'luxury'), 'Mains', 'ძირითადი კერძები', 2),
  ((SELECT id FROM restaurants WHERE slug = 'luxury'), 'Desserts', 'დესერტები', 3);

INSERT INTO menu_items
  (restaurant_id, category_id, name_en, name_ka, description_en, description_ka,
   price, model, model_usdz, thumbnail_url, is_3d, ar_scale, thumb_3d, text_only,
   featured, sort_order, visible)
VALUES
  ((SELECT id FROM restaurants WHERE slug = 'luxury'), (SELECT id FROM categories WHERE restaurant_id = (SELECT id FROM restaurants WHERE slug = 'luxury') AND name_en = 'Starters'), 'Pumpkin Velouté', 'გოგრის ველუტე', 'Roasted pumpkin, brown butter, toasted seeds.', 'შემწვარი გოგრა, დამბალი კარაქი, მოხალული თესლი.', '18 ₾', '', '', '', false, 1, false, true, false, 1, true),
  ((SELECT id FROM restaurants WHERE slug = 'luxury'), (SELECT id FROM categories WHERE restaurant_id = (SELECT id FROM restaurants WHERE slug = 'luxury') AND name_en = 'Starters'), 'Beetroot & Goat Cheese', 'ჭარხალი და თხის ყველი', 'Slow-baked beetroot, goat cheese, walnut, aged balsamic.', 'ნელა გამომცხვარი ჭარხალი, თხის ყველი, ნიგოზი, დავარგებული ბალზამიკო.', '24 ₾', '', '', '', false, 1, false, true, false, 2, true),
  ((SELECT id FROM restaurants WHERE slug = 'luxury'), (SELECT id FROM categories WHERE restaurant_id = (SELECT id FROM restaurants WHERE slug = 'luxury') AND name_en = 'Mains'), 'Aged Beef Tenderloin', 'დავარგებული საქონლის ფილე', 'Thirty-day aged fillet, potato purée, red wine jus.', 'ოცდაათი დღე დავარგებული ფილე, კარტოფილის პიურე, წითელი ღვინის სოუსი.', '62 ₾', '', '', '', false, 1, false, true, false, 3, true),
  ((SELECT id FROM restaurants WHERE slug = 'luxury'), (SELECT id FROM categories WHERE restaurant_id = (SELECT id FROM restaurants WHERE slug = 'luxury') AND name_en = 'Mains'), 'Trout with Pomegranate', 'კალმახი ბროწეულით', 'Pan-seared trout, pomegranate, herb oil.', 'ტაფაზე შემწვარი კალმახი, ბროწეული, მწვანილის ზეთი.', '44 ₾', '', '', '', false, 1, false, true, false, 4, true),
  ((SELECT id FROM restaurants WHERE slug = 'luxury'), (SELECT id FROM categories WHERE restaurant_id = (SELECT id FROM restaurants WHERE slug = 'luxury') AND name_en = 'Mains'), 'Wild Mushroom Risotto', 'ველური სოკოს რიზოტო', 'Carnaroli rice, wild mushrooms, aged hard cheese.', 'კარნაროლის ბრინჯი, ველური სოკო, დავარგებული მაგარი ყველი.', '36 ₾', '', '', '', false, 1, false, true, false, 5, true),
  ((SELECT id FROM restaurants WHERE slug = 'luxury'), (SELECT id FROM categories WHERE restaurant_id = (SELECT id FROM restaurants WHERE slug = 'luxury') AND name_en = 'Desserts'), 'Warm Chocolate Croissant', 'თბილი შოკოლადის კრუასანი', 'Baked to order, dark chocolate, vanilla cream.', 'შეკვეთისთანავე გამომცხვარი, შავი შოკოლადი, ვანილის კრემი.', '14 ₾', 'https://pub-3c68559de18f4aee94d127e180937bdd.r2.dev/croissant_draco.glb', 'https://pub-3c68559de18f4aee94d127e180937bdd.r2.dev/croissant.usdz', 'https://pub-3c68559de18f4aee94d127e180937bdd.r2.dev/croissant_poster.webp', true, 0.9, false, false, false, 6, true);

-- ══ cafe ════════════════════════════════════════════════════════
INSERT INTO categories (restaurant_id, name_en, name_ka, sort_order) VALUES
  ((SELECT id FROM restaurants WHERE slug = 'cafe'), 'Breakfast', 'საუზმე', 1),
  ((SELECT id FROM restaurants WHERE slug = 'cafe'), 'Bakery', 'საცხობი', 2),
  ((SELECT id FROM restaurants WHERE slug = 'cafe'), 'Coffee', 'ყავა', 3);

INSERT INTO menu_items
  (restaurant_id, category_id, name_en, name_ka, description_en, description_ka,
   price, model, model_usdz, thumbnail_url, is_3d, ar_scale, thumb_3d, text_only,
   featured, sort_order, visible)
VALUES
  ((SELECT id FROM restaurants WHERE slug = 'cafe'), (SELECT id FROM categories WHERE restaurant_id = (SELECT id FROM restaurants WHERE slug = 'cafe') AND name_en = 'Breakfast'), 'Avocado Toast', 'ავოკადოს ტოსტი', 'Sourdough, smashed avocado, poached egg, chilli flakes.', 'მაწონა პური, გასრესილი ავოკადო, მოხარშული კვერცხი, წიწაკის ფანტელები.', '22 ₾', '', '', '', false, 1, false, true, false, 1, true),
  ((SELECT id FROM restaurants WHERE slug = 'cafe'), (SELECT id FROM categories WHERE restaurant_id = (SELECT id FROM restaurants WHERE slug = 'cafe') AND name_en = 'Breakfast'), 'Shakshuka', 'შაქშუკა', 'Eggs baked in spiced tomato, feta, warm bread.', 'სანელებლიან პომიდორში გამომცხვარი კვერცხი, ფეტა, თბილი პური.', '21 ₾', '', '', '', false, 1, false, true, false, 2, true),
  ((SELECT id FROM restaurants WHERE slug = 'cafe'), (SELECT id FROM categories WHERE restaurant_id = (SELECT id FROM restaurants WHERE slug = 'cafe') AND name_en = 'Bakery'), 'Butter Croissant', 'კარაქის კრუასანი', 'Laminated overnight, baked each morning.', 'ღამით მომზადებული ცომი, ყოველ დილით გამომცხვარი.', '9 ₾', 'https://pub-3c68559de18f4aee94d127e180937bdd.r2.dev/croissant_draco.glb', 'https://pub-3c68559de18f4aee94d127e180937bdd.r2.dev/croissant.usdz', 'https://pub-3c68559de18f4aee94d127e180937bdd.r2.dev/croissant_poster.webp', true, 0.9, false, false, false, 3, true),
  ((SELECT id FROM restaurants WHERE slug = 'cafe'), (SELECT id FROM categories WHERE restaurant_id = (SELECT id FROM restaurants WHERE slug = 'cafe') AND name_en = 'Bakery'), 'Glazed Donut', 'გლაზურიანი დონატი', 'Soft raised dough under a thin vanilla glaze.', 'რბილი აწეული ცომი თხელი ვანილის გლაზურით.', '7 ₾', 'https://pub-3c68559de18f4aee94d127e180937bdd.r2.dev/donut_draco.glb', 'https://pub-3c68559de18f4aee94d127e180937bdd.r2.dev/donut.usdz', 'https://pub-3c68559de18f4aee94d127e180937bdd.r2.dev/donut_poster.webp', true, 0.9, false, false, false, 4, true),
  ((SELECT id FROM restaurants WHERE slug = 'cafe'), (SELECT id FROM categories WHERE restaurant_id = (SELECT id FROM restaurants WHERE slug = 'cafe') AND name_en = 'Coffee'), 'Flat White', 'ფლეთ ვაითი', 'Double ristretto, steamed milk, thin microfoam.', 'ორმაგი რისტრეტო, ორთქლზე გაცხელებული რძე, თხელი ქაფი.', '11 ₾', '', '', '', false, 1, false, true, false, 5, true),
  ((SELECT id FROM restaurants WHERE slug = 'cafe'), (SELECT id FROM categories WHERE restaurant_id = (SELECT id FROM restaurants WHERE slug = 'cafe') AND name_en = 'Coffee'), 'Iced Latte', 'ცივი ლატე', 'Espresso over ice with cold milk.', 'ესპრესო ყინულზე ცივი რძით.', '12 ₾', '', '', '', false, 1, false, true, false, 6, true);

-- ══ fast-casual ═════════════════════════════════════════════════
INSERT INTO categories (restaurant_id, name_en, name_ka, sort_order) VALUES
  ((SELECT id FROM restaurants WHERE slug = 'fast-casual'), 'Burgers & Dogs', 'ბურგერები და ჰოთ დოგი', 1),
  ((SELECT id FROM restaurants WHERE slug = 'fast-casual'), 'Sides', 'გარნირები', 2),
  ((SELECT id FROM restaurants WHERE slug = 'fast-casual'), 'Sweets', 'ტკბილეული', 3);

INSERT INTO menu_items
  (restaurant_id, category_id, name_en, name_ka, description_en, description_ka,
   price, model, model_usdz, thumbnail_url, is_3d, ar_scale, thumb_3d, text_only,
   featured, sort_order, visible)
VALUES
  ((SELECT id FROM restaurants WHERE slug = 'fast-casual'), (SELECT id FROM categories WHERE restaurant_id = (SELECT id FROM restaurants WHERE slug = 'fast-casual') AND name_en = 'Burgers & Dogs'), 'Big Burger', 'დიდი ბურგერი', 'Double beef patty, cheddar, bacon, house sauce, pickles.', 'ორმაგი საქონლის კატლეტი, ჩედარი, ბეკონი, საფირმო სოუსი, მჟავე კიტრი.', '26 ₾', 'https://pub-3c68559de18f4aee94d127e180937bdd.r2.dev/druidi_balanced_30k_2k.glb', 'https://pub-3c68559de18f4aee94d127e180937bdd.r2.dev/druidi_balanced_30k_2k.usdz', 'https://pub-3c68559de18f4aee94d127e180937bdd.r2.dev/burger_poster.webp', true, 1.5181, false, false, true, 1, true),
  ((SELECT id FROM restaurants WHERE slug = 'fast-casual'), (SELECT id FROM categories WHERE restaurant_id = (SELECT id FROM restaurants WHERE slug = 'fast-casual') AND name_en = 'Burgers & Dogs'), 'Hot Dog', 'ჰოთ დოგი', 'Grilled sausage, soft bun, mustard and crispy onion.', 'შემწვარი სოსისი, რბილი ფუნთუშა, მდოგვი და ხრაშუნა ხახვი.', '11 ₾', 'https://pub-3c68559de18f4aee94d127e180937bdd.r2.dev/hot_dog_draco.glb', 'https://pub-3c68559de18f4aee94d127e180937bdd.r2.dev/hot_dog.usdz', 'https://pub-3c68559de18f4aee94d127e180937bdd.r2.dev/hot_dog_poster.webp', true, 0.9312, false, false, false, 2, true),
  ((SELECT id FROM restaurants WHERE slug = 'fast-casual'), (SELECT id FROM categories WHERE restaurant_id = (SELECT id FROM restaurants WHERE slug = 'fast-casual') AND name_en = 'Sides'), 'Loaded Fries', 'ფრი დანამატებით', 'Fries under cheese sauce, bacon and spring onion.', 'ფრი ყველის სოუსით, ბეკონითა და მწვანე ხახვით.', '14 ₾', '', '', '', false, 1, false, true, false, 3, true),
  ((SELECT id FROM restaurants WHERE slug = 'fast-casual'), (SELECT id FROM categories WHERE restaurant_id = (SELECT id FROM restaurants WHERE slug = 'fast-casual') AND name_en = 'Sides'), 'Chicken Wings', 'ქათმის ფრთები', 'Six wings, choice of buffalo or barbecue glaze.', 'ექვსი ფრთა, ბაფალოს ან ბარბექიუს სოუსით.', '21 ₾', '', '', '', false, 1, false, true, false, 4, true),
  ((SELECT id FROM restaurants WHERE slug = 'fast-casual'), (SELECT id FROM categories WHERE restaurant_id = (SELECT id FROM restaurants WHERE slug = 'fast-casual') AND name_en = 'Sides'), 'Onion Rings', 'ხახვის რგოლები', 'Beer-battered, served with smoked paprika mayo.', 'ლუდის ცომში, შებოლილი პაპრიკის მაიონეზით.', '12 ₾', '', '', '', false, 1, false, true, false, 5, true),
  ((SELECT id FROM restaurants WHERE slug = 'fast-casual'), (SELECT id FROM categories WHERE restaurant_id = (SELECT id FROM restaurants WHERE slug = 'fast-casual') AND name_en = 'Sweets'), 'Glazed Donut', 'გლაზურიანი დონატი', 'Warm donut with a thin sugar glaze.', 'თბილი დონატი თხელი შაქრის გლაზურით.', '7 ₾', 'https://pub-3c68559de18f4aee94d127e180937bdd.r2.dev/donut_draco.glb', 'https://pub-3c68559de18f4aee94d127e180937bdd.r2.dev/donut.usdz', 'https://pub-3c68559de18f4aee94d127e180937bdd.r2.dev/donut_poster.webp', true, 0.9, false, false, false, 6, true);

-- ══ social-dining ═══════════════════════════════════════════════
INSERT INTO categories (restaurant_id, name_en, name_ka, sort_order) VALUES
  ((SELECT id FROM restaurants WHERE slug = 'social-dining'), 'Sharing', 'გასაზიარებელი', 1),
  ((SELECT id FROM restaurants WHERE slug = 'social-dining'), 'Bar Snacks', 'ბარის კერძები', 2),
  ((SELECT id FROM restaurants WHERE slug = 'social-dining'), 'Sweets', 'ტკბილეული', 3);

INSERT INTO menu_items
  (restaurant_id, category_id, name_en, name_ka, description_en, description_ka,
   price, model, model_usdz, thumbnail_url, is_3d, ar_scale, thumb_3d, text_only,
   featured, sort_order, visible)
VALUES
  ((SELECT id FROM restaurants WHERE slug = 'social-dining'), (SELECT id FROM categories WHERE restaurant_id = (SELECT id FROM restaurants WHERE slug = 'social-dining') AND name_en = 'Sharing'), 'Big Burger', 'დიდი ბურგერი', 'Double beef patty, cheddar, bacon and house sauce.', 'ორმაგი საქონლის კატლეტი, ჩედარი, ბეკონი და საფირმო სოუსი.', '24 ₾', 'https://pub-3c68559de18f4aee94d127e180937bdd.r2.dev/druidi_balanced_30k_2k.glb', 'https://pub-3c68559de18f4aee94d127e180937bdd.r2.dev/druidi_balanced_30k_2k.usdz', 'https://pub-3c68559de18f4aee94d127e180937bdd.r2.dev/burger_poster.webp', true, 1.5181, false, false, true, 1, true),
  ((SELECT id FROM restaurants WHERE slug = 'social-dining'), (SELECT id FROM categories WHERE restaurant_id = (SELECT id FROM restaurants WHERE slug = 'social-dining') AND name_en = 'Sharing'), 'Hot Dog', 'ჰოთ დოგი', 'Grilled sausage, mustard, crispy onion.', 'შემწვარი სოსისი, მდოგვი, ხრაშუნა ხახვი.', '10 ₾', 'https://pub-3c68559de18f4aee94d127e180937bdd.r2.dev/hot_dog_draco.glb', 'https://pub-3c68559de18f4aee94d127e180937bdd.r2.dev/hot_dog.usdz', 'https://pub-3c68559de18f4aee94d127e180937bdd.r2.dev/hot_dog_poster.webp', true, 0.9312, false, false, false, 2, true),
  ((SELECT id FROM restaurants WHERE slug = 'social-dining'), (SELECT id FROM categories WHERE restaurant_id = (SELECT id FROM restaurants WHERE slug = 'social-dining') AND name_en = 'Bar Snacks'), 'Loaded Nachos', 'ნაჩოსი დანამატებით', 'Corn chips, melted cheese, jalapeño, sour cream, salsa.', 'სიმინდის ჩიფსი, დამდნარი ყველი, ხალაპენიო, არაჟანი, სალსა.', '24 ₾', '', '', '', false, 1, false, true, false, 3, true),
  ((SELECT id FROM restaurants WHERE slug = 'social-dining'), (SELECT id FROM categories WHERE restaurant_id = (SELECT id FROM restaurants WHERE slug = 'social-dining') AND name_en = 'Bar Snacks'), 'Crispy Fries', 'ხრაშუნა ფრი', 'Double-fried, sea salt, garlic mayo on the side.', 'ორჯერ შემწვარი, ზღვის მარილი, ნიორის მაიონეზი ცალკე.', '12 ₾', '', '', '', false, 1, false, true, false, 4, true),
  ((SELECT id FROM restaurants WHERE slug = 'social-dining'), (SELECT id FROM categories WHERE restaurant_id = (SELECT id FROM restaurants WHERE slug = 'social-dining') AND name_en = 'Bar Snacks'), 'Buffalo Wings', 'ბაფალო ფრთები', 'Hot buffalo glaze, blue cheese dip, celery.', 'ცხარე ბაფალოს სოუსი, ლურჯი ყველის დიპი, ნიახური.', '20 ₾', '', '', '', false, 1, false, true, false, 5, true),
  ((SELECT id FROM restaurants WHERE slug = 'social-dining'), (SELECT id FROM categories WHERE restaurant_id = (SELECT id FROM restaurants WHERE slug = 'social-dining') AND name_en = 'Sweets'), 'Sugar Donut', 'შაქრიანი დონატი', 'Rolled in cinnamon sugar, served warm.', 'დარიჩინიან შაქარში ამოვლებული, თბილად მიირთმევა.', '7 ₾', 'https://pub-3c68559de18f4aee94d127e180937bdd.r2.dev/donut_draco.glb', 'https://pub-3c68559de18f4aee94d127e180937bdd.r2.dev/donut.usdz', 'https://pub-3c68559de18f4aee94d127e180937bdd.r2.dev/donut_poster.webp', true, 0.9, false, false, false, 6, true);

-- Verify: item counts, how many carry a real model, and that every
-- model URL points at the shared BetaReal bucket rather than a client one.
SELECT r.slug,
       count(*) AS items,
       count(*) FILTER (WHERE m.is_3d) AS with_3d,
       count(*) FILTER (WHERE m.model <> '' AND m.model NOT LIKE '%3c68559de18f4aee94d127e180937bdd%') AS foreign_models,
       (SELECT count(*) FROM categories c WHERE c.restaurant_id = r.id) AS cats
FROM restaurants r JOIN menu_items m ON m.restaurant_id = r.id
WHERE r.slug IN ('luxury', 'cafe', 'fast-casual', 'social-dining')
GROUP BY r.slug, r.id ORDER BY r.slug;

ROLLBACK;
