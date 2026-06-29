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
          Tenant required
        </div>
        <h1 className="text-xl md:text-2xl font-bold page-title" style={{ color: 'var(--gold)' }}>
          No restaurant is selected
        </h1>
        <p className="text-sm mt-2 leading-6" style={{ color: 'var(--dim)' }}>
          Open a tenant from the Tenants page, or ask a super admin to add this user to a brand or restaurant.
        </p>
      </div>
    )
  }

  if (!plan.loading && !plan.canUseAnalytics) {
    return (
      <LockedCard
        title="Analytics requires Full or Premium"
        description="Visitor analytics are available on the Full 450 and Premium 900 plans. Upgrade the account to see restaurant analytics here."
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
          src="https://restaurant-ar.pages.dev/admin.html"
          className="w-full"
          style={{ height: 'clamp(480px, calc(100dvh - 160px), 1200px)', border: 'none' }}
          title="Analytics Dashboard"
          onLoad={sendInitialPrefs}
        />
      </div>
    </div>
  )
}
