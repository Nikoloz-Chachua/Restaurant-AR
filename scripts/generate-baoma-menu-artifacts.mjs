import { mkdirSync, writeFileSync } from 'node:fs'

const restaurantId = 53
const restaurantSlug = 'b-main'
const brandId = 46
const brandSlug = 'b'
const publicDishBase = 'https://restaurant-ar.pages.dev/img/baoma/dishes/'
const localDishBase = './img/baoma/dishes/'

const categories = [
  ['Breakfast', 'საუზმე'],
  ['Salads', 'სალათები'],
  ['Soups', 'სუპები'],
  ['Georgian Mains', 'ქართული მთავარი კერძები'],
  ['Special Dishes & Barbecue', 'სპეციალური კერძები და მწვადი'],
  ['Cold Dishes', 'ცივი კერძები'],
  ['Pastry & Bread', 'ცომეული და პური'],
  ['Pizza', 'პიცა'],
  ['Pasta', 'პასტა'],
  ['Side Dishes', 'გარნირები'],
  ['Sauces', 'სოუსები'],
  ['Meze for Two', 'მენიუ ორ პერსონაზე'],
  ['Non-Alcoholic Drinks', 'უალკოჰოლო სასმელები'],
  ['Coffee & Tea', 'ყავა და ჩაი'],
  ['Alcoholic Drinks', 'ალკოჰოლური სასმელები'],
  ['Desserts', 'დესერტები']
].map(([name_en, name_ka], i) => ({
  id: 900000 + i,
  restaurant_id: restaurantId,
  name_en,
  name_ka,
  sort_order: i + 1
}))

const catId = Object.fromEntries(categories.map(c => [c.name_en, c.id]))

function item(category, name_en, price, opts = {}) {
  const image = opts.photo ? `${localDishBase}${opts.photo}` : ''
  const source = opts.source || []
  const oldOnly = source.length > 0 && source.every(n => [1, 4, 12].includes(n))
  const variants = opts.variants || []
  return {
    category,
    name_en,
    name_ka: opts.name_ka || '',
    description_en: opts.description_en || '',
    description_ka: opts.description_ka || '',
    price: formatGel(price),
    photo: opts.photo || '',
    source,
    price_basis: opts.price_basis || 'current/newer white menu where available; older burgundy retained for older-only items',
    conflict_notes: opts.conflict_notes || '',
    translation_status: opts.translation_status || (oldOnly ? 'provisional' : (opts.name_ka ? 'source' : 'provisional')),
    source_name_notes: opts.source_name_notes || '',
    visible: opts.visible ?? true,
    model: '',
    model_usdz: '',
    is_3d: false,
    thumb_3d: false,
    thumbnail_url: image,
    text_only: !image,
    ar_scale: 1,
    addons: [],
    variants
  }
}

function formatGel(price) {
  const raw = String(price).trim()
  if (!raw) return ''
  if (/^\d+\.00$/.test(raw)) return `${parseInt(raw, 10)} ₾`
  return `${raw} ₾`
}

function variant(en, ka, price, source) {
  return { en, ka, price: formatGel(price), source }
}

