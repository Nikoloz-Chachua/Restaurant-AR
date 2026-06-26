'use client'
import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/useLang'
import { usePlan } from '@/lib/usePlan'
import LockedCard from '@/components/LockedCard'

const ANALYTICS_ORIGIN = 'https://3darmenu.pages.dev'

export default function DeveloperAnalyticsPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const tokenRef  = useRef('')
  const [T] = useLang()
  const plan = usePlan()

  useEffect(() => {
    createClient().auth.getSession()
      .then(({ data }) => { tokenRef.current = data?.session?.access_token ?? '' })
      .catch(() => {})
  }, [])

  useEffect(() => {
    function relay(e: Event) {
      const { lang, dark } = (e as CustomEvent).detail
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'bl-pref', lang, dark },
        ANALYTICS_ORIGIN
      )
    }
    window.addEventListener('bl-pref', relay)
    return () => window.removeEventListener('bl-pref', relay)
  }, [])

  function sendInitialPrefs() {
    const lang  = localStorage.getItem('bl-admin-lang') || 'en'
    const dark  = localStorage.getItem('bl-admin-theme') !== 'light'
    const token = tokenRef.current

    if (token) {
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'bl-pref', lang, dark, token },
        ANALYTICS_ORIGIN
      )
      return
    }

    createClient().auth.getSession()
      .then(({ data }) => {
        tokenRef.current = data?.session?.access_token ?? ''
        iframeRef.current?.contentWindow?.postMessage(
          { type: 'bl-pref', lang, dark, token: tokenRef.current },
          ANALYTICS_ORIGIN
        )
      })
      .catch(() => {
        iframeRef.current?.contentWindow?.postMessage(
          { type: 'bl-pref', lang, dark },
          ANALYTICS_ORIGIN
        )
      })
  }

  if (!plan.loading && !plan.canUseDeveloperAnalytics) {
    return (
      <LockedCard
        title="Developer analytics are creator-only"
        description="Technical diagnostics, all-event summaries, AR health, and deeper funnel data are available only to internal BetaReal creator accounts."
        planLabel={plan.label}
      />
    )
  }

  return (
    <div>
      <h1 className="text-xl md:text-2xl font-bold mb-1 page-title" style={{ color: 'var(--gold)' }}>
        {T.navDeveloperAnalytics}
      </h1>
      <p className="text-sm mb-4 md:mb-6" style={{ color: 'var(--dim)' }}>
        Internal technical analytics and diagnostics for the BetaReal team.
      </p>
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <iframe
          ref={iframeRef}
          src="https://3darmenu.pages.dev/dev-analytics.html"
          className="w-full"
          style={{ height: 'clamp(560px, calc(100dvh - 160px), 1400px)', border: 'none' }}
          title="Developer Analytics Dashboard"
          onLoad={sendInitialPrefs}
        />
      </div>
    </div>
  )
}
