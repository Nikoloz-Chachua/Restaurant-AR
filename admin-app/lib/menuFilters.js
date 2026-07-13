export const DEFAULT_MENU_FILTERS = Object.freeze({
  query: '',
  menuGroup: 'all',
  categoryId: 'all',
  visibility: 'all',
  mediaState: 'all',
  quality: 'all',
})

const DRINK_CATEGORY_HINTS = new Set([
  'drink',
  'drinks',
  'beverage',
  'beverages',
  'coffee',
  'tea',
  'bar',
  'wine',
  'cocktail',
  'cocktails',
  'juice',
  'juices',
  'smoothie',
  'smoothies',
  'სასმელი',
  'სასმელები',
  'ყავა',
  'ჩაი',
  'წვენი',
  'წვენები',
  'კოქტეილი',
  'კოქტეილები',
  'ღვინო',
])

function normalizeCategoryName(value) {
  return String(value || '').trim().toLocaleLowerCase()
}

export function parseDrinkCategories(raw) {
  const out = new Set()
  if (!raw) return out
  const s = String(raw).trim()
  let list = []
  if (s[0] === '[') {
    try {
      list = JSON.parse(s)
    } catch {
      list = []
    }
  }
  if (!Array.isArray(list) || !list.length) list = s.replace(/^\[|\]$/g, '').split(/[,;\n]/)
  list.forEach(value => {
    const normalized = normalizeCategoryName(String(value).replace(/^["'\s]+|["'\s]+$/g, ''))
    if (normalized) out.add(normalized)
  })
  return out
}

export function serializeDrinkCategories(categories = [], drinkCategoryNames = new Set()) {
  const names = []
  const seen = new Set()
  categories.forEach(category => {
    const name = String(category?.name_en || '').trim()
    const key = normalizeCategoryName(name)
    if (!name || !drinkCategoryNames.has(key) || seen.has(key)) return
    names.push(name)
    seen.add(key)
  })
  return JSON.stringify(names)
}

export function inferMenuGroupForCategory(category, drinkCategoryNames = new Set(), useNameHints = true) {
  const en = normalizeCategoryName(category?.name_en)
  const ka = normalizeCategoryName(category?.name_ka)
  if (en && drinkCategoryNames.has(en)) return 'drink'
  if (!useNameHints) return 'food'
  if (en && DRINK_CATEGORY_HINTS.has(en)) return 'drink'
  if (ka && DRINK_CATEGORY_HINTS.has(ka)) return 'drink'
  return 'food'
}

export function hasActiveArMedia(item) {
  return item?.text_only !== true && Boolean(item?.is_3d) && String(item?.model || '').trim().length > 0
}

export function getMenuItemMediaState(item) {
  if (item?.text_only === true) return 'text'
  const hasThumbnail = String(item?.thumbnail_url || '').trim().length > 0
  const hasAr = hasActiveArMedia(item)

  if (hasAr) return 'ar'
  if (hasThumbnail) return 'photo'
  return 'text'
}

export function normalizeMenuFilters(filters = {}) {
  return {
    ...DEFAULT_MENU_FILTERS,
    ...filters,
    query: String(filters.query || '').trim().toLocaleLowerCase(),
    menuGroup: filters.menuGroup === 'food' || filters.menuGroup === 'drink' ? filters.menuGroup : 'all',
    categoryId: filters.categoryId === '' || filters.categoryId == null ? 'all' : String(filters.categoryId),
  }
}

export function menuFiltersAreActive(filters = {}) {
  const normalized = normalizeMenuFilters(filters)
  return Object.entries(DEFAULT_MENU_FILTERS).some(([key, value]) => normalized[key] !== value)
}

export function filterMenuItems(items, categories, filters = {}, drinkCategoryNames = new Set(), useDrinkCategoryHints = true) {
  const normalized = normalizeMenuFilters(filters)
  const categoryNames = new Map(
    categories.map(category => [
      String(category.id),
      `${category.name_en || ''} ${category.name_ka || ''}`.toLocaleLowerCase(),
    ]),
  )

  return items.filter(item => {
    const categoryKey = item.category_id == null ? '' : String(item.category_id)
    const categoryText = categoryNames.get(categoryKey) || ''
    const category = categoryKey
      ? categories.find(candidate => String(candidate.id) === categoryKey)
      : { name_en: 'Other', name_ka: 'სხვა' }

    if (normalized.query) {
      const haystack = [
        item.name_en,
        item.name_ka,
        categoryText,
      ].join(' ').toLocaleLowerCase()
      if (!haystack.includes(normalized.query)) return false
    }

    if (normalized.categoryId !== 'all' && categoryKey !== normalized.categoryId) return false
    if (
      normalized.menuGroup !== 'all'
      && inferMenuGroupForCategory(category, drinkCategoryNames, useDrinkCategoryHints) !== normalized.menuGroup
    ) return false

    if (normalized.visibility === 'visible' && !item.visible) return false
    if (normalized.visibility === 'hidden' && item.visible) return false

    const mediaState = getMenuItemMediaState(item)
    const missingImage = String(item.thumbnail_url || '').trim().length === 0
    if (normalized.mediaState === 'ar' && mediaState !== 'ar') return false
    if (normalized.mediaState === 'photo' && mediaState !== 'photo') return false
    if (normalized.mediaState === 'text' && mediaState !== 'text') return false
    if (normalized.mediaState === 'missing-image' && !missingImage) return false

    if (normalized.quality === 'missing-en' && String(item.name_en || '').trim()) return false
    if (normalized.quality === 'missing-ka' && String(item.name_ka || '').trim()) return false
    if (normalized.quality === 'missing-price' && String(item.price || '').trim()) return false

    return true
  })
}