const items = [
  item('Breakfast', 'Omelette', '8.00', { name_ka: 'ომლეტი', source: [1] }),
  item('Breakfast', 'Omelette with cheese/sausage', '12.90', { name_ka: 'ომლეტი ყველით/სოსისით', description_en: 'cheese/sausage', description_ka: 'ყველი/სოსისი', source: [1] }),
  item('Breakfast', 'Scrambled egg with bacon/cheese', '13.00', { name_ka: 'ათქვეფილი კვერცხი ბეკონით/ყველით', description_en: 'bacon/cheese', description_ka: 'ბეკონი/ყველი', source: [1] }),
  item('Breakfast', 'Bruschetta', '13.00', { name_ka: 'ბრუსკეტა', source: [1] }),
  item('Breakfast', 'Caesar Roll with french fries', '15.00', { name_ka: 'ცეზარ როლი კარტოფილი ფრით', description_en: 'french fries', description_ka: 'კარტოფილი ფრი', source: [1] }),
  item('Breakfast', 'Chicken sandwich with french fries', '12.00', { name_ka: 'ქათმის სენდვიჩი კარტოფილი ფრით', description_en: 'french fries', description_ka: 'კარტოფილი ფრი', source: [1] }),
  item('Breakfast', 'Chicken Burrito with french fries', '20.00', { name_ka: 'ქათმის ბურიტო კარტოფილი ფრით', description_en: 'french fries', description_ka: 'კარტოფილი ფრი', source: [1], source_name_notes: 'Source spells “Burito”; presentation corrected to “Burrito”.' }),
  item('Breakfast', 'Pancakes with meat/cheese', '9.90', { name_ka: 'ბლინები ხორცით/ყველით', description_en: 'meat/cheese', description_ka: 'ხორცი/ყველი', source: [1], source_name_notes: 'Source spells “meet”; presentation corrected to “meat”.' }),

  item('Salads', 'Cucumber-tomato salad', '14', { name_ka: 'კიტრი-პომიდვრის სალათი', source: [9], conflict_notes: 'Older burgundy price 9.00 in image 1.' }),
  item('Salads', 'Cucumber-tomato salad with walnuts', '16', { name_ka: 'კიტრი-პომიდვრის სალათი ნიგვზით', description_en: 'walnuts', description_ka: 'ნიგოზი', source: [9], conflict_notes: 'Older burgundy price 11.90 in image 1.' }),
  item('Salads', 'Greek salad', '21', { name_ka: 'ბერძნული სალათი', photo: 'greek-salad.webp', source: [9, 13], conflict_notes: 'Older burgundy price 18.00 in image 1.' }),
  item('Salads', 'Caesar', '26', { name_ka: 'ცეზარი', source: [9], conflict_notes: 'Older burgundy generic Caesar price 19.00 in image 1.' }),
  item('Salads', 'Caesar with shrimp', '25.00', { name_ka: 'ცეზარი კრევეტებით', description_en: 'shrimp', description_ka: 'კრევეტები', source: [1] }),
  item('Salads', 'Caesar with salmon', '27.00', { name_ka: 'ცეზარი ორაგულით', description_en: 'salmon', description_ka: 'ორაგული', source: [1] }),
  item('Salads', 'Chicken salad', '18', { name_ka: 'ქათმის სალათი', source: [9] }),
  item('Salads', 'Mushroom salad', '15', { name_ka: 'სოკოს სალათი', source: [9] }),
  item('Salads', 'Beet salad with tkemali', '12', { name_ka: 'ჭარხლის სალათი ტყემლით', description_en: 'tkemali', description_ka: 'ტყემალი', source: [9] }),
  item('Salads', 'Green salad', '14', { name_ka: 'მწვანე სალათი', source: [9] }),
  item('Salads', 'Vegetable salad', '14', { name_ka: 'ბოსტნეულის სალათი', source: [9] }),
  item('Salads', 'Olives', '9', { name_ka: 'ზეთისხილი', source: [9] }),
  item('Salads', 'Steak salad', '27.00', { name_ka: 'სტეიკის სალათი', source: [1] }),

  item('Soups', 'Chikhirtma', '14', { name_ka: 'ჩიხირთმა', description_en: 'chicken fillet, onion, garlic, vinegar, egg', description_ka: 'ქათმის ფილე, ხახვი, ნიორი, ძმარი, კვერცხი', source: [7], conflict_notes: 'Older burgundy price 12.00 in image 1.' }),
  item('Soups', 'Mushroom cream-soup', '16', { name_ka: 'სოკოს კრემ-სუპი', source: [7], conflict_notes: 'Older burgundy price 13.90 in image 1.' }),
  item('Soups', 'Soup-kharcho', '16', { name_ka: 'სუპ-ხარჩო', description_en: 'beef, onion, rice, tomato, Georgian spices', description_ka: 'საქონლის ხორცი, ხახვი, ბრინჯი, პომიდორი, ქართული სუნელები', photo: 'soup-kharcho.webp', source: [7, 14, 15], conflict_notes: 'Older burgundy price 18.00 in image 1. Preferred soup-kharcho.webp over soup-kharcho-alt.webp.' }),
  item('Soups', 'Fish soup', '16', { name_ka: 'თევზის სუპი', source: [7] }),
  item('Soups', 'Tomato cream-soup', '12.90', { name_ka: 'პომიდვრის კრემ-სუპი', source: [1] }),
  item('Soups', 'Pumpkin cream-soup', '13.90', { name_ka: 'გოგრის კრემ-სუპი', photo: 'pumpkin-soup.webp', source: [1, 14] }),
  item('Soups', 'Vegetables soup', '9.90', { name_ka: 'ბოსტნეულის სუპი', source: [1] }),

  item('Georgian Mains', 'Tabaka chicken', '22.00', { name_ka: 'ტაბაკა', photo: 'tabaka-chicken.webp', source: [2, 15], conflict_notes: 'Older burgundy Tabaka price 28.00 in image 4.' }),
  item('Georgian Mains', 'Shkmeruli', '30.00', { name_ka: 'შქმერული', description_en: 'fried chicken, garlic sauce, milk, Georgian spices', description_ka: 'შემწვარი ქათამი, ნივრის სოუსი, რძე, ქართული სუნელები', source: [2], conflict_notes: 'Older burgundy “Chkmeruli” price 23.00 in image 4.' }),
  item('Georgian Mains', 'Chick with tkemali', '25.00', { name_ka: 'წიწილა ტყემლით', source: [2] }),
  item('Georgian Mains', 'Mushrooms on the clay pan', '14.00', { name_ka: 'სოკო კეცზე', source: [2], conflict_notes: 'Older burgundy price 12.00 in image 4.' }),
  item('Georgian Mains', 'Mushrooms with sulguni on the clay pan', '17.00', { name_ka: 'სოკო კეცზე სულგუნით', description_en: 'sulguni', description_ka: 'სულგუნი', photo: 'mushrooms-sulguni.webp', source: [2, 14], conflict_notes: 'Older burgundy price 14.90 in image 4.' }),
  item('Georgian Mains', 'Fried sulguni on the clay pan', '16.00', { name_ka: 'შემწვარი სულგუნი კეცზე', source: [2] }),
  item('Georgian Mains', 'Bean with spices in a pot', '10.00', { name_ka: 'ლობიო ქოთანში', description_en: 'spices', description_ka: 'სუნელები', source: [2] }),
  item('Georgian Mains', 'Ajapsandal', '16', { name_ka: 'აჯაფსანდალი', source: [7] }),
  item('Georgian Mains', 'Chanakhi with sheep meat', '26', { name_ka: 'ჩანახი (ცხვრის ხორცით)', description_en: 'sheep meat', description_ka: 'ცხვრის ხორცი', source: [7] }),
  item('Georgian Mains', 'Chakapuli (lamb or calf)', '30', { name_ka: 'ჩაქაფული (ბატკანი ან ხბო)', description_en: 'lamb or calf, herbs, tkemali, wine', description_ka: 'ბატკანი ან ხბო, მწვანილი, ტყემალი, ღვინო', source: [7], conflict_notes: 'Older burgundy price 27.00 in image 4.' }),
  item('Georgian Mains', 'Ostry', '26', { name_ka: 'ოსტრი', description_en: 'beef, tomato sauce, onion, Georgian spices', description_ka: 'საქონლის ხორცი, ტომატის სოუსი, ხახვი, ქართული სუნელები', source: [7, 10] }),
  item('Georgian Mains', 'Ojakhuri', '24', { name_ka: 'ოჯახური', description_en: 'pork, fried potatoes, onion, garlic, paprika, Georgian spices', description_ka: 'ღორის ხორცი, შემწვარი კარტოფილი, ხახვი, ნიორი, პაპრიკა, ქართული სუნელები', photo: 'ojakhuri.webp', source: [7, 13], conflict_notes: 'Older page splits veal/pork; kept separate.' }),
  item('Georgian Mains', 'Chicken chakhokhbili', '18', { name_ka: 'ქათმის ჩახოხბილი', description_en: 'chicken fillet, paprika, tomatoes, onion, herbs, Georgian spices', description_ka: 'ქათმის ფილე, პაპრიკა, პომიდორი, ხახვი, მწვანილი, ქართული სუნელები', source: [7, 10] }),
  item('Georgian Mains', 'Chicken liver on clay pan', '16', { name_ka: 'ქათმის ღვიძლი კეცზე', source: [7] }),
  item('Georgian Mains', 'Beef steak', '35.90', { name_ka: 'საქონლის სტეიკი', source: [4] }),
  item('Georgian Mains', 'Salmon steak', '35.90', { name_ka: 'ორაგულის სტეიკი', source: [4] }),
  item('Georgian Mains', 'Beef stroganoff with potato fries', '34.00', { name_ka: 'ბეფსტროგანოვი კარტოფილი ფრით', description_en: 'potato fries', description_ka: 'კარტოფილი ფრი', source: [4] }),
  item('Georgian Mains', 'Megrelian kupati', '18.90', { name_ka: 'მეგრული კუპატი', source: [4] }),
  item('Georgian Mains', 'Imeruli kupati', '17.90', { name_ka: 'იმერული კუპატი', source: [4] }),
  item('Georgian Mains', 'Beans in clay pot with mtchadi', '14.00', { name_ka: 'ლობიო კეცზე მჭადით', description_en: 'mtchadi', description_ka: 'მჭადი', source: [4] }),
  item('Georgian Mains', 'Pelmeni in a pot', '15.90', { name_ka: 'პელმენი ქოთანში', source: [4] }),
  item('Georgian Mains', 'Dumplings with cheese on clay pot', '16.00', { name_ka: 'ყველის პელმენი კეცზე', description_en: 'cheese', description_ka: 'ყველი', source: [4] }),
  item('Georgian Mains', 'Ojakhuri with veal', '23.00', { name_ka: 'ოჯახური ხბოს ხორცით', description_en: 'veal', description_ka: 'ხბოს ხორცი', photo: 'ojakhuri-veal.webp', source: [4, 13, 15], price_basis: 'older burgundy printed price; no white-menu price', conflict_notes: 'Preferred ojakhuri-veal.webp over ojakhuri-veal-alt.webp.' }),
  item('Georgian Mains', 'Ojakhuri with pork', '19.00', { name_ka: 'ოჯახური ღორის ხორცით', description_en: 'pork', description_ka: 'ღორის ხორცი', photo: 'ojakhuri-pork.webp', source: [4, 13], price_basis: 'older burgundy printed price; no white-menu price' }),
  item('Georgian Mains', 'Ojakhuri with chicken', '18.00', { name_ka: 'ოჯახური ქათმით', description_en: 'chicken', description_ka: 'ქათამი', photo: 'ojakhuri-chicken.webp', source: [13], price_basis: 'photo label only; price retained from older chicken chakhokhbili category context is not inferred', conflict_notes: 'No menu-page price was readable for this photo label; item excluded from SQL/menu price inference would violate no-price rule.', visible: false }),
  item('Georgian Mains', 'Roasted sulguni on clay pot', '13.90', { name_ka: 'შემწვარი სულგუნი კეცზე', description_en: 'sulguni', description_ka: 'სულგუნი', source: [4], conflict_notes: 'Kept separate from current Fried sulguni wording.' }),
  item('Georgian Mains', 'Chicken heart and liver on the pan', '14.00', { name_ka: 'ქათმის გული და ღვიძლი ტაფაზე', description_en: 'chicken heart and liver', description_ka: 'ქათმის გული და ღვიძლი', source: [4] }),
  item('Georgian Mains', 'Tolma', '18.00', { name_ka: 'ტოლმა', source: [4] }),
  item('Georgian Mains', 'Ghomi', '7.00', { name_ka: 'ღომი', source: [4] }),
  item('Georgian Mains', 'Ghomi and kharcho', '28.00', { name_ka: 'ღომი და ხარჩო', source: [4] }),
  item('Georgian Mains', 'Elardji', '12.00', { name_ka: 'ელარჯი', source: [4] }),
  item('Georgian Mains', 'Trout with pomegranate sauce', '18.00', { name_ka: 'კალმახი ბროწეულის სოუსით', description_en: 'pomegranate sauce', description_ka: 'ბროწეულის სოუსი', photo: 'trout-pomegranate.webp', source: [4, 13], source_name_notes: 'Source spells “souce”; presentation corrected to “sauce”.' }),
  item('Georgian Mains', 'Satsivi with chicken', '27.00', { name_ka: 'საცივი ქათმით', description_en: 'chicken', description_ka: 'ქათამი', photo: 'satsivi-chicken.webp', source: [4, 14] }),
  item('Georgian Mains', 'Veal barbecue', '17.90', { name_ka: 'ხბოს მწვადი', source: [4] }),
  item('Georgian Mains', 'Chicken barbecue', '19', { name_ka: 'ქათმის მწვადი', description_en: 'cucumbers, tomatoes and french fries', description_ka: 'კიტრი, პომიდორი და კარტოფილი ფრი', photo: 'chicken-barbecue.webp', source: [3, 4], conflict_notes: 'Older burgundy price 14.90 in image 4. Used chicken-barbecue.webp; duplicate/similar chicken-shashlik.webp excluded.' }),
  item('Georgian Mains', 'Entrecôte with grilled vegetables', '25.90', { name_ka: 'ანტრეკოტი გრილზე შემწვარი ბოსტნეულით', description_en: 'grilled vegetables', description_ka: 'გრილზე შემწვარი ბოსტნეული', source: [4], source_name_notes: 'Source spells “Entrecott”; presentation corrected to “Entrecôte”.' }),
  item('Georgian Mains', 'Khinkali', '1.40', { name_ka: 'ხინკალი', source: [4] }),

  item('Special Dishes & Barbecue', 'Assorted barbeque', '46', { name_ka: 'მწვადის ასორტი', description_en: 'cucumbers, tomatoes and french fries', description_ka: 'კიტრი, პომიდორი და კარტოფილი ფრი', source: [3] }),
  item('Special Dishes & Barbecue', 'Chicken barbeque', '19', { name_ka: 'ქათმის მწვადი', description_en: 'cucumbers, tomatoes and french fries', description_ka: 'კიტრი, პომიდორი და კარტოფილი ფრი', source: [3], conflict_notes: 'Duplicate wording of Chicken barbecue retained because extraction lists this current special-dishes row separately.' }),
  item('Special Dishes & Barbecue', 'Pork barbeque', '20', { name_ka: 'ღორის მწვადი', description_en: 'cucumbers, tomatoes and french fries', description_ka: 'კიტრი, პომიდორი და კარტოფილი ფრი', photo: 'pork-bbq.webp', source: [3, 13] }),
  item('Special Dishes & Barbecue', 'Kebab', '20', { name_ka: 'ქაბაბი', description_en: 'cucumbers, tomatoes and french fries', description_ka: 'კიტრი, პომიდორი და კარტოფილი ფრი', source: [3] }),

  item('Cold Dishes', 'Satsivi with pre-order', '45', { name_ka: 'საცივი წინასწარი შეკვეთით', description_en: 'pre-order', description_ka: 'წინასწარი შეკვეთით', source: [5] }),
  item('Cold Dishes', 'Assorted herbs', '8', { name_ka: 'მწვანილის ასორტი', source: [5] }),
  item('Cold Dishes', 'Assorted pkhali', '23', { name_ka: 'ფხალის ასორტი', source: [5], conflict_notes: 'Older burgundy Pkhali platter price 23.90 in image 4.' }),
  item('Cold Dishes', 'Eggplant with walnuts', '17', { name_ka: 'ბადრიჯანი ნიგვზით', description_en: 'walnuts', description_ka: 'ნიგოზი', source: [5], conflict_notes: 'Older burgundy price 11.90 in image 4.' }),
  item('Cold Dishes', 'Spinach with walnuts', '14', { name_ka: 'ისპანახი ნიგვზით', description_en: 'walnuts', description_ka: 'ნიგოზი', source: [5] }),
  item('Cold Dishes', 'Beet leaves with walnuts', '14', { name_ka: 'ჭარხლის ფოთოლი ნიგვზით', description_en: 'walnuts', description_ka: 'ნიგოზი', source: [5] }),
  item('Cold Dishes', 'Cheese Imeruli', '14', { name_ka: 'იმერული ყველი', source: [5] }),
  item('Cold Dishes', 'Cheese Sulguni', '17', { name_ka: 'სულგუნი ყველი', source: [5] }),
  item('Cold Dishes', 'Cheese assorted', '24', { name_ka: 'ყველის ასორტი', source: [5], conflict_notes: 'Older Georgian/European cheese assortments are not identical and remain separate.' }),
  item('Cold Dishes', 'Pickled assorted', '14', { name_ka: 'მწნილის ასორტი', source: [5], conflict_notes: 'Older burgundy Assorted pickles price 15.90 in image 4.' }),
  item('Cold Dishes', 'Appetizer board', '35.00', { name_ka: 'საუზმეულის დაფა', source: [4] }),
  item('Cold Dishes', 'Assorted Georgian cheese', '30.00', { name_ka: 'ქართული ყველის ასორტი', source: [4] }),
  item('Cold Dishes', 'European assortment of cheese', '36.90', { name_ka: 'ევროპული ყველის ასორტი', source: [4] }),

  item('Pastry & Bread', 'Khachapuri imeruli', '15.00', { name_ka: 'იმერული ხაჭაპური', source: [1] }),
  item('Pastry & Bread', 'Khachapuri megrelian', '18.00', { name_ka: 'მეგრული ხაჭაპური', source: [1] }),
  item('Pastry & Bread', 'Royal khachapuri', '25.00', { name_ka: 'სამეფო ხაჭაპური', source: [1] }),
  item('Pastry & Bread', 'Khachapuri Adjaruli', '12.90', { name_ka: 'აჭარული ხაჭაპური', photo: 'adjaruli-khachapuri.webp', source: [1, 13] }),
  item('Pastry & Bread', 'Lobiani', '12.90', { name_ka: 'ლობიანი', source: [1] }),
  item('Pastry & Bread', 'Pancakes with meat (4 pieces)', '9.90', { name_ka: 'ბლინები ხორცით (4 ცალი)', description_en: 'meat; 4 pieces', description_ka: 'ხორცი; 4 ცალი', source: [1] }),
  item('Pastry & Bread', 'Pancakes with cheese (4 pieces)', '9.90', { name_ka: 'ბლინები ყველით (4 ცალი)', description_en: 'cheese; 4 pieces', description_ka: 'ყველი; 4 ცალი', source: [1] }),
  item('Pastry & Bread', 'Mtchadi', '3.90', { name_ka: 'მჭადი', source: [1] }),
  item('Pastry & Bread', 'Chvishtari', '6.90', { name_ka: 'ჭვიშტარი', source: [1] }),
  item('Pastry & Bread', 'Bread', '3.90', { name_ka: 'პური', source: [1] }),

  item('Pizza', 'Vegetable Pizza', '12.00', { name_ka: 'ბოსტნეულის პიცა', source: [4] }),
  item('Pizza', 'Pizza Margherita', '14.90', { name_ka: 'პიცა მარგარიტა', source: [4] }),
  item('Pizza', 'Pizza pepperoni', '18.00', { name_ka: 'პიცა პეპერონი', source: [4], source_name_notes: 'Source spells “pepperone”; presentation corrected to “pepperoni”.' }),
  item('Pizza', 'Pizza quattro formaggi (4 cheese)', '27.00', { name_ka: 'პიცა ოთხი ყველი', source: [4] }),
  item('Pizza', 'Pizza Mix', '30.00', { name_ka: 'პიცა მიქსი', source: [4] }),

  item('Pasta', 'Carbonara', '17.90', { name_ka: 'კარბონარა', source: [12] }),
  item('Pasta', 'Pasta quattro formaggi', '17.90', { name_ka: 'პასტა ოთხი ყველი', source: [12] }),

  item('Side Dishes', 'French fries', '8.00', { name_ka: 'კარტოფილი ფრი', source: [2, 10], conflict_notes: 'Older burgundy Potato fries price 6.00 in image 12.' }),
  item('Side Dishes', 'Mexican potatoes', '12.00', { name_ka: 'მექსიკური კარტოფილი', source: [2], conflict_notes: 'Older burgundy Potato in a Mexican way price 11.90 in image 12.' }),
  item('Side Dishes', 'Puree', '5.00', { name_ka: 'პიურე', source: [12] }),
  item('Side Dishes', 'Rice with vegetables', '10.00', { name_ka: 'ბრინჯი ბოსტნეულით', source: [12] }),
  item('Side Dishes', 'Grilled vegetables', '12.90', { name_ka: 'გრილზე შემწვარი ბოსტნეული', photo: 'grilled-vegetables.webp', source: [12, 14, 15], conflict_notes: 'Preferred grilled-vegetables.webp over grilled-vegetables-alt.webp.' }),
  item('Side Dishes', 'Georgian crisps', '10.00', { name_ka: 'ქართული ჩიფსი', source: [12] }),

  item('Sauces', 'Ketchup', '3.00', { name_ka: 'კეტჩუპი', source: [12] }),
  item('Sauces', 'Tkemali', '3.00', { name_ka: 'ტყემალი', source: [12] }),
  item('Sauces', 'Bullace sauce', '3.00', { name_ka: 'ტყემლის სოუსი', source: [12] }),
  item('Sauces', 'Tomato sauce', '3.00', { name_ka: 'ტომატის სოუსი', source: [12] }),
  item('Sauces', 'Quattro formaggi sauce', '9.00', { name_ka: 'ოთხი ყველის სოუსი', source: [12] }),
  item('Sauces', 'Mexican sauce', '3.00', { name_ka: 'მექსიკური სოუსი', source: [12] }),
  item('Sauces', 'Green adjika', '3.00', { name_ka: 'მწვანე აჯიკა', source: [12] }),
  item('Sauces', 'Red adjika', '3.00', { name_ka: 'წითელი აჯიკა', source: [12] }),

  item('Meze for Two', 'Georgian national meze for two persons', '115', { name_ka: 'ქართული ნაციონალური მენიუ ორ პერსონაზე', description_en: '1. Cucumber and tomato salad; 2. Spinach with walnuts; 3. Beet leaf with walnuts; 4. Eggplant with walnuts; 5. Pickled cabbage; 6. Stewed beef (Ostri); 7. Chakapuli (beef or lamb); 8. Chicken chakhokhbili; 9. Boiled bean with spices; 10. French fries', description_ka: '1. კიტრისა და პომიდვრის სალათა; 2. ისპანახი ნიგვზით; 3. ჭარხლის ფოთოლი ნიგვზით; 4. ბადრიჯანი ნიგვზით; 5. მჟავე კომბოსტო; 6. ძროხის ჩაშუშული (ოსტრი); 7. ჩაქაფული (ხბო ან ბატკანი); 8. ქათმის ჩახოხბილი; 9. ლობიო; 10. კარტოფილი ფრი', source: [10] }),

  item('Non-Alcoholic Drinks', 'Water', '3.00', { name_ka: 'წყალი', source: [6] }),
  item('Non-Alcoholic Drinks', 'Borjomi', '6', { name_ka: 'ბორჯომი', source: [6] }),
  item('Non-Alcoholic Drinks', 'Nabeglavi', '6', { name_ka: 'ნაბეღლავი', source: [6] }),
  item('Non-Alcoholic Drinks', 'Coca-Cola', '7', { name_ka: 'კოკა-კოლა', source: [6] }),
  item('Non-Alcoholic Drinks', 'Sparkling lemonade', '5', { name_ka: 'ნატახტარის ლიმონათი', source: [6] }),
  item('Non-Alcoholic Drinks', 'Fresh juice', '20', { name_ka: 'ნატურალური წვენი', source: [6] }),

  item('Coffee & Tea', 'Tea', '5', { name_ka: 'ჩაი', source: [6] }),
  item('Coffee & Tea', 'Turkish coffee', '6', { name_ka: 'თურქული ყავა', source: [6] }),
  item('Coffee & Tea', 'Instant coffee', '6', { name_ka: 'ხსნადი ყავა', source: [6] }),
  item('Coffee & Tea', 'Espresso', '8', { name_ka: 'ესპრესო', source: [6] }),
  item('Coffee & Tea', 'Americano', '8', { name_ka: 'ამერიკანო', source: [6] }),
  item('Coffee & Tea', 'Cappuccino', '9', { name_ka: 'კაპუჩინო', source: [6] }),
  item('Coffee & Tea', 'Iced coffee', '8', { name_ka: 'ცივი ყავა', source: [6] }),
  item('Coffee & Tea', 'Iced coffee with ice cream', '10', { name_ka: 'ცივი ყავა ნაყინით', description_en: 'ice cream', description_ka: 'ნაყინი', source: [6] }),

  item('Alcoholic Drinks', 'White dry homemade wine', '8', {
    name_ka: 'თეთრი მშრალი',
    description_en: 'homemade wine',
    description_ka: 'სახლის ღვინო',
    source: [8],
    translation_status: 'source',
    variants: [
      variant('glass', 'ჭიქა', '8', [8]),
      variant('0.5 L', '0.5 ლ', '30', [8]),
      variant('1 L', '1 ლ', '45', [8]),
      variant('1.5 L', '1.5 ლ', '60', [8])
    ]
  }),
  item('Alcoholic Drinks', 'Red dry homemade wine', '8', {
    name_ka: 'წითელი მშრალი',
    description_en: 'homemade wine',
    description_ka: 'სახლის ღვინო',
    source: [8],
    translation_status: 'source',
    variants: [
      variant('glass', 'ჭიქა', '8', [8]),
      variant('0.5 L', '0.5 ლ', '30', [8]),
      variant('1 L', '1 ლ', '45', [8]),
      variant('1.5 L', '1.5 ლ', '60', [8])
    ]
  }),
  item('Alcoholic Drinks', 'Semi-sweet red homemade wine', '9', {
    name_ka: 'წითელი ნახევრად ტკბილი',
    description_en: 'homemade wine',
    description_ka: 'სახლის ღვინო',
    source: [8],
    translation_status: 'source',
    variants: [
      variant('glass', 'ჭიქა', '9', [8]),
      variant('0.5 L', '0.5 ლ', '35', [8]),
      variant('1 L', '1 ლ', '50', [8]),
      variant('1.5 L', '1.5 ლ', '70', [8])
    ]
  }),
  item('Alcoholic Drinks', 'Vodka — 50 gr', '6', { name_ka: 'არაყი — 50 გრ', description_en: '50 gr', description_ka: '50 გრ', source: [8], translation_status: 'source' }),
  item('Alcoholic Drinks', 'Chacha — 50 gr', '6', { name_ka: 'ჭაჭა — 50 გრ', description_en: '50 gr', description_ka: '50 გრ', source: [8], translation_status: 'source' }),
  item('Alcoholic Drinks', 'Cognac — 50 gr', '8', { name_ka: 'კონიაკი — 50 გრ', description_en: '50 gr', description_ka: '50 გრ', source: [8], translation_status: 'source' }),
  item('Alcoholic Drinks', 'Natakhtari beer', '8', {
    name_ka: 'ნატახტარი',
    description_en: '0.5 L',
    description_ka: '0.5 ლ',
    source: [8],
    translation_status: 'source',
    variants: [
      variant('draft 0.5 L', 'ჩამოსასხმელი 0.5 ლ', '8', [8]),
      variant('bottled 0.5 L', 'ბოთლის 0.5 ლ', '8', [8])
    ]
  }),

  item('Desserts', 'Ice-cream', '7', { name_ka: 'ნაყინი', source: [6], conflict_notes: 'Older burgundy price 7.90 in image 12.' }),
  item('Desserts', 'Fruit assorted', '24', { name_ka: 'ხილის ასორტი', source: [6] }),
  item('Desserts', 'Pan cakes', '10', { name_ka: 'ბლინები', source: [6] }),
  item('Desserts', 'Cake', '7', { name_ka: 'ნამცხვარი', source: [6] }),
  item('Desserts', 'Churchkhela', '7', { name_ka: 'ჩურჩხელა', source: [6] }),
  item('Desserts', 'Fruit tray', '35.00', { name_ka: 'ხილის დაფა', source: [12], conflict_notes: 'Differs from current Fruit assorted; not merged.' }),
  item('Desserts', 'Churchkhela and nuts board', '19.90', { name_ka: 'ჩურჩხელისა და თხილეულის დაფა', source: [12] }),
  item('Desserts', 'Brownie with ice-cream', '12.90', { name_ka: 'ბრაუნი ნაყინით', source: [12] }),
  item('Desserts', 'Cheesecake', '12.00', { name_ka: 'ჩიზქეიქი', source: [12] }),
  item('Desserts', 'Crepe with banana and chocolate', '9.00', { name_ka: 'კრეპი ბანანით და შოკოლადით', source: [12] }),
  item('Desserts', 'Ice-cream with fruit', '9.90', { name_ka: 'ნაყინი ხილით', source: [12] }),
  item('Desserts', 'Ice-cream with nuts and chocolate', '9.90', { name_ka: 'ნაყინი თხილით და შოკოლადით', source: [12] }),
  item('Desserts', 'Peanuts', '5.90', { name_ka: 'არაქისი', source: [12] }),
  item('Desserts', 'Cherry', '18.00', { name_ka: 'ალუბალი', description_en: 'Cherry Confit; Mint Cream; Milk Chocolate Mousse with Tonka Beans', description_ka: 'ალუბლის კონფი; პიტნის კრემი; რძიანი შოკოლადის მუსი ტონკას მარცვლებით', photo: 'dessert-cherry.webp', source: [11] }),
  item('Desserts', 'Apple', '18.00', { name_ka: 'ვაშლი', description_en: 'Caramel Sponge Cake; With Thin Beans; Crispy Caramel Layer; Apple Compote', description_ka: 'კარამელის ბისკვიტი; თინ ბინსით; ხრაშუნა კარამელის ფენა; ვაშლის კომპოტი', photo: 'dessert-apple.webp', source: [11] }),
  item('Desserts', 'Heart', '18.00', { name_ka: 'გული', description_en: 'Chocolate Sponge Cake; Chocolate Ganache with Hazelnuts; Bavarian Mousse', description_ka: 'შოკოლადის ბისკვიტი; შოკოლადის განაში თხილით; ბავარიული მუსი', photo: 'dessert-heart.webp', source: [11] }),
  item('Desserts', 'Lemon', '18.00', { name_ka: 'ლიმონი', description_en: 'Lemon Cream; Lemon Ganache; Lemon Biscuit; Lemon Mousse', description_ka: 'ლიმონის კრემი; ლიმონის განაში; ლიმონის ბისკვიტი; ლიმონის მუსი', photo: 'dessert-lemon.webp', source: [11] }),
  item('Desserts', 'Pearl', '18.00', { name_ka: 'მარგალიტი', description_en: 'Lime sponge cake; Strawberry confit with lime; Meringue mousse with strawberries', description_ka: 'ლაიმის ბისკვიტი; მარწყვის კონფი ლაიმით; მერენგის მუსი მარწყვით', photo: 'dessert-pearl.webp', source: [11] }),
  item('Desserts', 'Origami', '18.00', { name_ka: 'ორიგამი', description_en: 'Coconut Mousse & biscuit; Pineapple Compote; Pina Colada Ganache; Crunchy Layer', description_ka: 'ქოქოსის მუსი და ბისკვიტი; ანანასის კომპოტი; პინა კოლადას განაში; ხრაშუნა ფენა', photo: 'dessert-origami.webp', source: [11] }),
  item('Desserts', 'Spiral', '18.00', { name_ka: 'სპირალი', description_en: 'Pistachio Dacquoise Biscuit; Raspberry Compote; Raspberry cream; Pistachio Mousse', description_ka: 'ფსტის დაკუაზის ბისკვიტი; ჟოლოს კომპოტი; ჟოლოს კრემი; ფსტის მუსი', photo: 'dessert-spiral.webp', source: [11] }),
  item('Desserts', 'Duna', '18.00', { name_ka: 'დუნა', description_en: 'Apricot; Passion Fruit; White Chocolate; Cream; Almond Flour; Flour; Egg', description_ka: 'გარგარი; პასიფლორა; თეთრი შოკოლადი; კრემი; ნუშის ფქვილი; ფქვილი; კვერცხი', photo: 'dessert-duna.webp', source: [11] })
]

