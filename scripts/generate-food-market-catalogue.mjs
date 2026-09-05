#!/usr/bin/env node

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = process.env.FOOD_MARKET_SOURCE_DIR || '/home/gagi/food-market-working';
const driveRoot = process.env.FOOD_MARKET_DRIVE_DIR || '/home/gagi/food-market-drive-web';
const assetDir = path.join(root, 'assets/food-market/catalogue');
const publicAssetRoot = 'https://restaurant-ar.pages.dev/assets/food-market/catalogue';
const transformVersion = 'fm-catalogue-v2-food-cover-drinks-contain-1200';
const pages = [
  { key: 'georgian', file: 'georgian.json', expected: 42 },
  { key: 'asian', file: 'asian.json', expected: 56 },
  { key: 'drinks', file: 'drinks.json', expected: 130 },
];
const preserved = new Map([
  ['BURRATA SALAD', {
    id: 1383,
    model: 'https://pub-b253d60df14c4c1f94bada002fa59596.r2.dev/food-market-main/1787818013846_burrata_salad_opt.glb',
    model_usdz: 'https://pub-b253d60df14c4c1f94bada002fa59596.r2.dev/food-market-main/1787818016905_burrata_salad.usdz',
    ar_scale: 0.15,
    thumbnail_url: 'https://restaurant-ar.pages.dev/assets/food-market/items/burrata-salad.webp',
  }],
  ['CHICKEN BALLS IN SHKMERULI SAUCE', {
    id: 1385,
    model: 'https://pub-b253d60df14c4c1f94bada002fa59596.r2.dev/food-market-main/1787818041592_chicken_balls_shkmeruli_opt.glb',
    model_usdz: 'https://pub-b253d60df14c4c1f94bada002fa59596.r2.dev/food-market-main/1787818044807_chicken_balls_shkmeruli.usdz',
    ar_scale: 0.15,
    thumbnail_url: 'https://restaurant-ar.pages.dev/assets/food-market/items/chicken-balls.webp',
  }],
  ['Unagi Philadelphia', {
    id: 1421,
    model: 'https://pub-b253d60df14c4c1f94bada002fa59596.r2.dev/food-market-main/1787820485854_salmon_sushi_roll_draco.glb',
    model_usdz: 'https://pub-b253d60df14c4c1f94bada002fa59596.r2.dev/food-market-main/1787820543487_salmon_sushi_roll.usdz',
    ar_scale: 1,
    thumbnail_url: 'https://pub-b253d60df14c4c1f94bada002fa59596.r2.dev/food-market-main/1787819264838_sushi.webp',
  }],
]);

