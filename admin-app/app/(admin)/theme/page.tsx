'use client'
import { useEffect, useState, useCallback, useMemo, type CSSProperties } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/useLang'
import type { Translations } from '@/lib/i18n'
import { usePlan } from '@/lib/usePlan'
import LockedCard from '@/components/LockedCard'
import { TEMPLATE_PRESETS, type ThemeConfig } from '@/lib/themePresets'

// Per-tenant editorial copy rendered by templates that have hero/visit sections.
// Kept in one list so the editor rows, the preserve-on-template-switch set and the
// customer app's token names cannot drift apart.
const CONTENT_FIELDS = [
  { key: 'hero_kicker',              label: 'contentHeroKicker' },
  { key: 'hero_kicker_ka',           label: 'contentHeroKickerKa' },
  { key: 'hero_copy',                label: 'contentHeroCopy' },
  { key: 'hero_copy_ka',             label: 'contentHeroCopyKa' },
  { key: 'hero_cta',                 label: 'contentHeroCta' },
  { key: 'hero_cta_ka',              label: 'contentHeroCtaKa' },
  { key: 'info_kicker',              label: 'contentInfoKicker' },
  { key: 'info_kicker_ka',           label: 'contentInfoKickerKa' },
  { key: 'info_title',               label: 'contentInfoTitle' },
  { key: 'info_title_ka',            label: 'contentInfoTitleKa' },
  { key: 'info_text',                label: 'contentInfoText' },
  { key: 'info_text_ka',             label: 'contentInfoTextKa' },
  { key: 'info_directions_label',    label: 'contentDirectionsLabel' },
  { key: 'info_directions_label_ka', label: 'contentDirectionsLabelKa' },
  { key: 'info_directions_url',      label: 'contentDirectionsUrl' },
  { key: 'info_instagram_label',     label: 'contentInstagramLabel' },
  { key: 'info_instagram_url',       label: 'contentInstagramUrl' },
] as const

// Templates that render the editorial copy above.
const CONTENT_TEMPLATES = new Set(['baoma'])

const CONTENT_KEYS = [...CONTENT_FIELDS.map(f => f.key), 'info_image_url']

// Content survives a template switch — it describes the restaurant, not the look.
const BRANDING_KEYS = ['site_name', 'site_name_ka', 'logo_url', 'hero_logo_url', 'hero_image_url', 'hero_images', ...CONTENT_KEYS]

// The hero gallery is stored in theme_config.hero_images as a JSON array of URLs.
// Older rows may hold a comma/newline list, so accept that shape too.
function parseHeroImages(raw?: string): string[] {
  const s = (raw || '').trim()
  if (!s) return []
  let list: unknown[] = []
  if (s[0] === '[') { try { list = JSON.parse(s) } catch { list = [] } }
  if (!list.length) list = s.replace(/^\[|\]$/g, '').split(/[,;\n]/)
  const out: string[] = []
  list.forEach(v => {
    const url = String(v).replace(/^["'\s]+|["'\s]+$/g, '')
    if (url && !out.includes(url)) out.push(url)
  })
  return out
}

const NIGHT_FIELDS: { key: string; tKey: keyof Translations }[] = [
  { key: 'night_bg',          tKey: 'colorBg' },
  { key: 'night_card',        tKey: 'colorCard' },
  { key: 'night_card2',       tKey: 'colorCard2' },
  { key: 'night_border',      tKey: 'colorBorder' },
  { key: 'night_text',        tKey: 'colorText' },
  { key: 'night_dim',         tKey: 'colorDim' },
  { key: 'night_accent',      tKey: 'colorAccent' },
  { key: 'night_accent_text', tKey: 'colorAccentText' },
  { key: 'night_price_color', tKey: 'colorPrice' },
  { key: 'night_badge_bg',    tKey: 'colorBadge' },
  { key: 'night_add_btn_color', tKey: 'colorAddBtn' },
  { key: 'night_thumb_bg',    tKey: 'colorThumbBg' },
  { key: 'night_modal_bg',    tKey: 'colorModalBg' },
]
const DAY_FIELDS: { key: string; tKey: keyof Translations }[] = [
  { key: 'day_bg',          tKey: 'colorBg' },
  { key: 'day_card',        tKey: 'colorCard' },
  { key: 'day_card2',       tKey: 'colorCard2' },
  { key: 'day_border',      tKey: 'colorBorder' },
  { key: 'day_text',        tKey: 'colorText' },
  { key: 'day_dim',         tKey: 'colorDim' },
  { key: 'day_accent',      tKey: 'colorAccent' },
  { key: 'day_accent_text', tKey: 'colorAccentText' },
  { key: 'day_price_color', tKey: 'colorPrice' },
  { key: 'day_badge_bg',    tKey: 'colorBadge' },
  { key: 'day_add_btn_color', tKey: 'colorAddBtn' },
  { key: 'day_thumb_bg',    tKey: 'colorThumbBg' },
  { key: 'day_modal_bg',    tKey: 'colorModalBg' },
]

const GOOGLE_FONTS = [
  'Nunito', 'Bebas Neue', 'Inter', 'Roboto', 'Lato', 'Poppins',
  'Playfair Display', 'Montserrat', 'Raleway', 'Open Sans',
  'Source Sans 3', 'Oswald', 'PT Serif', 'Merriweather',
]

function isColor(v: string) {
  return /^#[0-9a-fA-F]{3,8}$/.test(v) || v.startsWith('rgb')
}

function toHex(v: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v
  if (/^#[0-9a-fA-F]{3}$/.test(v)) {
    const m = v.match(/#(.)(.)(.)/)
    if (m) return `#${m[1]}${m[1]}${m[2]}${m[2]}${m[3]}${m[3]}`
  }
  return '#000000'
}

// Pull the plain URL out of a CSS `url("…")` background-image value (empty if it's a
// gradient, `none`, or unset — so the picker only previews an actual uploaded image).
function bgImageUrl(v?: string): string {
  const m = /url\(["']?([^"')]+)["']?\)/.exec(v || '')
  return m ? m[1] : ''
}

function currentTemplateDefaults(config: ThemeConfig, restaurantSlug?: string | null): ThemeConfig {
  const templateKey = config.template_key
  const preset = TEMPLATE_PRESETS.find(item => item.key === templateKey)
    ?? (restaurantSlug === 'monday-greens' ? TEMPLATE_PRESETS.find(item => item.key === 'monday_greens') : undefined)
    ?? TEMPLATE_PRESETS[0]
  const preservedBranding = Object.fromEntries(
    BRANDING_KEYS
      .filter(key => Object.prototype.hasOwnProperty.call(config, key))
      .map(key => [key, config[key]]),
  )
  return { ...preset.values, ...preservedBranding, template_key: preset.key }
}

// Logo / hero images are converted to WebP client-side, then uploaded straight to R2
// via the presigned PUT (same path as menu thumbnails). Images are allowed for clients;
// only GLB/USDZ models are super-admin-only.
async function toWebP(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      canvas.getContext('2d')!.drawImage(img, 0, 0)
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('Conversion failed')), 'image/webp', 0.9)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not load image')) }
    img.src = url
  })
}

