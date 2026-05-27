'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { translations, type Lang } from '@/lib/i18n'

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

export default function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()

  const [lang, setLang] = useState<Lang>('en')
  const [dark, setDark] = useState(true)

  useEffect(() => {
    const savedLang  = localStorage.getItem('bl-admin-lang')
    const savedTheme = localStorage.getItem('bl-admin-theme')
    const resolvedLang = (savedLang === 'en' || savedLang === 'ka') ? savedLang : 'en'
    const resolvedDark = savedTheme !== 'light'
    setLang(resolvedLang)
    setDark(resolvedDark)
    applyThemeVars(resolvedDark)
  }, [])

  const T = translations[lang]

  const NAV = [
    { href: '/dashboard', label: T.navAnalytics, icon: '📊' },
    { href: '/menu',      label: T.navMenu,       icon: '🍔' },
    { href: '/theme',     label: T.navTheme,      icon: '🎨' },
  ]

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
    <aside className="flex flex-col w-56 shrink-0 min-h-screen"
           style={{ background: 'var(--card)', borderRight: '1px solid var(--border)' }}>
      <div className="px-5 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="font-bold text-base" style={{ color: 'var(--gold)' }}>🦁 {T.brandTitle}</div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--dim)' }}>{T.brandSub}</div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, label, icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link key={href} href={href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all"
                  style={{
                    background: active ? 'var(--gold-dim, rgba(242,181,53,0.12))' : 'transparent',
                    color: active ? 'var(--gold)' : 'var(--dim)',
                    fontWeight: active ? '600' : '400',
                  }}>
              <span>{icon}</span>
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Language & theme toggles */}
      <div className="px-3 pb-2 flex gap-2">
        <button onClick={toggleLang}
                className="flex-1 py-2 rounded-lg text-xs font-semibold transition-colors"
                style={{ background: 'var(--card2)', color: 'var(--gold)',
                         border: '1px solid var(--border)' }}
                title="Switch language">
          {lang === 'en' ? 'KA' : 'EN'}
        </button>
        <button onClick={toggleTheme}
                className="flex-1 py-2 rounded-lg text-xs font-semibold transition-colors"
                style={{ background: 'var(--card2)', color: 'var(--gold)',
                         border: '1px solid var(--border)' }}
                title="Switch theme">
          {dark ? '☀' : '🌙'}
        </button>
      </div>

      <div className="px-3 pb-4">
        <a href="https://temotkesh.github.io/Restaurant-AR" target="_blank" rel="noreferrer"
           className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-1"
           style={{ color: 'var(--dim)' }}>
          <span>🔗</span> {T.viewMenu}
        </a>
        <button onClick={signOut}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm w-full text-left transition-colors"
                style={{ color: 'var(--dim)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--dim)')}>
          <span>🚪</span> {T.signOut}
        </button>
      </div>
    </aside>
  )
}