// Remove photo-label-only records without a menu-page price. The provenance still records excluded crops below.
const menuSourceItems = items.filter(i => i.visible !== false)

const rows = menuSourceItems.map((it, i) => ({
  id: 900000 + categories.length + i,
  restaurant_id: restaurantId,
  name_en: it.name_en,
  name_ka: it.name_ka,
  description_en: it.description_en,
  description_ka: it.description_ka,
  price: it.price,
  category_id: catId[it.category],
  categories: {
    name_en: it.category,
    name_ka: categories.find(c => c.name_en === it.category)?.name_ka || ''
  },
  model: '',
  model_usdz: '',
  sort_order: i + 1,
  visible: true,
  ar_scale: 1,
  thumbnail_url: it.thumbnail_url,
  thumb_3d: false,
  is_3d: false,
  text_only: it.text_only,
  addons: [],
  variants: it.variants
}))

const themeConfig = [
  { restaurant_id: restaurantId, key: 'phone_layout', value: 'twin' },
  { restaurant_id: restaurantId, key: 'drink_categories', value: JSON.stringify(['Non-Alcoholic Drinks', 'Coffee & Tea', 'Alcoholic Drinks']) }
]

const provenance = menuSourceItems.map((it, i) => ({
  id: rows[i].id,
  name_en: it.name_en,
  category: it.category,
  screenshot_numbers: it.source,
  price: it.price,
  price_basis: it.price_basis,
  conflict_notes: it.conflict_notes,
  translation_status: it.translation_status,
  source_name_notes: it.source_name_notes,
  photo_asset: it.photo,
  text_only: it.text_only,
  variants: it.variants
}))