// Every accepted relationship is reviewable here. Indices refer to the official,
// count-asserted source manifests; they deliberately avoid fuzzy runtime guesses.
const reviewedMatches = [
  ...[
    [0,'INTERNATIONAL/PIZZA/Copy of მარგარიტა.jpg'],[1,'INTERNATIONAL/PIZZA/Copy of პეპერონი.jpg'],[2,'INTERNATIONAL/PIZZA/Copy of 4 ყველი.jpg'],[3,'INTERNATIONAL/PIZZA/Copy of პროშუტო.jpg'],[4,'INTERNATIONAL/PIZZA/Copy of პიცა შეფი.jpg'],[5,'INTERNATIONAL/PIZZA/Copy of ვეგეტარიანული.jpg'],[6,'INTERNATIONAL/PIZZA/Copy of შავი ტრუფელის პიცა.jpg'],
    [7,'INTERNATIONAL/BURGER/CHICKEN BURGER'],[8,'INTERNATIONAL/BURGER/Copy of შეფ ბურგერი.jpg'],[9,'INTERNATIONAL/BURGER/Copy of სმეშ ბურგერი.jpg'],[10,'INTERNATIONAL/BURGER/Copy of სტეიკ სენდვიჩი.jpg'],
    [11,'INTERNATIONAL/PASTA/Copy of salmon pasta.jpg'],[12,'INTERNATIONAL/PASTA/Copy of პენე არაბიატა.jpg'],[13,'INTERNATIONAL/PASTA/Copy of პენე ბოლონეზე.jpg'],[14,'INTERNATIONAL/PASTA/Copy of სპაგეტი კარბონარა.jpg'],[15,'INTERNATIONAL/PASTA/Copy of სოკოს და ტრუფელის პასტა.jpg'],
    [16,'INTERNATIONAL/APPETIZER/DIP MIXES.png'],[17,'INTERNATIONAL/APPETIZER/TACOS PORK'],[18,'INTERNATIONAL/APPETIZER/TACOS BEEF'],[19,'INTERNATIONAL/APPETIZER/HUMMUS GREEN SALAD'],[21,'INTERNATIONAL/APPETIZER/Copy of french fries.png'],
    [22,'INTERNATIONAL/SALAD/Copy of ცეზარის სალათი ქათმით.jpg'],[24,'INTERNATIONAL/SALAD/Copy of kakhetian salad.JPG'],[26,'INTERNATIONAL/SALAD/SHRIMP SALAD'],
    [27,'INTERNATIONAL/SOUP/Copy of საქონლის ხორცის წვნიანი ბრინჯის ნუდლსით.jpg'],[28,'INTERNATIONAL/SOUP/Copy of ჩიხირთმა.jpeg'],[29,'INTERNATIONAL/SOUP/Copy of 3-soko.jpg'],[30,'INTERNATIONAL/SOUP/Copy of Pumpkin-cream-soup-1.JPG'],
    [32,'INTERNATIONAL/CROQUETTES/Copy of sulguni in tomato.jpg'],[33,'INTERNATIONAL/CROQUETTES/Copy of lobio balls.JPG'],[35,'INTERNATIONAL/CROQUETTES/Copy of elarji balls.JPG'],
    [36,'INTERNATIONAL/DOUGH/Copy of იმრეული ხაჭაპური.jpg'],[37,'INTERNATIONAL/DOUGH/Copy of აჭარული ხაჭაპური.jpg'],[38,'INTERNATIONAL/DOUGH/Copy of მეგრული ხაჭაპური.jpeg'],
    [41,'INTERNATIONAL/MAIN/Copy of გრილზე შემწვარი ქათმის ფილე.jpg'],
  ].map(([index, relative]) => ['georgian', index, relative]),
  ...[
    [0,'THAI/STIR FRIED/Stir Fried Cashewnut.jpg'],[1,'THAI/STIR FRIED/Stir Fried Broccoli with Shrimp.jpg'],[2,'THAI/RICE/Thai Style fried rice.jpg'],[3,'THAI/RICE/Sriracha Fried Rice.jpg'],[4,'THAI/RICE/Chicken Donburi.jpg'],[5,'THAI/RICE/Rice with Grilled Chicken & Satay Sauce.jpg'],[6,'THAI/RICE/Grilled chicken with curry rice.jpg'],[7,'THAI/SALAD/Grilled Chicken Salad.jpg'],[8,'THAI/SALAD/Crispy Chicken Salad.jpg'],[9,'THAI/APPETIZER/Copy of ხრაშუნა კრევეტი თამარინდ სოუსით crispy shrimp with tamarind souce.jpg'],[10,'THAI/APPETIZER/Kimchi.jpg'],[12,'THAI/SOUP/Massaman Curry.jpg'],[13,'THAI/CURRY/Grilled Chicken Red Hot Curry.jpg'],[15,'THAI/CURRY/yellow curry.jpg'],[18,'THAI/STIR FRIED/Stir Fried Glass Noodles.jpg'],[19,'THAI/NOODLES/Pad si Eyw.jpg'],[20,'THAI/NOODLES/Pad Thai Shrimp Noodles.jpg'],[21,'THAI/SOUP/Tom Yum Mix Seafood.jpg'],[23,'THAI/SOUP/Thai Noodle Soup with Chicken Shreded.jpg'],[24,'THAI/SOUP/Tom Yum Shrimp.jpg'],[25,'THAI/SOUP/Tom Kha.jpg'],[26,'THAI/SOUP/Tom Yum Ramen with Shrimp.jpg'],[27,'THAI/SOUP/Pho With Beef.jpg'],
    [28,'ASIAN/SASHIMI/Copy of salmon sashimi.JPG'],[29,'ASIAN/SASHIMI/Copy of tuna sashimi.JPG'],[31,'ASIAN/NIGIRI/Copy of salmon nigiri.JPG'],[32,'ASIAN/NIGIRI/Copy of tuna nigiri.JPG'],[35,'ASIAN/MAKI/Copy of კაპპა მაკი.JPG'],[36,'ASIAN/MAKI/Copy of შაკე მაკი.JPG'],[37,'ASIAN/MAKI/Copy of shrimp maki.JPG'],[41,'ASIAN/URAMAKI ROLL/Copy of spicy salmon roll.JPG'],[42,'ASIAN/URAMAKI ROLL/Copy of california.JPG'],[43,'ASIAN/URAMAKI ROLL/Copy of dragon roll.JPG'],[45,'ASIAN/URAMAKI ROLL/Copy of philadelphia roll.jpg'],[46,'ASIAN/URAMAKI ROLL/Copy of უნაგი როლი Unagi Roll.jpg'],[47,'ASIAN/URAMAKI ROLL/ტროპიკული კრევეტი.png'],[48,'ASIAN/URAMAKI ROLL/სამეფო ფილადელფია.png'],[50,'ASIAN/FUTOMAKI/Copy of futomaki veggie.JPG'],[51,'ASIAN/FUTOMAKI/Copy of futomaki tuna.JPG'],[52,'ASIAN/FUTOMAKI/Copy of futomaki salmon.JPG'],
  ].map(([index, relative]) => ['asian', index, relative]),
  ...[
    [2,'Riesling “vom Roten Schiefer” 2021, Germany.jpg'],[3,'Hey French Bianco Veneto, Multivintage Pasqua Italy.png'],[4,'Graves Blanc, Reserve, Bordeaux 2022, Mouton Cadet France.jpg'],[5,'Tsinandali, Naberauli.png'],[6,'Mtsvane, Kardanakhi 1888.png'],[7,'Tsiskari, Eclipse, Tkatsiteli 2021.png'],[8,'Mtsvane, Shakriani Estate.png'],[9,'Chinuri-Goruli Mtsvane, Gulodrava.jpg'],[10,'Atenuri, Gulodrava.jpg'],[11,'Tsolikauri, Anemo.png'],[12,'Goruli Mtsvane, Zedashe.jpg'],[13,'Mtsvane, Rtvelisi.png'],[14,'Rkatsiteli, Vardiashvili.png'],[15,'Khikhvi, Pirveli Winery.png'],[16,'Kisi, Shakriani Estate.png'],[17,'Tvishi, Naberauli.png'],[18,'Gviani Mosavali, Barbale.jpg'],[23,'Saint-Emilion, Reserve Bordeaux 2020, Mouton Cadet France.png'],[24,'Lui’, Cabernet Sauvignon Veneto 2018, Pasqua Italy.jpg'],[25,'Rosso Veneto IGT 2021, Pasqua Italy.png'],[26,'Saperavi Esabi, Eclipse.png'],[27,'Saperavi Dzelshavi, Royal Khvanchkara.png'],[28,'Asuretuli, Marbano.jpg'],[30,'Otskhanuri Sapere, Gulodrava.png'],[31,'Saperavi, Gulodrava.png'],[33,'Saperavi, Anemo.jpg'],[34,'Shavkapito, Zedashe.heic'],[35,'Asuretuli, Zedashe.heic'],[36,'Saperavi, Shakriani Estate kvevri.png'],[37,'Kindzmarauli, Rtvelisi.png'],[38,'Khvanchkara, Royal Khvanchkara.jpg'],[39,'Usakhelauri, Royal Racha.png'],[40,'11 Minutes, Rose Trevenezie 2023, Pasqua Italy.jpg'],[41,'Saperavi Rose, Chelti.jpg'],[42,'Shavkapito Rose, Amosa.png'],[43,'Usakhelauri Rose, Naberauli.png'],[51,'Monastrell 2021, Bodegas Carchelo Red Dry, Spain.jpg'],[52,'EYA Verdejo.heic'],[53,'Tsolikauri Kisi, Rtvelisi.png'],[54,'Tsinandali, Chelti.jpg'],[55,'Tvishi, Rtvelisi.png'],
  ].map(([index, file]) => ['drinks', index, `DRINKS/wine/${file}`]),
];

