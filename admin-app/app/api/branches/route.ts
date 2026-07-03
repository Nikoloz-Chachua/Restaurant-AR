import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { themePreset, themePresetValuesWithAccents } from '@/lib/themePresets'

type BranchRequest = {
  brandId?: number
  branchName?: string
  branchArea?: string
  branchSlug?: string
  templateKey?: string
  primaryColor?: string
  secondaryColor?: string
  createStarterCategory?: boolean
}

type BranchRpcRow = {
  brand_id: number
  brand_name: string
  brand_slug: string
  plan: 'ar_menu' | 'full' | 'premium'
  restaurant_id: number
  restaurant_name: string
  restaurant_slug: string
}

type BrandRow = {
  id: number
  name: string
  slug: string
  plan: 'ar_menu' | 'full' | 'premium'
  created_at: string
  restaurants?: {
    id: number
    name: string
    slug: string
    status: string
    custom_domain: string | null
    managerEmails?: string[]
  }[]
  adminEmails?: string[]
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const CUSTOMER_APP_URL = (process.env.NEXT_PUBLIC_CUSTOMER_APP_URL || 'https://restaurant-ar.pages.dev').replace(/\/$/, '')
const TENANT_DOMAIN_BASE = (process.env.NEXT_PUBLIC_TENANT_DOMAIN_BASE || 'betareal.ge').replace(/^https?:\/\//, '').replace(/\/$/, '')
function isPlatformRole(role: unknown) {
  return ['super_admin', 'creator', 'dev'].includes(String(role))
}

function cleanSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function isColor(value: unknown) {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)
}

async function upsertBranchTheme(
  restaurantId: number,
  siteName: string,
  siteNameKa: string,
  templateKey: string,
  primaryColor: string,
  secondaryColor: string,
) {
  const service = createAdminClient()
  if (!service) return 'SUPABASE_SERVICE_ROLE_KEY is missing; branch theme_config preset was not saved'
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

function branchPreviewUrl(slug: string) {
  if (
    TENANT_DOMAIN_BASE &&
    !TENANT_DOMAIN_BASE.includes('localhost') &&
    !/(^|-)dev($|-)|(^|-)local($|-)|(^|-)private($|-)|(^|-)staging($|-)|(^|-)test($|-)/.test(slug)
  ) {
    return `https://${slug}.${TENANT_DOMAIN_BASE}/`
  }
  const url = new URL(CUSTOMER_APP_URL)
  url.searchParams.set('tenant', slug)
  return url.toString()
}

async function enrichEmails(brands: BrandRow[]) {
  const service = createAdminClient()
  if (!service || brands.length === 0) return brands

  const restaurantIds = new Set(brands.flatMap(brand => (brand.restaurants ?? []).map(restaurant => Number(restaurant.id))))
  const brandIds = new Set(brands.map(brand => Number(brand.id)))
  const [{ data: brandUsers }, { data: restaurantUsers }, { data: users }] = await Promise.all([
    service.from('brand_users').select('brand_id, user_id, role'),
    service.from('restaurant_users').select('restaurant_id, user_id, role'),
    service.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ])
  const emailById = new Map(users?.users.map(user => [user.id, user.email ?? '']) ?? [])

  return brands.map(brand => ({
    ...brand,
    adminEmails: (brandUsers ?? [])
      .filter(row => brandIds.has(Number(row.brand_id)) && Number(row.brand_id) === Number(brand.id))
      .map(row => emailById.get(String(row.user_id)) ?? '')
      .filter(Boolean),
    restaurants: (brand.restaurants ?? []).map(restaurant => ({
      ...restaurant,
      managerEmails: (restaurantUsers ?? [])
        .filter(row => restaurantIds.has(Number(row.restaurant_id)) && Number(row.restaurant_id) === Number(restaurant.id))
        .map(row => emailById.get(String(row.user_id)) ?? '')
        .filter(Boolean),
    })),
  }))
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = user.app_metadata?.role
  const isSuperAdmin = isPlatformRole(role)
  let brandIds: number[] | null = null

  if (!isSuperAdmin) {
    const { data: memberships, error: membershipError } = await supabase
      .from('brand_users')
      .select('brand_id, role')
      .eq('user_id', user.id)
      .eq('role', 'brand_owner')
    if (membershipError) return NextResponse.json({ error: membershipError.message }, { status: 500 })
    brandIds = (memberships ?? []).map(row => Number(row.brand_id))
    if (brandIds.length === 0) return NextResponse.json({ brands: [] })
  }

  let query = supabase
    .from('brands')
    .select('id, name, slug, plan, created_at, restaurants(id, name, slug, status, custom_domain)')
    .order('created_at', { ascending: false })

  if (brandIds) query = query.in('id', brandIds)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const brands = await enrichEmails((data ?? []) as BrandRow[])
  return NextResponse.json({ brands })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null) as BranchRequest | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 })

  const brandId = Number(body.brandId)
  const branchName = String(body.branchName ?? '').trim()
  const branchArea = String(body.branchArea ?? branchName).trim()
  if (!Number.isInteger(brandId) || brandId <= 0) {
    return NextResponse.json({ error: 'Valid brandId is required' }, { status: 400 })
  }
  if (!branchName) {
    return NextResponse.json({ error: 'Branch name is required' }, { status: 400 })
  }
  const preset = themePreset(body.templateKey)
  const templateKey = preset.key
  const primaryColor = isColor(body.primaryColor) ? String(body.primaryColor) : preset.primaryColor
  const secondaryColor = isColor(body.secondaryColor) ? String(body.secondaryColor) : preset.secondaryColor

  const { data: brand, error: brandError } = await supabase
    .from('brands')
    .select('id, name, slug')
    .eq('id', brandId)
    .maybeSingle()
  if (brandError) return NextResponse.json({ error: brandError.message }, { status: 500 })
  if (!brand) return NextResponse.json({ error: 'Brand not found or not allowed' }, { status: 404 })

  const branchSlug = cleanSlug(String(body.branchSlug || `${brand.slug}-${branchArea}`))
  if (!SLUG_RE.test(branchSlug)) {
    return NextResponse.json({ error: 'Branch slug must use lowercase letters, numbers, and hyphens' }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('create_platform_branch', {
    p_brand_id: brandId,
    p_restaurant_name: branchName,
    p_restaurant_slug: branchSlug,
    p_create_starter_category: body.createStarterCategory ?? preset.createStarterCategory,
  }).single()

  if (error) {
    const duplicateSlug = error.code === '23505'
    return NextResponse.json({
      error: duplicateSlug
        ? 'Branch slug or custom domain already exists'
        : error.message || 'Branch creation failed',
    }, { status: duplicateSlug ? 409 : 400 })
  }

  const created = data as BranchRpcRow | null
  if (!created) return NextResponse.json({ error: 'Branch creation did not return a row' }, { status: 500 })
  const themeWarning = await upsertBranchTheme(
    created.restaurant_id,
    `${created.brand_name || brand.name} — ${created.restaurant_name}`,
    `${created.brand_name || brand.name} — ${created.restaurant_name}`,
    templateKey,
    primaryColor,
    secondaryColor,
  )

  return NextResponse.json({
    brand: {
      id: created.brand_id,
      name: created.brand_name,
      slug: created.brand_slug,
      plan: created.plan,
    },
    restaurant: {
      id: created.restaurant_id,
      name: created.restaurant_name,
      slug: created.restaurant_slug,
      brand_id: created.brand_id,
    },
    previewUrl: branchPreviewUrl(created.restaurant_slug),
    adminUrl: `/menu?tenant=${encodeURIComponent(created.restaurant_slug)}`,
    note: themeWarning ? `Branch created, but theme preset save failed: ${themeWarning}` : null,
  }, { status: 201 })
}
