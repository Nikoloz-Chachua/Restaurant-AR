'use client'
import { useEffect, useRef } from 'react'
import { useLang } from '@/lib/useLang'

export default function DashboardPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [T] = useLang()

  useEffect(() => {
    function relay(e: Event) {
      const { lang, dark } = (e as CustomEvent).detail
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'bl-pref', lang, dark },
        '*'
      )
    }
    window.addEventListener('bl-pref', relay)
    return () => window.removeEventListener('bl-pref', relay)
  }, [])

  function sendInitialPrefs() {
    const lang = localStorage.getItem('bl-admin-lang') || 'en'
    const dark = localStorage.getItem('bl-admin-theme') !== 'light'
    iframeRef.current?.contentWindow?.postMessage({ type: 'bl-pref', lang, dark }, '*')
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
