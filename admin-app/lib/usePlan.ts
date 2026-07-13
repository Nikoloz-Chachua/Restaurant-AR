'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { canCreateBranchesForRole } from '@/lib/branchPermissions'

export type PlanId = 'creator' | 'basic300' | 'full450' | 'premium900'
export type PlatformPlanId = 'ar_menu' | 'full' | 'premium'
export type RoleId = 'super_admin' | 'brand_owner' | 'branch_manager' | 'branch_staff'

export type PlanAccess = {
  role: RoleId
  plan: PlanId
  platformPlan: PlatformPlanId
  loading: boolean
  canUseMenu: boolean
  canUseAnalytics: boolean
  canUseTheme: boolean
  canUseDeveloperAnalytics: boolean
  canUploadModels: boolean
  canManageTenants: boolean
  canManageBranches: boolean
  canCreateBranches: boolean
  itemLimit: number | null
  label: string
  brandId: number | null
  restaurantId: number | null
  restaurantSlug: string
  restaurantName: string
  restaurantDomain: string
  canCreateBranchesEntitlement: boolean
  hasTenantContext: boolean
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
  if (value === 'branch_manager') return 'branch_manager'
  if (value === 'branch_staff') return 'branch_staff'
  return 'brand_owner'
}

function legacyPlatformPlan(plan: PlanId): PlatformPlanId {
  if (plan === 'creator' || plan === 'premium900') return 'premium'
  if (plan === 'full450') return 'full'
  return 'ar_menu'
}