function slug(value) {
  return String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 72) || 'item';
}
function sqlString(value) {
  if (value == null) return 'NULL';
  return `'${String(value).replaceAll("'", "''")}'`;
}
function unicodeSql(input) {
  if (input == null) return 'NULL';
  let out = '';
  for (const ch of String(input).replaceAll("'", "''")) {
    const cp = ch.codePointAt(0);
    out += cp <= 0x7f ? ch : cp <= 0xffff ? `\\${cp.toString(16).toUpperCase().padStart(4, '0')}` : `\\+${cp.toString(16).toUpperCase().padStart(6, '0')}`;
  }
  return `U&'${out}'`;
}
function categoryPrefix(item) {
  if (item.menu_page === 'georgian') return { en: 'Georgian', ka: 'ქართული' };
  if (item.menu_page === 'drinks') return { en: 'Drinks', ka: 'სასმელები' };
  return item.cuisine === 'japanese'
    ? { en: 'Japanese', ka: 'იაპონური' }
    : { en: 'Thai', ka: 'ტაილანდური' };
}
function price(value, variants = []) {
  const exact = variants.length ? variants[0].price : String(value).replace(',', '.');
  assert.match(String(exact), /^\d+(?:\.\d+)?$/, `invalid price ${value}`);
  return `${Number(exact).toFixed(2)} ₾`;
}
function databaseName(item) {
  if (item.menu_page === 'asian' && ['Salmon', 'Tuna'].includes(item.name_en)) return `${item.name_en} ${item.category_en}`;
  if (item.menu_page === 'drinks' && item.name_en === 'Saperavi, Shakriani Estate') {
    return `${item.name_en} (${item.category_en === 'Red Dry Qvevri' ? 'Qvevri' : 'Classic'})`;
  }
  if (item.menu_page === 'drinks' && item.name_en === 'Saperavi, Rtvelisi') {
    return `${item.name_en} (${item.category_en === 'Wine by the Glass' ? 'Glass' : 'Bottle'})`;
  }
  return item.name_en;
}

const manifests = new Map();
const raw = pages.flatMap(page => {
  const rows = JSON.parse(fs.readFileSync(path.join(sourceRoot, page.file), 'utf8'));
  assert.equal(rows.length, page.expected, `${page.key} item count`);
  manifests.set(page.key, rows);
  return rows;
});
assert.equal(raw.length, 228);

const allDriveFiles = [];
function enumerateFiles(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) enumerateFiles(absolute);
    else allDriveFiles.push(path.relative(driveRoot, absolute).split(path.sep).join('/'));
  }
}
enumerateFiles(driveRoot);
assert.equal(allDriveFiles.length, 179, 'fully enumerated Drive mirror');

for (const rows of manifests.values()) for (const item of rows) item.image_source_path = null;
const matchedRelative = new Set();
const matchedItems = new Set();
for (const [page, index, relative] of reviewedMatches) {
  const rows = manifests.get(page);
  assert.ok(rows?.[index], `invalid reviewed item ${page}[${index}]`);
  const absolute = path.join(driveRoot, relative);
  assert.ok(fs.existsSync(absolute), `missing reviewed Drive image: ${relative}`);
  assert.ok(!matchedRelative.has(relative), `Drive image mapped twice: ${relative}`);
  const identity = `${page}:${index}`;
  assert.ok(!matchedItems.has(identity), `menu item mapped twice: ${identity}`);
  rows[index].image_source_path = absolute;
  matchedRelative.add(relative);
  matchedItems.add(identity);
}
for (const page of pages) {
  fs.writeFileSync(path.join(sourceRoot, page.file), `${JSON.stringify(manifests.get(page.key), null, 2)}\n`);
}

