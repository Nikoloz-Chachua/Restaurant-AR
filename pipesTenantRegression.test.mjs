import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8')
const sw = readFileSync(new URL('./sw.js', import.meta.url), 'utf8')
const presets = readFileSync(new URL('./admin-app/lib/themePresets.ts', import.meta.url), 'utf8')
const themeEditor = readFileSync(new URL('./admin-app/app/(admin)/theme/page.tsx', import.meta.url), 'utf8')
const adminUxTest = readFileSync(new URL('./admin-app/lib/adminUx.test.mjs', import.meta.url), 'utf8')

function readJson(path) {
  return JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'))
}

function extractDollarJson(source, tag) {
  const match = source.match(new RegExp(`\\$${tag}\\$([\\s\\S]*?)\\$${tag}\\$::jsonb`))
  assert.ok(match, `Missing ${tag} JSON block`)
  return JSON.parse(match[1])
}

test('PIPES public shell is exact tenant gated and not a Mugsy recolor', () => {
  assert.match(html, /const _PIPES_RESTAURANT_SLUG = 'pipes-burger-main'/)
  assert.match(html, /const _PIPES_BRAND_SLUG = 'pipes-burger'/)
  assert.match(html, /const _PIPES_TEMPLATE_KEY = 'pipes_fabrika'/)
  assert.match(html, /function _isPipesTenant\(\)/)
  assert.match(html, /restaurant_slug === _PIPES_RESTAURANT_SLUG/)
  assert.match(html, /brandSlug === _PIPES_BRAND_SLUG/)
  assert.match(html, /\[data-tenant="pipes-burger-main"\]\[data-brand-slug="pipes-burger"\] \.pipes-shell/)
  assert.doesNotMatch(html, /\[data-template="pipes_fabrika"\] \.pipes-shell/)
  assert.doesNotMatch(html, /\[data-tenant="pipes-burger-main"\][^{]*\.mugsy-delivery-rail/i)
  assert.doesNotMatch(html, /id="pipes-order|pipes-delivery|data-pipes="order/i)
})

test('PIPES fixture is localhost-only, explicit, tenant-scoped, and not precached', () => {
  assert.match(html, /function _pipesFixtureRequested\(\)/)
  assert.match(html, /_tenantSlugFromHost\(\) === _PIPES_RESTAURANT_SLUG/)
  assert.match(html, /get\('fixture'\) === 'pipes'/)
  assert.match(html, /fetch\('\.\/data\/fixtures\/pipes-menu\.fixture\.json'/)
  assert.ok(!sw.includes('./data/fixtures/pipes-menu.fixture.json'), 'PIPES fixture must not be precached')
})

test('PIPES artifacts expose exact Wolt snapshot counts and local images', () => {
  const fixture = readJson('./data/fixtures/pipes-menu.fixture.json')
  const manifest = readJson('./assets/pipes/manifest.json')

  assert.equal(fixture.restaurant.id, 62)
  assert.equal(fixture.restaurant.slug, 'pipes-burger-main')
  assert.equal(fixture.restaurant.brand_id, 56)
  assert.equal(fixture.restaurant.brands.slug, 'pipes-burger')
  assert.equal(fixture.categories.length, 5)
  assert.equal(fixture.menu_items.length, 27)
  assert.equal(fixture.menu_items.filter(item => item.thumbnail_url).length, 14)
  assert.deepEqual(
    [...new Set(fixture.menu_items.map(item => item.category_name_en))],
    ['Burgers', 'Soup', 'Sides', 'Sauces', 'Drinks']
  )
  assert.ok(fixture.menu_items.every(item => item.is_3d === false && item.thumb_3d === false && item.model === '' && item.model_usdz === ''), 'PIPES fixture must not claim AR/3D')
  assert.ok(fixture.menu_items.every(item => item.text_only === !Boolean(item.thumbnail_url)), 'text_only must match image presence')
  assert.ok(fixture.menu_items.some(item => item.name_en === 'Pipes Signature Burger'))
  assert.ok(fixture.menu_items.some(item => item.name_en === 'Burgazm'))
  assert.ok(fixture.menu_items.every(item => !('source_item_id' in item)), 'public PIPES fixture must not expose Wolt item IDs')
  assert.deepEqual(
    fixture.menu_items
      .filter(item => item.visible !== false && item.featured)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || String(a.id ?? '').localeCompare(String(b.id ?? '')))
      .map(item => item.name_en),
    ['Pipes Signature Burger', 'Burgazm']
  )
  assert.ok(fixture.menu_items.every(item => !/Wolt|order|delivery/i.test(`${item.description_en} ${item.description_ka}`)), 'menu copy must not expose Wolt as active ordering')
  assert.equal(manifest.assets.length, 14)
  assert.ok(manifest.assets.every(asset => asset.source_url.startsWith('https://wolt-menu-images-cdn.wolt.com/')))
  assert.ok(manifest.assets.every(asset => asset.local_path.startsWith('assets/pipes/items-webp/')))
  for (const asset of manifest.assets) {
    assert.ok(existsSync(new URL(asset.local_path, import.meta.url)), `${asset.local_path} must exist`)
  }
})

test('PIPES production SQL is guarded, reversible, target-only, and count-validating', () => {
  const sql = readFileSync(new URL('./supabase/sql/2026-07-28_pipes_menu_import.sql', import.meta.url), 'utf8')
  const asciiSafeSql = readFileSync(new URL('./supabase/sql/2026-07-28_pipes_menu_import_ascii_safe.sql', import.meta.url), 'utf8')
  const categories = extractDollarJson(sql, 'pipes_categories')
  const items = extractDollarJson(sql, 'pipes_items')
  const theme = extractDollarJson(sql, 'pipes_theme')

  assert.equal(categories.length, 5)
  assert.equal(items.length, 27)
  assert.equal(items.filter(item => item.thumbnail_url).length, 14)
  assert.equal(theme.find(row => row.key === 'template_key')?.value, 'pipes_fabrika')
  assert.equal(theme.find(row => row.key === 'info_title')?.value, 'Find us in Fabrika')
  assert.equal(theme.find(row => row.key === 'info_title_ka')?.value, 'გვიპოვე ფაბრიკაში')
  assert.equal(theme.find(row => row.key === 'location_address')?.value, 'Fabrika, 8 Egnate Ninoshvili Street, Tbilisi')
  assert.equal(theme.find(row => row.key === 'location_address_ka')?.value, 'ფაბრიკა, ეგნატე ნინოშვილის ქუჩა 8, თბილისი')
  assert.ok(!theme.some(row => row.key === 'pipes_signature_item_id'))
  assert.match(sql, /^BEGIN;/m)
  assert.match(sql, /where r\.id = 62[\s\S]*?and r\.slug = 'pipes-burger-main'[\s\S]*?and r\.brand_id = 56[\s\S]*?and b\.slug = 'pipes-burger'/)
  assert.match(sql, /delete from public\.menu_items where restaurant_id = 62;/)
  assert.match(sql, /delete from public\.categories where restaurant_id = 62;/)
  assert.match(sql, /expected 5 PIPES categories/)
  assert.match(sql, /expected 27 PIPES menu items/)
  assert.match(sql, /expected 14 PIPES image-backed items/)
  assert.match(sql.trimEnd(), /ROLLBACK;$/)
  assert.match(asciiSafeSql.trimEnd(), /ROLLBACK;$/)
  assert.doesNotMatch(asciiSafeSql, /[\u10A0-\u10FF\u20BE]/)
  assert.deepEqual(extractDollarJson(asciiSafeSql, 'pipes_categories'), categories)
  assert.deepEqual(extractDollarJson(asciiSafeSql, 'pipes_items'), items)
  assert.deepEqual(extractDollarJson(asciiSafeSql, 'pipes_theme'), theme)
})

test('PIPES template is superadmin-loadable and content-editable through theme admin', () => {
  assert.match(presets, /\| 'pipes_fabrika'/)
  assert.match(presets, /key: 'pipes_fabrika'/)
  assert.match(presets, /label: 'PIPES Fabrika'/)
  assert.match(presets, /\.\.\.TEMPLATE_VISUAL_TOKENS\.pipes_fabrika/)
  assert.match(themeEditor, /CONTENT_TEMPLATES = new Set\(\['baoma', 'burger_bar', 'mugsy_street_diner', 'pipes_fabrika'\]\)/)
  assert.match(themeEditor, /key: 'location_address'/)
  assert.match(themeEditor, /key: 'location_address_ka'/)
  assert.doesNotMatch(themeEditor, /pipes_signature_item_id/)
  assert.match(adminUxTest, /theme templates are superadmin-only/)
})

test('PIPES dynamic shell has search, signature, location, and no active Wolt order CTA', () => {
  assert.match(html, /id="pipes-search"/)
  assert.match(html, /function _renderPipesSignature\(/)
  assert.doesNotMatch(html, /pipesSignatureItemId/)
  assert.doesNotMatch(html, /source_item_id/)
  assert.match(html, /\.filter\(item => item\.featured && item\.visible !== false\)[\s\S]*?\.sort\(\(a, b\) =>/)
  assert.doesNotMatch(html, /\.find\(item => item\.name === 'Pipes Signature Burger'\)/)
  assert.doesNotMatch(html, /\.find\(item => item\.name === 'Burgazm'\)/)
  assert.match(html, /Find us in Fabrika/)
  assert.match(html, /გვიპოვე ფაბრიკაში/)
  assert.match(html, /8 Egnate Ninoshvili Street/)
  assert.match(html, /41\.7095131,44\.8025001/)
  assert.match(html, /Interactive menu powered by BetaReal/)
  assert.match(html, /_isAREnabledMenuItem\(item\)/)
  assert.match(html, /if \(_isPipesTenant\(\)\) \{[\s\S]*?_renderPipesSignature\(items\)/)
  assert.doesNotMatch(html, /wolt\.com\/en\/geo\/tbilisi\/restaurant\/pipes/i)
})

test('PIPES public copy avoids unsupported factual claims', () => {
  const unsupportedYearClaim = new RegExp(['Since', String(2000 + 14)].join('\\s+'), 'i')
  const unsupportedPickClaim = new RegExp(['Real', 'menu', 'pick'].join('\\s+'), 'i')
  const unsupportedPickClaimKa = new RegExp(['რეალური', 'მენიუს', 'არჩევანი'].join('\\s+'))

  assert.doesNotMatch(html, unsupportedYearClaim)
  assert.doesNotMatch(html, unsupportedPickClaim)
  assert.doesNotMatch(html, unsupportedPickClaimKa)
  assert.match(html, /PIPES Signature/)
  assert.match(html, /PIPES საფირმო/)
})

test('PIPES document title suffix is localized', () => {
  assert.match(html, /documentTitleSuffix: 'document_title_suffix'/)
  assert.match(html, /const token = _PIPES_COPY_TOKENS\[key\]/)
  assert.match(html, /documentTitleSuffix: 'Fabrika Menu'/)
  assert.match(html, /documentTitleSuffix: 'ფაბრიკის მენიუ'/)
  assert.match(html, /_pipesText\('documentTitleSuffix'\)/)
  assert.doesNotMatch(html, /\? `\$\{brandTitle\} · Fabrika Menu`/)
})
