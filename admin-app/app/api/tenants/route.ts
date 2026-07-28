import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { themePreset, themePresetValuesWithAccents } from '@/lib/themePresets'
import { cleanEmail, ensureAdminAuthUser, fetchStoredInitialPasswords, isPlatformRole, storeInitialPassword } from '@/lib/adminAccounts'
import { deriveTenantCreationFields, nextTenantSlugCandidate, slugify } from '@/lib/adminUx'

type TenantPlan = 'ar_menu' | 'full' | 'premium'

type TenantRequest = {
  brandName?: string
  plan?: TenantPlan
  templateKey?: string
  primaryColor?: string
  secondaryColor?: string
  createStarterCategory?: boolean
  adminEmail?: string
  adminPassword?: string
}

type TenantPlanUpdateRequest = {
  brandId?: number | string
  brandSlug?: string
  plan?: TenantPlan
  canCreateBranches?: boolean
}

type TenantRpcRow = {
  brand_id: number
  brand_name: string
  brand_slug: string
  plan: TenantPlan
  restaurant_id: number
  restaurant_name: string
  restaurant_slug: string
}

type TenantBrand = {
  id: number
  name: string
  slug: string
  plan: TenantPlan
  can_create_branches?: boolean | null
  created_at: string
  restaurants?: {
    id: number
    name: string
    slug: string
    status: string
    custom_domain: string | null
    managerEmails?: string[]
    managerCredentials?: { email: string; storedInitialPassword: string | null }[]
  }[]
  adminEmails?: string[]
  adminCredentials?: { email: string; storedInitialPassword: string | null }[]
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const CUSTOMER_APP_URL = (process.env.NEXT_PUBLIC_CUSTOMER_APP_URL || 'https://restaurant-ar.pages.dev').replace(/\/$/, '')
const TENANT_DOMAIN_BASE = (process.env.NEXT_PUBLIC_TENANT_DOMAIN_BASE || 'betareal.ge').replace(/^https?:\/\//, '').replace(/\/$/, '')
function cleanSlug(value: string) {
  return slugify(value)
}

function isColor(value: unknown) {
  return typeof value === 'string' && (/^#[0-9a-fA-F]{6}$/.test(value) || value === '')
}

function isMissingBranchEntitlementColumn(error: { message?: string; code?: string } | null | undefined) {
  const message = String(error?.message ?? '').toLowerCase()
  return error?.code === '42703' || (message.includes('can_create_branches') && message.includes('column'))
}

async function upsertTenantTheme(
  restaurantId: number,
  siteName: string,
  siteNameKa: string,
  templateKey: string,
  primaryColor: string,
  secondaryColor: string,
) {
  const service = createAdminClient()
  if (!service) return 'SUPABASE_SERVICE_ROLE_KEY is missing; tenant theme_config preset was not saved'
  const preset = themePreset(templateKey)
  const rows = {
    ...themePresetValuesWithAccents(preset, primaryColor, secondaryColor),
    site_name: siteName,
    site_name_ka: siteNameKa,
    template_key: templateKey,
  }
  const { error } = await service
    .from('theme_config')
    .upsert(
      Object.entries(rows).map(([key, value]) => ({ restaurant_id: restaurantId, key, value })),
      { onConflict: 'restaurant_id,key' },
    )
  return error?.message ?? ''
}

// Only subdomains manually whitelisted as Custom Domains on the Cloudflare Pages
// project resolve; all other *.betareal.ge URLs return Cloudflare error 1014.
// Keep in sync with WORKING_TENANT_SUBDOMAINS in app/(admin)/tenants/page.tsx.
const WORKING_TENANT_SUBDOMAINS = new Set(['rhythm', 'monday-greens'])

function tenantPreviewUrl(slug: string) {
  if (
    WORKING_TENANT_SUBDOMAINS.has(slug) &&
    TENANT_DOMAIN_BASE &&
    !TENANT_DOMAIN_BASE.includes('localhost')
  ) {
    return `https://${slug}.${TENANT_DOMAIN_BASE}/`
  }
  const url = new URL(CUSTOMER_APP_URL)
  url.searchParams.set('tenant', slug)
  return url.toString()
}

function isTenantPlan(value: unknown): value is TenantPlan {
  return value === 'ar_menu' || value === 'full' || value === 'premium'
}

async function enrichTenantEmails(brands: TenantBrand[]) {
  const service = createAdminClient()
  if (!service || brands.length === 0) return brands

  const [{ data: brandUsers }, { data: restaurantUsers }, { data: users }] = await Promise.all([
    service.from('brand_users').select('brand_id, user_id, role'),
    service.from('restaurant_users').select('restaurant_id, user_id, role'),
    service.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ])
  const emailById = new Map(users?.users.map(user => [user.id, user.email ?? '']) ?? [])
  const storedPasswords = await fetchStoredInitialPasswords(
    service,
    [
      ...((brandUsers ?? []).map(row => String(row.user_id))),
      ...((restaurantUsers ?? []).map(row => String(row.user_id))),
    ],
  )

  return brands.map(brand => {
    const adminRows = (brandUsers ?? [])
      .filter(row => Number(row.brand_id) === Number(brand.id))
    const adminCredentials = adminRows
      .map(row => ({
        email: emailById.get(String(row.user_id)) ?? '',
        storedInitialPassword: storedPasswords.get(String(row.user_id))?.initialPassword || null,
      }))
      .filter(row => row.email)

    return {
      ...brand,
      adminEmails: adminCredentials.map(row => row.email),
      adminCredentials,
      restaurants: (brand.restaurants ?? []).map(restaurant => ({
        ...restaurant,
        managerCredentials: (restaurantUsers ?? [])
          .filter(row => Number(row.restaurant_id) === Number(restaurant.id))
          .map(row => ({
            email: emailById.get(String(row.user_id)) ?? '',
            storedInitialPassword: storedPasswords.get(String(row.user_id))?.initialPassword || null,
          }))
          .filter(row => row.email),
        managerEmails: (restaurantUsers ?? [])
          .filter(row => Number(row.restaurant_id) === Number(restaurant.id))
          .map(row => emailById.get(String(row.user_id)) ?? '')
          .filter(Boolean),
      })),
    }
  })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: superAdminResult } = user ? await supabase.rpc('is_super_admin') : { data: false }
  if (!user || superAdminResult !== true) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let { data, error } = await supabase
    .from('brands')
    .select('id, name, slug, plan, can_create_branches, created_at, restaurants(id, name, slug, status, custom_domain)')
    .order('created_at', { ascending: false })
  if (isMissingBranchEntitlementColumn(error)) {
    const fallback = await supabase
      .from('brands')
      .select('id, name, slug, plan, created_at, restaurants(id, name, slug, status, custom_domain)')
      .order('created_at', { ascending: false })
    data = fallback.data?.map(brand => ({ ...brand, can_create_branches: false })) ?? null
    error = fallback.error
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const brands = await enrichTenantEmails((data ?? []) as TenantBrand[])
  return NextResponse.json({ brands })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const role = user?.app_metadata?.role
  if (!user || !isPlatformRole(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => null) as TenantRequest | null
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 })
  }
  const tenantFields = deriveTenantCreationFields(body)
  const brandName = tenantFields.brandName
  const plan = body.plan === 'full' || body.plan === 'premium' ? body.plan : 'ar_menu'
  const preset = themePreset(body.templateKey)
  const templateKey = preset.key
  const primaryColor = isColor(body.primaryColor) && body.primaryColor ? body.primaryColor : preset.primaryColor
  const secondaryColor = isColor(body.secondaryColor) && body.secondaryColor ? body.secondaryColor : preset.secondaryColor
  const adminEmail = cleanEmail(body.adminEmail)
  const adminPassword = String(body.adminPassword ?? '')

  if (!brandName) {
    return NextResponse.json({ error: 'Brand name is required' }, { status: 400 })
  }
  if (!SLUG_RE.test(tenantFields.brandSlug) || !SLUG_RE.test(tenantFields.restaurantSlug)) {
    return NextResponse.json({ error: 'Slugs must use lowercase letters, numbers, and hyphens' }, { status: 400 })
  }
  if ((adminEmail || adminPassword) && (!adminEmail || adminPassword.length < 8)) {
    return NextResponse.json({ error: 'Admin email and password of at least 8 characters are required together' }, { status: 400 })
  }
  if (adminEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
    return NextResponse.json({ error: 'Admin email is not valid' }, { status: 400 })
  }

  let data: unknown = null
  let error: { code?: string; message?: string } | null = null
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const fields = attempt === 0 ? tenantFields : nextTenantSlugCandidate({ ...tenantFields, attempt })
    const result = await supabase.rpc('create_platform_tenant', {
      p_brand_name: fields.brandName,
      p_brand_slug: fields.brandSlug,
      p_restaurant_name: fields.restaurantName,
      p_restaurant_slug: fields.restaurantSlug,
      p_plan: plan,
      p_primary_color: primaryColor,
      p_secondary_color: secondaryColor,
      p_create_starter_category: body.createStarterCategory ?? preset.createStarterCategory,
    }).single()
    data = result.data
    error = result.error
    if (!error || error.code !== '23505') break
  }

  if (error) {
    return NextResponse.json({
      error: error.code === '23505'
        ? 'Could not derive an available tenant URL slug; try a more specific brand name'
        : error.message || 'Tenant creation failed before any rows were committed',
    }, { status: error.code === '23505' ? 409 : 400 })
  }

  const created = data as TenantRpcRow | null
  if (!created) {
    return NextResponse.json({ error: 'Tenant creation did not return a tenant row' }, { status: 500 })
  }

  const brand = {
    id: created.brand_id,
    name: created.brand_name,
    slug: created.brand_slug,
    plan: created.plan,
  }
  const restaurant = {
    id: created.restaurant_id,
    name: created.restaurant_name,
    slug: created.restaurant_slug,
    brand_id: created.brand_id,
  }
  const themeWarning = await upsertTenantTheme(
    restaurant.id,
    `${brand.name} — ${restaurant.name}`,
    `${brand.name} — ${restaurant.name}`,
    templateKey,
    primaryColor,
    secondaryColor,
  )
  const warnings = themeWarning ? [`theme preset save failed: ${themeWarning}`] : []

  let adminUser: { id: string; email: string } | null = null
  if (adminEmail) {
    const service = createAdminClient()
    if (!service) {
      return NextResponse.json({
        error: 'Tenant created, but admin user was not linked because SUPABASE_SERVICE_ROLE_KEY is missing in admin-app env',
        brand,
        restaurant,
        previewUrl: tenantPreviewUrl(restaurant.slug),
      }, { status: 500 })
    }

    const ensured = await ensureAdminAuthUser(service, adminEmail, adminPassword)
    if (ensured.error || !ensured.userId) {
      return NextResponse.json({
        error: `Tenant created, but admin user creation/update failed: ${ensured.error?.message || 'unknown error'}`,
        brand,
        restaurant,
        previewUrl: tenantPreviewUrl(restaurant.slug),
      }, { status: 500 })
    }
    const userId = ensured.userId

    const [{ error: brandLinkError }, { error: restaurantLinkError }] = await Promise.all([
      service.from('brand_users').upsert({ brand_id: brand.id, user_id: userId, role: 'brand_owner' }, { onConflict: 'brand_id,user_id' }),
      service.from('restaurant_users').upsert({ restaurant_id: restaurant.id, user_id: userId, role: 'branch_manager' }, { onConflict: 'restaurant_id,user_id' }),
    ])
    if (brandLinkError || restaurantLinkError) {
      return NextResponse.json({
        error: `Tenant created, but admin link failed: ${brandLinkError?.message || restaurantLinkError?.message}`,
        brand,
        restaurant,
        previewUrl: tenantPreviewUrl(restaurant.slug),
      }, { status: 500 })
    }
    const passwordStoreError = await storeInitialPassword(service, {
      userId,
      email: adminEmail,
      password: adminPassword,
      createdBy: user.id,
    })
    if (passwordStoreError) {
      warnings.push(`temporary password storage failed: ${passwordStoreError.message}`)
    }
    adminUser = { id: userId, email: adminEmail }
  }

  return NextResponse.json({
    brand,
    restaurant,
    adminUser,
    oneTimePassword: adminEmail ? adminPassword : null,
    previewUrl: tenantPreviewUrl(restaurant.slug),
    credentialNote: adminEmail ? 'Temporary password visibility: stored initial password is available to super admins only.' : null,
    note: warnings.length
      ? `Created database tenant, but ${warnings.join('; ')}`
      : 'Created database tenant. Customer URL uses the shared Pages template (?tenant=<branch-slug>); a clean <slug>.betareal.ge URL requires whitelisting the subdomain on the Cloudflare Pages project first.',
  }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: superAdminResult, error: superAdminError } = user ? await supabase.rpc('is_super_admin') : { data: false, error: null }
  if (superAdminError) return NextResponse.json({ error: superAdminError.message }, { status: 500 })
  if (!user || superAdminResult !== true) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => null) as TenantPlanUpdateRequest | null
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 })
  }

  const brandId = Number(body.brandId)
  const brandSlug = cleanSlug(String(body.brandSlug ?? ''))
  const plan = body.plan
  const hasPlanUpdate = plan !== undefined
  const hasBranchEntitlementUpdate = body.canCreateBranches !== undefined

  if (!hasPlanUpdate && !hasBranchEntitlementUpdate) {
    return NextResponse.json({ error: 'Plan or branch creation entitlement is required' }, { status: 400 })
  }
  if (hasPlanUpdate && !isTenantPlan(plan)) {
    return NextResponse.json({ error: 'Plan must be AR Menu 300, Full 450, or Premium 900' }, { status: 400 })
  }
  if (hasBranchEntitlementUpdate && typeof body.canCreateBranches !== 'boolean') {
    return NextResponse.json({ error: 'Branch creation entitlement must be true or false' }, { status: 400 })
  }
  if ((!Number.isInteger(brandId) || brandId <= 0) && !brandSlug) {
    return NextResponse.json({ error: 'Valid brandId or brandSlug is required' }, { status: 400 })
  }

  const updates: Record<string, string | boolean> = { updated_at: new Date().toISOString() }
  if (hasPlanUpdate) updates.plan = plan as TenantPlan
  if (hasBranchEntitlementUpdate) updates.can_create_branches = body.canCreateBranches === true

  let query = supabase
    .from('brands')
    .update(updates)
    .select('id, name, slug, plan, can_create_branches, created_at')

  query = Number.isInteger(brandId) && brandId > 0
    ? query.eq('id', brandId)
    : query.eq('slug', brandSlug)

  const { data: brand, error } = await query.maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!brand) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  return NextResponse.json({ brand })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: superAdminResult } = user ? await supabase.rpc('is_super_admin') : { data: false }
  if (!user || superAdminResult !== true) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const brandId = Number(req.nextUrl.searchParams.get('brandId'))
  if (!Number.isInteger(brandId) || brandId <= 0) {
    return NextResponse.json({ error: 'Valid brandId is required' }, { status: 400 })
  }

  const { data: brand, error: loadError } = await supabase
    .from('brands')
    .select('id, name, slug')
    .eq('id', brandId)
    .maybeSingle()

  if (loadError) return NextResponse.json({ error: loadError.message }, { status: 500 })
  if (!brand) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  
  const { error } = await supabase.from('brands').delete().eq('id', brandId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ deleted: true, brand })
}
