export const FOOD_MARKET_RESTAURANT_ID = 73
export const FOOD_MARKET_RESTAURANT_SLUG = 'food-market-main'

export function supportsAdditionalInfo(restaurantId, restaurantSlug) {
  return Number(restaurantId) === FOOD_MARKET_RESTAURANT_ID
    && String(restaurantSlug || '').trim().toLowerCase() === FOOD_MARKET_RESTAURANT_SLUG
}

export function localizedAdditionalInfo(item, lang = 'en') {
  const en = String(item?.additional_info_en || '').trim()
  const ka = String(item?.additional_info_ka || '').trim()
  return lang === 'ka' ? (ka || en) : (en || ka)
}
