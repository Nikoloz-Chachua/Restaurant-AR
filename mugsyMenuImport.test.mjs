import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const official = JSON.parse(readFileSync(new URL('./data/fixtures/mugsy-official-extract.json', import.meta.url), 'utf8'))
const fixture = JSON.parse(readFileSync(new URL('./data/fixtures/mugsy-menu.fixture.json', import.meta.url), 'utf8'))
const sql = readFileSync(new URL('./supabase/sql/2026-07-28_mugsy_menu_import.sql', import.meta.url), 'utf8')
const asciiSafeSql = readFileSync(new URL('./supabase/sql/2026-07-28_mugsy_menu_import_ascii_safe.sql', import.meta.url), 'utf8')

function extractDollarJson(source, tag) {
  const match = source.match(new RegExp(`\\$${tag}\\$([\\s\\S]*?)\\$${tag}\\$::jsonb`))
  assert.ok(match, `Missing ${tag} JSON block in Mugsy SQL import`)
  return JSON.parse(match[1])
}

function assertNoUpdatedAtAssignment(source) {
  assert.doesNotMatch(source, /\btheme_config\.updated_at\b/i)
  assert.doesNotMatch(source, /\bupdated_at\s*=\s*now\(\)/i)
}

test('official Mugsy extract and fixture expose exactly 4 categories and 21 products', () => {
  const officialCount = official.categories.reduce((sum, category) => sum + category.products.length, 0)
  assert.equal(official.categories.length, 4)
  assert.equal(officialCount, 21)

  assert.equal(fixture.menu_items.length, 21)
  assert.deepEqual(
    [...new Set(fixture.menu_items.map(item => item.category_name_en))],
    ['Burgers', 'Boxes', 'Sides & Fries', 'Drinks & Sauces']
  )
})

test('Mugsy SQL imports exactly 4 categories and 21 restaurant 59 non-3D products', () => {
  const categories = extractDollarJson(sql, 'mugsy_categories')
  const items = extractDollarJson(sql, 'mugsy_items')

  assert.equal(categories.length, 4)
  assert.equal(items.length, 21)
  assert.deepEqual(Object.keys(categories[0]), ['name_en', 'name_ka', 'sort_order'])
  assert.match(sql, /insert into public\.categories \(restaurant_id, name_en, name_ka, sort_order\)\nselect 59/)
  assert.match(sql, /insert into public\.menu_items \([\s\S]*?restaurant_id/)
  assert.match(sql, /select\n  59,\n  src\.name_en/)
  assert.match(sql, /delete from public\.menu_items where restaurant_id = 59;/)
  assert.match(sql, /delete from public\.categories where restaurant_id = 59;/)
  assert.match(sql.trimEnd(), /ROLLBACK;$/)

  for (const item of items) {
    assert.deepEqual(Object.keys(item), [
      'name_en',
      'name_ka',
      'description_en',
      'description_ka',
      'price',
      'price_old',
      'category_name_en',
      'sort_order',
      'visible',
      'model',
      'model_usdz',
      'ar_scale',
      'thumbnail_url',
      'thumb_3d',
      'is_3d',
      'text_only',
      'featured',
      'addons',
      'variants'
    ])
    assert.equal(item.is_3d, false, `${item.name_en} must not be marked 3D`)
    assert.equal(item.thumb_3d, false, `${item.name_en} must not use 3D thumbnail mode`)
    assert.equal(item.model, '', `${item.name_en} must not include a GLB`)
    assert.equal(item.model_usdz, '', `${item.name_en} must not include a USDZ`)
    assert.equal(item.text_only, false, `${item.name_en} should render as a photo card`)
    assert.equal(item.thumbnail_url, `./assets/mugsy/items-webp/${item.thumbnail_url.split('/').pop()}`)
    assert.ok(existsSync(new URL(item.thumbnail_url, import.meta.url)), `${item.thumbnail_url} must exist locally`)
  }
})

test('Mugsy SQL does not update missing theme_config timestamp columns', () => {
  assertNoUpdatedAtAssignment(sql)
  assertNoUpdatedAtAssignment(asciiSafeSql)
})

test('Mugsy ASCII-safe SQL decodes escaped payloads to the corrected Unicode data', () => {
  const categories = extractDollarJson(asciiSafeSql, 'mugsy_categories')
  const items = extractDollarJson(asciiSafeSql, 'mugsy_items')
  const theme = extractDollarJson(asciiSafeSql, 'mugsy_theme')

  assert.deepEqual(categories, extractDollarJson(sql, 'mugsy_categories'))
  assert.deepEqual(items, extractDollarJson(sql, 'mugsy_items'))
  assert.deepEqual(theme, extractDollarJson(sql, 'mugsy_theme'))
  for (const row of theme) {
    assert.deepEqual(Object.keys(row), ['key', 'value'])
  }
  assert.equal(categories.length, 4)
  assert.equal(items.length, 21)
  assert.equal(categories[0].name_ka, 'ბურგერები')
  assert.equal(items.find(item => item.name_en === 'Two Burger Box').name_ka, 'ორი ბურგერის ბოქსი')
  assert.equal(items.find(item => item.name_en === 'Fries').price, '4.4 ₾')
  assert.equal(theme.find(row => row.key === 'hero_cta_ka').value, 'მენიუს ნახვა')

  assert.match(asciiSafeSql, /where r\.id = 59[\s\S]*?and r\.slug = 'mugsy-main'[\s\S]*?and r\.brand_id = 53[\s\S]*?and b\.slug = 'mugsy'/)
  assert.match(asciiSafeSql, /delete from public\.menu_items where restaurant_id = 59;/)
  assert.match(asciiSafeSql, /delete from public\.categories where restaurant_id = 59;/)
  assert.match(asciiSafeSql.trimEnd(), /ROLLBACK;$/)
})

test('Mugsy ASCII-safe SQL payload contains no raw Georgian, lari, or mojibake markers', () => {
  assert.doesNotMatch(asciiSafeSql, /[\u10A0-\u10FF\u20BE]/)
  assert.doesNotMatch(asciiSafeSql, /(?:á|â|Ã|�|áƒ|â‚¾)/)
  assert.doesNotMatch(sql, /(?:á|â|Ã|�|áƒ|â‚¾)/)
})
