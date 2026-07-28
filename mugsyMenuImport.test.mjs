import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const official = JSON.parse(readFileSync(new URL('./data/fixtures/mugsy-official-extract.json', import.meta.url), 'utf8'))
const fixture = JSON.parse(readFileSync(new URL('./data/fixtures/mugsy-menu.fixture.json', import.meta.url), 'utf8'))
const sql = readFileSync(new URL('./supabase/sql/2026-07-28_mugsy_menu_import.sql', import.meta.url), 'utf8')

function extractDollarJson(tag) {
  const match = sql.match(new RegExp(`\\$${tag}\\$([\\s\\S]*?)\\$${tag}\\$::jsonb`))
  assert.ok(match, `Missing ${tag} JSON block in Mugsy SQL import`)
  return JSON.parse(match[1])
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
  const categories = extractDollarJson('mugsy_categories')
  const items = extractDollarJson('mugsy_items')

  assert.equal(categories.length, 4)
  assert.equal(items.length, 21)
  assert.match(sql, /insert into public\.categories \(restaurant_id, name_en, name_ka, sort_order\)\nselect 59/)
  assert.match(sql, /insert into public\.menu_items \([\s\S]*?restaurant_id/)
  assert.match(sql, /select\n  59,\n  src\.name_en/)
  assert.match(sql, /delete from public\.menu_items where restaurant_id = 59;/)
  assert.match(sql, /delete from public\.categories where restaurant_id = 59;/)
  assert.match(sql.trimEnd(), /ROLLBACK;$/)

  for (const item of items) {
    assert.equal(item.is_3d, false, `${item.name_en} must not be marked 3D`)
    assert.equal(item.thumb_3d, false, `${item.name_en} must not use 3D thumbnail mode`)
    assert.equal(item.model, '', `${item.name_en} must not include a GLB`)
    assert.equal(item.model_usdz, '', `${item.name_en} must not include a USDZ`)
    assert.equal(item.text_only, false, `${item.name_en} should render as a photo card`)
    assert.equal(item.thumbnail_url, `./assets/mugsy/items-webp/${item.thumbnail_url.split('/').pop()}`)
    assert.ok(existsSync(new URL(item.thumbnail_url, import.meta.url)), `${item.thumbnail_url} must exist locally`)
  }
})
