'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/useLang'
import { usePlan } from '@/lib/usePlan'
import LockedCard from '@/components/LockedCard'

type Change = {
  id: number
  source: string          // 'theme_config' | 'menu_items'
  record_id: string | null
  label: string | null
  field: string
  old_value: string | null
  new_value: string | null
  changed_at: string
}

const PAGE_SIZE = 60

// theme keys look like "day_accent" / "night_card2" — render them as
// "Day · Accent" rather than raw column names.
function prettyField(field: string): string {
  if (field === '__deleted__') return ''
  const mode = field.startsWith('day_') ? 'Day' : field.startsWith('night_') ? 'Night' : ''
  const rest = field.replace(/^(day|night)_/, '').replace(/_/g, ' ')
  const name = rest.charAt(0).toUpperCase() + rest.slice(1)
  return mode ? `${mode} · ${name}` : name
}

function isColor(v: string | null): boolean {
  return !!v && /^#[0-9a-fA-F]{3,8}$/.test(v.trim())
}

function shortValue(v: string | null): string {
  if (v === null) return '—'
  const s = v.trim()
  if (!s) return '(empty)'
  if (s.length > 46) return s.slice(0, 44) + '…'
  return s
}

function timeAgo(iso: string, T: { historyJustNow: string; historyMinutesAgo: string; historyHoursAgo: string; historyDaysAgo: string }): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return T.historyJustNow
  if (mins < 60) return T.historyMinutesAgo.replace('{n}', String(mins))
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return T.historyHoursAgo.replace('{n}', String(hrs))
  return T.historyDaysAgo.replace('{n}', String(Math.floor(hrs / 24)))
}