// ── Contrast (WCAG) ───────────────────────────────────────────────────
// Each editable color is checked against the surface it sits on; a row warns
// when the ratio drops below 3:1 (the large/UI-text threshold). `against` = the
// row is foreground text over that key; `fg` = the row is a background and that
// key is the text on it.
const CONTRAST: Record<string, { against?: string; fg?: string }> = {
  text:          { against: 'card' },
  dim:           { against: 'card' },
  price_color:   { against: 'card' },
  add_btn_color: { against: 'card' },
  accent_text:   { against: 'accent' },
  badge_bg:      { fg: 'accent_text' },
  modal_bg:      { fg: 'dim' },
  bg:            { fg: 'text' },
  card:          { fg: 'text' },
  card2:         { fg: 'text' },
}
function hexToRgb(h: string): [number, number, number] | null {
  let s = (h || '').trim().replace('#', '')
  if (s.length === 3) s = s.split('').map(c => c + c).join('')
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return null
  return [0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16)) as [number, number, number]
}
function relLum([r, g, b]: [number, number, number]): number {
  const a = [r, g, b].map(v => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4) })
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]
}
function contrastRatio(a: string, b: string): number | null {
  const c1 = hexToRgb(a), c2 = hexToRgb(b)
  if (!c1 || !c2) return null
  const L1 = relLum(c1), L2 = relLum(c2), hi = Math.max(L1, L2), lo = Math.min(L1, L2)
  return (hi + 0.05) / (lo + 0.05)
}
// Effective on-screen color for a base field — mirrors the preview's fallbacks.
function effColor(field: string, mode: string, config: ThemeConfig): string | undefined {
  const v = config[`${mode}_${field}`]
  if (field === 'price_color')   return v || config[`${mode}_hero_color`] || config[`${mode}_accent`]
  if (field === 'add_btn_color') return v || config[`${mode}_accent`]
  if (field === 'badge_bg')      return v || config[`${mode}_accent`]
  return v
}
// The failing ratio (< 3) for a field key like "night_text", or null if fine/N-A.
function rowWarnRatio(fieldKey: string, config: ThemeConfig): number | null {
  const m = fieldKey.startsWith('day_') ? 'day' : 'night'
  const field = fieldKey.replace(/^(night|day)_/, '')
  const spec = CONTRAST[field]
  if (!spec) return null
  const fg = effColor(spec.fg || field, m, config)
  const bg = effColor(spec.against || field, m, config)
  if (!fg || !bg) return null
  const r = contrastRatio(fg, bg)
  return r != null && r < 3 ? r : null
}

