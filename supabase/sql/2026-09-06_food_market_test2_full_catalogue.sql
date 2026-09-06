-- 2026-09-06_food_market_test2_full_catalogue.sql
-- Clones the live Food & Market catalogue (Georgian/Thai/Japanese/Drinks, 228 items)
-- onto the admin-panel-created preview tenant 'food-and-market-test2-main', so the
-- kitchen-split redesign can be reviewed live at restaurant-ar.pages.dev without
-- touching the real food-market-main tenant (id 73) at all.
--
-- Guarded: every statement is scoped by BOTH id and slug so this can only ever
-- write to restaurant 77 / brand 71, and only if their slugs still match what this
-- script expects. Rollback-only: review, then COMMIT manually.
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM restaurants WHERE id = 77 AND slug = 'food-and-market-test2-main') THEN
    RAISE EXCEPTION 'Expected restaurant 77 to be food-and-market-test2-main -- aborting.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM brands WHERE id = 71 AND slug = 'food-and-market-test2') THEN
    RAISE EXCEPTION 'Expected brand 71 to be food-and-market-test2 -- aborting.';
  END IF;
END $$;

-- Remove the empty placeholder category the admin panel auto-creates for a new
-- tenant, so it doesn't show up as a stray empty pill once real categories exist.
DELETE FROM categories WHERE restaurant_id = 77 AND name_en = 'Featured'
  AND NOT EXISTS (SELECT 1 FROM menu_items WHERE menu_items.category_id = categories.id);

-- Categories (44)
INSERT INTO categories (id, restaurant_id, name_en, name_ka, name_ru, sort_order) VALUES
  (209001, 77, 'Georgian — Pizza', 'ქართული — პიცა', NULL, 1),
  (209002, 77, 'Georgian — Burger', 'ქართული — ბურგერი', NULL, 2),
  (209003, 77, 'Georgian — Pasta', 'ქართული — პასტა', NULL, 3),
  (209004, 77, 'Georgian — Appetizer', 'ქართული — აპეტაიზერი', NULL, 4),
  (209005, 77, 'Georgian — Salads', 'ქართული — სალათები', NULL, 5),
  (209006, 77, 'Georgian — Soups', 'ქართული — წვნიანი', NULL, 6),
  (209007, 77, 'Georgian — Croquettes', 'ქართული — კროკეტები', NULL, 7),
  (209008, 77, 'Georgian — Dough', 'ქართული — ცომეული', NULL, 8),
  (209009, 77, 'Georgian — Main', 'ქართული — ძირითადი', NULL, 9),
  (209010, 77, 'Thai — Stir Fried', 'ტაილანდური — სთირ ფრაიდ', NULL, 10),
  (209011, 77, 'Thai — Fried Rice', 'ტაილანდური — ბრინჯი', NULL, 11),
  (209012, 77, 'Thai — Salads', 'ტაილანდური — სალათები', NULL, 12),
  (209013, 77, 'Thai — Appetizer', 'ტაილანდური — აპეტაიზერი', NULL, 13),
  (209014, 77, 'Thai — Curry', 'ტაილანდური — ქარი', NULL, 14),
  (209015, 77, 'Thai — Noodles', 'ტაილანდური — ნუდლსი', NULL, 15),
  (209016, 77, 'Thai — Soup', 'ტაილანდური — წვნიანი', NULL, 16),
  (209017, 77, 'Japanese — Sashimi', 'იაპონური — საშიმი', NULL, 17),
  (209018, 77, 'Japanese — Nigiri', 'იაპონური — ნიგირი', NULL, 18),
  (209019, 77, 'Japanese — Onigiri', 'იაპონური — ონიგირი', NULL, 19),
  (209020, 77, 'Japanese — Maki', 'იაპონური — მაკი', NULL, 20),
  (209021, 77, 'Japanese — Uramaki Roll', 'იაპონური — ურამაკი როლი', NULL, 21),
  (209022, 77, 'Japanese — Futomaki', 'იაპონური — ფუტომაკი', NULL, 22),
  (209023, 77, 'Japanese — Poke Bowl', 'იაპონური — თასი', NULL, 23),
  (209024, 77, 'Drinks — White Classic', 'სასმელები — თეთრი კლასიკური', NULL, 24),
  (209025, 77, 'Drinks — White Dry Qvevri', 'სასმელები — თეთრი მშრალი ქვევრის', NULL, 25),
  (209026, 77, 'Drinks — White Semi Sweet', 'სასმელები — თეთრი ნახევრად ტკბილი', NULL, 26),
  (209027, 77, 'Drinks — Red Dry Classic', 'სასმელები — წითელი მშრალი კლასიკური', NULL, 27),
  (209028, 77, 'Drinks — Red Dry Qvevri', 'სასმელები — წითელი მშრალი ქვევრის', NULL, 28),
  (209029, 77, 'Drinks — Red Semi Sweet', 'სასმელები — წითელი ნახევრად ტკბილი', NULL, 29),
  (209030, 77, 'Drinks — Rose', 'სასმელები — ვარდისფერი', NULL, 30),
  (209031, 77, 'Drinks — Sparkling Wine', 'სასმელები — ცქრიალა ღვინო', NULL, 31),
  (209032, 77, 'Drinks — Wine by the Glass', 'სასმელები — ჭიქით', NULL, 32),
  (209033, 77, 'Drinks — Refreshing Beverages', 'სასმელები — გამაგრილებელი სასმელი', NULL, 33),
  (209034, 77, 'Drinks — Coffee & Tea', 'სასმელები — ყავა და ჩაი', NULL, 34),
  (209035, 77, 'Drinks — Beer', 'სასმელები — ლუდი', NULL, 35),
  (209036, 77, 'Drinks — Vodka', 'სასმელები — არაყი', NULL, 36),
  (209037, 77, 'Drinks — Chacha', 'სასმელები — ჭაჭა', NULL, 37),
  (209038, 77, 'Drinks — Gin', 'სასმელები — ჯინი', NULL, 38),
  (209039, 77, 'Drinks — Tequila', 'სასმელები — ტეკილა', NULL, 39),
  (209040, 77, 'Drinks — Vermouth and Bitters', 'სასმელები — ვერმუტი და ბიტერი', NULL, 40),
  (209041, 77, 'Drinks — Rum & Liquor', 'სასმელები — რომი და ლიქიორი', NULL, 41),
  (209042, 77, 'Drinks — Whiskey', 'სასმელები — ვისკი', NULL, 42),
  (209043, 77, 'Drinks — Brandy and Cognac', 'სასმელები — ბრენდი და კონიაკი', NULL, 43),
  (209044, 77, 'Drinks — Cocktail', 'სასმელები — კოქტეილი', NULL, 44)
ON CONFLICT (id) DO NOTHING;

