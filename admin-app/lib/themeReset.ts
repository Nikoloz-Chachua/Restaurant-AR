import { TEMPLATE_PRESETS, type StarterTemplateKey, type ThemeConfig } from './themePresets.ts'
import type { RoleId } from './usePlan.ts'

export const BRANDING_KEYS = ['site_name', 'site_name_ka', 'logo_url', 'hero_logo_url', 'hero_image_url', 'hero_images'] as const

const MONDAY_GREENS_APPROVED_THEME = Object.freeze({
  night_bg: '#052529', night_bg2: '#052529', night_card: '#0c2029', night_card2: '#0b5e75', night_border: 'rgba(34,211,238,0.22)',
  night_text: '#ffffff', night_dim: '#ffffff', night_accent: '#f5feff', night_accent2: '#38bdf8', night_accent_text: '#000000', night_thumb_bg: '#13333a', night_modal_bg: '#06171c',
  night_glow: 'rgba(34,211,238,0.30)', night_glow2: 'rgba(56,189,248,0.24)', night_shadow: 'rgba(0,0,0,0.55)',
  night_bg_image: 'linear-gradient(180deg, var(--bg) 0%, var(--bg) 100%)',
  night_bg_size: 'auto', night_bg_repeat: 'no-repeat',
  night_card_bg: 'linear-gradient(158deg, #0c2029 0%, #123039 100%)', night_card_radius: '18px', night_card_blur: '0px',
  night_stage_bg: 'radial-gradient(85% 68% at 50% 18%, rgba(34,211,238,0.16), transparent 72%), #08222a',
  night_pill_bg: 'rgba(12,32,41,0.92)', night_pill_active_bg: 'linear-gradient(120deg, #22d3ee, #38bdf8)',
  night_cta_bg: 'linear-gradient(120deg, #22d3ee, #38bdf8)', night_cta_shadow: '0 7px 20px rgba(34,211,238,0.24)',
  night_hero_color: '#22d3ee', night_hero_shadow: '0 2px 18px rgba(34,211,238,0.24)', night_divider_bg: 'linear-gradient(90deg, transparent, #38bdf8, transparent)',
  night_accent_edge: 'linear-gradient(180deg, #22d3ee, #38bdf8)', night_thumb_vignette: 'radial-gradient(ellipse at center, transparent 34%, rgba(12,32,41,0.80) 100%)',
  night_item_shadow: '0 4px 14px rgba(0,0,0,0.5)', night_item_hover_shadow: '0 12px 26px rgba(0,0,0,0.56)',
  night_modal_bg_image: 'radial-gradient(70% 48% at 50% 36%, rgba(34,211,238,0.18) 0%, transparent 62%), radial-gradient(130% 100% at 50% 50%, #0a2630 0%, #06171c 72%)',
  day_bg: '#36a1b0', day_bg2: '#36a1b0', day_card: '#e6dbdb', day_card2: '#e6fbff', day_border: 'rgba(6,120,150,0.20)',
  day_text: '#0b2a30', day_dim: '#4f818c', day_accent: '#0891b2', day_accent2: '#0e7490', day_accent_text: '#ffffff', day_thumb_bg: '#78bac4', day_modal_bg: '#000000',
  day_glow: 'rgba(94,255,228,0.90)', day_glow2: 'rgba(6,140,150,0.18)', day_shadow: 'rgba(6,58,66,0.18)',
  day_bg_image: 'linear-gradient(180deg, var(--bg) 0%, var(--bg) 100%)',
  day_bg_size: 'auto', day_bg_repeat: 'no-repeat',
  day_card_bg: 'linear-gradient(158deg, #ffffff 0%, #ecf8f8 100%)', day_card_radius: '18px', day_card_blur: '0px',
  day_stage_bg: 'radial-gradient(85% 68% at 50% 18%, rgba(6,140,150,0.12), transparent 72%), #e4f4f4',
  day_pill_bg: 'rgba(255,255,255,0.86)', day_pill_active_bg: 'linear-gradient(120deg, #0891b2, #0e7490)',
  day_cta_bg: 'linear-gradient(120deg, #0891b2, #0e7490)', day_cta_shadow: '0 7px 20px rgba(8,145,178,0.20)',
  day_hero_color: '#0e7490', day_hero_shadow: '0 2px 14px rgba(8,145,178,0.18)', day_divider_bg: 'linear-gradient(90deg, transparent, #0e7490, transparent)',
  day_accent_edge: 'linear-gradient(180deg, #0e7490, #0b5566)', day_thumb_vignette: 'radial-gradient(ellipse at center, transparent 36%, rgba(215,246,251,0.85) 100%)',
  day_item_shadow: '0 4px 14px rgba(6,58,66,0.14)', day_item_hover_shadow: '0 12px 26px rgba(6,58,66,0.18)',
  day_modal_bg_image: 'radial-gradient(70% 48% at 50% 36%, rgba(6,140,150,0.13) 0%, transparent 62%), radial-gradient(130% 100% at 50% 50%, #bfe7ec 0%, #eafafb 72%)',
  font_body: 'Nunito', font_heading: 'Fraunces', template_key: 'monday_greens',
} satisfies ThemeConfig)

const TENANT_RESET_TEMPLATE_KEYS: Record<string, StarterTemplateKey> = {
  'monday-greens': 'monday_greens',
}

const TENANT_APPROVED_RESET_VALUES: Record<string, Readonly<ThemeConfig>> = {
  'monday-greens': MONDAY_GREENS_APPROVED_THEME,
}

export function canManageThemeTemplates(role: RoleId): boolean {
  return role === 'super_admin'
}

export function approvedTemplateKeyForTenant(restaurantSlug?: string | null): StarterTemplateKey | null {
  return restaurantSlug ? TENANT_RESET_TEMPLATE_KEYS[restaurantSlug] ?? null : null
}

export function assignedTemplateKeyForSave(
  currentConfig: ThemeConfig,
  restaurantSlug?: string | null,
  loadedTemplateKey?: string,
): string {
  return approvedTemplateKeyForTenant(restaurantSlug) ?? loadedTemplateKey ?? currentConfig.template_key ?? TEMPLATE_PRESETS[0].key
}

export function buildThemeResetConfig(config: ThemeConfig, restaurantSlug?: string | null): ThemeConfig {
  const approvedTenantValues = restaurantSlug ? TENANT_APPROVED_RESET_VALUES[restaurantSlug] : undefined
  const preservedBranding = Object.fromEntries(
    BRANDING_KEYS
      .filter(key => Object.prototype.hasOwnProperty.call(config, key))
      .map(key => [key, config[key]]),
  )

  if (approvedTenantValues) {
    return { ...approvedTenantValues, ...preservedBranding }
  }

  const templateKey = config.template_key as StarterTemplateKey | undefined
  const preset = TEMPLATE_PRESETS.find(item => item.key === templateKey) ?? TEMPLATE_PRESETS[0]

  return { ...preset.values, ...preservedBranding, template_key: preset.key }
}

export function clientSafeThemeConfigForSave(
  config: ThemeConfig,
  restaurantSlug?: string | null,
  loadedTemplateKey?: string,
): ThemeConfig {
  return {
    ...config,
    template_key: assignedTemplateKeyForSave(config, restaurantSlug, loadedTemplateKey),
  }
}

export function tenantResetValuesForTest(restaurantSlug: string): ThemeConfig | null {
  return TENANT_APPROVED_RESET_VALUES[restaurantSlug] ? { ...TENANT_APPROVED_RESET_VALUES[restaurantSlug] } : null
}
