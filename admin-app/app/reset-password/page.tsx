'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [hasSession, setHasSession] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setHasSession(Boolean(data.session))
    })

    const { data: listener } = supabase.auth.onAuthStateChange(event => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setHasSession(true)
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  async function sendReset(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setMessage('Password reset email sent.')
  }

  async function updatePassword(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setMessage('Password updated. Redirecting to login...')
    await supabase.auth.signOut()
    setTimeout(() => router.push('/login'), 800)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--gold)' }}>
            Reset password
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--dim)' }}>
            Passwords are not stored by BetaReal.
          </p>
        </div>

        <form
          onSubmit={hasSession ? updatePassword : sendReset}
          className="rounded-xl p-6 space-y-4"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          {hasSession ? (
            <div>
              <label className="block text-xs mb-1 uppercase tracking-widest" style={{ color: 'var(--dim)' }}>
                New password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs mb-1 uppercase tracking-widest" style={{ color: 'var(--dim)' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
          )}

          {error && (
            <p className="text-sm rounded px-3 py-2" style={{ color: 'var(--danger)', background: 'rgba(224,82,82,0.1)' }}>
              {error}
            </p>
          )}
          {message && (
            <p className="text-sm rounded px-3 py-2" style={{ color: 'var(--success)', background: 'rgba(76,175,125,0.1)' }}>
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg font-semibold text-sm transition-opacity"
            style={{ background: 'var(--gold)', color: '#0f0b07', opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Working...' : hasSession ? 'Update password' : 'Send reset email'}
          </button>
        </form>
      </div>
    </div>
  )
}