const excluded_assets = [
  { file: 'grilled-vegetables-alt.webp', reason: 'duplicate; preferred grilled-vegetables.webp' },
  { file: 'soup-kharcho-alt.webp', reason: 'duplicate; preferred soup-kharcho.webp' },
  { file: 'ojakhuri-veal-alt.webp', reason: 'duplicate; preferred ojakhuri-veal.webp' },
  { file: 'chicken-shashlik.webp', reason: 'duplicate/similar source imagery; preferred chicken-barbecue.webp for clearly priced Chicken barbecue' },
  { file: 'coffee-dessert.webp', reason: 'ambiguous label; not used for ordinary coffee/dessert' },
  { file: 'georgian-beer.webp', reason: 'generic Georgian beer label; not clearly Natakhtari, so not used' },
  { file: 'mushrooms-cheese.webp', reason: 'photo-label-only crop; no priced menu item identified as “Mushrooms with cheese”' },
  { file: 'ojakhuri-chicken.webp', reason: 'photo-label-only crop; no readable menu-page price, so no menu row generated' }
]

const fixture = {
  version: 1,
  generated_from: '/home/gagi/baoma_menu_extracted.md',
  restaurant: {
    id: restaurantId,
    slug: restaurantSlug,
    name: 'BAOMA',
    brand_id: brandId,
    brands: { id: brandId, slug: brandSlug, name: 'BAOMA', plan: 'premium' }
  },
  categories,
  theme_config: themeConfig,
  menu_items: rows,
  provenance,
  excluded_assets,
  notes: {
    source_policy: 'White/newer menu prices supersede older burgundy prices only where identity is clear. Older-only items are retained with their printed prices. Similar-but-not-identical dishes are kept separate. No prices are inferred from photo-only collages.',
    production_limitations: 'Client should confirm menu prices/translations and photo rights/quality before production import.'
  }
}