const ambiguousReasons = new Map([
  ['ASIAN/URAMAKI ROLL/Copy of spicy tuna roll.JPG', 'byte-identical to the selected Spicy Salmon photo'],
  ['INTERNATIONAL/SALAD/Copy of Walnut salad.jpg', 'byte-identical to the selected Kakhetian salad photo'],
  ['DRINKS/wine/Saperavi, Shakriani Estate.png', 'byte-identical to the selected explicitly named qvevri file'],
  ['DRINKS/wine/Cava Brut.png', 'generic bottle has no proven producer'],
  ['THAI/NOODLES/Pad Thai Noodles with chicken.jpg', 'alternate Pad Thai variant; shrimp is the selected representative'],
  ['THAI/SOUP/Tom Yam  Veggie Chicken.jpg', 'alternate Tom Yum variant; shrimp is the selected representative'],
]);
const preserved3dMediaSources = new Map([
  ['INTERNATIONAL/CROQUETTES/Copy of chicken balls.JPG', 'exact match for CHICKEN BALLS IN SHKMERULI SAUCE; preserved 3D row 1385 retains its established thumbnail'],
]);
for (const relative of ambiguousReasons.keys()) assert.ok(allDriveFiles.includes(relative), `missing ambiguous source: ${relative}`);
for (const relative of preserved3dMediaSources.keys()) assert.ok(allDriveFiles.includes(relative), `missing preserved 3D source: ${relative}`);
const auditFiles = allDriveFiles.sort().map(relative => {
  const match = reviewedMatches.find(x => x[2] === relative);
  if (match) {
    const item = manifests.get(match[0])[match[1]];
    return { source: relative, status: 'matched', item: `${match[0]}:${item.category_en}:${item.name_en}` };
  }
  if (ambiguousReasons.has(relative)) return { source: relative, status: 'ambiguous', reason: ambiguousReasons.get(relative) };
  if (preserved3dMediaSources.has(relative)) return { source: relative, status: 'current_item_preserved_3d_media', item: 'georgian:Croquettes:CHICKEN BALLS IN SHKMERULI SAUCE', reason: preserved3dMediaSources.get(relative) };
  return { source: relative, status: 'unmatched_or_obsolete', reason: 'no exact item in the official 228-row catalogue' };
});
const auditCounts = Object.fromEntries(['matched', 'current_item_preserved_3d_media', 'ambiguous', 'unmatched_or_obsolete'].map(status => [status, auditFiles.filter(x => x.status === status).length]));
fs.writeFileSync(path.join(root, 'assets/food-market/catalogue/source-audit.json'), `${JSON.stringify({ drive_root: driveRoot, total: auditFiles.length, counts: auditCounts, files: auditFiles }, null, 2)}\n`);

fs.mkdirSync(assetDir, { recursive: true });
const bySource = new Map();
for (const item of raw.filter(item => item.image_source_path)) {
  const source = path.resolve(item.image_source_path);
  assert.ok(fs.existsSync(source), `missing image: ${source}`);
  if (!bySource.has(source)) {
    const sourceBytes = fs.readFileSync(source);
    const sourceSha256 = crypto.createHash('sha256').update(sourceBytes).digest('hex');
    const digest = crypto.createHash('sha256').update(transformVersion).update(sourceBytes).digest('hex').slice(0, 8);
    const filename = `${item.menu_page}-${slug(item.category_en)}-${slug(item.name_en)}-${digest}.webp`;
    bySource.set(source, { filename, source, sourceSha256, uses: [] });
  }
  bySource.get(source).uses.push({ source_pdf: item.source_pdf, source_page: item.source_page, item: item.name_en });
}
assert.equal(bySource.size, reviewedMatches.length, 'unique matched photos');

const desiredWebps = new Set([...bySource.values()].map(x => x.filename));
for (const filename of fs.readdirSync(assetDir).filter(x => x.endsWith('.webp'))) {
  if (!desiredWebps.has(filename)) fs.unlinkSync(path.join(assetDir, filename));
}

const skipImageBuild = process.env.FOOD_MARKET_SKIP_IMAGE_BUILD === '1';
for (const entry of bySource.values()) {
  const output = path.join(assetDir, entry.filename);
  if (skipImageBuild) {
    assert.ok(fs.existsSync(output) && fs.statSync(output).size > 0, `missing generated image: ${output}`);
    continue;
  }
  const isDrink = entry.uses.every(use => use.source_pdf.includes('DRINKS'));
  const filter = isDrink
    ? "scale=1000:1000:force_original_aspect_ratio=decrease,pad=1200:1200:(ow-iw)/2:(oh-ih)/2:color=#f7f3eb"
    : 'scale=1200:1200:force_original_aspect_ratio=increase,crop=1200:1200';
  // ffmpeg probes the encoded bytes, so Drive thumbnails remain supported even
  // when their .heic/.png extension actually contains JPEG data.
  const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', entry.source,
    '-vf', filter, '-frames:v', '1', '-c:v', 'libwebp', '-quality', '88', '-compression_level', '6', '-map_metadata', '-1', output], { encoding: 'utf8' });
  assert.equal(result.status, 0, `ffmpeg failed for ${entry.source}: ${result.stderr}`);
}

const categoryMap = new Map();
const categoryOrder = [];
const categoryCounts = { georgian: 0, asian: 0, drinks: 0 };
for (const item of raw) {
  const prefix = categoryPrefix(item);
  const name_en = `${prefix.en} — ${item.category_en}`;
  const name_ka = `${prefix.ka} — ${item.category_ka}`;
  if (!categoryMap.has(name_en)) {
    const category = { id: 9001 + categoryOrder.length, name_en, name_ka, name_ru: null, sort_order: categoryOrder.length + 1 };
    categoryMap.set(name_en, category);
    categoryOrder.push(category);
    categoryCounts[item.menu_page]++;
  }
}
assert.deepEqual(categoryCounts, { georgian: 9, asian: 14, drinks: 21 });

