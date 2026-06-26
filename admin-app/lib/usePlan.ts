'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type PlanId = 'creator' | 'basic300' | 'full450' | 'premium900'
export type RoleId = 'creator' | 'client'

export type PlanAccess = {
  role: RoleId
  plan: PlanId
  loading: boolean
  canUseMenu: boolean
  canUseAnalytics: boolean
  canUseTheme: boolean
  canUseDeveloperAnalytics: boolean
  itemLimit: number | null
  label: string
}

const PLAN_LABELS: Record<PlanId, string> = {
  creator: 'Creator',
  basic300: 'Basic 300',
  full450: 'Full 450',
  premium900: 'Premium 900',
}

function normalizePlan(value: unknown): PlanId {
  return value === 'creator' || value === 'full450' || value === 'premium900' || value === 'basic300'
    ? value
    : 'basic300'
}

function normalizeRole(value: unknown, plan: PlanId): RoleId {
  if (value === 'creator' || plan === 'creator') return 'creator'
  return 'client'
}

function accessFor(role: RoleId, plan: PlanId, loading: boolean): PlanAccess {
  const isCreator = role === 'creator' || plan === 'creator'
  const hasFullAccess = isCreator || plan === 'full450' || plan === 'premium900'

  return {
    role,
    plan,
    loading,
    canUseMenu: true,
    canUseAnalytics: hasFullAccess,
    canUseTheme: hasFullAccess,
    canUseDeveloperAnalytics: isCreator,
    itemLimit: isCreator || plan === 'premium900' ? null : plan === 'full450' ? 7 : 5,
    label: PLAN_LABELS[plan],
  }
}

export function usePlan(): PlanAccess {
  const [access, setAccess] = useState<PlanAccess>(() => accessFor('client', 'basic300', true))

  useEffect(() => {
    const supabase = createClient()
    let mounted = true

    async function loadPlan() {
      const { data } = await supabase.auth.getUser()
      const metadata = {
        ...(data.user?.app_metadata ?? {}),
        ...(data.user?.user_metadata ?? {}),
      }
      const plan = normalizePlan(metadata.plan)
      const role = normalizeRole(metadata.role, plan)
      if (mounted) setAccess(accessFor(role, plan, false))
    }

    loadPlan().catch(() => {
      if (mounted) setAccess(accessFor('client', 'basic300', false))
    })

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      loadPlan().catch(() => {
        if (mounted) setAccess(accessFor('client', 'basic300', false))
      })
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  return access
}
