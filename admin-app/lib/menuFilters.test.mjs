import test from 'node:test'
import assert from 'node:assert/strict'
import {
  filterMenuItems,
  getMenuItemMediaState,
  menuFiltersAreActive,
} from './menuFilters.js'

const categories = [
  { id: 1, name_en: 'Burgers', name_ka: 'ბურგერები' },
  { id: 2, name_en: 'Drinks', name_ka: 'სასმელები' },
]

const items = [
  { id: 1, name_en: 'Classic Burger', name_ka: 'კლასიკური', category_id: 1, visible: true, is_3d: true, model: 'classic.glb', thumbnail_url: 'classic.webp', price: '25' },
  { id: 2, name_en: 'Lemonade', name_ka: 'ლიმონათი', category_id: 2, visible: true, is_3d: false, model: '', thumbnail_url: 'lemonade.webp', price: '8' },
  { id: 3, name_en: 'Water', name_ka: '', category_id: 2, visible: false, is_3d: false, model: '', thumbnail_url: '', price: '' },
  { id: 4, name_en: '', name_ka: 'სალათი', category_id: null, visible: true, is_3d: true, model: '', thumbnail_url: '', price: '12' },
]

test('searches trimmed text across English, Georgian, and category names without changing order', () => {
  assert.deepEqual(
    filterMenuItems(items, categories, { query: '  ბურგ  ' }).map(item => item.id),
    [1],
  )
  assert.deepEqual(
    filterMenuItems(items, categories, { query: 'drink' }).map(item => item.id),
    [2, 3],
  )
})

test('combines category, visibility, media, and quality filters with AND semantics', () => {
  assert.deepEqual(
    filterMenuItems(items, categories, {
      categoryId: '2',
      visibility: 'hidden',
      mediaState: 'missing-image',
      quality: 'missing-ka',
    }).map(item => item.id),
    [3],
  )
})

test('classifies media state from active 3D model and thumbnail presence', () => {
  assert.equal(getMenuItemMediaState(items[0]), 'ar')
  assert.equal(getMenuItemMediaState(items[1]), 'photo')
  assert.equal(getMenuItemMediaState(items[2]), 'text')
  assert.deepEqual(filterMenuItems(items, categories, { mediaState: 'text' }).map(item => item.id), [3, 4])
})

test('detects active filters after trimming the search query', () => {
  assert.equal(menuFiltersAreActive({ query: '   ' }), false)
  assert.equal(menuFiltersAreActive({ visibility: 'visible' }), true)
})
