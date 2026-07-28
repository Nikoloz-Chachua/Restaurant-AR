import test from 'node:test'
import assert from 'node:assert/strict'
import {
  adminIdentityLabel,
  deriveTenantCreationFields,
  isThemeTemplateActionAllowed,
  themeTabsForRole,
  normalizeThemeTabForRole,
  nextTenantSlugCandidate,
} from './adminUx.js'

test('tenant creation derives hidden branch and slug fields from brand identity', () => {
  assert.deepEqual(
    deriveTenantCreationFields({ brandName: 'Monday Greens' }),
    {
      brandName: 'Monday Greens',
      brandSlug: 'monday-greens',
      restaurantName: 'Monday Greens',
      restaurantSlug: 'monday-greens-main',
    },
  )

  assert.deepEqual(
    deriveTenantCreationFields({
      brandName: '  BetaReal Cafe!!!  ',
      brandSlug: 'stale-brand-overwrite',
      restaurantName: '<script>owned</script>',
      restaurantSlug: 'legacy-restaurant-overwrite',
    }),
    {
      brandName: 'BetaReal Cafe!!!',
      brandSlug: 'betareal-cafe',
      restaurantName: 'BetaReal Cafe!!!',
      restaurantSlug: 'betareal-cafe-main',
    },
  )
})

test('tenant slug collision retry preserves tenant identity and appends safe suffixes', () => {
  assert.deepEqual(
    nextTenantSlugCandidate({
      brandName: 'Monday Greens',
      brandSlug: 'stale-brand-overwrite',
      restaurantName: 'Stale Restaurant',
      restaurantSlug: 'stale-restaurant-overwrite',
      attempt: 1,
    }),
    {
      brandName: 'Monday Greens',
      brandSlug: 'monday-greens-2',
      restaurantName: 'Monday Greens',
      restaurantSlug: 'monday-greens-2-main',
    },
  )
})

test('sidebar identity reflects role and tenant without email-only logic', () => {
  assert.equal(adminIdentityLabel({ role: 'super_admin', loading: false, restaurantName: 'Monday Greens' }), 'Supaadmin')
  assert.equal(adminIdentityLabel({ role: 'brand_owner', loading: false, restaurantName: 'Monday Greens' }), 'Admin · Monday Greens')
  assert.equal(adminIdentityLabel({ role: 'branch_manager', loading: false, restaurantName: 'Main Branch' }), 'Admin · Main Branch')
  assert.equal(adminIdentityLabel({ role: 'brand_owner', loading: true, restaurantName: 'Monday Greens' }), '')
  assert.equal(adminIdentityLabel({ role: 'brand_owner', loading: false, restaurantName: '' }), 'Admin')
})

test('theme templates are superadmin-only and tenants land on first allowed edit tab', () => {
  assert.deepEqual(themeTabsForRole('super_admin').map(tab => tab.id), ['templates', 'night', 'day', 'background', 'fonts', 'branding'])
  assert.deepEqual(themeTabsForRole('brand_owner').map(tab => tab.id), ['night', 'day', 'background', 'fonts', 'branding'])
  assert.equal(normalizeThemeTabForRole('templates', 'brand_owner'), 'night')
  assert.equal(normalizeThemeTabForRole('templates', 'super_admin'), 'templates')
  assert.equal(isThemeTemplateActionAllowed('super_admin'), true)
  assert.equal(isThemeTemplateActionAllowed('brand_owner'), false)
})
