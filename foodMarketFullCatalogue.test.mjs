import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const fixture = JSON.parse(read('foods/food-market-full-catalogue.json'));
const html = read('index.html');
const sw = read('sw.js');
const sql = read('supabase/sql/2026-09-02_food_market_full_catalogue.sql');
const safeSql = read('supabase/sql/2026-09-02_food_market_full_catalogue_ascii_safe.sql');
const refreshSql = read('supabase/sql/2026-09-03_food_market_catalogue_photo_refresh.sql');
const safeRefreshSql = read('supabase/sql/2026-09-03_food_market_catalogue_photo_refresh_ascii_safe.sql');
const provenance = JSON.parse(read('assets/food-market/catalogue/provenance.json'));
const sourceAudit = JSON.parse(read('assets/food-market/catalogue/source-audit.json'));
const items = fixture.menu_items;

test('official manifests and fixture retain exact catalogue totals', () => {
  const counts = Object.groupBy(items, item => item._source.menu_page);
  assert.deepEqual(Object.fromEntries(Object.entries(counts).map(([key, rows]) => [key, rows.length])), {
    georgian: 42, asian: 56, drinks: 130,
  });
  assert.equal(items.length, 228);
  assert.equal(provenance.images.length, 116);
  assert.equal(items.filter(item => item.thumbnail_url.includes('/assets/food-market/catalogue/')).length, 116);
  assert.equal(items.filter(item => item.is_3d).length, 3);
  assert.equal(items.filter(item => item.thumbnail_url).length, 119);
  assert.equal(items.filter(item => item.text_only).length, 109);
  assert.ok(items.every(item => item.text_only === !item.thumbnail_url));
  assert.deepEqual(sourceAudit.counts, { matched: 116, current_item_preserved_3d_media: 1, ambiguous: 6, unmatched_or_obsolete: 56 });
  assert.equal(sourceAudit.total, 179);
  assert.deepEqual(sourceAudit.files.find(file => file.source === 'INTERNATIONAL/CROQUETTES/Copy of chicken balls.JPG'), {
    source: 'INTERNATIONAL/CROQUETTES/Copy of chicken balls.JPG',
    status: 'current_item_preserved_3d_media',
    item: 'georgian:Croquettes:CHICKEN BALLS IN SHKMERULI SAUCE',
    reason: 'exact match for CHICKEN BALLS IN SHKMERULI SAUCE; preserved 3D row 1385 retains its established thumbnail',
  });
});

test('the exact live 3D rows and model URLs are represented once', () => {
  const expected = [
    [1383, 'BURRATA SALAD', '1787818013846_burrata_salad_opt.glb', '1787818016905_burrata_salad.usdz'],
    [1385, 'CHICKEN BALLS IN SHKMERULI SAUCE', '1787818041592_chicken_balls_shkmeruli_opt.glb', '1787818044807_chicken_balls_shkmeruli.usdz'],
    [1421, 'Unagi Philadelphia', '1787820485854_salmon_sushi_roll_draco.glb', '1787820543487_salmon_sushi_roll.usdz'],
  ];
  for (const [id, name, glb, usdz] of expected) {
    const matches = items.filter(item => item.id === id && item.name_en === name);
    assert.equal(matches.length, 1);
    assert.ok(matches[0].model.endsWith(glb));
    assert.ok(matches[0].model_usdz.endsWith(usdz));
  }
});

test('page grouping is prefix-based and visible labels are stripped only for Food & Market', () => {
  assert.equal(fixture.categories.length, 44);
  const prefixCounts = Object.fromEntries(Object.entries(
    Object.groupBy(fixture.categories, category => category.name_en.split(' — ')[0]),
  ).map(([prefix, rows]) => [prefix, rows.length]));
  assert.deepEqual(prefixCounts, { Georgian: 9, Thai: 7, Japanese: 7, Drinks: 21 });
  assert.match(html, /function _foodMarketVisibleCategory\(name\)/);
  assert.match(html, /if \(!_isFoodMarketTenant\(\)\) return _cleanText\(name\)/);
  assert.match(html, /\['georgian', 'asian', 'drinks'\]/);
  assert.match(html, /history\.replaceState\(history\.state, '', url\)/);
});

