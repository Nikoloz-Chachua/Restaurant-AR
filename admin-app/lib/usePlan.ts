'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type PlanId = 'ar_menu' | 'full' | 'premium'
export type RoleId = 'super_admin' | 'brand_owner' | 'branch_staff' | 'none'

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
  brandId?: number
  restaurantId?: number
}

const PLAN_LABELS: Record<PlanId, string> = {
  ar_menu: 'AR Menu',
  full: 'Full',
  premium: 'Premium',
}

type Metadata = Record<string, unknown>

function normalizePlan(value: unknown): PlanId {
  if (value === 'premium' || value === 'premium900' || value === 'creator') return 'premium'
  if (value === 'full' || value === 'full450') return 'full'
  return 'ar_menu'
}

function planFromJoinedBrand(value: unknown): PlanId {
  if (!value) return 'ar_menu'
  const brand = Array.isArray(value) ? value[0] : value
  if (typeof brand === 'object' && brand && 'plan' in brand) {
    return normalizePlan((brand as { plan?: unknown }).plan)
  }
  return 'ar_menu'
}

function isSuperAdmin(metadata: Metadata) {
  const role = metadata.role
  return role === 'super_admin' || role === 'dev' || role === 'creator'
}

function metadataFallback(metadata: Metadata): { role: RoleId; plan: PlanId } {
  if (isSuperAdmin(metadata)) return { role: 'super_admin', plan: 'premium' }
  if (metadata.role === 'brand_owner') return { role: 'brand_owner', plan: normalizePlan(metadata.plan) }
  if (metadata.role === 'branch_staff') return { role: 'branch_staff', plan: normalizePlan(metadata.plan) }
  return { role: 'none', plan: 'ar_menu' }
}

function accessFor(
  role: RoleId,
  plan: PlanId,
  loading: boolean,
  scope: Pick<PlanAccess, 'brandId' | 'restaurantId'> = {},
): PlanAccess {
  const isSuper = role === 'super_admin'
  const isBrandOwner = role === 'brand_owner'
  const isBranchStaff = role === 'branch_staff'
  const hasPaidFeatures = plan === 'full' || plan === 'premium'

  return {
    role,
    plan,
    loading,
    canUseMenu: isSuper || isBrandOwner || isBranchStaff,
    canUseAnalytics: isSuper || (isBrandOwner && hasPaidFeatures),
    canUseTheme: isSuper || (isBrandOwner && hasPaidFeatures),
    canUseDeveloperAnalytics: isSuper,
    itemLimit: isSuper || plan === 'premium' ? null : 5,
    label: PLAN_LABELS[plan],
    ...scope,
  }
}

export function usePlan(): PlanAccess {
  const [access, setAccess] = useState<PlanAccess>(() => accessFor('none', 'ar_menu', true))

  useEffect(() => {
    const supabase = createClient()
    let mounted = true

    async function loadPlan() {
      const { data } = await supabase.auth.getUser()
      const user = data.user
      const metadata = {
        ...(user?.user_metadata ?? {}),
        ...(user?.app_metadata ?? {}),
      }

      if (!user) {
        if (mounted) setAccess(accessFor('none', 'ar_menu', false))
        return
      }

      if (isSuperAdmin(metadata)) {
        if (mounted) setAccess(accessFor('super_admin', 'premium', false))
        return
      }

      const { data: brandUser } = await supabase
        .from('brand_users')
        .select('brand_id, role, brands(plan)')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

      if (brandUser) {
        const row = brandUser as { brand_id?: number; brands?: unknown }
        if (mounted) {
          setAccess(accessFor('brand_owner', planFromJoinedBrand(row.brands), false, { brandId: row.brand_id }))
        }
        return
      }

      const { data: restaurantUser } = await supabase
        .from('restaurant_users')
        .select('restaurant_id, role, restaurants(brand_id, brands(plan))')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

      if (restaurantUser) {
        const row = restaurantUser as {
          restaurant_id?: number
          restaurants?: { brand_id?: number; brands?: unknown } | { brand_id?: number; brands?: unknown }[]
        }
        const restaurant = Array.isArray(row.restaurants) ? row.restaurants[0] : row.restaurants
        if (mounted) {
          setAccess(accessFor('branch_staff', planFromJoinedBrand(restaurant?.brands), false, {
            brandId: restaurant?.brand_id,
            restaurantId: row.restaurant_id,
          }))
        }
        return
      }

      const fallback = metadataFallback(metadata)
      if (mounted) setAccess(accessFor(fallback.role, fallback.plan, false))
    }

    loadPlan().catch(() => {
      if (mounted) setAccess(accessFor('none', 'ar_menu', false))
    })

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      loadPlan().catch(() => {
        if (mounted) setAccess(accessFor('none', 'ar_menu', false))
      })
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  return access
}