export default function ThemePage() {
  const supabase = createClient()
  const [T] = useLang()
  const plan = usePlan()
  const [config, setConfig]   = useState<ThemeConfig>({})
  const [savedConfig, setSavedConfig] = useState<ThemeConfig>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState('')
  const [tab, setTab]         = useState<'templates' | 'night' | 'day' | 'background' | 'fonts' | 'branding'>('templates')
  const [flashKey, setFlashKey]       = useState<string | null>(null)
  const [pendingPick, setPendingPick] = useState<string | null>(null)
  const text = useCallback((template: string, values: Record<string, string | number>) => (
    Object.entries(values).reduce(
      (result, [key, value]) => result.replace(`{${key}}`, String(value)),
      template,
    )
  ), [])

  // Unsaved-changes tracking: compare the working config against the last
  // persisted snapshot (order-independent).
  const dirty = useMemo(
    () => JSON.stringify(Object.entries(config).sort()) !== JSON.stringify(Object.entries(savedConfig).sort()),
    [config, savedConfig],
  )

  const load = useCallback(async () => {
    if (plan.loading || !plan.canUseTheme || !plan.restaurantId) {
      setLoading(plan.loading)
      return
    }
    const { data } = await supabase.from('theme_config').select('key,value').eq('restaurant_id', plan.restaurantId)
    const map: ThemeConfig = {}
    data?.forEach(r => { map[r.key] = r.value })
    setConfig(map)
    setSavedConfig(map)
    setLoading(false)
  }, [plan.canUseTheme, plan.loading, plan.restaurantId, supabase])

  useEffect(() => { void Promise.resolve().then(load) }, [load])

  // Leave guard #1 — warn on refresh / tab-close / external navigation.
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  // Leave guard #2 — confirm before an in-app (SPA) navigation away, e.g. the
  // sidebar links. Capture-phase so it runs before Next's <Link> click handler;
  // cancelling blocks the navigation. Skips new-tab / external / hash / modified
  // clicks (those don't lose the current edits).
  useEffect(() => {
    if (!dirty) return
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as HTMLElement).closest('a')
      const href = a?.getAttribute('href')
      if (!a || !href || a.target === '_blank' || href.startsWith('#') || /^[a-z]+:\/\//i.test(href)) return
      if (!window.confirm(T.unsavedLeave)) { e.preventDefault(); e.stopPropagation() }
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [dirty, T])

  // Click-to-edit: a preview element asks to edit `field` in `m` (night/day).
  // Switch to that tab, then (after it renders) scroll the row into view, flash
  // it, and open its color picker.
  const pickField = useCallback((m: 'night' | 'day', field: string) => {
    setTab(m)
    setPendingPick(`${m}_${field}`)
  }, [])
  useEffect(() => {
    if (!pendingPick) return
    const raf = requestAnimationFrame(() => {
      const row = document.getElementById(`crow-${pendingPick}`)
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' })
        const input = row.querySelector('input[type=color]') as (HTMLInputElement & { showPicker?: () => void }) | null
        try { input?.showPicker?.() } catch { input?.focus() }
      }
      setFlashKey(pendingPick)
      setPendingPick(null)
    })
    return () => cancelAnimationFrame(raf)
  }, [pendingPick, tab])
  useEffect(() => {
    if (!flashKey) return
    const t = setTimeout(() => setFlashKey(null), 1300)
    return () => clearTimeout(t)
  }, [flashKey])

  const [uploadingKey, setUploadingKey] = useState('')

  function set(key: string, value: string) {
    setConfig(c => ({ ...c, [key]: value }))
  }

  function setColor(key: string, value: string) {
    setConfig(current => {
      const next = { ...current, [key]: value }
      if ((key === 'night_bg' || key === 'day_bg') && value.trim()) {
        const prefix = key === 'night_bg' ? 'night' : 'day'
        next[`${prefix}_bg2`] = value
        next[`${prefix}_bg_image`] = 'linear-gradient(180deg, var(--bg) 0%, var(--bg) 100%)'
        next[`${prefix}_bg_size`] = 'auto'
        next[`${prefix}_bg_repeat`] = 'no-repeat'
      }
      // The thumbnail stage renders with --stage-bg and the modal with
      // --modal-bg-image; templates set those explicitly, which would override
      // a plain thumb_bg / modal_bg color and make the picker look like it does
      // nothing. Re-link the derived token to the chosen color so it takes.
      if ((key === 'night_thumb_bg' || key === 'day_thumb_bg') && value.trim()) {
        const prefix = key === 'night_thumb_bg' ? 'night' : 'day'
        next[`${prefix}_stage_bg`] = 'var(--thumb-bg)'
      }
      if ((key === 'night_modal_bg' || key === 'day_modal_bg') && value.trim()) {
        const prefix = key === 'night_modal_bg' ? 'night' : 'day'
        next[`${prefix}_modal_bg_image`] = 'linear-gradient(180deg, var(--modal-bg) 0%, var(--modal-bg) 100%)'
      }
      return next
    })
  }

  async function uploadImage(key: string, file: File) {
    if (!file.type.startsWith('image/')) { setMsg(T.onlyImageFiles); return }
    setUploadingKey(key)
    try {
      const blob = await toWebP(file)
      const filename = file.name.replace(/\.[^.]+$/i, '.webp')
      const res = await fetch('/api/r2-presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, restaurantId: plan.restaurantId, restaurantSlug: plan.restaurantSlug }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Server error ${res.status}`)
      const { uploadUrl, publicUrl } = await res.json()
      const up = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'image/webp' }, body: blob })
      if (!up.ok) throw new Error(`R2 upload failed: ${up.status}`)
      set(key, publicUrl)
      setMsg(T.imageUploaded)
    } catch (e) {
      setMsg(text(T.uploadFailed, { message: e instanceof Error ? e.message : String(e) }))
    }
    setUploadingKey('')
  }

  // ── Hero gallery ───────────────────────────────────────────────────────────
  // Photos live in hero_images (JSON array). hero_image_url is kept in sync with the
  // first photo, so the single-image fallback keeps working everywhere.
  const heroImages = parseHeroImages(config.hero_images)

  function writeHeroImages(list: string[]) {
    setConfig(c => ({ ...c, hero_images: JSON.stringify(list), hero_image_url: list[0] ?? '' }))
  }

  // Appends against the freshest config, so uploading several files can't drop any.
  function appendHeroImages(urls: string[]) {
    setConfig(c => {
      const current = parseHeroImages(c.hero_images)
      const merged = [...current, ...urls.filter(u => !current.includes(u))]
      return { ...c, hero_images: JSON.stringify(merged), hero_image_url: merged[0] ?? '' }
    })
  }

  async function uploadHeroImages(files: File[]) {
    const picked = files.filter(f => f.type.startsWith('image/'))
    if (!picked.length) { setMsg(T.onlyImageFiles); return }
    setUploadingKey('hero_images')
    const added: string[] = []
    try {
      for (const file of picked) {
        const blob = await toWebP(file)
        const filename = file.name.replace(/\.[^.]+$/i, '.webp')
        const res = await fetch('/api/r2-presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename, restaurantId: plan.restaurantId, restaurantSlug: plan.restaurantSlug }),
        })
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Server error ${res.status}`)
        const { uploadUrl, publicUrl } = await res.json()
        const up = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'image/webp' }, body: blob })
        if (!up.ok) throw new Error(`R2 upload failed: ${up.status}`)
        added.push(publicUrl)
      }
      appendHeroImages(added)
      setMsg(text(T.heroPhotosUploaded, { count: added.length }))
    } catch (e) {
      setMsg(text(T.uploadFailed, { message: e instanceof Error ? e.message : String(e) }))
    }
    setUploadingKey('')
  }

  function removeHeroImage(index: number) {
    writeHeroImages(heroImages.filter((_, n) => n !== index))
  }

  function moveHeroImage(index: number, dir: -1 | 1) {
    const to = index + dir
    if (to < 0 || to >= heroImages.length) return
    const list = [...heroImages]
    const held = list[index]
    list[index] = list[to]
    list[to] = held
    writeHeroImages(list)
  }

  // Background images set the CSS background-image token (url(...)) plus cover/no-repeat,
  // so an uploaded photo fills the whole menu backdrop.
  async function uploadBgImage(mode: 'night' | 'day', file: File) {
    if (!file.type.startsWith('image/')) { setMsg(T.onlyImageFiles); return }
    const key = `${mode}_bg_image`
    setUploadingKey(key)
    try {
      const blob = await toWebP(file)
      const filename = file.name.replace(/\.[^.]+$/i, '.webp')
      const res = await fetch('/api/r2-presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, restaurantId: plan.restaurantId, restaurantSlug: plan.restaurantSlug }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Server error ${res.status}`)
      const { uploadUrl, publicUrl } = await res.json()
      const up = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'image/webp' }, body: blob })
      if (!up.ok) throw new Error(`R2 upload failed: ${up.status}`)
      set(key, `url("${publicUrl}")`)
      set(`${mode}_bg_size`, 'cover')
      set(`${mode}_bg_repeat`, 'no-repeat')
      setMsg(T.backgroundImageUploaded)
    } catch (e) {
      setMsg(text(T.uploadFailed, { message: e instanceof Error ? e.message : String(e) }))
    }
    setUploadingKey('')
  }

  async function save() {
    setSaving(true)
    const rows = Object.entries(config).map(([key, value]) => ({ key, value, restaurant_id: plan.restaurantId }))
    await supabase.from('theme_config').upsert(rows, { onConflict: 'restaurant_id,key' })
    setSavedConfig({ ...config })
    setSaving(false)
    setMsg(T.saved)
    setTimeout(() => setMsg(''), 4000)
  }

  async function reset() {
    if (!confirm(T.resetConfirm)) return
    const next = currentTemplateDefaults(config, plan.restaurantSlug)
    const rows = Object.entries(next).map(([key, value]) => ({ key, value, restaurant_id: plan.restaurantId }))
    const { error } = await supabase.from('theme_config').upsert(rows, { onConflict: 'restaurant_id,key' })
    if (error) {
      setMsg(text(T.resetFailed, { message: error.message }))
      setTimeout(() => setMsg(''), 5000)
      return
    }
    setConfig(next)
    setSavedConfig({ ...next })
    setMsg(T.resetDone)
    setTimeout(() => setMsg(''), 3000)
  }

  // Legibility hint for a color row (or null). Built here so it can be localized.
  const warnText = (key: string): string | null => {
    const r = rowWarnRatio(key, config)
    return r != null ? `${T.contrastLow} (${r.toFixed(1)}:1)` : null
  }

  const tabs = [
    { id: 'templates', label: T.tabPresets },
    { id: 'night',     label: T.tabNight },
    { id: 'day',       label: T.tabDay },
    { id: 'background', label: T.tabBackground },
    { id: 'fonts',     label: T.tabFonts },
    { id: 'branding',  label: T.tabBranding },
  ] as const

  if (!plan.loading && !plan.restaurantId) {
    return (
      <div className="max-w-xl rounded-xl p-6" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <div className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--dim)' }}>
          {T.tenantRequired}
        </div>
        <h1 className="text-xl md:text-2xl font-bold page-title" style={{ color: 'var(--gold)' }}>
          {T.noRestaurantMapped}
        </h1>
        <p className="text-sm mt-2 leading-6" style={{ color: 'var(--dim)' }}>
          {T.noRestaurantThemeDesc}
        </p>
      </div>
    )
  }

  if (!plan.loading && !plan.canUseTheme) {
    return (
      <LockedCard
        title={T.themeLockedTitle}
        description={T.themeLockedDesc}
        planLabel={plan.label}
      />
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold page-title" style={{ color: 'var(--gold)' }}>{T.themeTitle}</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--dim)' }}>{T.themeDesc}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--dim)' }}>
            {T.tenantLabel}: <span style={{ color: 'var(--text)' }}>{plan.restaurantName}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {msg && (
            <span className="text-sm px-3 py-1.5 rounded-lg"
                  style={{ background: 'rgba(76,175,125,0.15)', color: 'var(--success)' }}>
              {msg}
            </span>
          )}
          {dirty && !msg && (
            <span className="text-sm px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5"
                  style={{ background: 'rgba(231,177,90,0.15)', color: 'var(--gold)' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--gold)' }} />
              {T.unsavedChanges}
            </span>
          )}
          <button onClick={reset}
                  className="px-4 py-2 rounded-lg text-sm"
                  style={{ color: 'var(--danger)', border: '1px solid rgba(224,82,82,0.3)' }}>
            {T.reset}
          </button>
          <button onClick={save} disabled={saving}
                  className="px-5 py-2 rounded-lg text-sm font-semibold"
                  style={{ background: 'var(--gold)', color: '#0f0b07',
                           opacity: saving ? 0.6 : dirty ? 1 : 0.65,
                           boxShadow: dirty && !saving ? '0 0 0 3px rgba(231,177,90,0.28)' : undefined,
                           transition: 'box-shadow .2s, opacity .2s' }}>
            {saving ? T.saving : T.saveChanges}
          </button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 items-start">
        {/* ── Left: editor controls (unchanged behaviour) ─────────────── */}
        <div className="w-full xl:flex-1 xl:min-w-0 xl:max-w-2xl">

      <div className="flex gap-1 mb-6 p-1 rounded-lg w-fit"
           style={{ background: 'var(--card)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
                  className="px-4 py-1.5 rounded-md text-sm font-medium transition-all"
                  style={{ background: tab === t.id ? 'var(--gold)' : 'transparent',
                           color: tab === t.id ? '#0f0b07' : 'var(--dim)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: 'var(--dim)' }}>{T.loading}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 max-w-2xl">
          {tab === 'templates' && (
            <div className="grid grid-cols-1 gap-3">
              {TEMPLATE_PRESETS.map(preset => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => {
                    setConfig(current => ({ ...current, ...preset.values }))
                    setMsg(text(T.templateLoaded, { name: preset.label }))
                  }}
                  className="text-left p-4 rounded-xl transition-colors"
                  style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }}
                >
                  <div className="flex items-center gap-3">
                    <TemplateSwatch values={preset.values} />
                    <div className="min-w-0">
                      <div className="font-semibold" style={{ color: 'var(--gold)' }}>{preset.label}</div>
                      <div className="text-sm mt-1" style={{ color: 'var(--dim)' }}>{preset.description}</div>
                    </div>
                  </div>
                </button>
              ))}
              <div className="text-xs leading-5" style={{ color: 'var(--dim)' }}>
                {T.templatesHint}
              </div>
            </div>
          )}
          {tab === 'night' && NIGHT_FIELDS.map(f => (
            <ColorRow key={f.key} fieldKey={f.key} label={T[f.tKey] as string} value={config[f.key] ?? ''}
                      flash={flashKey === f.key} warning={warnText(f.key)}
                      onChange={v => setColor(f.key, v)} />
          ))}
          {tab === 'day' && DAY_FIELDS.map(f => (
            <ColorRow key={f.key} fieldKey={f.key} label={T[f.tKey] as string} value={config[f.key] ?? ''}
                      flash={flashKey === f.key} warning={warnText(f.key)}
                      onChange={v => setColor(f.key, v)} />
          ))}
          {tab === 'background' && (
            <>
              <div className="p-4 rounded-xl text-sm leading-6"
                   style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--dim)' }}>
                {T.bgHint}
              </div>
              {(['night', 'day'] as const).map(mode => (
                <div key={mode} className="p-3 rounded-xl"
                     style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                  <div className="text-xs mb-3 uppercase tracking-widest" style={{ color: 'var(--gold)' }}>
                    {mode === 'night' ? T.tabNight : T.tabDay}
                  </div>
                  <ColorRow label={T.bgColor} value={config[`${mode}_bg`] ?? ''}
                            onChange={v => setColor(`${mode}_bg`, v)} />
                  <div className="mt-3">
                    <ImageUploadRow label={T.bgImageLabel} hint="" value={bgImageUrl(config[`${mode}_bg_image`])}
                                    uploading={uploadingKey === `${mode}_bg_image`}
                                    uploadLabel={T.uploadThumb} clearLabel={T.bgClearImage}
                                    previewAlt={T.imagePreviewAlt}
                                    onPick={f => uploadBgImage(mode, f)}
                                    onClear={() => set(`${mode}_bg_image`, 'none')} />
                  </div>
                </div>
              ))}
            </>
          )}
          {tab === 'fonts' && (
            <>
              <FontRow label={T.fontBody} preview={T.fontPreview} value={config.font_body ?? 'Nunito'}
                       onChange={v => set('font_body', v)} />
              <FontRow label={T.fontHeading} preview={T.fontPreview} value={config.font_heading ?? 'Bebas Neue'}
                       onChange={v => set('font_heading', v)} />
              <div className="mt-4 p-4 rounded-xl text-sm"
                   style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--dim)' }}>
                {T.fontNote}
                <a href="https://fonts.google.com" target="_blank" rel="noreferrer"
                   style={{ color: 'var(--gold)' }}>{T.fontNoteLink}</a>
                {T.fontNoteEnd}
              </div>
            </>
          )}
          {tab === 'branding' && (
            <>
              <BrandRow label={T.brandNameEn} value={config.site_name ?? ''}
                        onChange={v => set('site_name', v)} />
              <BrandRow label={T.brandNameKa} value={config.site_name_ka ?? ''}
                        onChange={v => set('site_name_ka', v)} />
              <ImageUploadRow label={T.brandLogo} hint={T.brandLogoHint} value={config.logo_url ?? ''}
                              uploading={uploadingKey === 'logo_url'} uploadLabel={T.uploadThumb} clearLabel={T.clearThumb}
                              previewAlt={T.imagePreviewAlt}
                              onPick={f => uploadImage('logo_url', f)} onClear={() => set('logo_url', '')} />
              {/* The old single "Hero image" row was removed: the gallery replaces it
                  (one photo = a still hero, two or more crossfade). hero_image_url is
                  still written automatically from the first gallery photo, so the menu
                  fallback and older builds keep working. */}
              <HeroGalleryRow label={T.brandHeroGallery} hint={T.brandHeroGalleryHint}
                              images={heroImages} uploading={uploadingKey === 'hero_images'}
                              addLabel={T.heroAddImages} removeLabel={T.heroRemove}
                              upLabel={T.heroMoveUp} downLabel={T.heroMoveDown}
                              emptyLabel={T.heroEmpty} previewAlt={T.imagePreviewAlt}
                              onPick={uploadHeroImages} onRemove={removeHeroImage} onMove={moveHeroImage} />
              {/* Templates that render editorial copy of their own expose it here, so a
                  tenant's wording, address and links are data the owner controls rather
                  than strings baked into the customer app. Only shown for templates that
                  actually have these sections. */}
              {CONTENT_TEMPLATES.has(config.template_key ?? '') && (
                <>
                  <div className="pt-2">
                    <div className="text-sm font-semibold" style={{ color: 'var(--gold)' }}>{T.contentHeading}</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--dim)' }}>{T.contentHint}</div>
                  </div>
                  {CONTENT_FIELDS.map(f => (
                    <BrandRow key={f.key} label={T[f.label]} value={config[f.key] ?? ''}
                              onChange={v => set(f.key, v)} />
                  ))}
                  <ImageUploadRow label={T.contentInfoImage} hint={T.contentInfoImageHint}
                                  value={config.info_image_url ?? ''}
                                  uploading={uploadingKey === 'info_image_url'}
                                  uploadLabel={T.uploadThumb} clearLabel={T.clearThumb}
                                  previewAlt={T.imagePreviewAlt}
                                  onPick={f => uploadImage('info_image_url', f)}
                                  onClear={() => set('info_image_url', '')} />
                </>
              )}
            </>
          )}
        </div>
      )}

      <div className="mt-8 p-4 rounded-xl text-sm"
           style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <span style={{ color: 'var(--dim)' }}>{T.reloadHint}</span>
        {(() => {
          // Link to THIS tenant's live menu (base + ?tenant=<slug>), matching how the
          // customer app resolves tenants — not a bare, tenant-less URL.
          const base = (process.env.NEXT_PUBLIC_CUSTOMER_APP_URL || 'https://restaurant-ar.pages.dev').replace(/\/$/, '')
          const url = plan.restaurantSlug ? `${base}/?tenant=${encodeURIComponent(plan.restaurantSlug)}` : base
          return (
            <a href={url} target="_blank" rel="noreferrer" style={{ color: 'var(--gold)' }}>
              {url.replace(/^https?:\/\//, '')} ↗
            </a>
          )
        })()}
      </div>
        </div>

        {/* ── Right: live preview ─────────────────────────────────────── */}
        <ThemePreview config={config} activeTab={tab} onPick={pickField} />
      </div>
    </div>
  )
}

