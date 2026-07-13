export const DEFAULT_MENU_FILTERS = Object.freeze({
  query: '',
  categoryId: 'all',
  visibility: 'all',
  mediaState: 'all',
  quality: 'all',
})

export function hasActiveArMedia(item) {
  return Boolean(item?.is_3d) && String(item?.model || '').trim().length > 0
}

export function getMenuItemMediaState(item) {
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
    categoryId: filters.categoryId === '' || filters.categoryId == null ? 'all' : String(filters.categoryId),
  }
}

export function menuFiltersAreActive(filters = {}) {
  const normalized = normalizeMenuFilters(filters)
  return Object.entries(DEFAULT_MENU_FILTERS).some(([key, value]) => normalized[key] !== value)
}

export function filterMenuItems(items, categories, filters = {}) {
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

    if (normalized.query) {
      const haystack = [
        item.name_en,
        item.name_ka,
        categoryText,
      ].join(' ').toLocaleLowerCase()
      if (!haystack.includes(normalized.query)) return false
    }

    if (normalized.categoryId !== 'all' && categoryKey !== normalized.categoryId) return false

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
