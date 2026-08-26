import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const human = fs.readFileSync(path.join(root, 'supabase/sql/2026-08-26_food_market_sample_menu.sql'), 'utf8');
const safe = fs.readFileSync(path.join(root, 'supabase/sql/2026-08-26_food_market_sample_menu_ascii_safe.sql'), 'utf8');
const refresh = fs.readFileSync(path.join(root, 'supabase/sql/2026-08-26_food_market_official_wolt_refresh.sql'), 'utf8');
const refreshSafe = fs.readFileSync(path.join(root, 'supabase/sql/2026-08-26_food_market_official_wolt_refresh_ascii_safe.sql'), 'utf8');
const manifest = fs.readFileSync(path.join(root, 'assets/food-market/ASSET-MANIFEST.md'), 'utf8');
const assetDir = path.join(root, 'assets/food-market/items');
const assets = fs.readdirSync(assetDir).filter((name) => name.endsWith('.webp'));

test('Food & Market import is exact-tenant guarded and remains rollback-first', () => {
  assert.match(human, /r\.id = 73/);
  assert.match(human, /r\.slug = 'food-market-main'/);
  assert.match(human, /r\.brand_id = 67/);
  assert.match(human, /b\.slug = 'food-market'/);
  assert.match(human, /DELETE FROM public\.menu_items WHERE restaurant_id = 73/);
  assert.match(human, /expected 12 items/);
  assert.match(human, /models must remain disabled until real GLB\/USDZ files are uploaded/);
  assert.equal(human.trimEnd().endsWith('ROLLBACK;'), true);
});

test('Food & Market sample includes 12 non-empty tenant thumbnails', () => {
  assert.equal(assets.length, 12);
  for (const name of assets) {
    assert.ok(fs.statSync(path.join(assetDir, name)).size > 0, `${name} must be non-empty`);
    assert.match(human, new RegExp(`/assets/food-market/items/${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  }
});

test('Food & Market SQL Editor artifact is ASCII-only and decodes localized literals safely', () => {
  assert.equal(Buffer.from(safe, 'ascii').toString('ascii'), safe);
  assert.match(safe, /U&'\\10D1\\10E3\\10E0\\10D0\\10E2\\10D0\\10E1/);
  assert.doesNotMatch(safe, /áƒ|Ã|�|â‚¾/);
  assert.equal(safe.trimEnd().endsWith('ROLLBACK;'), true);
});

test('Food & Market public menu offers Georgian and English only', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /'food-market-main': \['ka', 'en'\]/);
  assert.match(html, /_DEFAULT_LANGUAGE_BY_TENANT_SLUG = \{[^}]*'food-market-main': 'ka'/s);
});

test('Food & Market official-photo refresh is provenance-backed and target guarded', () => {
  assert.equal((manifest.match(/https:\/\/imageproxy\.wolt\.com\//g) || []).length, 11);
  assert.match(manifest, /Official source: https:\/\/wolt\.com\/ka\/geo\/tbilisi\/restaurant\/food-and-market/);
  assert.match(refresh, /r\.id = 73/);
  assert.match(refresh, /r\.slug = 'food-market-main'/);
  assert.match(refresh, /expected exactly 6 matched items/);
  assert.equal(refresh.trimEnd().endsWith('ROLLBACK;'), true);
  assert.equal(refreshSafe, Buffer.from(refreshSafe, 'ascii').toString('ascii'));
  assert.equal(refreshSafe.trimEnd().endsWith('ROLLBACK;'), true);
});
