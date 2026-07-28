export const THEME_EDIT_TABS = ['night', 'day', 'background', 'fonts', 'branding']
export const THEME_TEMPLATE_TAB = 'templates'

export function slugify(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function deriveTenantCreationFields(input) {
  const brandName = String(input?.brandName ?? '').trim()
  const brandSlug = slugify(brandName)
  const restaurantName = brandName
  const restaurantSlug = `${brandSlug}-main`
  return { brandName, brandSlug, restaurantName, restaurantSlug }
}

export function nextTenantSlugCandidate(input) {
  const attempt = Math.max(0, Number(input?.attempt ?? 0))
  const brandName = String(input?.brandName ?? '').trim()
  const baseSlug = slugify(brandName)
  const suffix = attempt > 0 ? `-${attempt + 1}` : ''
  const brandSlug = `${baseSlug}${suffix}`
  return {
    brandName,
    brandSlug,
    restaurantSlug: `${brandSlug}-main`,
    restaurantName: brandName,
  }
}

export function adminIdentityLabel(access) {
  if (!access || access.loading) return ''
  if (access.role === 'super_admin') return 'Supaadmin'
  const tenantName = String(access.restaurantName ?? '').trim()
  return tenantName ? `Admin · ${tenantName}` : 'Admin'
}

export function isThemeTemplateActionAllowed(role) {
  return role === 'super_admin'
}

export function themeTabsForRole(role) {
  const editTabs = THEME_EDIT_TABS.map(id => ({ id }))
  return isThemeTemplateActionAllowed(role)
    ? [{ id: THEME_TEMPLATE_TAB }, ...editTabs]
    : editTabs
}

export function normalizeThemeTabForRole(tab, role) {
  const allowed = themeTabsForRole(role).map(item => item.id)
  return allowed.includes(tab) ? tab : allowed[0]
}
