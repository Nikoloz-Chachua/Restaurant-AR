export function normalizeCategoryPosition(value, fallback, maxPosition) {
  const numeric = Number(value)
  const integer = Number.isFinite(numeric) ? Math.trunc(numeric) : fallback
  return Math.min(Math.max(integer, 1), Math.max(maxPosition, 1))
}

export function planCategoryOrder(categories, savedCategory, targetPosition) {
  const existing = categories
    .filter(category => Number(category.id) !== Number(savedCategory.id))
    .slice()
    .sort((a, b) => {
      const orderDiff = Number(a.sort_order || 0) - Number(b.sort_order || 0)
      return orderDiff || Number(a.id) - Number(b.id)
    })

  const position = normalizeCategoryPosition(targetPosition, existing.length + 1, existing.length + 1)
  const next = existing.slice()
  next.splice(position - 1, 0, savedCategory)

  return next.map((category, index) => ({
    id: Number(category.id),
    sort_order: index + 1,
  }))
}