test('fixture is triple-gated, bypasses analytics, and is never precached', () => {
  assert.match(html, /function _foodMarketFixtureRequested\(\)[\s\S]*?_isLocalhost\(\)[\s\S]*?_tenantSlugFromHost\(\) === 'food-market-main'[\s\S]*?get\('fm_catalogue'\) === '1'/);
  assert.match(html, /_analyticsEnabled = [^;]*!_foodMarketFixtureRequested\(\)/);
  assert.match(html, /fetch\('\.\/foods\/food-market-full-catalogue\.json', \{ cache: 'no-store' \}\)/);
  assert.ok(!sw.includes('food-market-full-catalogue.json'));
});

test('variants use renderer schema and logical items are unique within a page/category', () => {
  for (const item of items) {
    for (const variant of item.variants) assert.deepEqual(Object.keys(variant), ['en', 'ka', 'price']);
  }
  const keys = items.map(item => [item._source.menu_page, item.categories.name_en, item.name_en].join('|').toLowerCase());
  assert.equal(new Set(keys).size, keys.length);
  assert.equal(new Set(items.map(item => item.name_en.toLowerCase())).size, items.length);
  assert.ok(items.every(item => item.name_ka !== null && item.description_en !== null && item.description_ka !== null));
});

test('reviewed mappings are byte-unique and generated assets have no orphans', () => {
  const hashes = provenance.images.map(image => image.source_sha256);
  assert.ok(hashes.every(hash => /^[a-f0-9]{64}$/.test(hash)), 'provenance must store complete source SHA-256 digests');
  assert.equal(new Set(hashes).size, hashes.length);
  const expected = new Set(provenance.images.map(image => path.basename(image.output_path)));
  const actual = fs.readdirSync(path.join(root, 'assets/food-market/catalogue')).filter(name => name.endsWith('.webp'));
  assert.deepEqual(new Set(actual), expected);
});

