import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const sql = readFileSync(new URL('./supabase/sql/2026-08-03_aurevane_mingleyard_showcase_finish.sql', import.meta.url), 'utf8');
const asciiSql = readFileSync(new URL('./supabase/sql/2026-08-03_aurevane_mingleyard_showcase_finish_ascii_safe.sql', import.meta.url));
const sw = readFileSync(new URL('./sw.js', import.meta.url), 'utf8');
const mingleCss = readFileSync(new URL('./assets/showcase/mingleyard/editorial.css', import.meta.url), 'utf8');

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

test('MINGLEYARD editorial is exact-tenant gated and keeps sibling templates out', () => {
  assert.match(html, /data-editorial="mingleyard"/);
  assert.match(html, /data-mingleyard="headlineLead"/);
  assert.match(html, /function _isMingleyardTenant\(\)/);
  assert.match(html, /dataset\.tenant === 'social-dining'[\s\S]*dataset\.template === 'social_dining'/);
  assert.match(mingleCss, /html\[data-tenant="social-dining"\]\[data-template="social_dining"\]/);
  assert.match(mingleCss, /--bg:#ebe3d4/);
  assert.match(mingleCss, /--accent:#f05a28/);
  assert.match(mingleCss, /\.my-sticker-one/);
  assert.match(mingleCss, /\.bb-featured:not\(:empty\)/);
  assert.doesNotMatch(mingleCss, /data-template="(?:luxury_dining|modern_cafe|premium_fast_casual|monday_greens)"/);
});

test('MINGLEYARD editorial copy localizes and its fallback hero remains accessible', () => {
  assert.match(html, /const _MINGLEYARD_COPY = \{/);
  assert.match(html, /headlineLead: 'One yard\.'/);
  assert.match(html, /headlineLead: 'ერთი ეზო\.'/);
  assert.match(html, /cta: 'იხილეთ ეზოს მენიუ →'/);
  assert.match(html, /function _ensureMingleyardTemplateForExactTenant\(\)/);
  assert.match(html, /dataset\.tenant === 'social-dining' && !root\.dataset\.template/);
  assert.match(html, /root\.dataset\.template = 'social_dining'/);
  assert.match(html, /dataset\.tenant = _tenant\.restaurant_slug \|\| '';[\s\S]*?_ensureMingleyardTemplateForExactTenant\(\)/);
  assert.match(html, /document\.documentElement\.dataset\.template = templateKey;[\s\S]*?_applyMingleyardCopy\(\)/);
  assert.match(html, /_applyMingleyardCopy\(\);[\s\S]*document\.getElementById\('lang-toggle'\)/);
  assert.match(html, /_applyMingleyardCopy\(\);[\s\S]*try \{[\s\S]*const tenant = await _resolveTenant\(\)/);
  assert.match(html, /document\.querySelector\('\.mg-hero'\)\?\.removeAttribute\('aria-hidden'\)/);
  assert.doesNotMatch(html.match(/const _MINGLEYARD_COPY = \{[\s\S]*?\n        \};/)?.[0] || '', /open late/i);
});

test('MINGLEYARD presentation contains no historical source-brand wording', () => {
  const editorialMarkup = html.match(/<header class="my-topbar"[\s\S]*?<\/header>[\s\S]*?<div class="my-editorial-copy"[\s\S]*?<\/div>/)?.[0] || '';
  assert.ok(editorialMarkup);
  assert.doesNotMatch(editorialMarkup, /(?:fabrika|pipes)/i);
  assert.doesNotMatch(mingleCss, /(?:fabrika|pipes)/i);
});

// Pinned to a literal, so it moves with every cache bump. v152 was the AUREVANE
// hero sizing; v153 the hero-gallery ReferenceError repair; v154 the MINGLEYARD
// editorial redesign; v156 the custom-domain tenant resolution and the short
// demo hostnames; v157 restores the FOOD | DRINKS split. (v155 was this
// branch's number before merging v154; skipped so the published cache only ever
// moves forward.)
test('service worker cache advances and precaches MINGLEYARD editorial CSS', () => {
  assert.match(sw, /const CACHE_NAME = 'bl-v157';/);
  assert.equal((sw.match(/bl-v157/g) || []).length, 1);
  assert.match(sw, /assets\/showcase\/mingleyard\/editorial\.css/);
});
