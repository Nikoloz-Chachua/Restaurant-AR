'use client'
import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/useLang'

export default function DashboardPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const tokenRef  = useRef('')
  const [T] = useLang()

  // Start fetching the session token immediately on mount.
  // By the time the heavy iframe (Chart.js + Supabase CDN) fires onLoad,
  // getSession() has already resolved — sendInitialPrefs runs synchronously.
  useEffect(() => {
    createClient().auth.getSession()
      .then(({ data }) => { tokenRef.current = data?.session?.access_token ?? '' })
      .catch(() => {})
  }, [])

  useEffect(() => {
    function relay(e: Event) {
      const { lang, dark } = (e as CustomEvent).detail
      iframeRef.current?.contentWindow?.postMessage({ type: 'bl-pref', lang, dark }, '*')
    }
    window.addEventListener('bl-pref', relay)
    return () => window.removeEventListener('bl-pref', relay)
  }, [])

  function sendInitialPrefs() {
    const lang  = localStorage.getItem('bl-admin-lang') || 'en'
    const dark  = localStorage.getItem('bl-admin-theme') !== 'light'
    const token = tokenRef.current

    if (token) {
      iframeRef.current?.contentWindow?.postMessage({ type: 'bl-pref', lang, dark, token }, '*')
      return
    }

    // Rare: iframe loaded before getSession resolved — do async fallback
    createClient().auth.getSession()
      .then(({ data }) => {
        tokenRef.current = data?.session?.access_token ?? ''
        iframeRef.current?.contentWindow?.postMessage(
          { type: 'bl-pref', lang, dark, token: tokenRef.current },
          '*'
        )
      })
      .catch(() => {
        iframeRef.current?.contentWindow?.postMessage({ type: 'bl-pref', lang, dark }, '*')
      })
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--gold)' }}>{T.analyticsTitle}</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--dim)' }}>
        {T.analyticsDesc}
      </p>
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <iframe
          ref={iframeRef}
          src="https://temotkesh.github.io/Restaurant-AR/admin.html"
          className="w-full"
          style={{ height: 'calc(100vh - 140px)', border: 'none' }}
          title="Analytics Dashboard"
          onLoad={sendInitialPrefs}
        />
      </div>
    </div>
  )
}