const menuItems = raw.map((item, index) => {
  const prefix = categoryPrefix(item);
  const category = categoryMap.get(`${prefix.en} — ${item.category_en}`);
  const sourceEntry = item.image_source_path ? bySource.get(path.resolve(item.image_source_path)) : null;
  const keep = preserved.get(item.name_en);
  const thumbnail_url = keep?.thumbnail_url || (sourceEntry ? `${publicAssetRoot}/${sourceEntry.filename}` : '');
  return {
    id: keep?.id || 200001 + index,
    restaurant_id: 73,
    category_id: category.id,
    categories: { name_en: category.name_en, name_ka: category.name_ka, name_ru: null },
    name_en: databaseName(item),
    name_ka: item.name_ka || '',
    name_ru: null,
    description_en: item.description_en || '',
    description_ka: item.description_ka || '',
    description_ru: null,
    price: price(item.price_display, item.variants),
    price_old: null,
    model: keep?.model || '',
    model_usdz: keep?.model_usdz || '',
    thumbnail_url,
    is_3d: Boolean(keep),
    ar_scale: keep?.ar_scale ?? 1,
    thumb_3d: false,
    text_only: !thumbnail_url,
    featured: false,
    addons: [],
    variants: (item.variants || []).map(v => ({ en: v.name_en, ka: v.name_ka, price: price(v.price) })),
    sort_order: index + 1,
    visible: true,
    _source: { menu_page: item.menu_page, cuisine: item.cuisine || null, source_pdf: item.source_pdf, source_page: item.source_page, notes: item.notes },
    _catalogue_image: Boolean(sourceEntry),
  };
});
assert.equal(menuItems.filter(x => x._catalogue_image).length, reviewedMatches.length);
assert.equal(menuItems.filter(x => x.is_3d).length, 3);
const mediaCount = menuItems.filter(x => x.thumbnail_url).length;
const textOnlyCount = menuItems.filter(x => x.text_only).length;
assert.equal(mediaCount, reviewedMatches.length + 3);
assert.equal(textOnlyCount, 228 - mediaCount);

const logical = new Map();
for (const item of menuItems) {
  const key = [item._source.menu_page, item.categories.name_en, item.name_en].join('|').toLowerCase();
  assert.ok(!logical.has(key), `duplicate logical item: ${key}`);
  logical.set(key, item);
}

const fixture = {
  restaurant: { id: 73, slug: 'food-market-main', name: 'Food & Market', brand_id: 67, brands: { id: 67, slug: 'food-market', name: 'Food & Market', plan: 'premium' } },
  theme_config: [],
  categories: categoryOrder,
  menu_items: menuItems.map(({ _catalogue_image, ...item }) => item),
};
fs.writeFileSync(path.join(root, 'foods/food-market-full-catalogue.json'), `${JSON.stringify(fixture, null, 2)}\n`);

const provenance = [...bySource.values()].sort((a, b) => a.filename.localeCompare(b.filename)).map(entry => ({
  output_path: `assets/food-market/catalogue/${entry.filename}`,
  source_path: entry.source,
  source_sha256: entry.sourceSha256,
  uses: entry.uses,
}));
fs.writeFileSync(path.join(assetDir, 'provenance.json'), `${JSON.stringify({ generated_from: pages.map(p => path.join(sourceRoot, p.file)), transform_version: transformVersion, images: provenance }, null, 2)}\n`);

const categoryValues = categoryOrder.map(c => `  (73, ${sqlString(c.name_en)}, ${sqlString(c.name_ka)}, NULL, ${c.sort_order})`).join(',\n');
const itemValues = menuItems.map(item => {
  const source = item._source;
  return `  (${item.id}, ${sqlString(item.categories.name_en)}, ${sqlString(source.menu_page)}, ${sqlString(source.cuisine)}, ${sqlString(item.name_en)}, ${sqlString(item.name_ka)}, ${sqlString(item.description_en)}, ${sqlString(item.description_ka)}, ${sqlString(item.price)}, ${sqlString(item.thumbnail_url)}, ${sqlString(JSON.stringify(item.variants))}::jsonb, ${item.sort_order}, ${sqlString(source.source_pdf)}, ${source.source_page})`;
}).join(',\n');

const validationAnchor = "  IF EXISTS (SELECT 1 FROM public.menu_items m LEFT JOIN public.categories c ON c.id = m.category_id AND c.restaurant_id = m.restaurant_id WHERE m.restaurant_id = 73 AND c.id IS NULL) THEN RAISE EXCEPTION 'orphan/cross-tenant category'; END IF;";
const extraValidation = "  IF EXISTS (SELECT 1 FROM public.menu_items m JOIN public.categories c ON c.id = m.category_id WHERE m.restaurant_id = 73 GROUP BY c.name_en, m.name_en HAVING count(*) > 1) THEN RAISE EXCEPTION 'duplicate logical item'; END IF;\n"
  + "  IF EXISTS (SELECT 1 FROM public.menu_items WHERE restaurant_id = 73 AND (name_ru IS NOT NULL OR description_ru IS NOT NULL)) THEN RAISE EXCEPTION 'unexpected Russian catalogue copy'; END IF;\n"
  + validationAnchor;

