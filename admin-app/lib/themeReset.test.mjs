import test from 'node:test'
import assert from 'node:assert/strict'
import {
  approvedTemplateKeyForTenant,
  buildThemeResetConfig,
  canManageThemeTemplates,
  clientSafeThemeConfigForSave,
  tenantResetValuesForTest,
} from './themeReset.ts'

test('only super admins can manage theme templates in the Theme editor', () => {
  assert.equal(canManageThemeTemplates('super_admin'), true)
  assert.equal(canManageThemeTemplates('brand_owner'), false)
  assert.equal(canManageThemeTemplates('branch_manager'), false)
  assert.equal(canManageThemeTemplates('branch_staff'), false)
})

test('client save ignores a supplied Monday Greens template change', () => {
  const saved = clientSafeThemeConfigForSave(
    {
      template_key: 'fresh_glass',
      day_bg: '#111111',
      logo_url: 'https://cdn.example/logo.webp',
    },
    'monday-greens',
    'monday_greens',
  )

  assert.equal(saved.template_key, 'monday_greens')
  assert.equal(saved.day_bg, '#111111')
  assert.equal(saved.logo_url, 'https://cdn.example/logo.webp')
})

test('client save keeps the loaded tenant template for non-special tenants', () => {
  const saved = clientSafeThemeConfigForSave(
    { template_key: 'fresh_glass', day_bg: '#111111' },
    'ordinary-tenant',
    'warm_gold',
  )

  assert.equal(saved.template_key, 'warm_gold')
})

test('Monday Greens reset is deterministic staging-approved design while preserving branding', () => {
  assert.equal(approvedTemplateKeyForTenant('monday-greens'), 'monday_greens')

  const current = {
    template_key: 'fresh_glass',
    site_name: 'Monday Greens',
    site_name_ka: 'მანდეი გრინსი',
    logo_url: 'https://cdn.example/logo.webp',
    hero_image_url: 'https://cdn.example/hero.webp',
    item_view_123: '1 2 3',
    phone_layout: 'compact',
  }
  const reset = buildThemeResetConfig(current, 'monday-greens')
  const approved = tenantResetValuesForTest('monday-greens')

  assert.equal(reset.template_key, 'monday_greens')
  assert.equal(reset.font_body, 'Nunito')
  assert.equal(reset.font_heading, 'Fraunces')
  assert.equal(reset.day_bg, '#36a1b0')
  assert.equal(reset.day_bg2, '#36a1b0')
  assert.equal(reset.day_card, '#e6dbdb')
  assert.equal(reset.day_card2, '#e6fbff')
  assert.equal(reset.day_text, '#0b2a30')
  assert.equal(reset.day_dim, '#4f818c')
  assert.equal(reset.day_accent, '#0891b2')
  assert.equal(reset.day_accent2, '#0e7490')
  assert.equal(reset.day_accent_text, '#ffffff')
  assert.equal(reset.day_thumb_bg, '#78bac4')
  assert.equal(reset.day_modal_bg, '#000000')
  assert.equal(reset.night_bg, '#052529')
  assert.equal(reset.night_bg2, '#052529')
  assert.equal(reset.night_card, '#0c2029')
  assert.equal(reset.night_card2, '#0b5e75')
  assert.equal(reset.night_text, '#ffffff')
  assert.equal(reset.night_dim, '#ffffff')
  assert.equal(reset.night_accent, '#f5feff')
  assert.equal(reset.night_accent2, '#38bdf8')
  assert.equal(reset.night_accent_text, '#000000')
  assert.equal(reset.night_thumb_bg, '#13333a')
  assert.equal(reset.night_modal_bg, '#06171c')
  assert.equal(reset.day_cta_bg, approved.day_cta_bg)
  assert.equal(reset.night_modal_bg_image, approved.night_modal_bg_image)
  assert.equal(reset.site_name, current.site_name)
  assert.equal(reset.site_name_ka, current.site_name_ka)
  assert.equal(reset.logo_url, current.logo_url)
  assert.equal(reset.hero_image_url, current.hero_image_url)
  assert.equal(Object.hasOwn(reset, 'item_view_123'), false)
  assert.equal(Object.hasOwn(reset, 'phone_layout'), false)
})
