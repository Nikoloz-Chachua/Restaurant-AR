'use client'
import { useState } from 'react'
import Sidebar from './Sidebar'

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex min-h-screen">
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
          onClick={() => setOpen(false)}
        />
      )}

      <Sidebar open={open} onClose={() => setOpen(false)} />

      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile top bar */}
        <header
          className="md:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 shrink-0"
          style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)' }}
        >
          <button
            onClick={() => setOpen(true)}
            className="flex flex-col justify-center gap-[5px] w-7 h-7 shrink-0"
            aria-label="Open menu"
          >
            <span className="block h-[2px] w-full rounded-full transition-all" style={{ background: 'var(--gold)' }} />
            <span className="block h-[2px] w-4 rounded-full transition-all" style={{ background: 'var(--gold)' }} />
            <span className="block h-[2px] w-full rounded-full transition-all" style={{ background: 'var(--gold)' }} />
          </button>
          <span className="font-bold text-sm" style={{ color: 'var(--gold)' }}>3D AR Menu</span>
        </header>

        <main
          className="flex-1 overflow-auto p-4 md:p-8 page-content"
          style={{ background: 'var(--bg)' }}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