const sql = `-- Food & Market complete official printed catalogue (Unicode source).
-- Generated by scripts/generate-food-market-catalogue.mjs; review-first and rollback-only.
BEGIN;

DO $$
DECLARE actual_3d integer;
BEGIN
+  IF NOT EXISTS (SELECT 1 FROM public.restaurants r JOIN public.brands b ON b.id = r.brand_id WHERE r.id = 73 AND r.slug = 'food-market-main' AND r.brand_id = 67 AND b.id = 67 AND b.slug = 'food-market' AND b.name = 'Food & Market') THEN
+    RAISE EXCEPTION 'Food & Market identity assertion failed';
+  END IF;
+  SELECT count(*) INTO actual_3d FROM public.menu_items WHERE restaurant_id = 73 AND is_3d IS TRUE;
+  IF actual_3d <> 3 OR EXISTS (
+    SELECT 1 FROM (VALUES
+      (1383, 'Burrata Salad', 'BURRATA SALAD'),
+      (1385, 'Chicken Balls in Shkmeruli Sauce', 'CHICKEN BALLS IN SHKMERULI SAUCE'),
+      (1421, 'Unagi Philadelphia', 'Unagi Philadelphia')
+    ) expected(id, live_name_en, official_name_en)
+    LEFT JOIN public.menu_items m ON m.restaurant_id = 73 AND m.id = expected.id
+    WHERE m.id IS NULL OR (m.name_en IS DISTINCT FROM expected.live_name_en AND m.name_en IS DISTINCT FROM expected.official_name_en)
+      OR COALESCE(m.model, '') = '' OR COALESCE(m.model_usdz, '') = '' OR m.is_3d IS NOT TRUE
+  ) THEN RAISE EXCEPTION 'Food & Market 3D preservation assertion failed'; END IF;
END $$;

CREATE TEMP TABLE _fm_preserved AS
SELECT id, model, model_usdz, thumbnail_url, ar_scale, is_3d, thumb_3d
FROM public.menu_items WHERE restaurant_id = 73 AND id IN (1383, 1385, 1421);

CREATE TEMP TABLE _fm_categories (restaurant_id bigint, name_en text, name_ka text, name_ru text, sort_order integer) ON COMMIT DROP;
INSERT INTO _fm_categories VALUES
${categoryValues};

INSERT INTO public.categories (restaurant_id, name_en, name_ka, name_ru, sort_order)
SELECT * FROM _fm_categories
ON CONFLICT (restaurant_id, name_en) DO UPDATE SET name_ka = EXCLUDED.name_ka, name_ru = NULL, sort_order = EXCLUDED.sort_order;

CREATE TEMP TABLE _fm_items (preserved_id bigint, category_en text, menu_page text, cuisine text, name_en text, name_ka text, description_en text, description_ka text, price text, thumbnail_url text, variants jsonb, sort_order integer, source_pdf text, source_page integer) ON COMMIT DROP;
INSERT INTO _fm_items VALUES
${itemValues};

-- Dummy rows are replaceable; the three asserted model rows remain in place.
DELETE FROM public.menu_items WHERE restaurant_id = 73 AND id NOT IN (1383, 1385, 1421);

UPDATE public.menu_items m SET
+  category_id = c.id, name_en = src.name_en, name_ka = COALESCE(src.name_ka, ''), name_ru = NULL,
+  description_en = COALESCE(src.description_en, ''), description_ka = COALESCE(src.description_ka, ''), description_ru = NULL,
+  price = src.price, price_old = NULL, variants = src.variants, addons = '[]'::jsonb,
+  sort_order = src.sort_order, visible = true, featured = false
FROM _fm_items src JOIN public.categories c ON c.restaurant_id = 73 AND c.name_en = src.category_en
WHERE m.restaurant_id = 73 AND m.id = src.preserved_id AND src.preserved_id IN (1383, 1385, 1421);

INSERT INTO public.menu_items (restaurant_id, category_id, name_en, name_ka, name_ru, description_en, description_ka, description_ru, price, price_old, model, model_usdz, thumbnail_url, is_3d, ar_scale, thumb_3d, text_only, featured, addons, variants, sort_order, visible)
SELECT 73, c.id, src.name_en, COALESCE(src.name_ka, ''), NULL, COALESCE(src.description_en, ''), COALESCE(src.description_ka, ''), NULL, src.price, NULL, '', '', src.thumbnail_url, false, 1, false, src.thumbnail_url = '', false, '[]'::jsonb, src.variants, src.sort_order, true
FROM _fm_items src JOIN public.categories c ON c.restaurant_id = 73 AND c.name_en = src.category_en
WHERE src.preserved_id NOT IN (1383, 1385, 1421);

-- Only categories owned by this restaurant and absent from the official manifest are retired.
DELETE FROM public.categories c WHERE c.restaurant_id = 73 AND NOT EXISTS (SELECT 1 FROM _fm_categories wanted WHERE wanted.name_en = c.name_en);

DO $$
BEGIN
+  IF (SELECT count(*) FROM public.menu_items WHERE restaurant_id = 73 AND visible) <> 228 THEN RAISE EXCEPTION 'expected 228 visible items'; END IF;
+  IF (SELECT count(*) FROM public.categories WHERE restaurant_id = 73) <> 44 THEN RAISE EXCEPTION 'expected 44 categories'; END IF;
+  IF (SELECT count(*) FROM public.menu_items WHERE restaurant_id = 73 AND is_3d) <> 3 THEN RAISE EXCEPTION 'expected exactly 3 3D items'; END IF;
+  IF EXISTS (SELECT 1 FROM _fm_preserved p LEFT JOIN public.menu_items m ON m.id = p.id AND m.restaurant_id = 73 WHERE m.id IS NULL OR m.model IS DISTINCT FROM p.model OR m.model_usdz IS DISTINCT FROM p.model_usdz OR m.thumbnail_url IS DISTINCT FROM p.thumbnail_url OR m.ar_scale IS DISTINCT FROM p.ar_scale OR m.is_3d IS DISTINCT FROM p.is_3d OR m.thumb_3d IS DISTINCT FROM p.thumb_3d) THEN RAISE EXCEPTION 'preserved 3D media changed'; END IF;
+  IF (SELECT count(*) FROM public.menu_items WHERE restaurant_id = 73 AND thumbnail_url LIKE '${publicAssetRoot}/%') <> ${reviewedMatches.length} THEN RAISE EXCEPTION 'expected ${reviewedMatches.length} mapped catalogue images'; END IF;
+  IF EXISTS (SELECT 1 FROM public.menu_items WHERE restaurant_id = 73 AND id NOT IN (1383,1385,1421) AND (is_3d OR thumb_3d OR COALESCE(model,'') <> '' OR COALESCE(model_usdz,'') <> '' OR text_only IS DISTINCT FROM (COALESCE(thumbnail_url,'') = ''))) THEN RAISE EXCEPTION 'non-preserved media flags invalid'; END IF;
+  ${validationAnchor}
+  IF EXISTS (SELECT 1 FROM public.categories WHERE restaurant_id <> 73 AND name_en LIKE ANY (ARRAY['Georgian — %','Thai — %','Japanese — %','Drinks — %'])) THEN NULL; END IF; -- read-only: never mutate another tenant
+  IF EXISTS (SELECT 1 FROM public.menu_items WHERE restaurant_id = 73 AND (COALESCE(name_en,'') LIKE '%Ã%' OR COALESCE(name_ka,'') LIKE '%Ã%' OR COALESCE(description_ka,'') LIKE '%Ã%')) THEN RAISE EXCEPTION 'possible mojibake'; END IF;
END $$;

SELECT count(*) AS items, count(*) FILTER (WHERE is_3d) AS models, count(*) FILTER (WHERE thumbnail_url LIKE '${publicAssetRoot}/%') AS mapped_images FROM public.menu_items WHERE restaurant_id = 73;
ROLLBACK;
`;