function ColorRow({ fieldKey, label, value, onChange, flash, warning }:
  { fieldKey?: string; label: string; value: string; onChange: (v: string) => void; flash?: boolean; warning?: string | null }) {
  const colorVal = isColor(value) ? toHex(value) : '#000000'
  const borderColor = flash ? 'var(--gold)' : warning ? 'rgba(224,83,60,0.55)' : 'var(--border)'
  return (
    <div id={fieldKey ? `crow-${fieldKey}` : undefined}
         className="flex items-center gap-4 p-3 rounded-xl"
         style={{ background: 'var(--card)', border: `1px solid ${borderColor}`,
                  boxShadow: flash ? '0 0 0 3px rgba(231,177,90,0.35)' : undefined,
                  transition: 'box-shadow .2s, border-color .2s' }}>
      <input type="color" value={colorVal} onChange={e => onChange(e.target.value)}
             style={{ width: 44, height: 36, padding: '2px 4px', flexShrink: 0 }} />
      <div className="flex-1">
        <div className="text-xs mb-1 uppercase tracking-widest" style={{ color: 'var(--dim)' }}>
          {label}
        </div>
        <input value={value} onChange={e => onChange(e.target.value)}
               style={{ fontSize: '0.8rem', padding: '4px 8px' }}
               placeholder="#rrggbb or rgba(…)" />
      </div>
      {warning && (
        <span title={warning} className="shrink-0" style={{ cursor: 'help', lineHeight: 0 }}>
          <svg width="17" height="15" viewBox="0 0 16 14" aria-hidden="true">
            <path d="M8 1.4 L15 12.6 H1 Z" fill="none" stroke="#e0533c" strokeWidth="1.5" strokeLinejoin="round" />
            <line x1="8" y1="5.4" x2="8" y2="8.8" stroke="#e0533c" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="8" cy="10.9" r="0.9" fill="#e0533c" />
          </svg>
        </span>
      )}
      <div className="w-10 h-8 rounded-md border shrink-0"
           style={{ background: value, borderColor: 'var(--border)' }} />
    </div>
  )
}