function webpDimensions(file) {
  const data = fs.readFileSync(file);
  assert.equal(data.toString('ascii', 0, 4), 'RIFF', `${file} is not RIFF`);
  assert.equal(data.toString('ascii', 8, 12), 'WEBP', `${file} is not WebP`);
  for (let offset = 12; offset + 8 <= data.length;) {
    const type = data.toString('ascii', offset, offset + 4);
    const size = data.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (type === 'VP8X') return [1 + data.readUIntLE(start + 4, 3), 1 + data.readUIntLE(start + 7, 3)];
    if (type === 'VP8 ') {
      assert.deepEqual([...data.subarray(start + 3, start + 6)], [0x9d, 0x01, 0x2a], `${file} has an invalid VP8 frame`);
      return [data.readUInt16LE(start + 6) & 0x3fff, data.readUInt16LE(start + 8) & 0x3fff];
    }
    if (type === 'VP8L') {
      assert.equal(data[start], 0x2f, `${file} has an invalid VP8L frame`);
      const bits = data.readUInt32LE(start + 1);
      return [(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1];
    }
    offset = start + size + (size % 2);
  }
  assert.fail(`${file} has no WebP image chunk`);
}

test('drink bottle outputs are normalized to a 1200x1200 neutral canvas', () => {
  const drinkAssets = provenance.images.filter(image => image.uses.every(use => use.source_pdf.includes('DRINKS')));
  assert.ok(drinkAssets.length > 30);
  for (const image of drinkAssets) {
    assert.deepEqual(webpDimensions(path.join(root, image.output_path)), [1200, 1200], image.output_path);
  }
  assert.equal(provenance.transform_version, 'fm-catalogue-v2-food-cover-drinks-contain-1200');
});

test('targeted photo refresh is exact-set guarded, update-only, model-preserving, and rollback-only', () => {
  for (const value of ["r.id = 73", "r.slug = 'food-market-main'", "r.name = 'Food & Market'", 'r.brand_id = 67', "b.slug = 'food-market'", "b.name = 'Food & Market'"]) assert.ok(refreshSql.includes(value));
  assert.match(refreshSql, /expected exactly 228 current visible Food & Market items/);
  assert.match(refreshSql, /live item names differ from generated 228-item catalogue/);
  assert.match(refreshSql, /CREATE TEMP TABLE _fm_photo_refresh \(name_en text PRIMARY KEY/);
  assert.match(refreshSql, /UPDATE public\.menu_items m[\s\S]*?m\.restaurant_id = 73[\s\S]*?m\.name_en = src\.name_en[\s\S]*?src\.protected_3d IS FALSE/);
  assert.ok(!/\b(?:INSERT INTO|DELETE FROM) public\.menu_items\b/.test(refreshSql));
  assert.ok(!/\bUPDATE public\.categories\b|\bDELETE FROM public\.categories\b|\bINSERT INTO public\.categories\b/.test(refreshSql));
  assert.match(refreshSql, /expected 116 catalogue URLs/);
  assert.match(refreshSql, /expected exactly 3 models/);
  assert.match(refreshSql, /duplicate database-facing name_en/);
  assert.match(refreshSql, /orphan\/cross-tenant category/);
  for (const id of [1383, 1385, 1421]) assert.ok(refreshSql.includes(String(id)));
  assert.ok(refreshSql.trimEnd().endsWith('ROLLBACK;'));
  assert.ok([...safeRefreshSql].every(ch => ch.codePointAt(0) < 128));
  assert.ok(safeRefreshSql.trimEnd().endsWith('ROLLBACK;'));
});

test('Food & Market drink contain styling is exact-tenant scoped and leaves the lightbox alone', () => {
  assert.match(html, /html\[data-tenant="food-market-main"\]\[data-brand-slug="food-market"\] \.menu-item\.food-market-drink \.thumb-img\s*\{\s*object-fit: contain;/);
  assert.match(html, /_isFoodMarketTenant\(\)[\s\S]*?_groupOf\(item\.category \|\| item\.categories\?\.name_en\) === 'drinks'[\s\S]*?food-market-drink/);
  assert.match(html, /#lightbox-img[\s\S]*?object-fit: contain;/);
});

test('SQL is guarded, scoped, model-preserving, count-checked, and rollback-only', () => {
  assert.match(sql, /^--[\s\S]*?BEGIN;/);
  for (const value of ["r.id = 73", "r.slug = 'food-market-main'", 'r.brand_id = 67', "b.slug = 'food-market'", "b.name = 'Food & Market'"]) assert.ok(sql.includes(value));
  for (const id of [1383, 1385, 1421]) assert.ok(sql.includes(String(id)));
  assert.match(sql, /COALESCE\(m\.model, ''\) = '' OR COALESCE\(m\.model_usdz, ''\) = ''/);
  assert.match(sql, /CREATE TEMP TABLE _fm_preserved/);
  assert.match(sql, /expected\(id, live_name_en, official_name_en\)/);
  assert.match(sql, /m\.name_en IS DISTINCT FROM expected\.live_name_en AND m\.name_en IS DISTINCT FROM expected\.official_name_en/);
  assert.match(sql, /m\.model IS DISTINCT FROM p\.model/);
  assert.match(sql, /LEFT JOIN public\.menu_items m ON m\.id = p\.id AND m\.restaurant_id = 73 WHERE m\.id IS NULL/);
  assert.match(sql, /DELETE FROM public\.menu_items WHERE restaurant_id = 73/);
  assert.match(sql, /DELETE FROM public\.categories c WHERE c\.restaurant_id = 73/);
  assert.match(sql, /expected 228 visible items/);
  assert.match(sql, /expected 44 categories/);
  assert.match(sql, /expected 116 mapped catalogue images/);
  assert.match(sql, /name_ka = COALESCE\(src\.name_ka, ''\)/);
  assert.match(sql, /description_en = COALESCE\(src\.description_en, ''\)/);
  assert.ok(sql.trimEnd().endsWith('ROLLBACK;'));
});

test('ASCII-safe SQL contains valid-looking PostgreSQL Unicode escapes', () => {
  assert.ok([...safeSql].every(ch => ch.codePointAt(0) < 128));
  assert.ok(!safeSql.includes('₾'));
  assert.match(safeSql, /U&'[^']*\\10D/);
  assert.ok(safeSql.trimEnd().endsWith('ROLLBACK;'));
  assert.equal((safeSql.match(/INSERT INTO _fm_items VALUES/g) || []).length, 1);
});
