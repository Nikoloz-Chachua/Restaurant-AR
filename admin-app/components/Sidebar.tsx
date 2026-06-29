'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { translations, type Lang } from '@/lib/i18n'
import { usePlan } from '@/lib/usePlan'

const LIGHT: Record<string, string> = {
  '--bg':       '#f5f0e8',
  '--card':     '#ffffff',
  '--card2':    '#ede7d8',
  '--border':   'rgba(155,98,8,0.18)',
  '--text':     '#1c1308',
  '--dim':      '#8a7060',
  '--gold':     '#c07808',
  '--gold-dim': 'rgba(192,120,8,0.12)',
  '--danger':   '#cc3333',
  '--success':  '#2d7a50',
}

function applyThemeVars(isDark: boolean) {
  const root = document.documentElement
  if (isDark) {
    Object.keys(LIGHT).forEach(k => root.style.removeProperty(k))
  } else {
    Object.entries(LIGHT).forEach(([k, v]) => root.style.setProperty(k, v))
  }
}

interface Props {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: Props) {
  const pathname = usePathname()
  const router   = useRouter()
  const plan = usePlan()

  const [lang, setLang] = useState<Lang>('en')
  const [dark, setDark] = useState(true)

  useEffect(() => {
    const savedLang  = localStorage.getItem('bl-admin-lang')
    const savedTheme = localStorage.getItem('bl-admin-theme')
    const resolvedLang = (savedLang === 'en' || savedLang === 'ka') ? savedLang : 'en'
    const resolvedDark = savedTheme !== 'light'
    queueMicrotask(() => {
      setLang(resolvedLang)
      setDark(resolvedDark)
      applyThemeVars(resolvedDark)
    })
  }, [])

  const T = translations[lang]

  const tenantQuery = plan.restaurantSlug ? `?tenant=${encodeURIComponent(plan.restaurantSlug)}` : ''
  const tenantHref = (href: string) => tenantQuery && href !== '/tenants' ? `${href}${tenantQuery}` : href

  const NAV = [
    plan.canManageTenants ? { href: '/tenants', label: 'Tenants', icon: '▦' } : null,
    { href: tenantHref('/menu'), match: '/menu', label: T.navMenu, icon: '🍔' },
    plan.canUseAnalytics ? { href: tenantHref('/dashboard'), match: '/dashboard', label: T.navAnalytics, icon: '📊' } : null,
    plan.canUseDeveloperAnalytics ? { href: tenantHref('/dev-analytics'), match: '/dev-analytics', label: T.navDeveloperAnalytics, icon: '🛠' } : null,
    plan.canUseTheme ? { href: tenantHref('/theme'), match: '/theme', label: T.navTheme, icon: '🎨' } : null,
  ].filter((item): item is { href: string; match?: string; label: string; icon: string } => Boolean(item))

  function broadcast(newLang: Lang, newDark: boolean) {
    window.dispatchEvent(new CustomEvent('bl-pref', { detail: { lang: newLang, dark: newDark } }))
  }

  function toggleLang() {
    const next: Lang = lang === 'en' ? 'ka' : 'en'
    setLang(next)
    localStorage.setItem('bl-admin-lang', next)
    broadcast(next, dark)
  }

  function toggleTheme() {
    const next = !dark
    setDark(next)
    localStorage.setItem('bl-admin-theme', next ? 'dark' : 'light')
    applyThemeVars(next)
    broadcast(lang, next)
  }

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside
      className={[
        'flex flex-col w-56 shrink-0 min-h-screen',
        // Mobile: fixed overlay; desktop: static in flex flow
        'fixed inset-y-0 left-0 z-50 md:static md:z-auto',
        // Slide in/out on mobile; always visible on desktop
        'transition-transform duration-300 ease-in-out',
        open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
      ].join(' ')}
      style={{ background: 'var(--card)', borderRight: '1px solid var(--border)' }}
    >
      {/* Brand + mobile close */}
      <div
        className="flex items-center justify-between px-5 py-5 border-b shrink-0"
        style={{ borderColor: 'var(--border)' }}
      >
        <div>
          <div className="font-bold text-base leading-tight" style={{ color: 'var(--gold)' }}>
            🦁 {T.brandTitle}
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--dim)' }}>{T.brandSub}</div>
        </div>
        <button
          onClick={onClose}
          className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-xl leading-none"
          style={{ color: 'var(--dim)' }}
          aria-label="Close sidebar"
        >
          ×
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.map(({ href, match, label, icon }) => {
          const active = pathname.startsWith(match ?? href.split('?')[0])
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150"
              style={{
                background: active ? 'var(--gold-dim, rgba(242,181,53,0.12))' : 'transparent',
                color:      active ? 'var(--gold)' : 'var(--dim)',
                fontWeight: active ? '600' : '400',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--card2)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
            >
              <span className="text-base">{icon}</span>
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Language & theme toggles */}
      <div className="px-3 pb-2 flex gap-2 shrink-0">
        <button
          onClick={toggleLang}
          className="flex-1 py-2 rounded-lg text-xs font-semibold transition-colors duration-150"
          style={{ background: 'var(--card2)', color: 'var(--gold)', border: '1px solid var(--border)' }}
          title="Switch language"
        >
          {lang === 'en' ? 'KA' : 'EN'}
        </button>
        <button
          onClick={toggleTheme}
          className="flex-1 py-2 rounded-lg text-xs font-semibold transition-colors duration-150"
          style={{ background: 'var(--card2)', color: 'var(--gold)', border: '1px solid var(--border)' }}
          title="Switch theme"
        >
          {dark ? '☀' : '🌙'}
        </button>
      </div>

      {/* Footer links */}
      <div className="px-3 pb-4 shrink-0">
        <a
          href="https://restaurant-ar.pages.dev"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-1 transition-colors duration-150"
          style={{ color: 'var(--dim)' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--card2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <span>🔗</span> {T.viewMenu}
        </a>
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm w-full text-left transition-all duration-150"
          style={{ color: 'var(--dim)' }}
          onMouseEnter={e => {
            e.currentTarget.style.color = 'var(--danger)'
            e.currentTarget.style.background = 'rgba(224,82,82,0.08)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'var(--dim)'
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <span>🚪</span> {T.signOut}
        </button>
      </div>
    </aside>
  )
}