function planIdFromPlatform(platformPlan: PlatformPlanId, role: RoleId): PlanId {
  if (role === 'super_admin') return 'creator'
  if (platformPlan === 'premium') return 'premium900'
  if (platformPlan === 'full') return 'full450'
  return 'basic300'
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
  tenant: Partial<Pick<PlanAccess, 'brandId' | 'restaurantId' | 'restaurantSlug' | 'restaurantName' | 'restaurantDomain' | 'canCreateBranchesEntitlement'>> = {},
  platformPlan: PlatformPlanId = legacyPlatformPlan(plan),
): PlanAccess {
  const isSuperAdmin = role === 'super_admin'
  const hasTenantContext = Boolean(tenant.restaurantId)
  const hasFullAccess = hasTenantContext && (isSuperAdmin || platformPlan === 'full' || platformPlan === 'premium')
  const canCreateBranches = canCreateBranchesForRole(role, tenant.canCreateBranchesEntitlement)

  return {
    role,
    plan,
    platformPlan,
    loading,
    canUseMenu: !isSuperAdmin || hasTenantContext,
    canUseAnalytics: hasFullAccess,
    canUseTheme: hasFullAccess,
    canUseDeveloperAnalytics: isSuperAdmin,
    // Only BetaReal (super_admin) uploads GLB/USDZ models — clients never see the
    // model upload control. Clients can still manage their own photo thumbnails.
    canUploadModels: isSuperAdmin,
    canManageTenants: isSuperAdmin,
    canManageBranches: isSuperAdmin || role === 'brand_owner',
    canCreateBranches,
    itemLimit: isSuperAdmin || platformPlan === 'premium' ? null : platformPlan === 'full' ? 7 : 5,
    label: PLATFORM_PLAN_LABELS[platformPlan] ?? PLAN_LABELS[plan],
    brandId: tenant.brandId ?? null,
    restaurantId: tenant.restaurantId ?? null,
    restaurantSlug: tenant.restaurantSlug ?? '',
    restaurantName: tenant.restaurantName ?? '',
    restaurantDomain: tenant.restaurantDomain ?? '',
    canCreateBranchesEntitlement: tenant.canCreateBranchesEntitlement === true,
    hasTenantContext,
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
      const metadata = data.user?.app_metadata ?? {}
      const plan = metadata.role === 'creator' || metadata.role === 'dev' || metadata.role === 'super_admin'
        ? 'creator'
        : normalizePlan(metadata.plan)
      let role = normalizeRole(metadata.role)
      let platformPlan = legacyPlatformPlan(plan)
      let tenant: Partial<Pick<PlanAccess, 'brandId' | 'restaurantId' | 'restaurantSlug' | 'restaurantName' | 'restaurantDomain' | 'canCreateBranchesEntitlement'>> = {}

      if (userId) {
        const requestedSlug = requestedRestaurantSlug()
        const [{ data: brandUsers }, { data: restaurantUsers }] = await Promise.all([
          supabase.from('brand_users').select('brand_id, role, brands(plan)').eq('user_id', userId),
          supabase.from('restaurant_users').select('restaurant_id, role, restaurants(id, slug, name, brand_id, custom_domain, brands(plan))').eq('user_id', userId),
        ])
        const brandMemberships = brandUsers ?? []
        const restaurantMemberships = restaurantUsers ?? []
        const brandIds = new Set(brandMemberships.map(row => row.brand_id))
        const restaurantIds = new Set(restaurantMemberships.map(row => row.restaurant_id))
        const isSuperAdmin = role === 'super_admin'

        async function setTenantFromRestaurant(restaurant: {
          id: number; slug: string; name: string; brand_id: number; custom_domain?: string | null; brands?: { plan?: string } | { plan?: string }[] | null
        }) {
          const brand = Array.isArray(restaurant.brands) ? restaurant.brands[0] : restaurant.brands
          platformPlan = normalizePlatformPlan(brand?.plan)
          tenant = {
            brandId: restaurant.brand_id ?? null,
            restaurantId: restaurant.id,
            restaurantSlug: restaurant.slug,
            restaurantName: restaurant.name,
            restaurantDomain: restaurant.custom_domain ?? '',
            canCreateBranchesEntitlement: false,
          }
        }

        if (requestedSlug) {
          const { data: requestedRestaurant } = await supabase
            .from('restaurants')
            .select('id, slug, name, brand_id, custom_domain, brands(plan)')
            .eq('slug', requestedSlug)
            .maybeSingle()
          if (requestedRestaurant && (isSuperAdmin || brandIds.has(requestedRestaurant.brand_id) || restaurantIds.has(requestedRestaurant.id))) {
            await setTenantFromRestaurant(requestedRestaurant)
          }
        }

        if (!tenant.restaurantId && brandMemberships[0]) {
          const brandUser = brandMemberships[0]
          const brand = (Array.isArray(brandUser.brands) ? brandUser.brands[0] : brandUser.brands) as { plan?: string } | null
          const { data: restaurants } = await supabase
            .from('restaurants')
            .select('id, slug, name, brand_id, custom_domain, brands(plan)')
            .eq('brand_id', brandUser.brand_id)
            .order('created_at')
            .limit(1)
          const restaurant = restaurants?.[0]
          if (!isSuperAdmin) role = 'brand_owner'
          platformPlan = normalizePlatformPlan(brand?.plan)
          if (restaurant) await setTenantFromRestaurant(restaurant)
        } else if (!tenant.restaurantId && restaurantMemberships[0]?.restaurants) {
          const restaurant = (Array.isArray(restaurantMemberships[0].restaurants) ? restaurantMemberships[0].restaurants[0] : restaurantMemberships[0].restaurants) as {
            id: number; slug: string; name: string; brand_id: number; custom_domain?: string | null; brands?: { plan?: string } | { plan?: string }[]
          }
          if (!isSuperAdmin) role = normalizeRole(restaurantMemberships[0].role)
          await setTenantFromRestaurant(restaurant)
        }

        if (tenant.brandId) {
          const { data: entitlementBrand } = await supabase
            .from('brands')
            .select('can_create_branches')
            .eq('id', tenant.brandId)
            .maybeSingle()
          tenant.canCreateBranchesEntitlement = entitlementBrand?.can_create_branches === true
        }
      }

      if (mounted) setAccess(accessFor(role, planIdFromPlatform(platformPlan, role), false, tenant, platformPlan))
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