function sqlString(s) {
  return String(s).replace(/'/g, "''")
}

function productionItemRows() {
  return menuSourceItems.map((it, i) => ({
    name_en: it.name_en,
    name_ka: it.name_ka,
    description_en: it.description_en,
    description_ka: it.description_ka,
    price: it.price,
    category_name_en: it.category,
    model: '',
    model_usdz: '',
    sort_order: i + 1,
    visible: true,
    ar_scale: 1,
    thumbnail_url: it.photo ? `${publicDishBase}${it.photo}` : '',
    thumb_3d: false,
    is_3d: false,
    text_only: !it.photo,
    addons: [],
    variants: it.variants
  }))
}

const sqlCategories = JSON.stringify(categories.map(({ name_en, name_ka, sort_order }) => ({ name_en, name_ka, sort_order })), null, 2)
const sqlItems = JSON.stringify(productionItemRows(), null, 2)
const sqlTheme = JSON.stringify(themeConfig.map(({ key, value }) => ({ key, value })), null, 2)

const sql = `-- BAOMA real menu import artifact.
-- Source: /home/gagi/baoma_menu_extracted.md from supplied screenshot set 1-15.
-- Review before running: source menu prices/translations need client confirmation, and photo rights/quality should be confirmed before production.
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
   where r.id = ${restaurantId}
     and r.slug = '${restaurantSlug}'
     and r.brand_id = ${brandId}
     and b.slug = '${brandSlug}';

  if not found then
    raise exception 'BAOMA identity assertion failed for restaurant %, slug %, brand %, brand slug %', ${restaurantId}, '${restaurantSlug}', ${brandId}, '${brandSlug}';
  end if;
end $$;

-- If an unused corrupted Featured category exists for BAOMA, repair it only when
-- it has no menu-item references and the intended target category is absent.
do $$
declare
  v_featured_id bigint;
  v_refs integer;
begin
  select id into v_featured_id
    from public.categories
   where restaurant_id = ${restaurantId}
     and lower(name_en) = 'featured'
   limit 1;

  if v_featured_id is not null then
    select count(*) into v_refs
      from public.menu_items
     where restaurant_id = ${restaurantId}
       and category_id = v_featured_id;

    if v_refs = 0 and not exists (
      select 1 from public.categories where restaurant_id = ${restaurantId} and name_en = 'Breakfast'
    ) then
      update public.categories
         set name_en = 'Breakfast',
             name_ka = 'საუზმე',
             sort_order = 1
       where id = v_featured_id
         and restaurant_id = ${restaurantId};
    end if;
  end if;
end $$;

with src as (
  select *
  from jsonb_to_recordset($baoma_categories$${sqlCategories}$baoma_categories$::jsonb)
    as x(name_en text, name_ka text, sort_order integer)
)
insert into public.categories (restaurant_id, name_en, name_ka, sort_order)
select ${restaurantId}, name_en, name_ka, sort_order
from src
on conflict (restaurant_id, name_en) do update
set name_ka = excluded.name_ka,
    sort_order = excluded.sort_order;

with src as (
  select *
  from jsonb_to_recordset($baoma_items$${sqlItems}$baoma_items$::jsonb)
    as x(
      name_en text,
      name_ka text,
      description_en text,
      description_ka text,
      price text,
      category_name_en text,
      model text,
      model_usdz text,
      sort_order integer,
      visible boolean,
      ar_scale numeric,
      thumbnail_url text,
      thumb_3d boolean,
      is_3d boolean,
      text_only boolean,
      addons jsonb,
      variants jsonb
    )
)
insert into public.menu_items (
  restaurant_id, name_en, name_ka, description_en, description_ka, price,
  category_id, model, model_usdz, sort_order, visible, ar_scale,
  thumbnail_url, thumb_3d, is_3d, text_only, addons, variants
)
select
  ${restaurantId},
  src.name_en,
  src.name_ka,
  src.description_en,
  src.description_ka,
  src.price,
  (
    select c.id
      from public.categories c
     where c.restaurant_id = ${restaurantId}
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
  coalesce(src.addons, '[]'::jsonb),
  coalesce(src.variants, '[]'::jsonb)
from src
on conflict (restaurant_id, name_en) do update
set name_ka = excluded.name_ka,
    description_en = excluded.description_en,
    description_ka = excluded.description_ka,
    price = excluded.price,
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
    addons = excluded.addons,
    variants = excluded.variants;

with src as (
  select *
  from jsonb_to_recordset($baoma_theme$${sqlTheme}$baoma_theme$::jsonb)
    as x(key text, value text)
)
insert into public.theme_config (restaurant_id, key, value)
select ${restaurantId}, key, value
from src
on conflict (restaurant_id, key) do update
set value = excluded.value,
    updated_at = now();

notify pgrst, 'reload schema';

-- Validation queries: these should be inspected before switching to COMMIT.
select 'baoma_category_count' as check_name, count(*) as value
  from public.categories
 where restaurant_id = ${restaurantId};

select 'baoma_visible_menu_item_count' as check_name, count(*) as value
  from public.menu_items
 where restaurant_id = ${restaurantId}
   and visible = true;

select 'baoma_photo_item_count' as check_name, count(*) as value
  from public.menu_items
 where restaurant_id = ${restaurantId}
   and visible = true
   and coalesce(thumbnail_url, '') <> '';

select restaurant_id, name_en, count(*) as duplicate_count
  from public.menu_items
 where restaurant_id = ${restaurantId}
 group by restaurant_id, name_en
having count(*) > 1;

select mi.id, mi.name_en, mi.category_id
  from public.menu_items mi
  left join public.categories c
    on c.id = mi.category_id
 where mi.restaurant_id = ${restaurantId}
   and (mi.category_id is null or c.id is null);

select mi.id, mi.name_en, mi.category_id, c.restaurant_id as category_restaurant_id
  from public.menu_items mi
  join public.categories c on c.id = mi.category_id
 where mi.restaurant_id = ${restaurantId}
   and c.restaurant_id <> ${restaurantId};

select id, name_en
  from public.menu_items
 where restaurant_id = ${restaurantId}
   and visible = true
   and coalesce(is_3d, false) = true;

select id, name_en
  from public.menu_items
 where restaurant_id = ${restaurantId}
   and visible = true
   and text_only = true
   and coalesce(thumbnail_url, '') <> '';

-- COMMIT switch: replace the next line with COMMIT; after validation and approval.
ROLLBACK;
`

mkdirSync('data/fixtures', { recursive: true })
mkdirSync('supabase/sql', { recursive: true })
writeFileSync('data/fixtures/baoma-menu.fixture.json', `${JSON.stringify(fixture, null, 2)}\n`)
writeFileSync('supabase/sql/2026-07-26_baoma_menu_import.sql', sql)

console.log(`Wrote ${rows.length} BAOMA menu items, ${categories.length} categories, ${rows.filter(r => r.thumbnail_url).length} photo items.`)
console.log(`Excluded ${excluded_assets.length} ambiguous/duplicate dish crops from item mapping.`)
