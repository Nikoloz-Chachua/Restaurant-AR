'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/useLang'
import type { Translations } from '@/lib/i18n'

type ThemeConfig = Record<string, string>

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

export default function ThemePage() {
  const supabase = createClient()
  const [T] = useLang()
  const [config, setConfig]   = useState<ThemeConfig>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState('')
  const [tab, setTab]         = useState<'night' | 'day' | 'fonts' | 'branding'>('night')

  const load = useCallback(async () => {
    const { data } = await supabase.from('theme_config').select('key,value')
    const map: ThemeConfig = {}
    data?.forEach(r => { map[r.key] = r.value })
    setConfig(map)
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  function set(key: string, value: string) {
    setConfig(c => ({ ...c, [key]: value }))
  }

  async function save() {
    setSaving(true)
    const rows = Object.entries(config).map(([key, value]) => ({ key, value }))
    await supabase.from('theme_config').upsert(rows, { onConflict: 'key' })
    setSaving(false)
    setMsg(T.saved)
    setTimeout(() => setMsg(''), 4000)
  }

  async function reset() {
    if (!confirm(T.resetConfirm)) return
    await supabase.from('theme_config').delete().neq('key', '__none__')
    await load()
    setMsg(T.resetDone)
    setTimeout(() => setMsg(''), 3000)
  }

  const tabs = [
    { id: 'night',    label: T.tabNight },
    { id: 'day',      label: T.tabDay },
    { id: 'fonts',    label: T.tabFonts },
    { id: 'branding', label: T.tabBranding },
  ] as const

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--gold)' }}>{T.themeTitle}</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--dim)' }}>{T.themeDesc}</p>
        </div>
        <div className="flex items-center gap-3">
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
          {tab === 'night' && NIGHT_FIELDS.map(f => (
            <ColorRow key={f.key} label={T[f.tKey] as string} value={config[f.key] ?? ''}
                      onChange={v => set(f.key, v)} />
          ))}
          {tab === 'day' && DAY_FIELDS.map(f => (
            <ColorRow key={f.key} label={T[f.tKey] as string} value={config[f.key] ?? ''}
                      onChange={v => set(f.key, v)} />
          ))}
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
            </>
          )}
        </div>
      )}

      <div className="mt-8 p-4 rounded-xl text-sm"
           style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <span style={{ color: 'var(--dim)' }}>{T.reloadHint}</span>
        <a href="https://temotkesh.github.io/Restaurant-AR" target="_blank" rel="noreferrer"
           style={{ color: 'var(--gold)' }}>
          temotkesh.github.io/Restaurant-AR ↗
        </a>
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

function BrandRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="p-3 rounded-xl"
         style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <div className="text-xs mb-2 uppercase tracking-widest" style={{ color: 'var(--dim)' }}>{label}</div>
      <input value={value} onChange={e => onChange(e.target.value)} />
    </div>
  )
}
