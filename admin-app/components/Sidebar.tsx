'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const NAV = [
  { href: '/dashboard', label: 'Analytics',   icon: '📊' },
  { href: '/menu',      label: 'Menu Editor',  icon: '🍔' },
  { href: '/theme',     label: 'Theme Editor', icon: '🎨' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="flex flex-col w-56 shrink-0 min-h-screen"
           style={{ background: '#0a0806', borderRight: '1px solid var(--border)' }}>
      <div className="px-5 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="font-bold text-base" style={{ color: 'var(--gold)' }}>🦁 BL Admin</div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--dim)' }}>Burger Lions</div>
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

      <div className="px-3 pb-4">
        <a href="https://golden-dodol-0efadd.netlify.app" target="_blank" rel="noreferrer"
           className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-1"
           style={{ color: 'var(--dim)' }}>
          <span>🔗</span> View Menu
        </a>
        <button onClick={signOut}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm w-full text-left transition-colors"
                style={{ color: 'var(--dim)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--dim)')}>
          <span>🚪</span> Sign Out
        </button>
      </div>
    </aside>
  )
}