const cleanSql = sql.replace(/^\+/gm, '').replace(validationAnchor, extraValidation);
assert.ok(cleanSql.includes("RAISE EXCEPTION 'duplicate logical item'"), 'SQL validation anchor missing');
const humanPath = path.join(root, 'supabase/sql/2026-09-02_food_market_full_catalogue.sql');
fs.writeFileSync(humanPath, cleanSql);
// Convert each non-ASCII SQL string literal to PostgreSQL's U& notation. SQL's
// doubled apostrophes are decoded and then re-escaped by unicodeSql().
const safeSql = cleanSql.replace(/'(?:''|[^'])*'/g, literal => {
  if ([...literal].every(ch => ch.codePointAt(0) <= 0x7f)) return literal;
  return unicodeSql(literal.slice(1, -1).replaceAll("''", "'"));
});
assert.ok([...safeSql].every(ch => ch.codePointAt(0) <= 0x7f), 'ASCII-safe SQL contains non-ASCII');
fs.writeFileSync(path.join(root, 'supabase/sql/2026-09-02_food_market_full_catalogue_ascii_safe.sql'), safeSql);

const refreshValues = menuItems.map(item =>
  `  (${sqlString(item.name_en)}, ${sqlString(item.thumbnail_url)}, ${item.is_3d})`
).join(',\n');
const refreshSql = `-- Food & Market targeted catalogue photo refresh (Unicode source).
-- Generated by scripts/generate-food-market-catalogue.mjs; rollback-first and rollback-only.
-- Updates media flags by the existing unique database-facing name_en; it never inserts or deletes menu rows.
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.restaurants r JOIN public.brands b ON b.id = r.brand_id WHERE r.id = 73 AND r.slug = 'food-market-main' AND r.name = 'Food & Market' AND r.brand_id = 67 AND b.id = 67 AND b.slug = 'food-market' AND b.name = 'Food & Market') THEN
    RAISE EXCEPTION 'Food & Market identity assertion failed';
  END IF;
  IF (SELECT count(*) FROM public.menu_items WHERE restaurant_id = 73 AND visible IS TRUE) <> 228 THEN
    RAISE EXCEPTION 'expected exactly 228 current visible Food & Market items';
  END IF;
  IF EXISTS (SELECT 1 FROM public.menu_items WHERE restaurant_id = 73 AND visible IS TRUE GROUP BY name_en HAVING count(*) <> 1) THEN
    RAISE EXCEPTION 'database-facing name_en must be unique';
  END IF;
  IF (SELECT count(*) FROM public.menu_items WHERE restaurant_id = 73 AND is_3d IS TRUE) <> 3 OR EXISTS (
    SELECT 1 FROM (VALUES (1383), (1385), (1421)) protected(id)
    LEFT JOIN public.menu_items m ON m.restaurant_id = 73 AND m.id = protected.id
    WHERE m.id IS NULL OR m.visible IS NOT TRUE OR m.is_3d IS NOT TRUE OR COALESCE(m.model, '') = '' OR COALESCE(m.model_usdz, '') = ''
  ) THEN RAISE EXCEPTION 'Food & Market protected 3D rows mismatch'; END IF;
END $$;

CREATE TEMP TABLE _fm_photo_refresh (name_en text PRIMARY KEY, thumbnail_url text NOT NULL, protected_3d boolean NOT NULL) ON COMMIT DROP;
INSERT INTO _fm_photo_refresh VALUES
${refreshValues};

DO $$
BEGIN
  IF (SELECT count(*) FROM _fm_photo_refresh) <> 228 THEN RAISE EXCEPTION 'expected 228 refresh mappings'; END IF;
  IF (SELECT count(*) FROM _fm_photo_refresh WHERE thumbnail_url LIKE '${publicAssetRoot}/%' AND protected_3d IS FALSE) <> 116 THEN RAISE EXCEPTION 'expected 116 catalogue photo mappings'; END IF;
  IF (SELECT count(*) FROM _fm_photo_refresh WHERE protected_3d) <> 3 THEN RAISE EXCEPTION 'expected 3 protected mappings'; END IF;
  IF EXISTS (
    (SELECT name_en FROM _fm_photo_refresh EXCEPT SELECT name_en FROM public.menu_items WHERE restaurant_id = 73 AND visible IS TRUE)
    UNION ALL
    (SELECT name_en FROM public.menu_items WHERE restaurant_id = 73 AND visible IS TRUE EXCEPT SELECT name_en FROM _fm_photo_refresh)
  ) THEN RAISE EXCEPTION 'live item names differ from generated 228-item catalogue'; END IF;
END $$;

CREATE TEMP TABLE _fm_protected_media AS
SELECT id, thumbnail_url, model, model_usdz, is_3d, ar_scale, thumb_3d
FROM public.menu_items WHERE restaurant_id = 73 AND id IN (1383, 1385, 1421);

UPDATE public.menu_items m
SET thumbnail_url = src.thumbnail_url,
    text_only = (src.thumbnail_url = '')
FROM _fm_photo_refresh src
WHERE m.restaurant_id = 73 AND m.visible IS TRUE AND m.name_en = src.name_en AND src.protected_3d IS FALSE;

DO $$
BEGIN
  IF (SELECT count(*) FROM public.menu_items WHERE restaurant_id = 73 AND visible IS TRUE AND thumbnail_url LIKE '${publicAssetRoot}/%') <> 116 THEN RAISE EXCEPTION 'expected 116 catalogue URLs'; END IF;
  IF EXISTS (SELECT 1 FROM public.menu_items m JOIN _fm_photo_refresh src ON src.name_en = m.name_en WHERE m.restaurant_id = 73 AND m.visible IS TRUE AND src.protected_3d IS FALSE AND (m.thumbnail_url IS DISTINCT FROM src.thumbnail_url OR m.text_only IS DISTINCT FROM (src.thumbnail_url = ''))) THEN RAISE EXCEPTION 'photo refresh mismatch'; END IF;
  IF EXISTS (SELECT 1 FROM _fm_protected_media p LEFT JOIN public.menu_items m ON m.restaurant_id = 73 AND m.id = p.id WHERE m.id IS NULL OR m.thumbnail_url IS DISTINCT FROM p.thumbnail_url OR m.model IS DISTINCT FROM p.model OR m.model_usdz IS DISTINCT FROM p.model_usdz OR m.is_3d IS DISTINCT FROM p.is_3d OR m.ar_scale IS DISTINCT FROM p.ar_scale OR m.thumb_3d IS DISTINCT FROM p.thumb_3d) THEN RAISE EXCEPTION 'protected 3D media changed'; END IF;
  IF (SELECT count(*) FROM public.menu_items WHERE restaurant_id = 73 AND visible IS TRUE AND is_3d IS TRUE) <> 3 THEN RAISE EXCEPTION 'expected exactly 3 models'; END IF;
  IF EXISTS (SELECT 1 FROM public.menu_items WHERE restaurant_id = 73 AND visible IS TRUE GROUP BY name_en HAVING count(*) > 1) THEN RAISE EXCEPTION 'duplicate database-facing name_en'; END IF;
  IF EXISTS (SELECT 1 FROM public.menu_items m LEFT JOIN public.categories c ON c.id = m.category_id AND c.restaurant_id = m.restaurant_id WHERE m.restaurant_id = 73 AND m.visible IS TRUE AND c.id IS NULL) THEN RAISE EXCEPTION 'orphan/cross-tenant category'; END IF;
END $$;

SELECT count(*) AS items, count(*) FILTER (WHERE is_3d) AS models, count(*) FILTER (WHERE thumbnail_url LIKE '${publicAssetRoot}/%') AS catalogue_urls FROM public.menu_items WHERE restaurant_id = 73 AND visible IS TRUE;
ROLLBACK;
`;
const refreshPath = path.join(root, 'supabase/sql/2026-09-03_food_market_catalogue_photo_refresh.sql');
fs.writeFileSync(refreshPath, refreshSql);
const safeRefreshSql = refreshSql.replace(/'(?:''|[^'])*'/g, literal => {
  if ([...literal].every(ch => ch.codePointAt(0) <= 0x7f)) return literal;
  return unicodeSql(literal.slice(1, -1).replaceAll("''", "'"));
});
assert.ok([...safeRefreshSql].every(ch => ch.codePointAt(0) <= 0x7f), 'ASCII-safe refresh SQL contains non-ASCII');
fs.writeFileSync(path.join(root, 'supabase/sql/2026-09-03_food_market_catalogue_photo_refresh_ascii_safe.sql'), safeRefreshSql);

console.log(`Generated ${menuItems.length} items, ${categoryOrder.length} categories, ${bySource.size} catalogue images, ${menuItems.filter(x => x.is_3d).length} preserved 3D rows.`);
