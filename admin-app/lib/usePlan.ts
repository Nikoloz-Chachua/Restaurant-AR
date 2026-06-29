'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type PlanId = 'creator' | 'basic300' | 'full450' | 'premium900'
export type PlatformPlanId = 'ar_menu' | 'full' | 'premium'
export type RoleId = 'super_admin' | 'brand_owner' | 'branch_staff'

export type PlanAccess = {
  role: RoleId
  plan: PlanId
  platformPlan: PlatformPlanId
  loading: boolean
  canUseMenu: boolean
  canUseAnalytics: boolean
  canUseTheme: boolean
  canUseDeveloperAnalytics: boolean
  canManageTenants: boolean
  itemLimit: number | null
  label: string
  brandId: number | null
  restaurantId: number | null
  restaurantSlug: string
  restaurantName: string
}

const PLAN_LABELS: Record<PlanId, string> = {
  creator: 'Creator',
  basic300: 'Basic 300',
  full450: 'Full 450',
  premium900: 'Premium 900',
}

const PLATFORM_PLAN_LABELS: Record<PlatformPlanId, string> = {
  ar_menu: 'AR Menu 300',
  full: 'Full 450',
  premium: 'Premium 900',
}

function normalizePlan(value: unknown): PlanId {
  if (value === 'ar_menu') return 'basic300'
  if (value === 'full') return 'full450'
  if (value === 'premium') return 'premium900'
  return value === 'creator' || value === 'full450' || value === 'premium900' || value === 'basic300'
    ? value
    : 'basic300'
}

function normalizePlatformPlan(value: unknown): PlatformPlanId {
  if (value === 'premium' || value === 'premium900' || value === 'creator') return 'premium'
  if (value === 'full' || value === 'full450') return 'full'
  return 'ar_menu'
}

function normalizeRole(value: unknown): RoleId {
  if (value === 'super_admin' || value === 'creator' || value === 'dev') return 'super_admin'
  if (value === 'branch_staff') return 'branch_staff'
  return 'brand_owner'
}

function legacyPlatformPlan(plan: PlanId): PlatformPlanId {
  if (plan === 'creator' || plan === 'premium900') return 'premium'
  if (plan === 'full450') return 'full'
  return 'ar_menu'
}

function requestedRestaurantSlug() {
  if (typeof window === 'undefined') return ''
  const params = new URLSearchParams(window.location.search)
  const requested = params.get('tenant') || params.get('restaurant') || params.get('restaurantSlug') || params.get('slug')
  return requested?.trim().toLowerCase().replace(/[^a-z0-9-]/g, '') ?? ''
}

function accessFor(
  role: RoleId,
  plan: PlanId,
  loading: boolean,
  tenant: Partial<Pick<PlanAccess, 'brandId' | 'restaurantId' | 'restaurantSlug' | 'restaurantName'>> = {},
  platformPlan: PlatformPlanId = legacyPlatformPlan(plan),
): PlanAccess {
  const isSuperAdmin = role === 'super_admin'
  const hasFullAccess = isSuperAdmin || platformPlan === 'full' || platformPlan === 'premium'

  return {
    role,
    plan,
    platformPlan,
    loading,
    canUseMenu: true,
    canUseAnalytics: hasFullAccess,
    canUseTheme: hasFullAccess,
    canUseDeveloperAnalytics: isSuperAdmin,
    canManageTenants: isSuperAdmin,
    itemLimit: isSuperAdmin || platformPlan === 'premium' ? null : platformPlan === 'full' ? 7 : 5,
    label: PLATFORM_PLAN_LABELS[platformPlan] ?? PLAN_LABELS[plan],
    brandId: tenant.brandId ?? null,
    restaurantId: tenant.restaurantId ?? null,
    restaurantSlug: tenant.restaurantSlug ?? '',
    restaurantName: tenant.restaurantName ?? '',
  }
}