export default function HistoryPage() {
  const supabase = createClient()
  const [T] = useLang()
  const plan = usePlan()

  const [rows, setRows]       = useState<Change[]>([])
  const [picked, setPicked]   = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [busy, setBusy]       = useState(false)
  const [msg, setMsg]         = useState('')
  const [setupErr, setSetupErr] = useState('')

  const load = useCallback(async () => {
    if (plan.loading || !plan.restaurantId) { setLoading(plan.loading); return }
    const { data, error } = await supabase
      .from('change_history')
      .select('id,source,record_id,label,field,old_value,new_value,changed_at')
      .eq('restaurant_id', plan.restaurantId)
      .order('changed_at', { ascending: false })
      .limit(PAGE_SIZE)
    // A missing table must not look like "nothing has changed yet" — that sends
    // people hunting for a bug in their edit instead of running the migration.
    setSetupErr(error ? error.message : '')
    setRows((data as Change[]) ?? [])
    setPicked(new Set())
    setLoading(false)
  }, [plan.loading, plan.restaurantId, supabase])

  // Deferred like the other admin pages, so the first load doesn't setState
  // synchronously inside the effect body.
  useEffect(() => { void Promise.resolve().then(load) }, [load])

  function toggle(id: number) {
    setPicked(p => {
      const next = new Set(p)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  // Reverting writes old_value back. That write is itself logged by the trigger,
  // so an accidental revert shows up in history and can be undone in turn.
  async function revertSelected() {
    const chosen = rows.filter(r => picked.has(r.id))
    if (!chosen.length) return
    if (!confirm(T.historyRevertConfirm.replace('{n}', String(chosen.length)))) return
    setBusy(true)
    let done = 0
    try {
      // Oldest first, so several changes to the same field land in the right order.
      for (const c of [...chosen].reverse()) {
        if (c.field === '__deleted__') continue        // deleted rows aren't restorable here
        if (c.source === 'theme_config') {
          const { error } = await supabase.from('theme_config').upsert(
            { restaurant_id: plan.restaurantId, key: c.field, value: c.old_value ?? '' },
            { onConflict: 'restaurant_id,key' },
          )
          if (error) throw new Error(error.message)
        } else if (c.source === 'menu_items' && c.record_id) {
          const { error } = await supabase
            .from('menu_items')
            .update({ [c.field]: c.old_value })
            .eq('id', c.record_id)
          if (error) throw new Error(error.message)
        }
        done++
      }
      setMsg(T.historyReverted.replace('{n}', String(done)))
      await load()
    } catch (e) {
      setMsg(`${T.historyRevertFailed} ${e instanceof Error ? e.message : String(e)}`)
    }
    setBusy(false)
    setTimeout(() => setMsg(''), 5000)
  }

  if (plan.loading || loading) {
    return <p style={{ color: 'var(--dim)' }}>{T.loading}</p>
  }
  if (!plan.restaurantId) {
    return <LockedCard title={T.historyLockedTitle} description={T.noRestaurantSelected} planLabel={plan.label} />
  }

  return (
    <div>
      <h1 className="text-2xl font-bold page-title mb-1" style={{ color: 'var(--gold)' }}>{T.historyTitle}</h1>
      <p className="text-sm mb-5" style={{ color: 'var(--dim)' }}>{T.historyIntro}</p>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <button type="button" onClick={revertSelected} disabled={busy || picked.size === 0}
                className="px-4 py-2 rounded-lg text-sm font-semibold"
                style={{
                  background: picked.size ? 'var(--gold)' : 'var(--card2)',
                  color: picked.size ? '#1a1205' : 'var(--dim)',
                  border: '1px solid var(--border)',
                  cursor: picked.size && !busy ? 'pointer' : 'not-allowed',
                  opacity: busy ? 0.6 : 1,
                }}>
          {busy ? '…' : T.historyRevertSelected.replace('{n}', String(picked.size))}
        </button>
        <button type="button" onClick={() => void load()} disabled={busy}
                className="px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--card2)', color: 'var(--text)', border: '1px solid var(--border)' }}>
          {T.historyRefresh}
        </button>
        {msg && <span className="text-sm" style={{ color: 'var(--dim)' }}>{msg}</span>}
      </div>

      {setupErr && (
        <div className="rounded-xl p-6" style={{ background: 'var(--card)', border: '1px solid var(--danger)' }}>
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--danger)' }}>{T.historyNotSetUp}</p>
          <p className="text-sm" style={{ color: 'var(--dim)' }}>{T.historyNotSetUpHint}</p>
          <code className="block text-xs mt-2" style={{ color: 'var(--dim)' }}>{setupErr}</code>
        </div>
      )}

      {!setupErr && rows.length === 0 && (
        <div className="rounded-xl p-6" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--dim)' }}>{T.historyEmpty}</p>
        </div>
      )}

      <ul className="flex flex-col gap-2 list-none p-0">
        {rows.map(r => {
          const on = picked.has(r.id)
          const deleted = r.field === '__deleted__'
          return (
            <li key={r.id} className="rounded-xl p-3"
                style={{ background: 'var(--card)', border: `1px solid ${on ? 'var(--gold)' : 'var(--border)'}` }}>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={on} onChange={() => toggle(r.id)} disabled={deleted}
                       className="mt-1 shrink-0" style={{ width: 16, height: 16, accentColor: 'var(--gold)' }} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--dim)' }}>
                    {r.source === 'theme_config' ? T.historySourceTheme : T.historySourceMenu}
                    {r.label ? ` · ${r.label}` : ''}
                    {!deleted && ` · ${prettyField(r.field)}`}
                  </div>

                  {deleted ? (
                    <div className="text-sm" style={{ color: 'var(--danger)' }}>{T.historyItemDeleted}</div>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap text-sm" style={{ color: 'var(--text)' }}>
                      <Value v={r.old_value} />
                      <span style={{ color: 'var(--dim)' }}>→</span>
                      <Value v={r.new_value} />
                    </div>
                  )}

                  <div className="text-xs mt-1" style={{ color: 'var(--dim)' }}>
                    {timeAgo(r.changed_at, T)}
                  </div>
                </div>
              </label>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// Colours get a swatch so "which blue was it?" is answerable at a glance.
function Value({ v }: { v: string | null }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {isColor(v) && (
        <span style={{
          width: 14, height: 14, borderRadius: 3, background: v as string,
          border: '1px solid var(--border)', display: 'inline-block',
        }} />
      )}
      <code style={{ fontSize: '0.78rem', color: 'var(--text)' }}>{shortValue(v)}</code>
    </span>
  )
}