-- Menu items (228)
INSERT INTO menu_items (id, restaurant_id, name_en, name_ka, name_ru, description_en, description_ka, description_ru, price, price_old, category_id, model, model_usdz, thumbnail_url, thumb_3d, is_3d, text_only, ar_scale, visible, sort_order, featured, addons, variants) VALUES
  (400001, 77, 'MARGHERITA', 'მარგარიტა', NULL, 'Tomato sauce, Mozzarella
Milk Product, Gluten', 'ტომატის სოუსი, მოცარელა
რძის ნაწარმი, გლუტენი', NULL, '24.00 ₾', NULL, 209001, '', '', '', false, false, true, 1, true, 1, false, '[]'::jsonb, '[]'::jsonb),
  (400002, 77, 'PEPPERONI', 'პეპერონი', NULL, 'Tomato sauce, Mozzarella, Pepperoni
Milk Product, Gluten', 'ტომატის სოუსი, მოცარელა, პეპერონი
რძის ნაწარმი, გლუტენი', NULL, '33.00 ₾', NULL, 209001, '', '', '', false, false, true, 1, true, 2, false, '[]'::jsonb, '[]'::jsonb),
  (400003, 77, '4 CHEESE', '4 ყველი', NULL, 'Edamer, Gauda, Gorgonzola, Mozzarella
Milk Product, Gluten', 'ედამერი, გაუდა, გორგონზოლა, მოცარელა
რძის ნაწარმი, გლუტენი', NULL, '34.00 ₾', NULL, 209001, '', '', '', false, false, true, 1, true, 3, false, '[]'::jsonb, '[]'::jsonb),
  (400004, 77, 'PROSCIUTTO', 'პროშუტო', NULL, 'Prosciutto, Mushrooms, Mozzarella
Milk Product, Gluten', 'პროშუტო, სოკო, მოცარელა
რძის ნაწარმი, გლუტენი', NULL, '35.00 ₾', NULL, 209001, '', '', '', false, false, true, 1, true, 4, false, '[]'::jsonb, '[]'::jsonb),
  (400005, 77, 'CHEF’S PIZZA', 'შეფ პიცა', NULL, 'Cream, Ham, Mushrooms, Mozzarella
Milk Product, Gluten', 'ნაღები, ლორი, სოკო, მოცარელა
რძის ნაწარმი, გლუტენი', NULL, '32.00 ₾', NULL, 209001, '', '', '', false, false, true, 1, true, 5, false, '[]'::jsonb, '[]'::jsonb),
  (400006, 77, 'VEGETARIAN', 'ვეგეტარიანული', NULL, 'Tomato Sauce, Mozzarella, Bell Pepper Green and Red, Mushrooms, Cherry Tomatoes, Black Olives
Gluten', 'ტომატის სოუსი, მოცარელა, ბულგარული წითელი და მწვანე, სოკო, პომიდორი ჩერი, შავი ზეთისხილი
გლუტენი', NULL, '24.00 ₾', NULL, 209001, '', '', '', false, false, true, 1, true, 6, false, '[]'::jsonb, '[]'::jsonb),
  (400007, 77, 'BLACK TRUFFLE PIZZA', 'შავი ტრუფელის პიცა', NULL, 'Cream, Mozzarella, Parmesan, Mushroom, Truffle Pasta', 'ნაღები, მოცარელა, პარმეზანი, სოკო, ტრუფელის პასტა', NULL, '30.00 ₾', NULL, 209001, '', '', '', false, false, true, 1, true, 7, false, '[]'::jsonb, '[]'::jsonb),
  (400008, 77, 'CHICKEN BURGER', 'ბურგერი ქათმით', NULL, 'F&M Burger Bread, Chicken cutlet, Cheddar, Lettuce, Mustard, Mayo, Red Onion, Ketchup
Gluten, Milk Product, Egg, Shirbakht Seed, Fish, Mustard', 'ფუდ & მარკეტის ბურგერის პური, ქათმის კატლეტი, ჩედარი, სალათის ფოთოლი, მდოგვი, მაიონეზი, წითელი ხახვი, კეტჩუპი
გლუტენი, რძის ნაწარმი, კვერცხი, შირბახტის თესლი, თევზი, მდოგვი', NULL, '28.00 ₾', NULL, 209002, '', '', 'https://restaurant-ar.pages.dev/assets/food-market/catalogue/georgian-burger-chicken-burger-6a9e4fa4.webp', false, false, false, 1, true, 8, false, '[]'::jsonb, '[]'::jsonb),
  (400009, 77, 'CHEF BURGER', 'შეფ ბურგერი', NULL, 'F&M Burger Bread, Cheddar cheese, Angus Meat, Jalepenio, Cheese Sauce, Marinated Cucumber, Lettuce, Tomato, Bacon
Gluten, Milk Product, Egg, Shirbakht Seed', 'ფუდ & მარკეტის ბურგერის პური, ყველი ჩედარი, ანგუსის ხორცი, ჰალეპენიო, ყველის სოუსი, კიტრის მარინადი, სალათის ფოთოლი, პომიდორი, ბეკონი
გლუტენი, რძის ნაწარმი, კვერცხი, შირბახტის თესლი', NULL, '38.00 ₾', NULL, 209002, '', '', '', false, false, true, 1, true, 9, false, '[]'::jsonb, '[]'::jsonb),
  (400010, 77, 'SMASHED BURGER', 'სმეშ ბურგერი', NULL, 'F&M Burger Bread, Angus Meat, Cheddar Cheese, Salad Iceberg, Onion, Tomato, Bacon, Jalapeno Pickled
Gluten, Milk Product, Egg, Shirbakht Seed', 'ფუდ & მარკეტის ბურგერის პური, ანგუსის ხორცი, ყველი ჩედარი, აისბერგი, ხახვი, პომიდორი, ბეკონი, ჰალაპენიო
გლუტენი, რძის ნაწარმი, კვერცხი, შირბახტის თესლი', NULL, '36.00 ₾', NULL, 209002, '', '', '', false, false, true, 1, true, 10, false, '[]'::jsonb, '[]'::jsonb),
  (400011, 77, 'STEAK SANDWICH', 'სტეიკ სენდვიჩი', NULL, 'F&M Tonis Puri, Angus Meat, Iceberg lettuce, Tomato, Mustard, Mayonnaise, Onion, Gherkins, Cheddar Cheese
Gluten, Milk Product, Egg, Shirbakht Seed, Mustard', 'ფუდ ენდ მარკეტის თონის პური, საქონლის ხორცის სტეიკი, აისბერგი, პამიდორი, მდოგვი, მაიონეზი, ხახვი, კიტრის მარინადი, ყველი ჩედარი
გლუტენი, რძის ნაწარმი, კვერცხი, შირბახტის თესლი, მდოგვი', NULL, '40.00 ₾', NULL, 209002, '', '', '', false, false, true, 1, true, 11, false, '[]'::jsonb, '[]'::jsonb),
  (400012, 77, 'SALMON PASTA', 'ორაგულის პასტა', NULL, 'Salmon, Garlic, Cream, Parmesan, Coriander, Olive Oil
Gluten, Seafood, Milk Product, Egg', 'ორაგული, ნიორი, ნაღები, პარმეზანი, ქინძი, ზეითუნის ზეთი
გლუტენი, ზღვის პროდუქტი, რძის ნაწარმი, კვერცხი', NULL, '34.00 ₾', NULL, 209003, '', '', '', false, false, true, 1, true, 12, false, '[]'::jsonb, '[]'::jsonb),
  (400013, 77, 'PENNE ARRABIATA', 'პენე არაბიატა', NULL, 'Tomato sauce, Cherry Tomatoes, Parmesan, Parsley, Spring Onion
Gluten, Soy, Milk Product, Egg', 'პომიდვრის სოუსი, პომიდორი ჩერი, პარმეზანი, ოხრახუში, მწვანე ხახვი
გლუტენი, სოია, რძის ნაწარმი, კვერცხი', NULL, '23.00 ₾', NULL, 209003, '', '', '', false, false, true, 1, true, 13, false, '[]'::jsonb, '[]'::jsonb),
  (400014, 77, 'PENNE BOLOGNESE', 'პენე ბოლონეზე', NULL, 'Meat, Parmesan, Parsley, Spring Onion
Gluten, Soy, Milk Product, Egg', 'ხორცი, პარმეზანი, ოხრახუში, მწვანე ხახვი
გლუტენი, სოია, რძის ნაწარმი, კვერცხი', NULL, '30.00 ₾', NULL, 209003, '', '', '', false, false, true, 1, true, 14, false, '[]'::jsonb, '[]'::jsonb),
  (400015, 77, 'SPAGHETTI CARBONARA', 'სპაგეტი კარბონარა', NULL, 'Eggs, Cream, Bacon, Parmesan, Parsley, Spring Onion, Garlic
Gluten, Soy, Milk Product, Egg', 'კვერცხი, ნაღები, ბეკონი, პარმეზანი, ოხრახუში, მწვანე ხახვი, ნიორი
გლუტენი, სოია, რძის ნაწარმი, კვერცხი', NULL, '31.00 ₾', NULL, 209003, '', '', '', false, false, true, 1, true, 15, false, '[]'::jsonb, '[]'::jsonb),
  (400016, 77, 'MUSHROOM & TRUFFLE FUSILLONI', 'სოკოს და ტრუფელის პასტა', NULL, 'Oyster Mushroom, Button Mushroom, Onion, Garlic, Cream, Truffle Pasta
Gluten, Soy, Milk Product, Egg', 'კალმახა სოკო, ქამა სოკო, ხახვი, ნიორი, ნაღები, ტრუფელის პასტა
გლუტენი, სოია, რძის ნაწარმი, კვერცხი', NULL, '29.00 ₾', NULL, 209003, '', '', '', false, false, true, 1, true, 16, false, '[]'::jsonb, '[]'::jsonb),
  (400017, 77, 'DIP MIXES', 'დიფების მიქსი', NULL, 'Nadughi with truffle, avocado salsa, tomato salsa, tortilla chips', 'ნადუღი ტრუფელით, ავოკადოს სალსა, პომიდვრის სალსა, ტორტილიას ჩიფსები', NULL, '20.00 ₾', NULL, 209004, '', '', 'https://restaurant-ar.pages.dev/assets/food-market/catalogue/georgian-appetizer-dip-mixes-98a7b175.webp', false, false, false, 1, true, 17, false, '[]'::jsonb, '[]'::jsonb),
  (400018, 77, 'PULLED BBQ PORK TACO', 'ტაკო ღორის ხორცით და მანგოს სალსათი', NULL, 'GLUTEN', 'გლუტენი', NULL, '27.00 ₾', NULL, 209004, '', '', 'https://restaurant-ar.pages.dev/assets/food-market/catalogue/georgian-appetizer-pulled-bbq-pork-taco-2288c30e.webp', false, false, false, 1, true, 18, false, '[]'::jsonb, '[]'::jsonb),
  (400019, 77, 'PULLED BEEF TACO', 'ტაკო საქონლის ხორცით და კივის სალსათი', NULL, 'GLUTEN', 'გლუტენი', NULL, '28.00 ₾', NULL, 209004, '', '', 'https://restaurant-ar.pages.dev/assets/food-market/catalogue/georgian-appetizer-pulled-beef-taco-ba94bfb6.webp', false, false, false, 1, true, 19, false, '[]'::jsonb, '[]'::jsonb),
  (400020, 77, 'HUMMUS WITH GREEN SALAD AND PITA', 'ჰუმუსი მწვანე სალათით და პიტა პურით', NULL, NULL, NULL, NULL, '27.00 ₾', NULL, 209004, '', '', 'https://restaurant-ar.pages.dev/assets/food-market/catalogue/georgian-appetizer-hummus-with-green-salad-and-pita-9f260f56.webp', false, false, false, 1, true, 20, false, '[]'::jsonb, '[]'::jsonb),
  (400021, 77, 'FRENCH FRIES WITH TRUFFLE SAUCE', 'კარტოფილი ფრი ტრუფელის სოუსით', NULL, NULL, NULL, NULL, '14.00 ₾', NULL, 209004, '', '', '', false, false, true, 1, true, 21, false, '[]'::jsonb, '[]'::jsonb),
  (400022, 77, 'FRENCH FRIES', 'კარტოფილი ფრი', NULL, NULL, NULL, NULL, '10.00 ₾', NULL, 209004, '', '', 'https://restaurant-ar.pages.dev/assets/food-market/catalogue/georgian-appetizer-french-fries-522e1f87.webp', false, false, false, 1, true, 22, false, '[]'::jsonb, '[]'::jsonb),
  (400023, 77, 'CAESAR SALAD with CHICKEN', 'სალათი ცეზარი ქათმით', NULL, 'Fish, Milk Product, Mustard, Gluten, Egg, Bacon', 'ანჩოუსი, რძის ნაწარმი, მდოგვი, გლუტენი, კვერცხი, ბეკონი', NULL, '28.00 ₾', NULL, 209005, '', '', '', false, false, true, 1, true, 23, false, '[]'::jsonb, '[]'::jsonb),
  (201383, 77, 'BURRATA SALAD', 'ბურატას სალათი', NULL, NULL, NULL, NULL, '34.00 ₾', NULL, 209005, 'https://pub-b253d60df14c4c1f94bada002fa59596.r2.dev/food-market-main/1787818013846_burrata_salad_opt.glb', 'https://pub-b253d60df14c4c1f94bada002fa59596.r2.dev/food-market-main/1787818016905_burrata_salad.usdz', 'https://restaurant-ar.pages.dev/assets/food-market/items/burrata-salad.webp', false, true, false, 0.15, true, 24, false, '[]'::jsonb, '[]'::jsonb),
  (400025, 77, 'Kakhetian Cucumber & Tomato salad', 'კიტრი პომიდვრის სალათი კახურად', NULL, NULL, NULL, NULL, '20.00 ₾', NULL, 209005, '', '', '', false, false, true, 1, true, 25, false, '[]'::jsonb, '[]'::jsonb),
  (400026, 77, 'Cucumber & Tomato salad with Walnut', 'კიტრი პომიდვრის სალათი ნიგვზით', NULL, NULL, NULL, NULL, '22.00 ₾', NULL, 209005, '', '', '', false, false, true, 1, true, 26, false, '[]'::jsonb, '[]'::jsonb),
  (400027, 77, 'SHRIMP SALAD', 'კრევეტის სალათი', NULL, NULL, NULL, NULL, '32.00 ₾', NULL, 209005, '', '', '', false, false, true, 1, true, 27, false, '[]'::jsonb, '[]'::jsonb),
  (400028, 77, 'BEEF SOUP, RICE NOODLES', 'საქონლის ხორცის წვნიანი ბრინჯის ნუდლსით', NULL, NULL, NULL, NULL, '29.00 ₾', NULL, 209006, '', '', '', false, false, true, 1, true, 28, false, '[]'::jsonb, '[]'::jsonb),
  (400029, 77, 'CHIKHIRTMA WITH SMOKED SULGUNI', 'ჩიხირთმა შებოლილი სულგუნით', NULL, 'Milk Product, Egg', 'რძის ნაწარმი, კვერცხი', NULL, '26.00 ₾', NULL, 209006, '', '', '', false, false, true, 1, true, 29, false, '[]'::jsonb, '[]'::jsonb),
  (400030, 77, '3 MUSHROOMS CREAM SOUP', 'სამი სოკოს შეჭამანდი', NULL, 'Milk Product', 'რძის ნაწარმი', NULL, '24.00 ₾', NULL, 209006, '', '', '', false, false, true, 1, true, 30, false, '[]'::jsonb, '[]'::jsonb),
  (400031, 77, 'PUMPKIN CREAM SOUP, CROSTINI', 'გოგრის კრემ-სუპი', NULL, 'Milk Product', 'რძის ნაწარმი', NULL, '18.00 ₾', NULL, 209006, '', '', '', false, false, true, 1, true, 31, false, '[]'::jsonb, '[]'::jsonb),
  (400032, 77, 'CHICKEN STICKS WITH SESAME', 'ქათმის ჩხირები სეზამით', NULL, NULL, NULL, NULL, '28.00 ₾', NULL, 209007, '', '', '', false, false, true, 1, true, 32, false, '[]'::jsonb, '[]'::jsonb),
  (400033, 77, 'CHEESE STICKS IN TOMATO SAUCE', 'ყველის ჩხირები პომიდვრის სოუსში', NULL, NULL, NULL, NULL, '27.00 ₾', NULL, 209007, '', '', '', false, false, true, 1, true, 33, false, '[]'::jsonb, '[]'::jsonb),
  (400034, 77, 'LOBIO BALLS WITH HAM IN JONJOLI SAUCE', 'ლობიოს ბურთები ლორით ჯონჯოლის სოუსში', NULL, NULL, NULL, NULL, '27.00 ₾', NULL, 209007, '', '', '', false, false, true, 1, true, 34, false, '[]'::jsonb, '[]'::jsonb),
  (201385, 77, 'CHICKEN BALLS IN SHKMERULI SAUCE', 'ქათმის ბურთები შქმერულ სოუსში', NULL, NULL, NULL, NULL, '27.00 ₾', NULL, 209007, 'https://pub-b253d60df14c4c1f94bada002fa59596.r2.dev/food-market-main/1787818041592_chicken_balls_shkmeruli_opt.glb', 'https://pub-b253d60df14c4c1f94bada002fa59596.r2.dev/food-market-main/1787818044807_chicken_balls_shkmeruli.usdz', 'https://restaurant-ar.pages.dev/assets/food-market/items/chicken-balls.webp', false, true, false, 0.15, true, 35, false, '[]'::jsonb, '[]'::jsonb),
  (400036, 77, 'ELARJI BALLS WITH KUPATI IN BAJHE SAUCE', 'ელარჯის ბურთები კუპატის შიგთავსით ბაჟეს სოუსში', NULL, NULL, NULL, NULL, '27.00 ₾', NULL, 209007, '', '', '', false, false, true, 1, true, 36, false, '[]'::jsonb, '[]'::jsonb),
  (400037, 77, 'IMERETIAN KHACHAPURI', 'იმერული ხაჭაპური', NULL, 'Gluten, Milk Product, Egg', 'გლუტენი, რძის ნაწარმი, კვერცხი', NULL, '28.00 ₾', NULL, 209008, '', '', '', false, false, true, 1, true, 37, false, '[]'::jsonb, '[]'::jsonb),
  (400038, 77, 'ADJARIAN KHACHAPURI', 'აჭარული ხაჭაპური', NULL, 'Gluten, Milk Product, Egg', 'გლუტენი, რძის ნაწარმი, კვერცხი', NULL, '27.00 ₾', NULL, 209008, '', '', '', false, false, true, 1, true, 38, false, '[]'::jsonb, '[]'::jsonb),
  (400039, 77, 'MEGRELIAN KHACHAPURI', 'მეგრული ხაჭაპური', NULL, 'Gluten, Milk Product, Egg', 'გლუტენი, რძის ნაწარმი, კვერცხი', NULL, '30.00 ₾', NULL, 209008, '', '', '', false, false, true, 1, true, 39, false, '[]'::jsonb, '[]'::jsonb),
  (400040, 77, 'CHICKEN SCHNITZEL', 'ქათმის შნიცელი', NULL, NULL, NULL, NULL, '28.00 ₾', NULL, 209009, '', '', '', false, false, true, 1, true, 40, false, '[]'::jsonb, '[]'::jsonb),
  (400041, 77, 'SALMON WITH SPINACH', 'ორაგული ისპანახით', NULL, NULL, NULL, NULL, '52.00 ₾', NULL, 209009, '', '', '', false, false, true, 1, true, 41, false, '[]'::jsonb, '[]'::jsonb),
  (400042, 77, 'GRILLED LEMON CHICKEN, PARMESAN, SUN DRIED TOMATO', 'გრილზე შემწვარი ქათმის ფილე', NULL, 'Milk Product', 'ლიმონით, პარმეზანით და მზეზე გამომშრალი პომიდორით
რძის ნაწარმი', NULL, '30.00 ₾', NULL, 209009, '', '', '', false, false, true, 1, true, 42, false, '[]'::jsonb, '[]'::jsonb),
  (400043, 77, 'Stir Fried Cashewnut', 'სთირ ფრაიდ ქეშიუ', NULL, 'Cashewnut, Fish Sauce, Oyster Sauce', 'ქეშიუ, თევზის სოუსი, ხამანწკის სოუსი', NULL, '32.00 ₾', NULL, 209010, '', '', '', false, false, true, 1, true, 43, false, '[]'::jsonb, '[{"en": "Chicken", "ka": "\u10e5\u10d0\u10d7\u10d0\u10db\u10d8", "price": "32.00 \u20be"}, {"en": "Shrimp", "ka": "\u10d9\u10e0\u10d4\u10d5\u10d4\u10e2\u10d8", "price": "38.00 \u20be"}]'::jsonb),
  (400044, 77, 'Stir Fried Broccoli with Shrimp', 'სთირ ფრაიდ ბროკოლი კრევეტით', NULL, 'Soy sauce, Oyster sauce', 'სოიოს სოუსი, ხამანწკის სოუსი', NULL, '36.00 ₾', NULL, 209010, '', '', '', false, false, true, 1, true, 44, false, '[]'::jsonb, '[]'::jsonb),
  (400045, 77, 'Thai Style Fried Rice', 'ბრინჯი აზიურად', NULL, 'Soy Sauce', 'სოიოს სოუსი', NULL, '18.00 ₾', NULL, 209011, '', '', '', false, false, true, 1, true, 45, false, '[]'::jsonb, '[{"en": "Veggie", "ka": "\u10d1\u10dd\u10e1\u10e2\u10dc\u10d4\u10e3\u10da\u10d8", "price": "18.00 \u20be"}, {"en": "Chicken", "ka": "\u10e5\u10d0\u10d7\u10d0\u10db\u10d8", "price": "25.00 \u20be"}, {"en": "Shrimp", "ka": "\u10d9\u10e0\u10d4\u10d5\u10d4\u10e2\u10d8", "price": "34.00 \u20be"}]'::jsonb),
  (400046, 77, 'Sriracha Fried Rice', 'სრირაჩა ფრაიდ რაის', NULL, 'Soy sauce, White Sesame seed', 'სოიოს სოუსი, სეზამის მარცვალი', NULL, '27.00 ₾', NULL, 209011, '', '', '', false, false, true, 1, true, 46, false, '[]'::jsonb, '[{"en": "Chicken", "ka": "\u10e5\u10d0\u10d7\u10d0\u10db\u10d8", "price": "27.00 \u20be"}, {"en": "Shrimp", "ka": "\u10d9\u10e0\u10d4\u10d5\u10d4\u10e2\u10d8", "price": "36.00 \u20be"}]'::jsonb),
  (400047, 77, 'Chicken Donburi', 'დონბური ქათმით', NULL, 'Sesame Oil, White Sesame Seed, Soy Sauce, Oyster sauce', 'სეზამის ზეთი, სეზამის მარცვალი, სოიოს სოუსი, ხამანწკის სოუსი', NULL, '20.00 ₾', NULL, 209011, '', '', '', false, false, true, 1, true, 47, false, '[]'::jsonb, '[]'::jsonb),
  (400048, 77, 'Rice with Grilled Chicken & Satay Sauce', 'ბრინჯი ქათმით და მიწისთხილის სოუსით', NULL, 'Coconut Milk, Dark Soy sauce, Oyster sauce, Fish sauce, Peanut, White Sesame Seed', 'ქოქოსის რძე, სოიოს სოუსი, ხამანწკის სოუსი, თევზის სოუსი, მიწისთხილი, სეზამის მარცვალი', NULL, '28.00 ₾', NULL, 209011, '', '', '', false, false, true, 1, true, 48, false, '[]'::jsonb, '[]'::jsonb),
  (400049, 77, 'Grilled chicken with curry rice', 'ქათამი გრილზე ქარი ბრინჯით', NULL, 'Steam Rice, Curry, Turmeric, Garlic, Shallot, Onion, Coriander, Cucumber', 'ბრინჯი, ქარი, კურკუმა, ნიორი, შალოტი, ხახვი, ქინძი, კიტრი', NULL, '29.00 ₾', NULL, 209011, '', '', '', false, false, true, 1, true, 49, false, '[]'::jsonb, '[]'::jsonb),
  (400050, 77, 'Grilled Chicken Salad', 'ქათმის სალათი გრილზე', NULL, 'Chicken, Thai Spices, Red Chili, Cherry tomato, Cucumber, Spring Onion, Onion, Shallot, Coriander, Fish sauce', 'ქათამი, ტაი სანელებლები, წითელი ჩილი, პომიდორი ჩერი, კიტრი, მწვანე ხახვი, ხახვი, შალოტი, ქინძი, თევზის სოუსი', NULL, '27.00 ₾', NULL, 209012, '', '', '', false, false, true, 1, true, 50, false, '[]'::jsonb, '[]'::jsonb),
  (400051, 77, 'Crispy Chicken Salad', 'ხრაშუნა ქათმის სალათი', NULL, 'Chicken, Spring onion, Shallot, white onion, Celery, Coriander, Tomato, Red chilli', 'ქათამი, მწვანე ხახვი, შალოტი, თეთრი ხახვი, ნიახური, ქინძი, პამიდორი, წითელი ჩილი', NULL, '27.00 ₾', NULL, 209012, '', '', '', false, false, true, 1, true, 51, false, '[]'::jsonb, '[]'::jsonb),
  (400052, 77, 'Crispy Shrimp with Tamarind Sauce', 'ხრაშუნა კრევეტი თამარინდ სოუსით', NULL, 'Shrimp, tempura, shallot, tamarind sauce, fish sauce, coleslaw, crispy onion, chilli, coriander', 'კრევეტები, ტემპურა, თამარინდის სოუსი, თევზის სოუსი, ხრაშუნა ხახვი, წიწაკა, ქინძი', NULL, '35.00 ₾', NULL, 209013, '', '', '', false, false, true, 1, true, 52, false, '[]'::jsonb, '[]'::jsonb),
  (400053, 77, 'Kimchi', 'კიმჩი', NULL, 'Chinese cabbage, Ginger, Spring onion, Carrot, Chilli powder, Shrimp paste', 'ჩინური კომბოსტო, ჯინჯერი, მწვანე ხახვი, სტაფილო, ჩილის პუდრა, კრევეტის პასტა', NULL, '15.00 ₾', NULL, 209013, '', '', '', false, false, true, 1, true, 53, false, '[]'::jsonb, '[]'::jsonb),
  (400054, 77, 'Panang Curry', 'პანანგ ქარი', NULL, 'Fish sauce, Coconut milk', 'თევზის სოუსი, ქოქოსის რძე', NULL, '27.00 ₾', NULL, 209014, '', '', '', false, false, true, 1, true, 54, false, '[]'::jsonb, '[{"en": "Chicken", "ka": "\u10e5\u10d0\u10d7\u10d0\u10db\u10d8", "price": "27.00 \u20be"}, {"en": "Beef", "ka": "\u10e1\u10d0\u10e5. \u10ee\u10dd\u10e0\u10ea\u10d8", "price": "35.00 \u20be"}]'::jsonb),
  (400055, 77, 'Massaman Curry', 'მასამან ქარი', NULL, 'White onion, Potato, Peanut, massaman curry paste', 'ხახვი, კარტოფილი, მიწისთხილი, მასამან ქარის პასტა', NULL, '24.00 ₾', NULL, 209014, '', '', '', false, false, true, 1, true, 55, false, '[]'::jsonb, '[{"en": "Chicken", "ka": "\u10e5\u10d0\u10d7\u10d0\u10db\u10d8", "price": "24.00 \u20be"}, {"en": "Beef", "ka": "\u10e1\u10d0\u10e5.\u10ee\u10dd\u10e0\u10ea\u10d8", "price": "34.00 \u20be"}, {"en": "Shrimp", "ka": "\u10d9\u10e0\u10d4\u10d5\u10d4\u10e2\u10d8", "price": "34.00 \u20be"}]'::jsonb),
  (400056, 77, 'Grilled Chicken Red Hot Curry', 'ქათამი გრილზე წითელი ქარი', NULL, 'Chicken meat, Green pea, Zucchini, Basil, Cherry tomato, Red chilli, Red curry paste', 'ქათამი, მუხუდო, ცუკინი, ბაზილი, ჩერი პომიდორი, წითელი ჩილი, წითელი ჩილის პასტა', NULL, '32.00 ₾', NULL, 209014, '', '', '', false, false, true, 1, true, 56, false, '[]'::jsonb, '[]'::jsonb),
  (400057, 77, 'Green Curry', 'მწვანე ქარი', NULL, 'Fish sauce, Coconut milk', 'თევზის სოუსი, ქოქოსის რძე', NULL, '26.00 ₾', NULL, 209014, '', '', '', false, false, true, 1, true, 57, false, '[]'::jsonb, '[{"en": "Chicken", "ka": "\u10e5\u10d0\u10d7\u10d0\u10db\u10d8", "price": "26.00 \u20be"}, {"en": "Shrimp", "ka": "\u10d9\u10e0\u10d4\u10d5\u10d4\u10e2\u10d8", "price": "35.00 \u20be"}, {"en": "Beef", "ka": "\u10e1\u10d0\u10e5. \u10ee\u10dd\u10e0\u10ea\u10d8", "price": "35.00 \u20be"}]'::jsonb),
  (400058, 77, 'Yellow Curry', 'ყვითელი ქარი', NULL, 'Fish sauce, Coconut milk', 'თევზის სოუსი, ქოქოსის რძე', NULL, '25.00 ₾', NULL, 209014, '', '', '', false, false, true, 1, true, 58, false, '[]'::jsonb, '[{"en": "Chicken", "ka": "\u10e5\u10d0\u10d7\u10db\u10d8\u10d7", "price": "25.00 \u20be"}, {"en": "Beef", "ka": "\u10e1\u10d0\u10e5. \u10ee\u10dd\u10e0\u10ea\u10d8\u10d7", "price": "35.00 \u20be"}]'::jsonb),
  (400059, 77, 'Stir fried Noodles Sriracha Sauce', 'სრირაჩა სთირ ფრაიდ ნუდლსი', NULL, 'Celery, Soy sauce, Oyster sauce', 'ნიახური, სოიოს სოუსი, ხამანწკის სოუსი', NULL, '26.00 ₾', NULL, 209015, '', '', '', false, false, true, 1, true, 59, false, '[]'::jsonb, '[{"en": "Chicken", "ka": "\u10e5\u10d0\u10d7\u10d0\u10db\u10d8", "price": "26.00 \u20be"}, {"en": "Shrimp", "ka": "\u10d9\u10e0\u10d4\u10d5\u10d4\u10e2\u10d8", "price": "32.00 \u20be"}]'::jsonb),
  (400060, 77, 'Stir fried Noodles Soy Sauce', 'სთირ ფრაიდ ნუდლსი სოიოს სოუსით', NULL, 'Celery, Soy sauce, Oyster sauce', 'ნიახური, სოიოს სოუსი, ხამანწკის სოუსი', NULL, '25.00 ₾', NULL, 209015, '', '', '', false, false, true, 1, true, 60, false, '[]'::jsonb, '[{"en": "Chicken", "ka": "\u10e5\u10d0\u10d7\u10d0\u10db\u10d8", "price": "25.00 \u20be"}, {"en": "Shrimp", "ka": "\u10d9\u10e0\u10d4\u10d5\u10d4\u10e2\u10d8", "price": "30.00 \u20be"}]'::jsonb),
  (400061, 77, 'Stir fried Glass Noodles', 'სთირ ფრაიდ გლას ნუდლსი', NULL, 'Celery, Soy sauce, Oyster sauce', 'ნიახური, სოიოს სოუსი, ხამანწკის სოუსი', NULL, '24.00 ₾', NULL, 209015, '', '', '', false, false, true, 1, true, 61, false, '[]'::jsonb, '[{"en": "Veggie", "ka": "\u10d1\u10dd\u10e1\u10e2\u10dc\u10d4\u10e3\u10da\u10d8", "price": "24.00 \u20be"}, {"en": "Chicken", "ka": "\u10e5\u10d0\u10d7\u10d0\u10db\u10d8", "price": "28.00 \u20be"}, {"en": "Shrimp", "ka": "\u10d9\u10e0\u10d4\u10d5\u10d4\u10e2\u10d8", "price": "36.00 \u20be"}]'::jsonb),
  (400062, 77, 'Pad Si Euw', 'პად სი იუ ნუდლსი', NULL, 'Soy sauce, Oyster sauce', 'სოიოს სოუსი, ხამანწკის სოუსი', NULL, '24.00 ₾', NULL, 209015, '', '', '', false, false, true, 1, true, 62, false, '[]'::jsonb, '[{"en": "Veggie", "ka": "\u10d1\u10dd\u10e1\u10e2\u10dc\u10d4\u10e3\u10da\u10d8", "price": "24.00 \u20be"}, {"en": "Chicken", "ka": "\u10e5\u10d0\u10d7\u10d0\u10db\u10d8", "price": "30.00 \u20be"}, {"en": "Shrimp", "ka": "\u10d9\u10e0\u10d4\u10d5\u10d4\u10e2\u10d8", "price": "36.00 \u20be"}]'::jsonb),
  (400063, 77, 'Pad Thai Noodles', 'პად ტაი ნუდლსი', NULL, 'Fish sauce, Tamarind sauce, tofu', 'თევზის სოუსი, თამარინდ სოუსი, ტოფუ', NULL, '24.00 ₾', NULL, 209015, '', '', '', false, false, true, 1, true, 63, false, '[]'::jsonb, '[{"en": "Veggie", "ka": "\u10d1\u10dd\u10e1\u10e2\u10dc\u10d4\u10e3\u10da\u10d8", "price": "24.00 \u20be"}, {"en": "Chicken", "ka": "\u10e5\u10d0\u10d7\u10d0\u10db\u10d8", "price": "30.00 \u20be"}, {"en": "Shrimp", "ka": "\u10d9\u10e0\u10d4\u10d5\u10d4\u10e2\u10d8", "price": "36.00 \u20be"}]'::jsonb),
  (400064, 77, 'Tom Yum Seafood Clear Soup', 'ტომ იამი გამჭვირვალე წვნიანი ზღვის პროდუქტებით', NULL, 'Stock, Shallot, Lemongrass, Galangal, Pickle chilli, Mussel, Squid, Shrimp, Mushroom, Sweet basil, Red chilli, MSG, Fish sauce, Lime, Lime leaves', 'ბულიონი, შალოტი, ლემონგრასი, გალანგალი, მწნილი წიწაკა, მიდიები, კალმარი, კრევეტები, სოკო, ტკბილი რეჰანი, წითელი წიწაკა, MSG, თევზის სოუსი, ლაიმი, ლაიმის ფოთლები', NULL, '38.00 ₾', NULL, 209016, '', '', '', false, false, true, 1, true, 64, false, '[]'::jsonb, '[]'::jsonb),
  (400065, 77, 'Thai Noodles Black Soup', 'ტაი ნუდლსის შავი წვნიანი', NULL, 'Cinnamon, Anise star, Garlic, Rice noodles, Coleslaw, Coriander, Green Onion, Dry shitake, White pepper powder, MSG, Soy sauce, Oyster sauce, Dark soy sauce', 'დარიჩინი, ანისულის ვარსკვლავი, ნიორი, ბრინჯის ლაფშა, კოულსლოუ, ქინძი, მწვანე ხახვი, ხმელი შიიტაკე, თეთრი წიწაკის ფხვნილი, MSG, სოიოს სოუსი, ხამანწკის სოუსი, მუქი სოიოს სოუსი', NULL, '27.00 ₾', NULL, 209016, '', '', '', false, false, true, 1, true, 65, false, '[]'::jsonb, '[{"en": "Chicken", "ka": "\u10e5\u10d0\u10d7\u10d0\u10db\u10d8", "price": "27.00 \u20be"}, {"en": "Beef", "ka": "\u10e1\u10d0\u10e5\u10dd\u10dc\u10da\u10d8\u10e1 \u10ee\u10dd\u10e0\u10ea\u10d8", "price": "33.00 \u20be"}]'::jsonb),
  (400066, 77, 'Thai Noodle Soup with Chicken Shreded', 'ტაი ნუდლ სუფი ქათმით', NULL, 'Peanut, garlic, soy sauce, oyster sauce', 'მიწისთხილი, ნიორი, სოიოს სოუსი, ხამანწკის სოუსი', NULL, '22.00 ₾', NULL, 209016, '', '', '', false, false, true, 1, true, 66, false, '[]'::jsonb, '[]'::jsonb),
  (400067, 77, 'Tom Yum', 'ტომ იამი', NULL, 'Fish sauce, Coconut milk', 'თევზის სოუსი, ქოქოსის რძე', NULL, '26.00 ₾', NULL, 209016, '', '', '', false, false, true, 1, true, 67, false, '[]'::jsonb, '[{"en": "Veggie", "ka": "\u10d1\u10dd\u10e1\u10e2\u10dc\u10d4\u10e3\u10da\u10d8", "price": "26.00 \u20be"}, {"en": "Chicken", "ka": "\u10e5\u10d0\u10d7\u10d0\u10db\u10d8", "price": "30.00 \u20be"}, {"en": "Shrimp", "ka": "\u10d9\u10e0\u10d4\u10d5\u10d4\u10e2\u10d8", "price": "36.00 \u20be"}]'::jsonb),
  (400068, 77, 'Tom Kha', 'ტომ კჰა', NULL, 'Fish sauce, Coconut milk', 'თევზის სოუსი, ქოქოსის რძე', NULL, '26.00 ₾', NULL, 209016, '', '', '', false, false, true, 1, true, 68, false, '[]'::jsonb, '[{"en": "Veggie", "ka": "\u10d1\u10dd\u10e1\u10e2\u10dc\u10d4\u10e3\u10da\u10d8", "price": "26.00 \u20be"}, {"en": "Chicken", "ka": "\u10e5\u10d0\u10d7\u10d0\u10db\u10d8", "price": "30.00 \u20be"}, {"en": "Shrimp", "ka": "\u10d9\u10e0\u10d4\u10d5\u10d4\u10e2\u10d8", "price": "36.00 \u20be"}]'::jsonb),
  (400069, 77, 'Tom Yum Ramen with Shrimp', 'ტომ იამის რამენი კრევეტით', NULL, 'Ramen noodles, Shrimp, wakame, Bonito, Tom yum paste, Chilli paste, Egg, White sesame seed, Spring onion, Nori, Soy sauce', 'რამენის ნუდლი, კრევეტი, ვაკამე, ბონიტო, ტომ იამის პასტა, ჩილი პასტა, კვერცხი, სეზამის თესლი, მწვანე ხახვი, ნორი, სოიოს სოუსი', NULL, '32.00 ₾', NULL, 209016, '', '', '', false, false, true, 1, true, 69, false, '[]'::jsonb, '[]'::jsonb),
  (400070, 77, 'Pho with Beef', 'პჰო საქონლის ხორცით', NULL, 'Beef, White onion, Garlic, Coriander root, Ginger, Rice noodles, Cabbage, Carrot, Basil, coriander, red chilli, Soy sauce, Oyster sauce', 'საქონლის ხორცი, ხახვი, ნიორი, ქინძის ფესვი, ჯინჯერი, ბრინჯის ნუდლი, კომბოსტო, სტაფილო, ბაზილი, ქინძი, წითელი ჩილი, სოიოს სოუსი, ხამანწკის სოუსი', NULL, '38.00 ₾', NULL, 209016, '', '', '', false, false, true, 1, true, 70, false, '[]'::jsonb, '[]'::jsonb),
  (400071, 77, 'Salmon', 'ორაგული', NULL, 'salmon, lemon zest, himalayan salt', 'ორაგული, ლიმონის ცედრა, ჰიმალაის მარილი', NULL, '36.00 ₾', NULL, 209017, '', '', 'https://restaurant-ar.pages.dev/assets/food-market/catalogue/asian-sashimi-salmon-75d8714e.webp', false, false, false, 1, true, 71, false, '[]'::jsonb, '[]'::jsonb),
  (400072, 77, 'Tuna', 'თინუსი', NULL, 'tuna, green onion', 'თინუსი, მწვანე ხახვი', NULL, '25.00 ₾', NULL, 209017, '', '', 'https://restaurant-ar.pages.dev/assets/food-market/catalogue/asian-sashimi-tuna-97d4da5c.webp', false, false, false, 1, true, 72, false, '[]'::jsonb, '[]'::jsonb),
  (400073, 77, 'Chef', 'შეფი', NULL, 'Salmon, rice, Spring onion', 'ორაგული, ბრინჯი, მწვანე ხახვი', NULL, '25.00 ₾', NULL, 209018, '', '', '', false, false, true, 1, true, 73, false, '[]'::jsonb, '[]'::jsonb),
  (400074, 77, 'Salmon', 'ორაგული', NULL, 'salmon, rice', 'ორაგული, ბრინჯი', NULL, '22.00 ₾', NULL, 209018, '', '', 'https://restaurant-ar.pages.dev/assets/food-market/catalogue/asian-nigiri-salmon-2102b157.webp', false, false, false, 1, true, 74, false, '[]'::jsonb, '[]'::jsonb),
  (400075, 77, 'Tuna', 'თინუსი', NULL, 'tuna, spring onions, rice', 'თინუსი, მწვანე ხახვი, ბრინჯი', NULL, '20.00 ₾', NULL, 209018, '', '', 'https://restaurant-ar.pages.dev/assets/food-market/catalogue/asian-nigiri-tuna-38cc91c7.webp', false, false, false, 1, true, 75, false, '[]'::jsonb, '[]'::jsonb),
  (400076, 77, 'Salmon', 'ორაგული', NULL, 'rice, salmon, cream cheese, nori, teriyaki, green onion', 'ბრინჯი, ორაგული, კრემყველი, ნორი, ტერიაკი, მწვანე ხახვი', NULL, '24.00 ₾', NULL, 209019, '', '', '', false, false, true, 1, true, 76, false, '[]'::jsonb, '[]'::jsonb),
  (400077, 77, 'Shrimp', 'კრევეტი', NULL, 'rice, crab, shrimp, tempura, mayo-mango, nori', 'ბრინჯი, კრემყველი, კრევეტი, ტემპურა, მაიო-მანგო, ნორი', NULL, '20.00 ₾', NULL, 209019, '', '', '', false, false, true, 1, true, 77, false, '[]'::jsonb, '[]'::jsonb),
  (400078, 77, 'Kappa Maki', 'კიტრის მაკი', NULL, 'nori, rice, cucumber', 'ნორი, ბრინჯი, კიტრი', NULL, '14.00 ₾', NULL, 209020, '', '', 'https://restaurant-ar.pages.dev/assets/food-market/catalogue/asian-maki-kappa-maki-5d259973.webp', false, false, false, 1, true, 78, false, '[]'::jsonb, '[]'::jsonb),
  (400079, 77, 'Shake Maki', 'ორაგულის მაკი', NULL, 'nori, Salmon, Rice', 'ნორი, ორაგული, ბრინჯი', NULL, '21.00 ₾', NULL, 209020, '', '', 'https://restaurant-ar.pages.dev/assets/food-market/catalogue/asian-maki-shake-maki-a4c6ea2e.webp', false, false, false, 1, true, 79, false, '[]'::jsonb, '[]'::jsonb),
  (400080, 77, 'Ebi Maki', 'კრევეტის მაკი', NULL, 'nori, shrimp, rice, cream-cheese', 'ნორი, კრევეტი, ბრინჯი, კრემყველი', NULL, '20.00 ₾', NULL, 209020, '', '', 'https://restaurant-ar.pages.dev/assets/food-market/catalogue/asian-maki-ebi-maki-757905be.webp', false, false, false, 1, true, 80, false, '[]'::jsonb, '[]'::jsonb),
  (201421, 77, 'Unagi Philadelphia', 'უნაგი ფილადელფია', NULL, 'rice, sesame, unagi fish, avocado, salmon, unagi sauce, tobiko, cream-cheese', 'ბრინჯი, სეზამი, გველთევზა, ავოკადო, ორაგული, უნაგის სოუსი, ტობიკო, კრემყველი', NULL, '44.00 ₾', NULL, 209021, 'https://pub-b253d60df14c4c1f94bada002fa59596.r2.dev/food-market-main/1787820485854_salmon_sushi_roll_draco.glb', 'https://pub-b253d60df14c4c1f94bada002fa59596.r2.dev/food-market-main/1787820543487_salmon_sushi_roll.usdz', 'https://pub-b253d60df14c4c1f94bada002fa59596.r2.dev/food-market-main/1787819264838_sushi.webp', false, true, false, 1, true, 81, false, '[]'::jsonb, '[]'::jsonb),
  (400082, 77, 'Crab Uramaki', 'კიბორჩხალას ურამაკი', NULL, 'rice, salmon, avocado, crab mix', 'ბრინჯი, ორაგული, ავოკადო, კრაბის მიქსი', NULL, '28.00 ₾', NULL, 209021, '', '', '', false, false, true, 1, true, 82, false, '[]'::jsonb, '[]'::jsonb),
  (400083, 77, 'Unagi Crispy Roll', 'უნაგის ხრაშუნა როლი', NULL, 'rice, sesame, cream-cheese, shrimp, unagi fish, unagi sauce, mayo, panko', 'ბრინჯი, სეზამი, კრემ-ყველი, კრევეტი, გველთევზა, უნაგის სოუსი, მაიო, პანკო', NULL, '42.00 ₾', NULL, 209021, '', '', '', false, false, true, 1, true, 83, false, '[]'::jsonb, '[]'::jsonb),
  (400084, 77, 'Spicy Salmon', 'ცხარე ორაგული', NULL, 'nori, rice, sesame, salmon, cucumber, spicy mayo, spring onion', 'ნორი, ბრინჯი, სეზამი, ორაგული, კიტრი, ცხარე მაიო, მწვანე ხახვი', NULL, '28.00 ₾', NULL, 209021, '', '', 'https://restaurant-ar.pages.dev/assets/food-market/catalogue/asian-uramaki-roll-spicy-salmon-14f590ef.webp', false, false, false, 1, true, 84, false, '[]'::jsonb, '[]'::jsonb),
  (400085, 77, 'California', 'კალიფორნია', NULL, 'nori, rice, tobiko, mayo, shrimp, crab, cucumber', 'ნორი, ბრინჯი, ტობიკო, მაიონეზი, კრევეტი, კიბორჩხალა, კიტრი', NULL, '30.00 ₾', NULL, 209021, '', '', 'https://restaurant-ar.pages.dev/assets/food-market/catalogue/asian-uramaki-roll-california-aecaa463.webp', false, false, false, 1, true, 85, false, '[]'::jsonb, '[]'::jsonb),
  (400086, 77, 'Dragon', 'დრაგონ', NULL, 'nori, rice, sesame, shrimp, spicy mayo, avocado, unagi fish, teriyaki sauce', 'ნორი, ბრინჯი, სეზამი, კრევეტი, ცხარე მაიონეზი, ავოკადო, გველთევზა, ტერიაკის სოუსი', NULL, '38.00 ₾', NULL, 209021, '', '', 'https://restaurant-ar.pages.dev/assets/food-market/catalogue/asian-uramaki-roll-dragon-1952043b.webp', false, false, false, 1, true, 86, false, '[]'::jsonb, '[]'::jsonb),
  (400087, 77, 'Spicy Tuna', 'ცხარე თინუსი', NULL, 'nori, rice, cucumber, sesame, tuna, spicy mayo, green onion', 'ნორი, ბრინჯი, კიტრი, სეზამი, თინუსი, ცხარე მაიო, მწვანე ხახვი', NULL, '25.00 ₾', NULL, 209021, '', '', 'https://restaurant-ar.pages.dev/assets/food-market/catalogue/asian-uramaki-roll-spicy-tuna-9b131c51.webp', false, false, false, 1, true, 87, false, '[]'::jsonb, '[]'::jsonb),
  (400088, 77, 'Philadelphia', 'ფილადელფია', NULL, 'nori, rice, salmon, cream cheese, tobiko, green onion, himalayan salt, teriyaki sauce', 'ნორი, ბრინჯი, ორაგული, კრემ ყველი, ტობიკო, მწვანე ხახვი, ჰიმალაის მარილი, ტერიაკის სოუსი', NULL, '42.00 ₾', NULL, 209021, '', '', 'https://restaurant-ar.pages.dev/assets/food-market/catalogue/asian-uramaki-roll-philadelphia-8947015b.webp', false, false, false, 1, true, 88, false, '[]'::jsonb, '[]'::jsonb),
  (400089, 77, 'Unagi', 'უნაგი', NULL, 'nori, rice, avocado, sesame, unagi, cream cheese, teriyaki', 'ნორი, ბრინჯი, ავოკადო, სეზამი, უნაგი, კრემ ყველი, ტერიაკი', NULL, '35.00 ₾', NULL, 209021, '', '', 'https://restaurant-ar.pages.dev/assets/food-market/catalogue/asian-uramaki-roll-unagi-d83a44b9.webp', false, false, false, 1, true, 89, false, '[]'::jsonb, '[]'::jsonb),
  (400090, 77, 'Tropical Shrimp', 'ტროპიკული კრევეტი', NULL, 'nori, rice, shrimp, salmon, avocado, tempura, mayo-mango', 'ნორი, ბრინჯი, კრევეტი, ორაგული, ავოკადო, ტემპურა, მაიო-მანგო', NULL, '33.00 ₾', NULL, 209021, '', '', 'https://restaurant-ar.pages.dev/assets/food-market/catalogue/asian-uramaki-roll-tropical-shrimp-e011d09b.webp', false, false, false, 1, true, 90, false, '[]'::jsonb, '[]'::jsonb),
  (400091, 77, 'Royal Philadelphia', 'სამეფო ფილადელფია', NULL, 'nori, rice, salmon, cream cheese, caviar, lemon zest', 'ნორი, ბრინჯი, ორაგული, კრემყველი, ხიზილალა, ლიმონის ცედრა', NULL, '48.00 ₾', NULL, 209021, '', '', 'https://restaurant-ar.pages.dev/assets/food-market/catalogue/asian-uramaki-roll-royal-philadelphia-ccfa402f.webp', false, false, false, 1, true, 91, false, '[]'::jsonb, '[]'::jsonb),
  (400092, 77, 'Spicy Philadelphia', 'ცხარე ფილადელფია', NULL, 'nori, rice, salmon, cream cheese, mayo-mango, chili pepper', 'ნორი, ბრინჯი, ორაგული, კრემყველი, მაიო-მანგო, ჩილი წიწაკა', NULL, '40.00 ₾', NULL, 209021, '', '', '', false, false, true, 1, true, 92, false, '[]'::jsonb, '[]'::jsonb),
  (400093, 77, 'Veggie Futomaki', 'ფუტომაკი ბოსტნეული', NULL, 'nori, rice, sesame, iceberg, cucumber, hiashi, tekuan', 'ნორი, ბრინჯი, სეზამი, აისბერგი, კიტრი, ჰიაში, ტეკუანი', NULL, '21.00 ₾', NULL, 209022, '', '', 'https://restaurant-ar.pages.dev/assets/food-market/catalogue/asian-futomaki-veggie-futomaki-7e4d2105.webp', false, false, false, 1, true, 93, false, '[]'::jsonb, '[]'::jsonb),
  (400094, 77, 'Tuna Futomaki', 'ფუტომაკი თინუსი', NULL, 'nori, rice, ginger, tuna, spring onion, cream-cheese, cucumber', 'ნორი, ბრინჯი, ჯინჯერი, თინუსი, მწვანე ხახვი, კრემ-ყველი, კიტრი', NULL, '27.00 ₾', NULL, 209022, '', '', 'https://restaurant-ar.pages.dev/assets/food-market/catalogue/asian-futomaki-tuna-futomaki-09b4635a.webp', false, false, false, 1, true, 94, false, '[]'::jsonb, '[]'::jsonb),
  (400095, 77, 'Salmon Futomaki', 'ფუტომაკი ორაგულით', NULL, 'nori, rice, salmon, cream-cheese, spring onion, crab', 'ნორი, ბრინჯი, ორაგული, კრემ-ყველი, მწვანე ხახვი, კიბორჩხალა', NULL, '32.00 ₾', NULL, 209022, '', '', 'https://restaurant-ar.pages.dev/assets/food-market/catalogue/asian-futomaki-salmon-futomaki-d1ecf09b.webp', false, false, false, 1, true, 95, false, '[]'::jsonb, '[]'::jsonb),
  (400096, 77, 'Salmon Poke Bowl', 'ორაგულის თასი', NULL, 'Salmon, Sweet corn, Avocado, Carrot, Cucumber, Kimchi, Rice, Unagi sauce, Sesame seed, Spicy mayo', 'ორაგული, ტკბილი სიმინდი, ავოკადო, სტაფილო, კიტრი, კიმჩი, ბრინჯი, უნაგის სოუსი, სეზამის მარცვლები, ცხარე მაიონეზი', NULL, '28.00 ₾', NULL, 209023, '', '', '', false, false, true, 1, true, 96, false, '[]'::jsonb, '[]'::jsonb),
  (400097, 77, 'Tuna Poke Bowl', 'თინუსის თასი', NULL, 'Tuna, Cucumber, Carrot, Hiyashi wakame, Radish, Sesame seed, Rice, Unagi sauce, Wasabi Mayo', 'თინუსი, კიტრი, სტაფილო, ჰიაში ვაკამე, ბოლოკი, სეზამის მარცვლები, ბრინჯი, უნაგის სოუსი, ვასაბის მაიონეზი', NULL, '29.00 ₾', NULL, 209023, '', '', '', false, false, true, 1, true, 97, false, '[]'::jsonb, '[]'::jsonb),
  (400098, 77, 'Shrimp Poke Bowl', 'კრევეტის თასი', NULL, 'Shrimp, Edamame, Sweet corn, Carrot, Cucumber, Pickle ginger, Tobiko, Rice, Soya, Mayo', 'კრევეტი, ედამამე, ტკბილი სიმინდი, სტაფილო, კიტრი, მწნილი კოჭა, ტობიკო, ბრინჯი, სოიო, მაიონეზი', NULL, '25.00 ₾', NULL, 209023, '', '', '', false, false, true, 1, true, 98, false, '[]'::jsonb, '[]'::jsonb),
  (400099, 77, 'Faustino VII Blanco 2024, Bodegas Spain', 'ფაუსტინო VII 2024, Bodegas ესპანეთი', NULL, NULL, NULL, NULL, '52.00 ₾', NULL, 209024, '', '', '', false, false, true, 1, true, 99, false, '[]'::jsonb, '[]'::jsonb),
  (400100, 77, 'Lumina Pinot Grigio delle Venezie DOC 2024, Ruffino Italy', 'ლუმინა პინო გრიჯიო დელე ვენეციე, Ruffino იტალია', NULL, NULL, NULL, NULL, '61.00 ₾', NULL, 209024, '', '', '', false, false, true, 1, true, 100, false, '[]'::jsonb, '[]'::jsonb),
  (400101, 77, 'Riesling “vom Roten Schiefer” 2021, Germany', 'რიზლინგი „vom Roten Schiefer“ 2021 გერმანია', NULL, NULL, NULL, NULL, '82.00 ₾', NULL, 209024, '', '', '', false, false, true, 1, true, 101, false, '[]'::jsonb, '[]'::jsonb),
  (400102, 77, 'Hey French Bianco Veneto, Multivintage Pasqua Italy', 'ბიანკო ვენეტო, Multivintage Pasqua იტალია', NULL, NULL, NULL, NULL, '201.00 ₾', NULL, 209024, '', '', 'https://restaurant-ar.pages.dev/assets/food-market/catalogue/drinks-white-classic-hey-french-bianco-veneto-multivintage-pasqua-italy-fc171a6c.webp', false, false, false, 1, true, 102, false, '[]'::jsonb, '[]'::jsonb),
  (400103, 77, 'Graves Blanc, Reserve, Bordeaux 2022, Mouton Cadet France', 'გრეივს ბლანი, რეზერვი, ბორდო 2022, Mouton Cadet საფრანგეთი', NULL, NULL, NULL, NULL, '76.00 ₾', NULL, 209024, '', '', 'https://restaurant-ar.pages.dev/assets/food-market/catalogue/drinks-white-classic-graves-blanc-reserve-bordeaux-2022-mouton-cadet-france-97dd6ac2.webp', false, false, false, 1, true, 103, false, '[]'::jsonb, '[]'::jsonb),
  (400104, 77, 'Tsinandali, Naberauli', 'წინანდალი, ნაბერაული', NULL, NULL, NULL, NULL, '24.00 ₾', NULL, 209024, '', '', '', false, false, true, 1, true, 104, false, '[]'::jsonb, '[]'::jsonb),
  (400105, 77, 'Mtsvane, Kardanakhi 1888', 'მწვანე, კარდანახი 1888', NULL, NULL, NULL, NULL, '15.00 ₾', NULL, 209024, '', '', 'https://restaurant-ar.pages.dev/assets/food-market/catalogue/drinks-white-classic-mtsvane-kardanakhi-1888-65192427.webp', false, false, false, 1, true, 105, false, '[]'::jsonb, '[]'::jsonb),
  (400106, 77, 'Tsiskari, Eclipse, Tkatsiteli 2021', 'ცისკარი, ეკლიფსე, რქაწითელი 2021', NULL, NULL, NULL, NULL, '27.00 ₾', NULL, 209024, '', '', '', false, false, true, 1, true, 106, false, '[]'::jsonb, '[]'::jsonb),
  (400107, 77, 'Mtsvane, Shakriani Estate', 'მწვანე, შაქრიანი ესთეითი', NULL, NULL, NULL, NULL, '36.00 ₾', NULL, 209024, '', '', '', false, false, true, 1, true, 107, false, '[]'::jsonb, '[]'::jsonb),
  (400108, 77, 'Chinuri-Goruli Mtsvane, Gulodrava', 'ჩინური-გორული მწვანე, გულოდრავა', NULL, NULL, NULL, NULL, '42.00 ₾', NULL, 209024, '', '', 'https://restaurant-ar.pages.dev/assets/food-market/catalogue/drinks-white-classic-chinuri-goruli-mtsvane-gulodrava-573d989d.webp', false, false, false, 1, true, 108, false, '[]'::jsonb, '[]'::jsonb),
  (400109, 77, 'Atenuri, Gulodrava', 'ატენური, გულოდრავა', NULL, NULL, NULL, NULL, '42.00 ₾', NULL, 209024, '', '', 'https://restaurant-ar.pages.dev/assets/food-market/catalogue/drinks-white-classic-atenuri-gulodrava-d1edd923.webp', false, false, false, 1, true, 109, false, '[]'::jsonb, '[]'::jsonb),
  (400110, 77, 'Tsolikauri, Anemo', 'ცოლიკაური, ანემო', NULL, NULL, NULL, NULL, '51.00 ₾', NULL, 209025, '', '', '', false, false, true, 1, true, 110, false, '[]'::jsonb, '[]'::jsonb),
  (400111, 77, 'Goruli Mtsvane, Zedashe', 'გორული მწვანე, ზედაშე', NULL, NULL, NULL, NULL, '63.00 ₾', NULL, 209025, '', '', 'https://restaurant-ar.pages.dev/assets/food-market/catalogue/drinks-white-dry-qvevri-goruli-mtsvane-zedashe-d3cbfc96.webp', false, false, false, 1, true, 111, false, '[]'::jsonb, '[]'::jsonb),
  (400112, 77, 'Mtsvane, Rtvelisi', 'მწვანე, რთველისი', NULL, NULL, NULL, NULL, '47.00 ₾', NULL, 209025, '', '', 'https://restaurant-ar.pages.dev/assets/food-market/catalogue/drinks-white-dry-qvevri-mtsvane-rtvelisi-6c23f455.webp', false, false, false, 1, true, 112, false, '[]'::jsonb, '[]'::jsonb),
  (400113, 77, 'Rkatsiteli, Vardiashvili', 'რქაწითელი, ვარდიაშვილი', NULL, NULL, NULL, NULL, '31.00 ₾', NULL, 209025, '', '', '', false, false, true, 1, true, 113, false, '[]'::jsonb, '[]'::jsonb),
  (400114, 77, 'Khikhvi, Pirveli Winery', 'ხიხვი, პირველი მეღვინეობა', NULL, NULL, NULL, NULL, '51.00 ₾', NULL, 209025, '', '', 'https://restaurant-ar.pages.dev/assets/food-market/catalogue/drinks-white-dry-qvevri-khikhvi-pirveli-winery-e9ed587e.webp', false, false, false, 1, true, 114, false, '[]'::jsonb, '[]'::jsonb),
  (400115, 77, 'Kisi, Shakriani Estate', 'ქისი, შაქრიანი ესთეითი', NULL, NULL, NULL, NULL, '36.00 ₾', NULL, 209025, '', '', 'https://restaurant-ar.pages.dev/assets/food-market/catalogue/drinks-white-dry-qvevri-kisi-shakriani-estate-64352086.webp', false, false, false, 1, true, 115, false, '[]'::jsonb, '[]'::jsonb),
  (400116, 77, 'Tvishi, Naberauli', 'ტვიში, ნაბერაული', NULL, NULL, NULL, NULL, '81.00 ₾', NULL, 209026, '', '', '', false, false, true, 1, true, 116, false, '[]'::jsonb, '[]'::jsonb),
  (400117, 77, 'Gviani Mosavali, Barbale', 'გვიანი მოსავალი, ბარბალე', NULL, NULL, NULL, NULL, '56.00 ₾', NULL, 209026, '', '', 'https://restaurant-ar.pages.dev/assets/food-market/catalogue/drinks-white-semi-sweet-gviani-mosavali-barbale-bc3782e4.webp', false, false, false, 1, true, 117, false, '[]'::jsonb, '[]'::jsonb),
  (400118, 77, 'Faustino VII Tempranillo 2023, Bodegas Spain', 'ფაუსტინო VII ტემპრანილო 2023, Bodegas ესპანეთი', NULL, NULL, NULL, NULL, '52.00 ₾', NULL, 209027, '', '', '', false, false, true, 1, true, 118, false, '[]'::jsonb, '[]'::jsonb),
  (400119, 77, '10 Meses 2023, Portia Spain', '10 მესეს 2023, Portia ესპანეთი', NULL, NULL, NULL, NULL, '91.00 ₾', NULL, 209027, '', '', '', false, false, true, 1, true, 119, false, '[]'::jsonb, '[]'::jsonb),
  (400120, 77, '1877 Chianti DOCG, Ruffino Italy', '1877 ჩიანტი DOCG, Ruffino იტალია', NULL, NULL, NULL, NULL, '65.00 ₾', NULL, 209027, '', '', '', false, false, true, 1, true, 120, false, '[]'::jsonb, '[]'::jsonb),
  (400121, 77, 'Primitivo di Manduria DOC 2024, Tenute Orestiadi Italy', 'პრიმიტივო დი მანდურია DOC 2024, Tenute Orestiadi იტალია', NULL, NULL, NULL, NULL, '73.00 ₾', NULL, 209027, '', '', '', false, false, true, 1, true, 121, false, '[]'::jsonb, '[]'::jsonb),
  (400122, 77, 'Saint-Emilion, Reserve Bordeaux 2020, Mouton Cadet France', 'სან-ემილიონ, რეზერვ ბორდო 2020, Mouton Cadet საფრანგეთი', NULL, NULL, NULL, NULL, '102.00 ₾', NULL, 209027, '', '', '', false, false, true, 1, true, 122, false, '[]'::jsonb, '[]'::jsonb),
  (400123, 77, 'Lui’, Cabernet Sauvignon Veneto 2018, Pasqua Italy', 'ლუი, კაბერნე სოვინიონი ვენეტო 2018, Pasqua იტალია', NULL, NULL, NULL, NULL, '133.00 ₾', NULL, 209027, '', '', 'https://restaurant-ar.pages.dev/assets/food-market/catalogue/drinks-red-dry-classic-lui-cabernet-sauvignon-veneto-2018-pasqua-italy-73b50510.webp', false, false, false, 1, true, 123, false, '[]'::jsonb, '[]'::jsonb),
  (400124, 77, 'Rosso Veneto IGT 2021, Pasqua Italy', 'როსო ვენეტო IGT 2021, Pasqua იტალია', NULL, NULL, NULL, NULL, '77.00 ₾', NULL, 209027, '', '', '', false, false, true, 1, true, 124, false, '[]'::jsonb, '[]'::jsonb),
  (400125, 77, 'Saperavi Esabi, Eclipse', 'საფერავი ესაბი, ეკლიპსე', NULL, NULL, NULL, NULL, '45.00 ₾', NULL, 209027, '', '', '', false, false, true, 1, true, 125, false, '[]'::jsonb, '[]'::jsonb),
  (400126, 77, 'Saperavi Dzelshavi, Royal Khvanchkara', 'საფერავი ძელშავი, როიალ ხვანჭკარა', NULL, NULL, NULL, NULL, '40.00 ₾', NULL, 209027, '', '', '', false, false, true, 1, true, 126, false, '[]'::jsonb, '[]'::jsonb),
  (400127, 77, 'Asuretuli, Marbano', 'ასურეთული, მარბანო', NULL, NULL, NULL, NULL, '54.00 ₾', NULL, 209027, '', '', 'https://restaurant-ar.pages.dev/assets/food-market/catalogue/drinks-red-dry-classic-asuretuli-marbano-e9014015.webp', false, false, false, 1, true, 127, false, '[]'::jsonb, '[]'::jsonb),
  (400128, 77, 'Saperavi, Shakriani Estate', 'საფერავი, შაქრიანი ესთეითი', NULL, NULL, NULL, NULL, '36.00 ₾', NULL, 209027, '', '', '', false, false, true, 1, true, 128, false, '[]'::jsonb, '[]'::jsonb),
  (400129, 77, 'Otskhanuri Sapere, Gulodrava', 'ოცხანური საფერე, გულოდრავა', NULL, NULL, NULL, NULL, '42.00 ₾', NULL, 209027, '', '', '', false, false, true, 1, true, 129, false, '[]'::jsonb, '[]'::jsonb),
  (400130, 77, 'Saperavi, Gulodrava', 'საფერავი, გულოდრავა', NULL, NULL, NULL, NULL, '42.00 ₾', NULL, 209027, '', '', '', false, false, true, 1, true, 130, false, '[]'::jsonb, '[]'::jsonb),
  (400131, 77, 'Saperavi, Rtvelisi', 'საფერავი, რთველისი', NULL, NULL, NULL, NULL, '45.00 ₾', NULL, 209027, '', '', '', false, false, true, 1, true, 131, false, '[]'::jsonb, '[]'::jsonb),
  (400132, 77, 'Saperavi, Anemo', 'საფერავი, ანემო', NULL, NULL, NULL, NULL, '45.00 ₾', NULL, 209028, '', '', '', false, false, true, 1, true, 132, false, '[]'::jsonb, '[]'::jsonb),
  (400133, 77, 'Shavkapito, Zedashe', 'შავკაპიტო, ზედაშე', NULL, NULL, NULL, NULL, '54.00 ₾', NULL, 209028, '', '', '', false, false, true, 1, true, 133, false, '[]'::jsonb, '[]'::jsonb),
  (400134, 77, 'Asuretuli, Zedashe', 'ასურეთული, ზედაშე', NULL, NULL, NULL, NULL, '54.00 ₾', NULL, 209028, '', '', 'https://restaurant-ar.pages.dev/assets/food-market/catalogue/drinks-red-dry-qvevri-asuretuli-zedashe-36fda36e.webp', false, false, false, 1, true, 134, false, '[]'::jsonb, '[]'::jsonb),
  (400135, 77, 'Saperavi, Shakriani Estate', 'საფერავი, შაქრიანი ესთეითი', NULL, NULL, NULL, NULL, '41.00 ₾', NULL, 209028, '', '', '', false, false, true, 1, true, 135, false, '[]'::jsonb, '[]'::jsonb),
  (400136, 77, 'Kindzmarauli, Rtvelisi', 'ქინძმარაული რთველისი', NULL, NULL, NULL, NULL, '32.00 ₾', NULL, 209029, '', '', 'https://restaurant-ar.pages.dev/assets/food-market/catalogue/drinks-red-semi-sweet-kindzmarauli-rtvelisi-61ef3100.webp', false, false, false, 1, true, 136, false, '[]'::jsonb, '[]'::jsonb),
  (400137, 77, 'Khvanchkara, Royal Khvanchkara', 'ხვანჭკარა, როიალ ხვანჭკარა', NULL, NULL, NULL, NULL, '72.00 ₾', NULL, 209029, '', '', 'https://restaurant-ar.pages.dev/assets/food-market/catalogue/drinks-red-semi-sweet-khvanchkara-royal-khvanchkara-d46dd3ce.webp', false, false, false, 1, true, 137, false, '[]'::jsonb, '[]'::jsonb),
  (400138, 77, 'Usakhelauri, Royal Racha', 'უსახელაური, როიალ რაჭა', NULL, NULL, NULL, NULL, '207.00 ₾', NULL, 209029, '', '', '', false, false, true, 1, true, 138, false, '[]'::jsonb, '[]'::jsonb),
  (400139, 77, '11 Minutes, Rose Trevenezie 2023, Pasqua Italy', '11 მინუტეს, როზე ტრევენეციე 2023, Pasqua იტალია', NULL, NULL, NULL, NULL, '88.00 ₾', NULL, 209030, '', '', 'https://restaurant-ar.pages.dev/assets/food-market/catalogue/drinks-rose-11-minutes-rose-trevenezie-2023-pasqua-italy-14102dd4.webp', false, false, false, 1, true, 139, false, '[]'::jsonb, '[]'::jsonb),
  (400140, 77, 'Saperavi Rose, Chelti', 'საფერავი როზე, ჩელთი', NULL, NULL, NULL, NULL, '27.00 ₾', NULL, 209030, '', '', '', false, false, true, 1, true, 140, false, '[]'::jsonb, '[]'::jsonb),
  (400141, 77, 'Shavkapito Rose, Amosa', 'შავკაპიტო როზე, ამოსა', NULL, NULL, NULL, NULL, '34.00 ₾', NULL, 209030, '', '', '', false, false, true, 1, true, 141, false, '[]'::jsonb, '[]'::jsonb),
  (400142, 77, 'Usakhelauri Rose, Naberauli', 'უსახელაური როზე, ნაბერაული', NULL, NULL, NULL, NULL, '63.00 ₾', NULL, 209030, '', '', '', false, false, true, 1, true, 142, false, '[]'::jsonb, '[]'::jsonb),
  (400143, 77, 'Askaneli Brut', 'ასკანელი ბრუტი', NULL, NULL, NULL, NULL, '42.00 ₾', NULL, 209031, '', '', '', false, false, true, 1, true, 143, false, '[]'::jsonb, '[]'::jsonb),
  (400144, 77, 'Bodegas Faustino Cava Brut', 'ბოდეგას ფაუსტინო', NULL, NULL, NULL, NULL, '61.00 ₾', NULL, 209031, '', '', '', false, false, true, 1, true, 144, false, '[]'::jsonb, '[]'::jsonb),
  (400145, 77, 'Soffio Prosecco DOC Millesimato 2025', 'პროსეკო', NULL, NULL, NULL, NULL, '83.00 ₾', NULL, 209031, '', '', '', false, false, true, 1, true, 145, false, '[]'::jsonb, '[]'::jsonb),
  (400146, 77, 'Faustino Cava Brut, Bodegas', 'ფაუსტინო, Bodegas', NULL, 'Sparkling Wine, Spain', 'ცქრიალა ღვინო, ესპანეთი', NULL, '17.00 ₾', NULL, 209032, '', '', '', false, false, true, 1, true, 146, false, '[]'::jsonb, '[]'::jsonb),
  (400147, 77, 'Pinot Grigio, Ruffino', 'პინო გრიჯიო, Ruffino', NULL, 'White Classic, Italy', 'თეთრი კლასიკური, იტალია', NULL, '18.00 ₾', NULL, 209032, '', '', '', false, false, true, 1, true, 147, false, '[]'::jsonb, '[]'::jsonb),
  (400148, 77, 'Primitivo di Manduria', 'პრიმიტივო დი მანდურია', NULL, 'Red Dry, Italy', 'წითელი მშრალი, იტალია', NULL, '24.00 ₾', NULL, 209032, '', '', '', false, false, true, 1, true, 148, false, '[]'::jsonb, '[]'::jsonb),
  (400149, 77, 'Cava Brut, Campo Viejo', 'კავა ბრუტი, Campo Viejo', NULL, 'Sparkling Wine, Spain', 'ცქრიალა ღვინო, ესპანეთი', NULL, '20.00 ₾', NULL, 209032, '', '', '', false, false, true, 1, true, 149, false, '[]'::jsonb, '[]'::jsonb),
  (400150, 77, 'Monastrell 2021, Bodegas Carchelo', 'მონასტრელ 2021, Bodegas Carchelo', NULL, 'Red Dry, Spain', 'წითელი მშრალი, ესპანეთი', NULL, '18.00 ₾', NULL, 209032, '', '', 'https://restaurant-ar.pages.dev/assets/food-market/catalogue/drinks-wine-by-the-glass-monastrell-2021-bodegas-carchelo-0a81c591.webp', false, false, false, 1, true, 150, false, '[]'::jsonb, '[]'::jsonb),
  (400151, 77, 'EYA Verdejo 2023, Bodegas Carchelo', 'ეა ვერდეხო 2023, Bodegas Carchelo', NULL, 'White Dry, Spain', 'თეთრი მშრალი, ესპანეთი', NULL, '16.00 ₾', NULL, 209032, '', '', 'https://restaurant-ar.pages.dev/assets/food-market/catalogue/drinks-wine-by-the-glass-eya-verdejo-2023-bodegas-carchelo-01265ed9.webp', false, false, false, 1, true, 151, false, '[]'::jsonb, '[]'::jsonb),
  (400152, 77, 'Tsolikauri Kisi, Rtvelisi', 'ცოლიკაური ქისი, რთველისი', NULL, NULL, NULL, NULL, '18.00 ₾', NULL, 209032, '', '', '', false, false, true, 1, true, 152, false, '[]'::jsonb, '[]'::jsonb),
  (400153, 77, 'Tsinandali, Chelti', 'წინანდალი, ჩელთი', NULL, NULL, NULL, NULL, '14.00 ₾', NULL, 209032, '', '', '', false, false, true, 1, true, 153, false, '[]'::jsonb, '[]'::jsonb),
  (400154, 77, 'Tvishi, Rtvelisi', 'ტვიში, რთველისი', NULL, NULL, NULL, NULL, '18.00 ₾', NULL, 209032, '', '', '', false, false, true, 1, true, 154, false, '[]'::jsonb, '[]'::jsonb),
  (400155, 77, 'Saperavi, Rtvelisi', 'საფერავი, რთველისი', NULL, NULL, NULL, NULL, '15.00 ₾', NULL, 209032, '', '', '', false, false, true, 1, true, 155, false, '[]'::jsonb, '[]'::jsonb),
  (400156, 77, 'Borjomi Sparkling Water', 'ბორჯომი', NULL, NULL, NULL, NULL, '5.00 ₾', NULL, 209033, '', '', '', false, false, true, 1, true, 156, false, '[]'::jsonb, '[]'::jsonb),
  (400157, 77, 'Bakuriani Mineral Water', 'ბაკურიანი', NULL, NULL, NULL, NULL, '4.00 ₾', NULL, 209033, '', '', '', false, false, true, 1, true, 157, false, '[]'::jsonb, '[]'::jsonb),
  (400158, 77, 'Limonati by Borjomi', 'ლიმონათი ბორჯომი', NULL, 'Pear / Citrus / Tangerine / Tarragon', 'მსხალი / ციტრუსი / მანდარინი / ტარხუნა', NULL, '6.00 ₾', NULL, 209033, '', '', '', false, false, true, 1, true, 158, false, '[]'::jsonb, '[]'::jsonb),
  (400159, 77, 'Coca-Cola', 'კოკა კოლა', NULL, NULL, NULL, NULL, '5.00 ₾', NULL, 209033, '', '', '', false, false, true, 1, true, 159, false, '[]'::jsonb, '[]'::jsonb),
  (400160, 77, 'Coca-Cola Zero', 'კოკა კოლა ზერო', NULL, NULL, NULL, NULL, '5.00 ₾', NULL, 209033, '', '', '', false, false, true, 1, true, 160, false, '[]'::jsonb, '[]'::jsonb),
  (400161, 77, 'Kombucha', 'კომბუჩა', NULL, NULL, NULL, NULL, '11.00 ₾', NULL, 209033, '', '', '', false, false, true, 1, true, 161, false, '[]'::jsonb, '[]'::jsonb),
  (400162, 77, 'Juice', 'წვენი', NULL, NULL, NULL, NULL, '7.00 ₾', NULL, 209033, '', '', '', false, false, true, 1, true, 162, false, '[]'::jsonb, '[]'::jsonb),
  (400163, 77, 'Fresh', 'ფრეში', NULL, 'Orange, grapefruit', 'ფორთოხალი, გრეიფრუტი', NULL, '17.00 ₾', NULL, 209033, '', '', '', false, false, true, 1, true, 163, false, '[]'::jsonb, '[]'::jsonb),
  (400164, 77, 'Homemade Lemonade with Mint and Lemon', 'ლიმნის და პიტნის ლიმონათი', NULL, NULL, NULL, NULL, '15.00 ₾', NULL, 209033, '', '', '', false, false, true, 1, true, 164, false, '[]'::jsonb, '[]'::jsonb),
  (400165, 77, 'Homemade Lemonade Citrus', 'ლიმონათი ციტრუსის', NULL, NULL, NULL, NULL, '15.00 ₾', NULL, 209033, '', '', '', false, false, true, 1, true, 165, false, '[]'::jsonb, '[]'::jsonb),
  (400166, 77, 'Homemade Lemonade Berries', 'ლიმონათი კენკრის', NULL, NULL, NULL, NULL, '15.00 ₾', NULL, 209033, '', '', '', false, false, true, 1, true, 166, false, '[]'::jsonb, '[]'::jsonb),
  (400167, 77, 'Laghidze Waters', 'ლაღიძის წყლები', NULL, NULL, NULL, NULL, '8.00 ₾', NULL, 209033, '', '', '', false, false, true, 1, true, 167, false, '[]'::jsonb, '[]'::jsonb),
  (400168, 77, 'Espresso', 'ესპრესო', NULL, NULL, NULL, NULL, '8.00 ₾', NULL, 209034, '', '', '', false, false, true, 1, true, 168, false, '[]'::jsonb, '[]'::jsonb),
  (400169, 77, 'Americano', 'ამერიკანო', NULL, NULL, NULL, NULL, '8.00 ₾', NULL, 209034, '', '', '', false, false, true, 1, true, 169, false, '[]'::jsonb, '[]'::jsonb),
  (400170, 77, 'Turkish Coffee', 'თურქული ყავა', NULL, NULL, NULL, NULL, '6.00 ₾', NULL, 209034, '', '', '', false, false, true, 1, true, 170, false, '[]'::jsonb, '[]'::jsonb),
  (400171, 77, 'Cappuccino', 'კაპუჩინო', NULL, NULL, NULL, NULL, '10.00 ₾', NULL, 209034, '', '', '', false, false, true, 1, true, 171, false, '[]'::jsonb, '[]'::jsonb),
  (400172, 77, 'Black Tea', 'შავი ჩაი', NULL, NULL, NULL, NULL, '12.00 ₾', NULL, 209034, '', '', '', false, false, true, 1, true, 172, false, '[]'::jsonb, '[]'::jsonb),
  (400173, 77, 'Green Tea', 'მწვანე ჩაი', NULL, NULL, NULL, NULL, '12.00 ₾', NULL, 209034, '', '', '', false, false, true, 1, true, 173, false, '[]'::jsonb, '[]'::jsonb),
  (400174, 77, 'Fruit Tea', 'ხილის ჩაი', NULL, NULL, NULL, NULL, '12.00 ₾', NULL, 209034, '', '', '', false, false, true, 1, true, 174, false, '[]'::jsonb, '[]'::jsonb),
  (400175, 77, 'Double Espresso', 'ორმაგი ესპრესო', NULL, NULL, NULL, NULL, '12.00 ₾', NULL, 209034, '', '', '', false, false, true, 1, true, 175, false, '[]'::jsonb, '[]'::jsonb),
  (400176, 77, 'Latte', 'ლატე', NULL, NULL, NULL, NULL, '12.00 ₾', NULL, 209034, '', '', '', false, false, true, 1, true, 176, false, '[]'::jsonb, '[]'::jsonb),
  (400177, 77, 'Mint & Bekondara Tea', 'პიტნის და ბექონდარას ჩაი', NULL, NULL, NULL, NULL, '15.00 ₾', NULL, 209034, '', '', '', false, false, true, 1, true, 177, false, '[]'::jsonb, '[]'::jsonb),
  (400178, 77, 'Ice Coffee', 'ცივი ყავა', NULL, NULL, NULL, NULL, '13.00 ₾', NULL, 209034, '', '', '', false, false, true, 1, true, 178, false, '[]'::jsonb, '[]'::jsonb),
  (400179, 77, 'Ice Coffee with Ice Cream', 'ცივი ყავა ნაყინით', NULL, NULL, NULL, NULL, '16.00 ₾', NULL, 209034, '', '', '', false, false, true, 1, true, 179, false, '[]'::jsonb, '[]'::jsonb),
  (400180, 77, 'Super Bock', 'სუპერ ბოკი', NULL, NULL, NULL, NULL, '14.00 ₾', NULL, 209035, '', '', '', false, false, true, 1, true, 180, false, '[]'::jsonb, '[]'::jsonb),
  (400181, 77, 'Qarva', 'ქარვა', NULL, NULL, NULL, NULL, '11.00 ₾', NULL, 209035, '', '', '', false, false, true, 1, true, 181, false, '[]'::jsonb, '[]'::jsonb),
  (400182, 77, 'Corona', 'კორონა', NULL, NULL, NULL, NULL, '16.00 ₾', NULL, 209035, '', '', '', false, false, true, 1, true, 182, false, '[]'::jsonb, '[]'::jsonb),
  (400183, 77, 'Stella', 'სტელა', NULL, NULL, NULL, NULL, '14.00 ₾', NULL, 209035, '', '', '', false, false, true, 1, true, 183, false, '[]'::jsonb, '[]'::jsonb),
  (400184, 77, 'Lowenbrau', 'ლოვენბრაუ', NULL, NULL, NULL, NULL, '12.00 ₾', NULL, 209035, '', '', '', false, false, true, 1, true, 184, false, '[]'::jsonb, '[]'::jsonb),
  (400185, 77, 'Leffe', 'ლეფე', NULL, NULL, NULL, NULL, '15.00 ₾', NULL, 209035, '', '', '', false, false, true, 1, true, 185, false, '[]'::jsonb, '[]'::jsonb),
  (400186, 77, 'Absolut', 'აბსოლუტი', NULL, NULL, NULL, NULL, '10.00 ₾', NULL, 209036, '', '', '', false, false, true, 1, true, 186, false, '[]'::jsonb, '[]'::jsonb),
  (400187, 77, 'Grey Goose', 'გრეი გუსი', NULL, NULL, NULL, NULL, '22.00 ₾', NULL, 209036, '', '', '', false, false, true, 1, true, 187, false, '[]'::jsonb, '[]'::jsonb),
  (400188, 77, 'Stolichnaya', 'სტოლიჩნაია', NULL, NULL, NULL, NULL, '12.00 ₾', NULL, 209036, '', '', '', false, false, true, 1, true, 188, false, '[]'::jsonb, '[]'::jsonb),
  (400189, 77, 'Chef Chacha', 'შეფის ჭაჭა', NULL, NULL, NULL, NULL, '10.00 ₾', NULL, 209037, '', '', '', false, false, true, 1, true, 189, false, '[]'::jsonb, '[]'::jsonb),
  (400190, 77, 'Tanqueray London Dry', 'თენქერეი London Dry', NULL, NULL, NULL, NULL, '14.00 ₾', NULL, 209038, '', '', '', false, false, true, 1, true, 190, false, '[]'::jsonb, '[]'::jsonb),
  (400191, 77, 'Tanqueray 10', 'თენქერეი 10', NULL, NULL, NULL, NULL, '20.00 ₾', NULL, 209038, '', '', '', false, false, true, 1, true, 191, false, '[]'::jsonb, '[]'::jsonb),
  (400192, 77, 'Hendrick’s', 'ჰენდრიკსი', NULL, NULL, NULL, NULL, '20.00 ₾', NULL, 209038, '', '', '', false, false, true, 1, true, 192, false, '[]'::jsonb, '[]'::jsonb),
  (400193, 77, 'Don Julio Blanco', 'დონ ხულიო Blanco', NULL, NULL, NULL, NULL, '45.00 ₾', NULL, 209039, '', '', '', false, false, true, 1, true, 193, false, '[]'::jsonb, '[]'::jsonb),
  (400194, 77, 'Don Julio Reposado', 'დონ ხულიო Reposado', NULL, NULL, NULL, NULL, '51.00 ₾', NULL, 209039, '', '', '', false, false, true, 1, true, 194, false, '[]'::jsonb, '[]'::jsonb),
  (400195, 77, 'Martini', 'მარტინი', NULL, 'Bianco, Rosso, Extra Dry', NULL, NULL, '14.00 ₾', NULL, 209040, '', '', '', false, false, true, 1, true, 195, false, '[]'::jsonb, '[]'::jsonb),
  (400196, 77, 'Aperol', 'აპეროლი', NULL, NULL, NULL, NULL, '14.00 ₾', NULL, 209040, '', '', '', false, false, true, 1, true, 196, false, '[]'::jsonb, '[]'::jsonb),
  (400197, 77, 'Jägermeister', 'იაგერმაისტერი', NULL, NULL, NULL, NULL, '14.00 ₾', NULL, 209040, '', '', '', false, false, true, 1, true, 197, false, '[]'::jsonb, '[]'::jsonb),
  (400198, 77, 'Captain Morgan', 'კაპიტან მორგანი', NULL, NULL, NULL, NULL, '12.00 ₾', NULL, 209041, '', '', '', false, false, true, 1, true, 198, false, '[]'::jsonb, '[]'::jsonb),
  (400199, 77, 'Zacapa 23y', 'ზაკაპა 23წ', NULL, NULL, NULL, NULL, '48.00 ₾', NULL, 209041, '', '', '', false, false, true, 1, true, 199, false, '[]'::jsonb, '[]'::jsonb),
  (400200, 77, 'Baileys', 'ბეილისი', NULL, NULL, NULL, NULL, '12.00 ₾', NULL, 209041, '', '', '', false, false, true, 1, true, 200, false, '[]'::jsonb, '[]'::jsonb),
  (400201, 77, 'Johnnie Walker Red Label', 'ჯონი უოკერი Red Label', NULL, NULL, NULL, NULL, '12.00 ₾', NULL, 209042, '', '', '', false, false, true, 1, true, 201, false, '[]'::jsonb, '[]'::jsonb),
  (400202, 77, 'Johnnie Walker Black Label', 'ჯონი უოკერი Black Label', NULL, NULL, NULL, NULL, '18.00 ₾', NULL, 209042, '', '', '', false, false, true, 1, true, 202, false, '[]'::jsonb, '[]'::jsonb),
  (400203, 77, 'Singleton 12y', 'სინგლტონი 12წ', NULL, NULL, NULL, NULL, '20.00 ₾', NULL, 209042, '', '', '', false, false, true, 1, true, 203, false, '[]'::jsonb, '[]'::jsonb),
  (400204, 77, 'Singleton 15y', 'სინგლტონი 15წ', NULL, NULL, NULL, NULL, '32.00 ₾', NULL, 209042, '', '', '', false, false, true, 1, true, 204, false, '[]'::jsonb, '[]'::jsonb),
  (400205, 77, 'Talisker 10y', 'ტალისკერი 10წ', NULL, NULL, NULL, NULL, '35.00 ₾', NULL, 209042, '', '', '', false, false, true, 1, true, 205, false, '[]'::jsonb, '[]'::jsonb),
  (400206, 77, 'Bulleit Rye', 'ბულეთ რეი', NULL, NULL, NULL, NULL, '22.00 ₾', NULL, 209042, '', '', '', false, false, true, 1, true, 206, false, '[]'::jsonb, '[]'::jsonb),
  (400207, 77, 'Tullamore', 'ტულამორი', NULL, NULL, NULL, NULL, '15.00 ₾', NULL, 209042, '', '', '', false, false, true, 1, true, 207, false, '[]'::jsonb, '[]'::jsonb),
  (400208, 77, 'Kilbeggan', 'კილბეგანი', NULL, NULL, NULL, NULL, '15.00 ₾', NULL, 209042, '', '', '', false, false, true, 1, true, 208, false, '[]'::jsonb, '[]'::jsonb),
  (400209, 77, 'Askaneli 3y', 'ასკანელი 3წ', NULL, NULL, NULL, NULL, '12.00 ₾', NULL, 209043, '', '', '', false, false, true, 1, true, 209, false, '[]'::jsonb, '[]'::jsonb),
  (400210, 77, 'Askaneli 6y', 'ასკანელი 6წ', NULL, NULL, NULL, NULL, '16.00 ₾', NULL, 209043, '', '', '', false, false, true, 1, true, 210, false, '[]'::jsonb, '[]'::jsonb),
  (400211, 77, 'Askaneli VSOP', 'ასკანელი VSOP', NULL, NULL, NULL, NULL, '42.00 ₾', NULL, 209043, '', '', '', false, false, true, 1, true, 211, false, '[]'::jsonb, '[]'::jsonb),
  (400212, 77, 'Rémy Martin VSOP', 'რემი მარტინი VSOP', NULL, NULL, NULL, NULL, '36.00 ₾', NULL, 209043, '', '', '', false, false, true, 1, true, 212, false, '[]'::jsonb, '[]'::jsonb),
  (400213, 77, 'Figleton', NULL, NULL, 'Singleton | Fig Jam | Angostura Bitters', NULL, NULL, '30.00 ₾', NULL, 209044, '', '', '', false, false, true, 1, true, 213, false, '[]'::jsonb, '[]'::jsonb),
  (400214, 77, 'Orchard Boulevardier', NULL, NULL, 'Singleton | Apple & Pear vermouth | Campari', NULL, NULL, '30.00 ₾', NULL, 209044, '', '', '', false, false, true, 1, true, 214, false, '[]'::jsonb, '[]'::jsonb),
  (400215, 77, 'Espresso Martini', NULL, NULL, 'Espresso | Vodka Absolut | Kahlua', NULL, NULL, '30.00 ₾', NULL, 209044, '', '', '', false, false, true, 1, true, 215, false, '[]'::jsonb, '[]'::jsonb),
  (400216, 77, 'Lovely Weekend', NULL, NULL, 'Vodka Absolut | Campari | Maracuja puree | Grapefruit Juice | Lemon Fresh', NULL, NULL, '30.00 ₾', NULL, 209044, '', '', '', false, false, true, 1, true, 216, false, '[]'::jsonb, '[]'::jsonb),
  (400217, 77, 'Miss Sunshine', NULL, NULL, 'Tequila | Maracuja puree | Amaretto | Lemon Fresh', NULL, NULL, '30.00 ₾', NULL, 209044, '', '', '', false, false, true, 1, true, 217, false, '[]'::jsonb, '[]'::jsonb),
  (400218, 77, 'Moscow Mule', NULL, NULL, 'Vodka Absolut | Lemon Fresh | Ginger Sirup', NULL, NULL, '30.00 ₾', NULL, 209044, '', '', '', false, false, true, 1, true, 218, false, '[]'::jsonb, '[]'::jsonb),
  (400219, 77, 'Rum Berries', NULL, NULL, 'Captain Morgan white | Cointreau | Berrie Puree | Pomegranate Juice | Lemon Fresh | Berries', NULL, NULL, '30.00 ₾', NULL, 209044, '', '', '', false, false, true, 1, true, 219, false, '[]'::jsonb, '[]'::jsonb),
  (400220, 77, 'Cucumber and Basil Smash', NULL, NULL, 'Tanquerey | Cucumber sirup | Basil Sirup | Lemon Fresh', NULL, NULL, '30.00 ₾', NULL, 209044, '', '', '', false, false, true, 1, true, 220, false, '[]'::jsonb, '[]'::jsonb),
  (400221, 77, 'Negroni', NULL, NULL, 'Tanquerey | Martini Rosso | Campari', NULL, NULL, '30.00 ₾', NULL, 209044, '', '', '', false, false, true, 1, true, 221, false, '[]'::jsonb, '[]'::jsonb),
  (400222, 77, 'Aperol Spritz', NULL, NULL, 'Aperol | Sparkling Wine', NULL, NULL, '30.00 ₾', NULL, 209044, '', '', '', false, false, true, 1, true, 222, false, '[]'::jsonb, '[]'::jsonb),
  (400223, 77, 'Gin Tonic', NULL, NULL, 'Tanquerey | Tonic', NULL, NULL, '30.00 ₾', NULL, 209044, '', '', '', false, false, true, 1, true, 223, false, '[]'::jsonb, '[]'::jsonb),
  (400224, 77, 'Mohito', NULL, NULL, 'Captain Morgan white | Schweppes', NULL, NULL, '30.00 ₾', NULL, 209044, '', '', '', false, false, true, 1, true, 224, false, '[]'::jsonb, '[]'::jsonb),
  (400225, 77, 'Cuba Libre', NULL, NULL, 'Captain Morgan white | Coca-Cola | Lime Fresh', NULL, NULL, '30.00 ₾', NULL, 209044, '', '', '', false, false, true, 1, true, 225, false, '[]'::jsonb, '[]'::jsonb),
  (400226, 77, 'Long Island', NULL, NULL, 'Vodka Absolut | Captain Morgan white | Tequilla | Tanquerey | Cointreau', NULL, NULL, '30.00 ₾', NULL, 209044, '', '', '', false, false, true, 1, true, 226, false, '[]'::jsonb, '[]'::jsonb),
  (400227, 77, 'Elder Johnny', NULL, NULL, 'Johnnie Walker Black Label | Elderflower | Orange Bitter’s', NULL, NULL, '30.00 ₾', NULL, 209044, '', '', '', false, false, true, 1, true, 227, false, '[]'::jsonb, '[]'::jsonb),
  (400228, 77, 'Smashing Walk', NULL, NULL, 'Johnnie Walker Black Label | Honey & Ginger Syrup | Lemon | Angostura Bitter', NULL, NULL, '30.00 ₾', NULL, 209044, '', '', '', false, false, true, 1, true, 228, false, '[]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Sanity check before you COMMIT: expect 44 categories and 228 items.
SELECT (SELECT count(*) FROM categories WHERE restaurant_id = 77) AS category_count,
       (SELECT count(*) FROM menu_items WHERE restaurant_id = 77) AS item_count;

COMMIT;