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
const provenance = JSON.parse(read('assets/food-market/catalogue/provenance.json'));
const items = fixture.menu_items;

test('official manifests and fixture retain exact catalogue totals', () => {
  const counts = Object.groupBy(items, item => item._source.menu_page);
  assert.deepEqual(Object.fromEntries(Object.entries(counts).map(([key, rows]) => [key, rows.length])), {
    georgian: 42, asian: 56, drinks: 130,
  });
  assert.equal(items.length, 228);
  assert.equal(provenance.images.length, 42);
  assert.equal(items.filter(item => item.thumbnail_url.includes('/assets/food-market/catalogue/')).length, 42);
  assert.equal(items.filter(item => item.is_3d).length, 3);
  assert.equal(items.filter(item => item.text_only).length, 183);
  assert.ok(items.every(item => item.text_only === !item.thumbnail_url));
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
  assert.match(sql, /expected 42 mapped catalogue images/);
  assert.ok(sql.trimEnd().endsWith('ROLLBACK;'));
});

test('ASCII-safe SQL contains valid-looking PostgreSQL Unicode escapes', () => {
  assert.ok([...safeSql].every(ch => ch.codePointAt(0) < 128));
  assert.ok(!safeSql.includes('₾'));
  assert.match(safeSql, /U&'[^']*\\10D/);
  assert.ok(safeSql.trimEnd().endsWith('ROLLBACK;'));
  assert.equal((safeSql.match(/INSERT INTO _fm_items VALUES/g) || []).length, 1);
});
