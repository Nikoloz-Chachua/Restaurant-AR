#!/usr/bin/env node

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = process.env.FOOD_MARKET_SOURCE_DIR || '/home/gagi/food-market-working';
const assetDir = path.join(root, 'assets/food-market/catalogue');
const publicAssetRoot = 'https://restaurant-ar.pages.dev/assets/food-market/catalogue';
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

const raw = pages.flatMap(page => {
  const rows = JSON.parse(fs.readFileSync(path.join(sourceRoot, page.file), 'utf8'));
  assert.equal(rows.length, page.expected, `${page.key} item count`);
  return rows;
});
assert.equal(raw.length, 228);

fs.mkdirSync(assetDir, { recursive: true });
const bySource = new Map();
for (const item of raw.filter(item => item.image_source_path)) {
  const source = path.resolve(item.image_source_path);
  assert.ok(fs.existsSync(source), `missing image: ${source}`);
  if (!bySource.has(source)) {
    const digest = crypto.createHash('sha256').update(source).digest('hex').slice(0, 8);
    const filename = `${item.menu_page}-${slug(item.category_en)}-${slug(item.name_en)}-${digest}.webp`;
    bySource.set(source, { filename, source, uses: [] });
  }
  bySource.get(source).uses.push({ source_pdf: item.source_pdf, source_page: item.source_page, item: item.name_en });
}
assert.equal(bySource.size, 42, 'unique matched photos');

const skipImageBuild = process.env.FOOD_MARKET_SKIP_IMAGE_BUILD === '1';
for (const entry of bySource.values()) {
  const output = path.join(assetDir, entry.filename);
  if (skipImageBuild) {
    assert.ok(fs.existsSync(output) && fs.statSync(output).size > 0, `missing generated image: ${output}`);
    continue;
  }
  let result;
  if (/\.heic$/i.test(entry.source)) {
    const modules = process.env.FOOD_MARKET_IMAGE_NODE_MODULES;
    assert.ok(modules, 'HEIC sources require FOOD_MARKET_IMAGE_NODE_MODULES pointing to a directory containing heic-decode and sharp');
    const helper = `const fs=require('fs');const decode=require(process.argv[1]+'/heic-decode');const sharp=require(process.argv[1]+'/sharp');(async()=>{const x=await decode({buffer:fs.readFileSync(process.argv[2])});await sharp(x.data,{raw:{width:x.width,height:x.height,channels:4}}).resize({width:1200,height:1200,fit:'inside',withoutEnlargement:true}).webp({quality:88,effort:6}).toFile(process.argv[3])})().catch(e=>{console.error(e);process.exit(1)})`;
    result = spawnSync(process.execPath, ['-e', helper, modules, entry.source, output], { encoding: 'utf8' });
  } else {
    result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', entry.source,
      '-vf', "scale='min(1200,iw)':'min(1200,ih)':force_original_aspect_ratio=decrease",
      '-c:v', 'libwebp', '-quality', '88', '-compression_level', '6', '-map_metadata', '-1', output], { encoding: 'utf8' });
  }
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
    name_en: item.name_en,
    name_ka: item.name_ka,
    name_ru: null,
    description_en: item.description_en,
    description_ka: item.description_ka,
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
assert.equal(menuItems.filter(x => x._catalogue_image).length, 42);
assert.equal(menuItems.filter(x => x.is_3d).length, 3);
assert.equal(menuItems.filter(x => x.thumbnail_url).length, 45);
assert.equal(menuItems.filter(x => x.text_only).length, 183);

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
  uses: entry.uses,
}));
fs.writeFileSync(path.join(assetDir, 'provenance.json'), `${JSON.stringify({ generated_from: pages.map(p => path.join(sourceRoot, p.file)), images: provenance }, null, 2)}\n`);

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
+  category_id = c.id, name_en = src.name_en, name_ka = src.name_ka, name_ru = NULL,
+  description_en = src.description_en, description_ka = src.description_ka, description_ru = NULL,
+  price = src.price, price_old = NULL, variants = src.variants, addons = '[]'::jsonb,
+  sort_order = src.sort_order, visible = true, featured = false
FROM _fm_items src JOIN public.categories c ON c.restaurant_id = 73 AND c.name_en = src.category_en
WHERE m.restaurant_id = 73 AND m.id = src.preserved_id AND src.preserved_id IN (1383, 1385, 1421);

INSERT INTO public.menu_items (restaurant_id, category_id, name_en, name_ka, name_ru, description_en, description_ka, description_ru, price, price_old, model, model_usdz, thumbnail_url, is_3d, ar_scale, thumb_3d, text_only, featured, addons, variants, sort_order, visible)
SELECT 73, c.id, src.name_en, src.name_ka, NULL, src.description_en, src.description_ka, NULL, src.price, NULL, '', '', src.thumbnail_url, false, 1, false, src.thumbnail_url = '', false, '[]'::jsonb, src.variants, src.sort_order, true
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
+  IF (SELECT count(*) FROM public.menu_items WHERE restaurant_id = 73 AND thumbnail_url LIKE '${publicAssetRoot}/%') <> 42 THEN RAISE EXCEPTION 'expected 42 mapped catalogue images'; END IF;
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

console.log(`Generated ${menuItems.length} items, ${categoryOrder.length} categories, ${bySource.size} catalogue images, ${menuItems.filter(x => x.is_3d).length} preserved 3D rows.`);
