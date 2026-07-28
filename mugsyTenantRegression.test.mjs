import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8')
const sw = readFileSync(new URL('./sw.js', import.meta.url), 'utf8')
const presets = readFileSync(new URL('./admin-app/lib/themePresets.ts', import.meta.url), 'utf8')
const adminUxTest = readFileSync(new URL('./admin-app/lib/adminUx.test.mjs', import.meta.url), 'utf8')

test('Mugsy public shell is exact tenant gated and keeps other tenants out', () => {
  assert.match(html, /const _MUGSY_RESTAURANT_SLUG = 'mugsy-main'/)
  assert.match(html, /const _MUGSY_BRAND_SLUG = 'mugsy'/)
  assert.match(html, /function _isMugsyTenant\(\)/)
  assert.match(html, /restaurant_slug === _MUGSY_RESTAURANT_SLUG/)
  assert.match(html, /brandSlug === _MUGSY_BRAND_SLUG/)
  assert.ok(!/\[data-template="mugsy_street_diner"\] \.mugsy-shell/.test(html), 'public Mugsy shell must not be gated only by reusable template_key')
  assert.match(html, /\[data-tenant="mugsy-main"\]\[data-brand-slug="mugsy"\] \.mugsy-shell/)
})

test('Mugsy fixture is localhost-only, explicit, dynamic, and not precached', () => {
  assert.match(html, /function _mugsyFixtureRequested\(\)/)
  assert.match(html, /_tenantSlugFromHost\(\) === _MUGSY_RESTAURANT_SLUG/)
  assert.match(html, /get\('fixture'\) === 'mugsy'/)
  assert.match(html, /fetch\('\.\/data\/fixtures\/mugsy-menu\.fixture\.json'/)
  assert.ok(!sw.includes('./data/fixtures/mugsy-menu.fixture.json'), 'Mugsy visual fixture must not be precached')
})

test('Mugsy copy, ordering, locations, and delivery links are theme-config driven', () => {
  assert.match(html, /const _MUGSY_COPY_TOKENS = \{/)
  assert.match(html, /mugsy_order_links/)
  assert.match(html, /mugsy_locations/)
  assert.match(html, /https:\/\/wolt\.com\/en\/geo\/tbilisi\/restaurant\/magsys-burger/)
  assert.match(html, /https:\/\/glovoapp\.com\/en\/ge\/tbilisi\/stores\/mugsy-s-burger-tbi/)
  assert.match(html, /Petre Melikishvili/)
  assert.match(html, /Vazha Pshavela/)
  assert.ok(!/tel:/.test(html), 'Mugsy shell must not invent a phone link')
})

test('Mugsy menu cards remain data sourced and photo-only items do not advertise AR', () => {
  assert.match(html, /menu_items\?select=\*,categories\(name_en,name_ka\)&restaurant_id=eq\.\$\{tenant\.restaurant_id\}/)
  assert.match(html, /A real resolved tenant with no menu items should stay empty/)
  assert.match(html, /Mugsy has not published menu items here yet/)
  assert.match(html, /const has3d = _isAREnabledMenuItem\(item\)/)
  assert.match(html, /\$\{has3d \? `<button class="ar-btn"/)
  assert.doesNotMatch(html, /Mugsy.*Featured|Popular/i)
})

test('Mugsy hero copy describes the interactive BetaReal menu without claiming current AR', () => {
  assert.match(html, /interactive BetaReal menu experience/)
  assert.match(html, /BetaReal-ის ინტერაქტიული მენიუს გამოცდილება/)
  assert.doesNotMatch(html, /AR-ready BetaReal menu experience/)
  assert.doesNotMatch(html, /BetaReal-ის AR მენიუს გამოცდილება/)
})

test('Mugsy street-diner template is superadmin-loadable and tenant admins stay restricted', () => {
  assert.match(presets, /\| 'mugsy_street_diner'/)
  assert.match(presets, /key: 'mugsy_street_diner'/)
  assert.match(presets, /label: 'Mugsy Street Diner'/)
  assert.match(adminUxTest, /theme templates are superadmin-only/)
  assert.match(adminUxTest, /brand_owner'\)\.map\(tab => tab\.id\), \['night', 'day', 'background', 'fonts', 'branding'\]/)
})

test('service-worker cache was bumped for changed public assets', () => {
  const cacheMatch = sw.match(/CACHE_NAME\s*=\s*'bl-v(\d+)'/)
  assert.ok(cacheMatch, 'service worker cache version must use bl-vNNN format')
  assert.ok(Number(cacheMatch[1]) >= 131, 'Mugsy asset/runtime changes require a bl-v131+ cache')
  assert.match(sw, /\.\/assets\/mugsy\/logo\.svg/)
  assert.match(sw, /\.\/assets\/mugsy\/hero-/)
  assert.doesNotMatch(sw, /\.\/assets\/mugsy\/items-webp\//, 'Mugsy product thumbnails must lazy-load through runtime cache')
})
