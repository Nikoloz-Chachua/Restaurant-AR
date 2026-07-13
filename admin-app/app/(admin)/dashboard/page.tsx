'use client'
import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/useLang'
import { usePlan } from '@/lib/usePlan'
import LockedCard from '@/components/LockedCard'

// Only send messages to this exact origin — never '*'
const ANALYTICS_ORIGIN = 'https://restaurant-ar.pages.dev'

export default function DashboardPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const tokenRef  = useRef('')
  const [T] = useLang()
  const plan = usePlan()
  const analyticsSrc = `https://restaurant-ar.pages.dev/admin.html?${new URLSearchParams({
    ...(plan.restaurantId ? { restaurantId: String(plan.restaurantId) } : {}),
    ...(plan.brandId ? { brandId: String(plan.brandId) } : {}),
    ...(plan.restaurantSlug ? { tenant: plan.restaurantSlug } : {}),
  }).toString()}`

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
        { type: 'bl-pref', lang, dark, token, restaurantId: plan.restaurantId, brandId: plan.brandId },
        ANALYTICS_ORIGIN
      )
      return
    }

    createClient().auth.getSession()
      .then(({ data }) => {
        tokenRef.current = data?.session?.access_token ?? ''
        iframeRef.current?.contentWindow?.postMessage(
          { type: 'bl-pref', lang, dark, token: tokenRef.current, restaurantId: plan.restaurantId, brandId: plan.brandId },
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

  if (!plan.loading && !plan.restaurantId) {
    return (
      <div className="max-w-xl rounded-xl p-6" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <div className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--dim)' }}>
          {T.tenantRequired}
        </div>
        <h1 className="text-xl md:text-2xl font-bold page-title" style={{ color: 'var(--gold)' }}>
          {T.noRestaurantSelected}
        </h1>
        <p className="text-sm mt-2 leading-6" style={{ color: 'var(--dim)' }}>
          {T.noRestaurantAnalyticsDesc}
        </p>
      </div>
    )
  }

  if (!plan.loading && !plan.canUseAnalytics) {
    return (
      <LockedCard
        title={T.analyticsLockedTitle}
        description={T.analyticsLockedDesc}
        planLabel={plan.label}
      />
    )
  }

  return (
    <div>
      <h1 className="text-xl md:text-2xl font-bold mb-1 page-title" style={{ color: 'var(--gold)' }}>{T.analyticsTitle}</h1>
      <p className="text-sm mb-4 md:mb-6" style={{ color: 'var(--dim)' }}>
        {T.analyticsDesc}
      </p>
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <iframe
          ref={iframeRef}
          src={analyticsSrc}
          className="w-full"
          style={{ height: 'clamp(480px, calc(100dvh - 160px), 1200px)', border: 'none' }}
          title={T.analyticsIframeTitle}
          onLoad={sendInitialPrefs}
        />
      </div>
    </div>
  )
}
