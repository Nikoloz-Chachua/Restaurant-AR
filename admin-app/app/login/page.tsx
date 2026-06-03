'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
         style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--gold)' }}>
            3D AR Menu Admin
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--dim)' }}>
            Sign in to manage the restaurant
          </p>
        </div>

        <form onSubmit={handleLogin}
              className="rounded-xl p-6 space-y-4"
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <div>
            <label className="block text-xs mb-1 uppercase tracking-widest"
                   style={{ color: 'var(--dim)' }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                   required autoFocus />
          </div>
          <div>
            <label className="block text-xs mb-1 uppercase tracking-widest"
                   style={{ color: 'var(--dim)' }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                   required />
          </div>

          {error && (
            <p className="text-sm rounded px-3 py-2"
               style={{ color: 'var(--danger)', background: 'rgba(224,82,82,0.1)' }}>
              {error}
            </p>
          )}

          <button type="submit" disabled={loading}
                  className="w-full py-2.5 rounded-lg font-semibold text-sm transition-opacity"
                  style={{ background: 'var(--gold)', color: '#0f0b07',
                           opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