export function usePlan(): PlanAccess {
  const [access, setAccess] = useState<PlanAccess>(() => accessFor('brand_owner', 'basic300', true))

  useEffect(() => {
    const supabase = createClient()
    let mounted = true

    async function loadPlan() {
      const { data } = await supabase.auth.getUser()
      const userId = data.user?.id
      const metadata = {
        ...(data.user?.app_metadata ?? {}),
        ...(data.user?.user_metadata ?? {}),
      }
      const plan = metadata.role === 'creator' || metadata.role === 'dev' || metadata.role === 'super_admin'
        ? 'creator'
        : normalizePlan(metadata.plan)
      let role = normalizeRole(metadata.role)
      let platformPlan = legacyPlatformPlan(plan)
      let tenant: Partial<Pick<PlanAccess, 'brandId' | 'restaurantId' | 'restaurantSlug' | 'restaurantName'>> = {}

      if (userId) {
        const [{ data: brandUser }, { data: restaurantUser }] = await Promise.all([
          supabase.from('brand_users').select('brand_id, role, brands(plan)').eq('user_id', userId).limit(1).maybeSingle(),
          supabase.from('restaurant_users').select('restaurant_id, role, restaurants(id, slug, name, brand_id, brands(plan))').eq('user_id', userId).limit(1).maybeSingle(),
        ])

        if (restaurantUser?.restaurants) {
          const restaurant = (Array.isArray(restaurantUser.restaurants) ? restaurantUser.restaurants[0] : restaurantUser.restaurants) as {
            id: number; slug: string; name: string; brand_id: number; brands?: { plan?: string } | { plan?: string }[]
          }
          const brand = Array.isArray(restaurant.brands) ? restaurant.brands[0] : restaurant.brands
          role = 'branch_staff'
          platformPlan = normalizePlatformPlan(brand?.plan)
          tenant = {
            brandId: restaurant.brand_id ?? null,
            restaurantId: restaurant.id,
            restaurantSlug: restaurant.slug,
            restaurantName: restaurant.name,
          }
        } else if (brandUser) {
          const brand = (Array.isArray(brandUser.brands) ? brandUser.brands[0] : brandUser.brands) as { plan?: string } | null
          const { data: restaurants } = await supabase
            .from('restaurants')
            .select('id, slug, name')
            .eq('brand_id', brandUser.brand_id)
            .order('created_at')
            .limit(1)
          const restaurant = restaurants?.[0]
          role = 'brand_owner'
          platformPlan = normalizePlatformPlan(brand?.plan)
          tenant = {
            brandId: brandUser.brand_id,
            restaurantId: restaurant?.id ?? null,
            restaurantSlug: restaurant?.slug ?? '',
            restaurantName: restaurant?.name ?? '',
          }
        } else if (role === 'super_admin') {
          const selectedSlug = requestedRestaurantSlug() || 'burger-lions-main'
          const { data: burgerLions } = await supabase
            .from('restaurants')
            .select('id, slug, name, brand_id, brands(plan)')
            .eq('slug', selectedSlug)
            .maybeSingle()
          if (burgerLions) {
            const brand = (Array.isArray(burgerLions.brands) ? burgerLions.brands[0] : burgerLions.brands) as { plan?: string } | null
            platformPlan = normalizePlatformPlan(brand?.plan ?? metadata.plan)
            tenant = {
              brandId: burgerLions.brand_id,
              restaurantId: burgerLions.id,
              restaurantSlug: burgerLions.slug,
              restaurantName: burgerLions.name,
            }
          }
        }
      }

      if (mounted) setAccess(accessFor(role, plan, false, tenant, platformPlan))
    }

    loadPlan().catch(() => {
      if (mounted) setAccess(accessFor('brand_owner', 'basic300', false))
    })

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      loadPlan().catch(() => {
        if (mounted) setAccess(accessFor('brand_owner', 'basic300', false))
      })
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  return access
}
