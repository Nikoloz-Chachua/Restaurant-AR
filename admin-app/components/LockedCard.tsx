'use client'
import Link from 'next/link'
import { useLang } from '@/lib/useLang'

export default function LockedCard({
  title,
  description,
  planLabel,
}: {
  title: string
  description: string
  planLabel?: string
}) {
  const [T] = useLang()

  return (
    <div className="max-w-xl rounded-xl p-6" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <div className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--dim)' }}>
        {T.lockedFeature}
      </div>
      <h1 className="text-xl md:text-2xl font-bold page-title" style={{ color: 'var(--gold)' }}>
        {title}
      </h1>
      <p className="text-sm mt-2 leading-6" style={{ color: 'var(--dim)' }}>
        {description}
      </p>
      {planLabel && (
        <p className="text-xs mt-4" style={{ color: 'var(--dim)' }}>
          {T.currentPlan}: <span style={{ color: 'var(--text)' }}>{planLabel}</span>
        </p>
      )}
      <Link
        href="/menu"
        className="inline-flex mt-5 px-4 py-2 rounded-lg text-sm font-semibold"
        style={{ background: 'var(--gold)', color: '#0f0b07' }}
      >
        {T.backToMenu}
      </Link>
    </div>
  )
}
