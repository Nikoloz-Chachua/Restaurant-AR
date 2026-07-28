import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const fixture = JSON.parse(readFileSync('data/fixtures/pipes-menu.fixture.json', 'utf8'))
const manifest = JSON.parse(readFileSync('assets/pipes/manifest.json', 'utf8'))
const sql = readFileSync('supabase/sql/2026-07-28_pipes_menu_import.sql', 'utf8')
const asciiSafeSql = readFileSync('supabase/sql/2026-07-28_pipes_menu_import_ascii_safe.sql', 'utf8')
const html = readFileSync('index.html', 'utf8')
const presets = readFileSync('admin-app/lib/themePresets.ts', 'utf8')
const themeEditor = readFileSync('admin-app/app/(admin)/theme/page.tsx', 'utf8')

function extractDollarJson(source, tag) {
  const match = source.match(new RegExp(`\\$${tag}\\$([\\s\\S]*?)\\$${tag}\\$::jsonb`))
  assert.ok(match, `Missing ${tag} JSON block`)
  return JSON.parse(match[1])
}

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
assert.ok(fixture.menu_items.every(item => item.restaurant_id === 62))
assert.ok(fixture.menu_items.every(item => item.is_3d === false && item.thumb_3d === false && item.model === '' && item.model_usdz === ''))
assert.ok(fixture.menu_items.every(item => item.text_only === !Boolean(item.thumbnail_url)))
assert.ok(fixture.menu_items.some(item => item.name_en === 'Pipes Signature Burger'))
assert.ok(fixture.menu_items.some(item => item.name_en === 'Burgazm'))
assert.ok(fixture.menu_items.every(item => !('source_item_id' in item)))
assert.deepEqual(
  fixture.menu_items
    .filter(item => item.visible !== false && item.featured)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || String(a.id ?? '').localeCompare(String(b.id ?? '')))
    .map(item => item.name_en),
  ['Pipes Signature Burger', 'Burgazm']
)
assert.ok(!fixture.menu_items.some(item => /Wolt|order|delivery/i.test(`${item.description_en} ${item.description_ka}`)))

assert.equal(manifest.assets.length, 14)
assert.ok(manifest.assets.every(asset => asset.source_url.startsWith('https://wolt-menu-images-cdn.wolt.com/')))
assert.ok(manifest.assets.every(asset => asset.local_path.startsWith('assets/pipes/items-webp/')))
manifest.assets.forEach(asset => {
  assert.ok(existsSync(asset.local_path), `${asset.local_path} must exist`)
})

const sqlCategories = extractDollarJson(sql, 'pipes_categories')
const sqlItems = extractDollarJson(sql, 'pipes_items')
const sqlTheme = extractDollarJson(sql, 'pipes_theme')
assert.equal(sqlCategories.length, 5)
assert.equal(sqlItems.length, 27)
assert.equal(sqlItems.filter(item => item.thumbnail_url).length, 14)
assert.equal(sqlTheme.find(row => row.key === 'info_title')?.value, 'Find us in Fabrika')
assert.equal(sqlTheme.find(row => row.key === 'info_title_ka')?.value, 'გვიპოვე ფაბრიკაში')
assert.equal(sqlTheme.find(row => row.key === 'location_address')?.value, 'Fabrika, 8 Egnate Ninoshvili Street, Tbilisi')
assert.equal(sqlTheme.find(row => row.key === 'location_address_ka')?.value, 'ფაბრიკა, ეგნატე ნინოშვილის ქუჩა 8, თბილისი')
assert.equal(sqlTheme.find(row => row.key === 'document_title_suffix')?.value, 'Fabrika Menu')
assert.equal(sqlTheme.find(row => row.key === 'document_title_suffix_ka')?.value, 'ფაბრიკის მენიუ')
assert.ok(!sqlTheme.some(row => row.key === 'pipes_signature_item_id'))
assert.match(sql, /^BEGIN;/m)
assert.match(sql, /ROLLBACK;\s*$/)
assert.match(sql, /r\.id = 62/)
assert.match(sql, /r\.slug = 'pipes-burger-main'/)
assert.match(sql, /r\.brand_id = 56/)
assert.match(sql, /b\.slug = 'pipes-burger'/)
assert.match(sql, /delete from public\.menu_items where restaurant_id = 62;/)
assert.match(sql, /delete from public\.categories where restaurant_id = 62;/)
assert.match(sql, /expected 5 PIPES categories/)
assert.match(sql, /expected 27 PIPES menu items/)
assert.match(sql, /expected 14 PIPES image-backed items/)
assert.ok(!/insert into public\.menu_items\s*\(\s*id\b/i.test(sql))
assert.ok(!/created_at/i.test(sql))

assert.deepEqual(extractDollarJson(asciiSafeSql, 'pipes_categories'), sqlCategories)
assert.deepEqual(extractDollarJson(asciiSafeSql, 'pipes_items'), sqlItems)
assert.deepEqual(extractDollarJson(asciiSafeSql, 'pipes_theme'), sqlTheme)
assert.doesNotMatch(asciiSafeSql, /[\u10A0-\u10FF\u20BE]/)
assert.doesNotMatch(asciiSafeSql, /(?:á|â|Ã|�|áƒ|â‚¾)/)
assert.doesNotMatch(sql, /(?:á|â|Ã|�|áƒ|â‚¾)/)

assert.match(html, /const _PIPES_RESTAURANT_SLUG = 'pipes-burger-main'/)
assert.match(html, /function _pipesFixtureRequested\(\)/)
assert.match(html, /function _renderPipesSignature\(/)
assert.match(html, /function _applyPipesCopy\(\)/)
assert.doesNotMatch(html, /source_item_id/)
assert.match(html, /\.filter\(item => item\.featured && item\.visible !== false\)[\s\S]*?\.sort\(\(a, b\) =>/)
assert.doesNotMatch(html, /\.find\(item => item\.name === 'Pipes Signature Burger'\)/)
assert.match(presets, /\| 'pipes_fabrika'/)
assert.match(presets, /key: 'pipes_fabrika'/)
assert.match(themeEditor, /pipes_fabrika/)
assert.match(themeEditor, /key: 'location_address'/)
assert.match(themeEditor, /key: 'location_address_ka'/)
assert.doesNotMatch(themeEditor, /pipes_signature_item_id/)

console.log(`PIPES artifact checks passed: ${fixture.menu_items.length} items, ${fixture.categories.length} categories, ${manifest.assets.length} image assets`)