function TemplateSwatch({ values }: { values: ThemeConfig }) {
  return (
    <span
      className="relative block h-14 w-20 shrink-0 overflow-hidden rounded-lg"
      style={{
        background: values.day_bg_image ?? `linear-gradient(135deg, ${values.day_bg}, ${values.day_bg2 ?? values.day_bg})`,
        border: `1px solid ${values.day_border ?? 'var(--border)'}`,
      }}
      aria-hidden="true"
    >
      <span
        className="absolute left-2 top-2 h-8 w-11 rounded-md"
        style={{
          background: values.day_card_bg ?? `linear-gradient(135deg, ${values.day_card}, ${values.day_card2 ?? values.day_card})`,
          boxShadow: values.day_item_shadow ?? '0 4px 12px rgba(0,0,0,0.12)',
        }}
      />
      <span
        className="absolute bottom-2 right-2 h-4 w-9 rounded-full"
        style={{ background: values.day_cta_bg ?? values.day_accent }}
      />
    </span>
  )
}

function FontRow({ label, value, preview, onChange }: { label: string; value: string; preview: string; onChange: (v: string) => void }) {
  const [T] = useLang()

  return (
    <div className="p-3 rounded-xl"
         style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <div className="text-xs mb-2 uppercase tracking-widest" style={{ color: 'var(--dim)' }}>{label}</div>
      <div className="flex gap-3">
        <select value={GOOGLE_FONTS.includes(value) ? value : 'custom'}
                onChange={e => { if (e.target.value !== 'custom') onChange(e.target.value) }}
                style={{ flex: '0 0 200px' }}>
          {GOOGLE_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
          <option value="custom">{T.customFontOption}</option>
        </select>
        <input value={value} onChange={e => onChange(e.target.value)}
               placeholder={T.fontPlaceholder} style={{ flex: 1 }} />
      </div>
      <div className="mt-2 text-lg" style={{ fontFamily: `'${value}', sans-serif`, color: 'var(--text)' }}>
        {preview}{value}
      </div>
    </div>
  )
}

// Multi-photo hero. Order matters (it's the order guests see), so each row carries
// up/down controls — arrows rather than drag, so it behaves the same on a phone.
function HeroGalleryRow({ label, hint, images, uploading, addLabel, removeLabel, upLabel, downLabel, emptyLabel, previewAlt, onPick, onRemove, onMove }: {
  label: string; hint: string; images: string[]; uploading: boolean
  addLabel: string; removeLabel: string; upLabel: string; downLabel: string
  emptyLabel: string; previewAlt: string
  onPick: (files: File[]) => void; onRemove: (index: number) => void; onMove: (index: number, dir: -1 | 1) => void
}) {
  const arrowBtn: CSSProperties = {
    background: 'var(--card2)', color: 'var(--gold)',
    border: '1px solid var(--border)', borderRadius: 6,
    width: 28, height: 28, lineHeight: 1, cursor: 'pointer',
  }
  return (
    <div className="p-3 rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <div className="text-xs mb-2 uppercase tracking-widest" style={{ color: 'var(--dim)' }}>{label}</div>

      <label className="px-3 py-1.5 rounded text-xs font-medium cursor-pointer inline-block"
             style={{ background: 'var(--card2)', color: 'var(--gold)', border: '1px solid var(--border)', opacity: uploading ? 0.5 : 1 }}>
        {uploading ? '…' : addLabel}
        <input type="file" accept="image/*" multiple style={{ display: 'none' }} disabled={uploading}
               onChange={e => {
                 const files = Array.from(e.target.files || [])
                 if (files.length) onPick(files)
                 e.target.value = ''
               }} />
      </label>

      {images.length === 0 && (
        <p className="text-xs mt-3" style={{ color: 'var(--dim)' }}>{emptyLabel}</p>
      )}

      {images.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2 list-none p-0">
          {images.map((url, i) => (
            <li key={`${url}-${i}`} className="flex items-center gap-3 p-2 rounded-lg"
                style={{ background: 'var(--card2)', border: '1px solid var(--border)' }}>
              <span className="text-xs w-5 text-center shrink-0" style={{ color: 'var(--dim)' }}>{i + 1}</span>
              <img src={url} alt={previewAlt}
                   style={{ height: 44, width: 68, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />
              <span className="flex-1" />
              <button type="button" onClick={() => onMove(i, -1)} disabled={i === 0}
                      title={upLabel} aria-label={upLabel}
                      style={{ ...arrowBtn, opacity: i === 0 ? 0.35 : 1 }}>↑</button>
              <button type="button" onClick={() => onMove(i, 1)} disabled={i === images.length - 1}
                      title={downLabel} aria-label={downLabel}
                      style={{ ...arrowBtn, opacity: i === images.length - 1 ? 0.35 : 1 }}>↓</button>
              <button type="button" onClick={() => onRemove(i)} title={removeLabel} aria-label={removeLabel}
                      style={{ background: 'rgba(224,82,82,0.1)', color: 'var(--danger)',
                               border: '1px solid rgba(224,82,82,0.25)', borderRadius: 6,
                               width: 28, height: 28, lineHeight: 1, cursor: 'pointer' }}>×</button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs mt-2" style={{ color: 'var(--dim)' }}>{hint}</p>
    </div>
  )
}

function ImageUploadRow({ label, hint, value, uploading, uploadLabel, clearLabel, previewAlt, onPick, onClear }: {
  label: string; hint: string; value: string; uploading: boolean; uploadLabel: string; clearLabel: string; previewAlt: string
  onPick: (f: File) => void; onClear: () => void
}) {
  return (
    <div className="p-3 rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <div className="text-xs mb-2 uppercase tracking-widest" style={{ color: 'var(--dim)' }}>{label}</div>
      <div className="flex items-center gap-3 flex-wrap">
        <label className="px-3 py-1.5 rounded text-xs font-medium cursor-pointer"
               style={{ background: 'var(--card2)', color: 'var(--gold)', border: '1px solid var(--border)', opacity: uploading ? 0.5 : 1 }}>
          {uploading ? '…' : uploadLabel}
          <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploading}
                 onChange={e => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = '' }} />
        </label>
        {value && (
          <>
            <button type="button" onClick={onClear} className="px-3 py-1.5 rounded text-xs font-medium"
                    style={{ background: 'rgba(224,82,82,0.1)', color: 'var(--danger)', border: '1px solid rgba(224,82,82,0.25)' }}>
              {clearLabel}
            </button>
            <img src={value} alt={previewAlt}
                 style={{ height: 40, maxWidth: 120, objectFit: 'contain', borderRadius: 6, border: '1px solid var(--border)' }} />
          </>
        )}
      </div>
      <p className="text-xs mt-2" style={{ color: 'var(--dim)' }}>{hint}</p>
    </div>
  )
}

function BrandRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="p-3 rounded-xl"
         style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <div className="text-xs mb-2 uppercase tracking-widest" style={{ color: 'var(--dim)' }}>{label}</div>
      <input value={value} onChange={e => onChange(e.target.value)} />
    </div>
  )
}

// ── Live preview ──────────────────────────────────────────────────────
// Renders a faithful mock of the customer menu by scoping the SAME CSS
// variables the live site sets (see index.html → applyRemoteTheme varMap)
// onto a wrapper, from the current unsaved `config`. Read-only: it only
// consumes config, never writes it.

type PreviewMode = 'night' | 'day'
type PreviewDevice = 'desktop' | 'phone'

// Fallbacks for the 10 base color keys when a tenant hasn't set one — mirror
// the generic index.html :root so the mock is never blank.
const PREVIEW_DEFAULTS = {
  night: {
    bg: '#14100b', card: '#211a12', card2: '#2b2218', border: 'rgba(231,177,90,0.20)',
    text: '#f1e7d4', dim: '#9a8a70', accent: '#e7b15a', accent_text: '#14100b',
    thumb_bg: '#0d0a07', modal_bg: '#14100b',
  },
  day: {
    bg: '#f3e9d6', card: '#fbf4e4', card2: '#ecdcc0', border: 'rgba(176,122,30,0.22)',
    text: '#221a0e', dim: '#6b5a3c', accent: '#8c6014', accent_text: '#ffffff',
    thumb_bg: '#c8b898', modal_bg: '#f3e9d6',
  },
} as const

function ThemePreview({ config, activeTab, onPick }:
  { config: ThemeConfig; activeTab: string; onPick: (mode: PreviewMode, field: string) => void }) {
  const [T] = useLang()
  const [device, setDevice] = useState<PreviewDevice>('desktop')
  const [mode, setMode]     = useState<PreviewMode>('night')

  // Follow the editor into the palette being edited (night/day tabs).
  useEffect(() => {
    if (activeTab === 'day') setMode('day')
    else if (activeTab === 'night') setMode('night')
  }, [activeTab])

  // Load the chosen Google Fonts so the preview types in the real faces.
  const fontBody    = config.font_body    || 'Nunito'
  const fontHeading = config.font_heading || 'Bebas Neue'
  useEffect(() => {
    const fams = Array.from(new Set([fontBody, fontHeading])).filter(Boolean)
    const links = fams.map(fam => {
      const l = document.createElement('link')
      l.rel = 'stylesheet'
      l.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fam)}:wght@400;600;700&display=swap`
      document.head.appendChild(l)
      return l
    })
    return () => { links.forEach(l => l.remove()) }
  }, [fontBody, fontHeading])

  const d = PREVIEW_DEFAULTS[mode]
  const V = (k: string) => config[`${mode}_${k}`]
  const base = (k: keyof typeof d) => V(k) || d[k]
  const accent = base('accent')
  const card = base('card'), card2 = base('card2')

  // Same CSS variables index.html applies, scoped to this subtree only.
  const vars = {
    '--bg': base('bg'),
    '--bg-image': V('bg_image') || 'none',
    '--bg-size': V('bg_size') || 'auto',
    '--bg-repeat': V('bg_repeat') || 'no-repeat',
    '--card': card,
    '--card2': card2,
    '--card-bg': V('card_bg') || `linear-gradient(158deg, ${card} 0%, ${card2} 100%)`,
    '--card-radius': V('card_radius') || '16px',
    '--border': base('border'),
    '--text': base('text'),
    '--dim': base('dim'),
    '--accent': accent,
    '--accent-text': base('accent_text'),
    '--thumb-bg': base('thumb_bg'),
    '--thumb-vignette': V('thumb_vignette') || 'none',
    '--cta-bg': V('cta_bg') || accent,
    '--pill-bg': V('pill_bg') || 'transparent',
    '--pill-active-bg': V('pill_active_bg') || accent,
    '--hero-color': V('hero_color') || accent,
    '--badge-bg': V('badge_bg') || V('cta_bg') || accent,
    '--price-color': V('price_color') || V('hero_color') || accent,
    '--add-btn-color': V('add_btn_color') || accent,
    '--divider-bg': V('divider_bg') || `linear-gradient(90deg, transparent, ${accent}, transparent)`,
    '--item-shadow': V('item_shadow') || '0 4px 14px rgba(0,0,0,0.28)',
    '--modal-bg': base('modal_bg'),
  } as CSSProperties

  const brand = config.site_name || T.previewRestaurant
  const logoUrl = config.logo_url || ''
  const cols = device === 'desktop' ? 2 : 1
  const frameW = device === 'desktop' ? 560 : 300

  const items = [
    { emoji: '🥗', name: T.previewItemSeasonalName, desc: T.previewItemSeasonalDesc, price: '24 ₾' },
    { emoji: '🍽️', name: T.previewItemSignatureName, desc: T.previewItemSignatureDesc, price: '29 ₾' },
    { emoji: '🍟', name: T.previewItemSideName, desc: T.previewItemSideDesc, price: '12 ₾' },
    { emoji: '🥤', name: T.previewItemDrinkName, desc: T.previewItemDrinkDesc, price: '7 ₾'  },
  ]
  const shown = device === 'desktop' ? items : items.slice(0, 3)

  return (
    <div className="w-full xl:w-auto xl:sticky xl:top-4 shrink-0">
      <style>{`.pv-hot{cursor:pointer;outline:2px solid transparent;outline-offset:2px;border-radius:4px;transition:outline-color .12s}.pv-hot:hover{outline-color:#38bdf8}`}</style>
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--dim)' }}>
          {T.previewLabel}
        </span>
        <div className="flex gap-2">
          <Segmented value={device} onChange={v => setDevice(v as PreviewDevice)}
                     options={[{ id: 'desktop', label: T.previewDesktop }, { id: 'phone', label: T.previewPhone }]} />
          <Segmented value={mode} onChange={v => setMode(v as PreviewMode)}
                     options={[{ id: 'night', label: T.tabNight }, { id: 'day', label: T.tabDay }]} />
        </div>
      </div>

      <div className="rounded-2xl p-3 flex justify-center"
           style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <div style={{ width: frameW, maxWidth: '100%' }}>
          <div className="overflow-hidden shadow-xl"
               onClick={e => {
                 const el = (e.target as HTMLElement).closest<HTMLElement>('[data-field]')
                 if (el?.dataset.field) onPick(mode, el.dataset.field)
               }}
               style={{
                 ...vars,
                 borderRadius: device === 'phone' ? 34 : 12,
                 border: device === 'phone' ? '9px solid #0c0a08' : '1px solid rgba(0,0,0,0.35)',
               }}>
            {device === 'desktop' ? (
              <div className="flex items-center gap-1.5 px-3 py-2" style={{ background: '#141210' }}>
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#ff5f57' }} />
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#febc2e' }} />
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#28c840' }} />
                <span className="ml-2 text-[10px] px-2 py-0.5 rounded" style={{ background: '#26221d', color: '#9a8a70' }}>
                  menu.betareal.ge
                </span>
              </div>
            ) : (
              <div className="flex justify-center py-1.5" style={{ background: '#0c0a08' }}>
                <span className="w-16 h-1.5 rounded-full" style={{ background: '#2a2622' }} />
              </div>
            )}

            <div className="pv-hot" data-field="bg" title={`✎ ${T.colorBg}`} style={{
              background: 'var(--bg-image, none)',
              backgroundColor: 'var(--bg)',
              backgroundSize: 'var(--bg-size, auto)',
              backgroundRepeat: 'var(--bg-repeat, no-repeat)',
              fontFamily: `'${fontBody}', sans-serif`,
              padding: device === 'phone' ? '18px 14px 14px' : '22px 20px 18px',
              maxHeight: 470, overflowY: 'auto',
            }}>
              <div className="text-center mb-4">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt={brand}
                       style={{ maxWidth: device === 'phone' ? 150 : 190, maxHeight: 70, margin: '0 auto', objectFit: 'contain' }} />
                ) : (
                  <div style={{
                    fontFamily: `'${fontHeading}', sans-serif`, color: 'var(--hero-color)',
                    letterSpacing: 3, fontSize: device === 'phone' ? 22 : 28, lineHeight: 1.1,
                    textTransform: 'uppercase', fontWeight: 700,
                  }}>{brand}</div>
                )}
                <div style={{ height: 3, width: 66, margin: '10px auto 0', borderRadius: 3, background: 'var(--divider-bg)' }} />
              </div>

              <div className="flex gap-2 mb-4 justify-center flex-wrap">
                {[T.previewCategoryMains, T.previewCategorySides, T.previewCategoryDrinks].map((c, i) => (
                  <span key={c} className={`text-[11px] px-3 py-1 rounded-full${i === 0 ? ' pv-hot' : ''}`}
                        data-field={i === 0 ? 'accent' : undefined} title={i === 0 ? `✎ ${T.colorAccent}` : undefined} style={{
                    background: i === 0 ? 'var(--pill-active-bg)' : 'var(--pill-bg)',
                    color: i === 0 ? 'var(--accent-text)' : 'var(--dim)',
                    border: i === 0 ? 'none' : '1px solid var(--border)',
                  }}>{c}</span>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12 }}>
                {shown.map((it, i) => (
                  <div key={i} className="pv-hot" data-field="card" title={`✎ ${T.colorCard}`} style={{
                    background: 'var(--card-bg)', border: '1px solid var(--border)',
                    borderRadius: 'var(--card-radius, 16px)', boxShadow: 'var(--item-shadow)',
                    padding: 12, display: 'flex', flexDirection: 'column', gap: 8,
                  }}>
                    <div className="relative flex items-center justify-center pv-hot" data-field="thumb_bg" title={`✎ ${T.colorThumbBg}`}
                         style={{ background: 'var(--thumb-bg)', borderRadius: 12, height: device === 'phone' ? 84 : 96, fontSize: 34 }}>
                      <span style={{ position: 'absolute', inset: 0, borderRadius: 12, background: 'var(--thumb-vignette, none)' }} />
                      <span style={{ position: 'relative' }}>{it.emoji}</span>
                      <span className="absolute top-1.5 right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded pv-hot" data-field="badge_bg" title={`✎ ${T.colorBadge}`}
                            style={{ background: 'var(--badge-bg)', color: 'var(--accent-text)', letterSpacing: 0.5 }}>3D</span>
                    </div>
                    <div className="pv-hot" data-field="text" title={`✎ ${T.colorText}`} style={{ color: 'var(--text)', fontWeight: 700, fontSize: 14 }}>{it.name}</div>
                    <div className="pv-hot" data-field="dim" title={`✎ ${T.colorDim}`} style={{ color: 'var(--dim)', fontSize: 11, lineHeight: 1.4 }}>{it.desc}</div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="pv-hot" data-field="price_color" title={`✎ ${T.colorPrice}`} style={{ color: 'var(--price-color)', fontWeight: 700, fontSize: 15 }}>{it.price}</span>
                      <button className="pv-hot" data-field="add_btn_color" title={`✎ ${T.colorAddBtn}`} style={{ background: 'transparent', color: 'var(--add-btn-color)', border: '1.5px solid var(--add-btn-color)', fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 999 }}>
                        {T.previewAdd}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between px-4 py-3 pv-hot" data-field="modal_bg" title={`✎ ${T.colorModalBg}`}
                 style={{ background: 'var(--modal-bg)', borderTop: '1px solid var(--border)', fontFamily: `'${fontBody}', sans-serif` }}>
              <span style={{ color: 'var(--dim)', fontSize: 12 }}>{T.previewCartCount}</span>
              <span className="px-4 py-1.5 rounded-full text-xs font-bold" style={{ background: 'var(--cta-bg)', color: 'var(--accent-text)' }}>
                {T.previewViewCart}
              </span>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-2 text-[11px] leading-relaxed" style={{ color: 'var(--dim)' }}>
        {T.previewHint}
      </p>
    </div>
  )
}

function Segmented({ value, onChange, options }:
  { value: string; onChange: (v: string) => void; options: { id: string; label: string }[] }) {
  return (
    <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--card)' }}>
      {options.map(o => (
        <button key={o.id} onClick={() => onChange(o.id)}
                className="px-3 py-1 rounded-md text-xs font-medium transition-all"
                style={{ background: value === o.id ? 'var(--gold)' : 'transparent',
                         color: value === o.id ? '#0f0b07' : 'var(--dim)' }}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
