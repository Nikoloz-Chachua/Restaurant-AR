'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/useLang'
import type { Translations } from '@/lib/i18n'
import { usePlan } from '@/lib/usePlan'
import LockedCard from '@/components/LockedCard'
import { TEMPLATE_PRESETS, type ThemeConfig } from '@/lib/themePresets'
import { buildThemeResetConfig, canManageThemeTemplates, clientSafeThemeConfigForSave } from '@/lib/themeReset'

const NIGHT_FIELDS: { key: string; tKey: keyof Translations }[] = [
  { key: 'night_bg',          tKey: 'colorBg' },
  { key: 'night_card',        tKey: 'colorCard' },
  { key: 'night_card2',       tKey: 'colorCard2' },
  { key: 'night_border',      tKey: 'colorBorder' },
  { key: 'night_text',        tKey: 'colorText' },
  { key: 'night_dim',         tKey: 'colorDim' },
  { key: 'night_accent',      tKey: 'colorAccent' },
  { key: 'night_accent_text', tKey: 'colorAccentText' },
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
  { key: 'day_thumb_bg',    tKey: 'colorThumbBg' },
  { key: 'day_modal_bg',    tKey: 'colorModalBg' },
]

const GOOGLE_FONTS = [
  'Nunito', 'Bebas Neue', 'Inter', 'Roboto', 'Lato', 'Poppins',
  'Playfair Display', 'Montserrat', 'Raleway', 'Open Sans',
  'Source Sans 3', 'Oswald', 'PT Serif', 'Merriweather',
]

type ThemeTab = 'templates' | 'night' | 'day' | 'background' | 'fonts' | 'branding'

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
  const [tab, setTab]         = useState<ThemeTab>('night')
  const [loadedTemplateKey, setLoadedTemplateKey] = useState<string | undefined>()
  const showTemplateControls = canManageThemeTemplates(plan.role)

  const load = useCallback(async () => {
    if (plan.loading || !plan.canUseTheme || !plan.restaurantId) {
      setLoading(plan.loading)
      return
    }
    const { data } = await supabase.from('theme_config').select('key,value').eq('restaurant_id', plan.restaurantId)
    const map: ThemeConfig = {}
    data?.forEach(r => { map[r.key] = r.value })
    setConfig(map)
    setLoadedTemplateKey(map.template_key)
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
    if (!picked.length) { setMsg('Only image files are supported'); return }
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
      setMsg(`${added.length} photo(s) uploaded. Press Save Changes to publish.`)
    } catch (e) {
      setMsg(`Upload failed: ${e instanceof Error ? e.message : String(e)}`)
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
    const next = showTemplateControls
      ? config
      : clientSafeThemeConfigForSave(config, plan.restaurantSlug, loadedTemplateKey)
    const rows = Object.entries(next).map(([key, value]) => ({ key, value, restaurant_id: plan.restaurantId }))
    await supabase.from('theme_config').upsert(rows, { onConflict: 'restaurant_id,key' })
    setConfig(next)
    setLoadedTemplateKey(next.template_key)
    setSaving(false)
    setMsg(T.saved)
    setTimeout(() => setMsg(''), 4000)
  }

  async function reset() {
    if (!confirm(T.resetConfirm)) return
    const resetBase = showTemplateControls
      ? config
      : clientSafeThemeConfigForSave(config, plan.restaurantSlug, loadedTemplateKey)
    const next = buildThemeResetConfig(resetBase, plan.restaurantSlug)
    const rows = Object.entries(next).map(([key, value]) => ({ key, value, restaurant_id: plan.restaurantId }))
    const { error } = await supabase.from('theme_config').upsert(rows, { onConflict: 'restaurant_id,key' })
    if (error) {
      setMsg(`Reset failed: ${error.message}`)
      setTimeout(() => setMsg(''), 5000)
      return
    }
    setConfig(next)
    setLoadedTemplateKey(next.template_key)
    setMsg(T.resetDone)
    setTimeout(() => setMsg(''), 3000)
  }

  const tabs: { id: ThemeTab; label: string }[] = [
    showTemplateControls ? { id: 'templates', label: T.tabPresets } : null,
    { id: 'night',     label: T.tabNight },
    { id: 'day',       label: T.tabDay },
    { id: 'background', label: T.tabBackground },
    { id: 'fonts',     label: T.tabFonts },
    { id: 'branding',  label: T.tabBranding },
  ].filter((item): item is { id: ThemeTab; label: string } => Boolean(item))

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
          {showTemplateControls && tab === 'templates' && (
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
              <HeroGalleryRow label={T.brandHeroGallery} hint={T.brandHeroGalleryHint}
                              images={heroImages} uploading={uploadingKey === 'hero_images'}
                              addLabel={T.heroAddImages} removeLabel={T.heroRemove}
                              upLabel={T.heroMoveUp} downLabel={T.heroMoveDown} emptyLabel={T.heroEmpty}
                              onPick={files => uploadHeroImages(files)}
                              onRemove={removeHeroImage} onMove={moveHeroImage} />
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

// Multi-photo hero. Order matters (it's the order guests see), so each row carries
// up/down controls — arrows rather than drag, so it works the same on a phone.
function HeroGalleryRow({ label, hint, images, uploading, addLabel, removeLabel, upLabel, downLabel, emptyLabel, onPick, onRemove, onMove }: {
  label: string; hint: string; images: string[]; uploading: boolean
  addLabel: string; removeLabel: string; upLabel: string; downLabel: string; emptyLabel: string
  onPick: (files: File[]) => void; onRemove: (index: number) => void; onMove: (index: number, dir: -1 | 1) => void
}) {
  const btn = {
    background: 'var(--card2)', color: 'var(--gold)',
    border: '1px solid var(--border)', borderRadius: 6,
    width: 28, height: 28, lineHeight: 1, cursor: 'pointer',
  } as const
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
              <img src={url} alt=""
                   style={{ height: 44, width: 68, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />
              <span className="flex-1" />
              <button type="button" onClick={() => onMove(i, -1)} disabled={i === 0}
                      title={upLabel} aria-label={upLabel}
                      style={{ ...btn, opacity: i === 0 ? 0.35 : 1 }}>↑</button>
              <button type="button" onClick={() => onMove(i, 1)} disabled={i === images.length - 1}
                      title={downLabel} aria-label={downLabel}
                      style={{ ...btn, opacity: i === images.length - 1 ? 0.35 : 1 }}>↓</button>
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

function BrandRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="p-3 rounded-xl"
         style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <div className="text-xs mb-2 uppercase tracking-widest" style={{ color: 'var(--dim)' }}>{label}</div>
      <input value={value} onChange={e => onChange(e.target.value)} />
    </div>
  )
}
