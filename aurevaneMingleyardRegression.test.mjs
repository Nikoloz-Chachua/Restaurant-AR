import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const sql = readFileSync(new URL('./supabase/sql/2026-08-03_aurevane_mingleyard_showcase_finish.sql', import.meta.url), 'utf8');
const asciiSql = readFileSync(new URL('./supabase/sql/2026-08-03_aurevane_mingleyard_showcase_finish_ascii_safe.sql', import.meta.url));
const sw = readFileSync(new URL('./sw.js', import.meta.url), 'utf8');

const directions = 'https://www.google.com/maps/dir/?api=1&destination=41.723254266557774,44.730718867747115';
const coordinate = '41.723254266557774,44.730718867747115';
const dishes = [
  ['Seared Salmon', '32 ₾', 'salmon.webp'],
  ['Ember Steak', '38 ₾', 'steak.webp'],
  ['Pumpkin Risotto', '24 ₾', 'risotto.webp'],
  ['Cocoa Garden', '18 ₾', 'dessert.webp'],
];

test('showcase templates opt into shared hero gallery and localized brand heading', () => {
  assert.match(html, /<h1 class="mg-hero-brand" data-brand><\/h1>/);
  assert.match(html, /HERO_GALLERY_TEMPLATES[^;]+luxury_dining[^;]+social_dining/);
  assert.match(html, /\[data-template="luxury_dining"\] \.mg-hero,/);
  assert.match(html, /\[data-template="social_dining"\] \.mg-hero \{/);
  assert.match(html, /\[data-template="luxury_dining"\] \.mg-hero-logo,[\s\S]*?display: none/);
  assert.match(html, /\[data-template="luxury_dining"\] \.mg-hero \{\s*min-height: clamp\(360px, 82vw, 430px\);/);
  assert.match(html, /@media \(min-width: 640px\) \{\s*\[data-template="luxury_dining"\] \.mg-hero \{\s*min-height: clamp\(500px, 44vw, 590px\);/);
});

test('only the intended templates are added to generic venue rendering', () => {
  const set = html.match(/const VENUE_INFO_TEMPLATES = new Set\(\[([^\]]+)\]\)/)?.[1] ?? '';
  assert.match(set, /'luxury_dining'/);
  assert.match(set, /'social_dining'/);
  assert.match(set, /'burger_bar'/);
  assert.match(set, /'gochit_monster'/);
  assert.match(html, /src = 'https:\/\/www\.google\.com\/maps\?q=' \+ encodeURIComponent\(query\) \+ '&output=embed'/);
  assert.match(html, /\[data-template="luxury_dining"\] \.venue-map iframe/);
  assert.match(html, /\[data-template="social_dining"\] \.site-footer/);
});

test('guarded SQL has exact tenant identities, location and four photo-only dishes', () => {
  for (const value of [
    "r.id = 67 AND r.slug = 'luxury' AND r.brand_id = 61",
    "b.slug = 'luxury-dining-template' AND t.value = 'luxury_dining'",
    "r.id = 70 AND r.slug = 'social-dining' AND r.brand_id = 64",
    "b.slug = 'social-dining-template' AND t.value = 'social_dining'",
    coordinate,
    directions,
    '78A Vazha-Pshavela Avenue, Tbilisi 0186',
    'ვაჟა-ფშაველას გამზირი 78ა, თბილისი 0186',
    "'Chef''s Selection'",
  ]) assert.ok(sql.includes(value), `missing ${value}`);

  for (const [name, price, image] of dishes) {
    assert.ok(sql.includes(`'${name}'`));
    assert.ok(sql.includes(`'${price}'`));
    assert.ok(sql.includes(`https://restaurant-ar.pages.dev/assets/showcase/aurevane/dishes/${image}`));
  }
  assert.match(sql, /SELECT 67,[\s\S]+d\.price, '', '', d\.thumbnail_url, false, 1, false, false, false/);
  assert.match(sql, /expected 6 total \/ 2 3D \/ 4 photo-only/);
  assert.match(sql, /expected 6 total \/ 3 3D \/ 3 photo-only/);
  assert.equal(sql.trimEnd().endsWith('ROLLBACK;'), true);
});

test('direct-editor SQL is ASCII-only, rollback-first and uses PostgreSQL Unicode escapes', () => {
  assert.equal([...asciiSql].every(byte => byte < 128), true);
  const text = asciiSql.toString('ascii');
  assert.match(text, /U&'\\[0-9A-F]{4}/);
  assert.match(text, /^--[\s\S]*?BEGIN;/);
  assert.equal(text.trimEnd().endsWith('ROLLBACK;'), true);
  assert.doesNotMatch(text, /theme_config\.updated_at/);
});

test('service worker cache advances for AUREVANE hero sizing', () => {
  assert.match(sw, /const CACHE_NAME = 'bl-v152';/);
  assert.equal((sw.match(/bl-v152/g) || []).length, 1);
});
