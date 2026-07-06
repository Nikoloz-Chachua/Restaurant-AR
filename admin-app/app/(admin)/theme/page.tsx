'use client'
import { useEffect, useState, useCallback, type CSSProperties } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/useLang'
import type { Translations } from '@/lib/i18n'
import { usePlan } from '@/lib/usePlan'
import LockedCard from '@/components/LockedCard'
import { TEMPLATE_PRESETS, type ThemeConfig } from '@/lib/themePresets'

const BRANDING_KEYS = ['site_name', 'site_name_ka', 'logo_url', 'hero_logo_url', 'hero_image_url']

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

export default function ThemePage() {
  const supabase = createClient()
  const [T] = useLang()
  const plan = usePlan()
  const [config, setConfig]   = useState<ThemeConfig>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState('')
  const [tab, setTab]         = useState<'templates' | 'night' | 'day' | 'background' | 'fonts' | 'branding'>('templates')

  const load = useCallback(async () => {
    if (plan.loading || !plan.canUseTheme || !plan.restaurantId) {
      setLoading(plan.loading)
      return
    }
    const { data } = await supabase.from('theme_config').select('key,value').eq('restaurant_id', plan.restaurantId)
    const map: ThemeConfig = {}
    data?.forEach(r => { map[r.key] = r.value })
    setConfig(map)
    setLoading(false)
  }, [plan.canUseTheme, plan.loading, plan.restaurantId, supabase])

  useEffect(() => { void Promise.resolve().then(load) }, [load])

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
    if (!file.type.startsWith('image/')) { setMsg('Only image files are supported'); return }
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
      setMsg('Image uploaded. Press Save Changes to publish it.')
    } catch (e) {
      setMsg(`Upload failed: ${e instanceof Error ? e.message : String(e)}`)
    }
    setUploadingKey('')
  }

  // Background images set the CSS background-image token (url(...)) plus cover/no-repeat,
  // so an uploaded photo fills the whole menu backdrop.
  async function uploadBgImage(mode: 'night' | 'day', file: File) {
    if (!file.type.startsWith('image/')) { setMsg('Only image files are supported'); return }
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
      setMsg('Background image uploaded. Press Save Changes to publish it.')
    } catch (e) {
      setMsg(`Upload failed: ${e instanceof Error ? e.message : String(e)}`)
    }
    setUploadingKey('')
  }

  async function save() {
    setSaving(true)
    const rows = Object.entries(config).map(([key, value]) => ({ key, value, restaurant_id: plan.restaurantId }))
    await supabase.from('theme_config').upsert(rows, { onConflict: 'restaurant_id,key' })
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
      setMsg(`Reset failed: ${error.message}`)
      setTimeout(() => setMsg(''), 5000)
      return
    }
    setConfig(next)
    setMsg(T.resetDone)
    setTimeout(() => setMsg(''), 3000)
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
          Tenant required
        </div>
        <h1 className="text-xl md:text-2xl font-bold page-title" style={{ color: 'var(--gold)' }}>
          No restaurant is mapped to this account
        </h1>
        <p className="text-sm mt-2 leading-6" style={{ color: 'var(--dim)' }}>
          Ask a super admin to add this user to a brand or restaurant before editing theme settings.
        </p>
      </div>
    )
  }

  if (!plan.loading && !plan.canUseTheme) {
    return (
      <LockedCard
        title="Theme customization requires Full or Premium"
        description="Custom colors, fonts, and branding are available on the Full 450 and Premium 900 plans."
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
            Tenant: <span style={{ color: 'var(--text)' }}>{plan.restaurantName}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {msg && (
            <span className="text-sm px-3 py-1.5 rounded-lg"
                  style={{ background: 'rgba(76,175,125,0.15)', color: 'var(--success)' }}>
              {msg}
            </span>
          )}
          <button onClick={reset}
                  className="px-4 py-2 rounded-lg text-sm"
                  style={{ color: 'var(--danger)', border: '1px solid rgba(224,82,82,0.3)' }}>
            {T.reset}
          </button>
          <button onClick={save} disabled={saving}
                  className="px-5 py-2 rounded-lg text-sm font-semibold"
                  style={{ background: 'var(--gold)', color: '#0f0b07', opacity: saving ? 0.6 : 1 }}>
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
                    setMsg(`${preset.label} loaded. Press Save Changes to publish it.`)
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
                Templates are not locked. Load one, adjust colors/fonts/branding in the other tabs, then save.
              </div>
            </div>
          )}
          {tab === 'night' && NIGHT_FIELDS.map(f => (
            <ColorRow key={f.key} label={T[f.tKey] as string} value={config[f.key] ?? ''}
                      onChange={v => setColor(f.key, v)} />
          ))}
          {tab === 'day' && DAY_FIELDS.map(f => (
            <ColorRow key={f.key} label={T[f.tKey] as string} value={config[f.key] ?? ''}
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
                              onPick={f => uploadImage('logo_url', f)} onClear={() => set('logo_url', '')} />
              <ImageUploadRow label={T.brandHero} hint={T.brandHeroHint} value={config.hero_image_url ?? ''}
                              uploading={uploadingKey === 'hero_image_url'} uploadLabel={T.uploadThumb} clearLabel={T.clearThumb}
                              onPick={f => uploadImage('hero_image_url', f)} onClear={() => set('hero_image_url', '')} />
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
        <ThemePreview config={config} activeTab={tab} />
      </div>
    </div>
  )
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const colorVal = isColor(value) ? toHex(value) : '#000000'
  return (
    <div className="flex items-center gap-4 p-3 rounded-xl"
         style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
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
  return (
    <div className="p-3 rounded-xl"
         style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <div className="text-xs mb-2 uppercase tracking-widest" style={{ color: 'var(--dim)' }}>{label}</div>
      <div className="flex gap-3">
        <select value={GOOGLE_FONTS.includes(value) ? value : 'custom'}
                onChange={e => { if (e.target.value !== 'custom') onChange(e.target.value) }}
                style={{ flex: '0 0 200px' }}>
          {GOOGLE_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
          <option value="custom">Custom…</option>
        </select>
        <input value={value} onChange={e => onChange(e.target.value)}
               placeholder="Or type any Google Font name" style={{ flex: 1 }} />
      </div>
      <div className="mt-2 text-lg" style={{ fontFamily: `'${value}', sans-serif`, color: 'var(--text)' }}>
        {preview}{value}
      </div>
    </div>
  )
}

function ImageUploadRow({ label, hint, value, uploading, uploadLabel, clearLabel, onPick, onClear }: {
  label: string; hint: string; value: string; uploading: boolean; uploadLabel: string; clearLabel: string
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
            <img src={value} alt="preview"
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

function ThemePreview({ config, activeTab }: { config: ThemeConfig; activeTab: string }) {
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

  const brand = config.site_name || 'Your Restaurant'
  const logoUrl = config.logo_url || ''
  const cols = device === 'desktop' ? 2 : 1
  const frameW = device === 'desktop' ? 560 : 300

  const items = [
    { emoji: '🥗', name: 'Seasonal Bowl',   desc: 'Fresh grains, roasted vegetables, herbs, house dressing.', price: '24 ₾' },
    { emoji: '🍽️', name: 'Signature Plate',  desc: 'A balanced plate built around the kitchen signature.',      price: '29 ₾' },
    { emoji: '🍟', name: 'Crisp Side',       desc: 'Crisp seasonal side with a bright dipping sauce.',          price: '12 ₾' },
    { emoji: '🥤', name: 'House Drink',      desc: 'Refreshing house drink served cold.',                       price: '7 ₾'  },
  ]
  const shown = device === 'desktop' ? items : items.slice(0, 3)

  return (
    <div className="w-full xl:w-auto xl:sticky xl:top-4 shrink-0">
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

            <div style={{
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
                {['Mains', 'Sides', 'Drinks'].map((c, i) => (
                  <span key={c} className="text-[11px] px-3 py-1 rounded-full" style={{
                    background: i === 0 ? 'var(--pill-active-bg)' : 'var(--pill-bg)',
                    color: i === 0 ? 'var(--accent-text)' : 'var(--dim)',
                    border: i === 0 ? 'none' : '1px solid var(--border)',
                  }}>{c}</span>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12 }}>
                {shown.map((it, i) => (
                  <div key={i} style={{
                    background: 'var(--card-bg)', border: '1px solid var(--border)',
                    borderRadius: 'var(--card-radius, 16px)', boxShadow: 'var(--item-shadow)',
                    padding: 12, display: 'flex', flexDirection: 'column', gap: 8,
                  }}>
                    <div className="relative flex items-center justify-center"
                         style={{ background: 'var(--thumb-bg)', borderRadius: 12, height: device === 'phone' ? 84 : 96, fontSize: 34 }}>
                      <span style={{ position: 'absolute', inset: 0, borderRadius: 12, background: 'var(--thumb-vignette, none)' }} />
                      <span style={{ position: 'relative' }}>{it.emoji}</span>
                      <span className="absolute top-1.5 right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded"
                            style={{ background: 'var(--badge-bg)', color: 'var(--accent-text)', letterSpacing: 0.5 }}>3D</span>
                    </div>
                    <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: 14 }}>{it.name}</div>
                    <div style={{ color: 'var(--dim)', fontSize: 11, lineHeight: 1.4 }}>{it.desc}</div>
                    <div className="flex items-center justify-between mt-1">
                      <span style={{ color: 'var(--price-color)', fontWeight: 700, fontSize: 15 }}>{it.price}</span>
                      <button style={{ background: 'transparent', color: 'var(--add-btn-color)', border: '1.5px solid var(--add-btn-color)', fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 999 }}>
                        + Add
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between px-4 py-3"
                 style={{ background: 'var(--modal-bg)', borderTop: '1px solid var(--border)', fontFamily: `'${fontBody}', sans-serif` }}>
              <span style={{ color: 'var(--dim)', fontSize: 12 }}>2 items · 53 ₾</span>
              <span className="px-4 py-1.5 rounded-full text-xs font-bold" style={{ background: 'var(--cta-bg)', color: 'var(--accent-text)' }}>
                View Cart
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
