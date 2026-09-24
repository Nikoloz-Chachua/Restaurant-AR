import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql = fs.readFileSync('supabase/sql/2026-09-25_kado_digital_menu.sql', 'utf8');
const safe = fs.readFileSync('supabase/sql/2026-09-25_kado_digital_menu_ascii_safe.sql', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

test('KADO import is pinned to restaurant 81 / brand 75 and rollback-first', () => {
  for (const s of [sql, safe]) {
    assert.match(s, /r\.id = 81 AND r\.slug = 'kado-main' AND r\.brand_id = 75 AND b\.slug = 'kado'/);
    assert.equal(s.trim().split('\n').at(-1), 'ROLLBACK;');
    assert.doesNotMatch(s, /\bCOMMIT;/);
    for (const m of s.matchAll(/restaurant_id = (\d+)/g)) assert.equal(m[1], '81');
  }
  assert.ok([...safe].every(c => c.charCodeAt(0) < 128), 'SQL Editor copy must be ASCII-only');
});

test('KADO items are photo-only and every thumbnail ships with the site', () => {
  assert.match(sql, /false, 1, false, false, false, d\.sort_order, true/);
  const thumbs = [...sql.matchAll(/restaurant-ar\.pages\.dev\/(assets\/kado\/[^']+)'/g)].map(m => m[1]).filter(t => !t.includes('%'));
  assert.ok(thumbs.length >= 130);
  for (const t of thumbs) assert.ok(fs.existsSync(t), t + ' missing');
});

test('KADO renderer hooks are scoped to the kado-main slug', () => {
  assert.match(html, /'kado-main': 'elegant_black'/);
  assert.match(html, /'kado-main': \['ka', 'en'\]/);
  assert.match(html, /VENUE_INFO_TENANTS = new Set\(\['burger-planet-main', 'kado-main'\]\)/);
});
