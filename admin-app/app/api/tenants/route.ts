import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type TenantRequest = {
  brandName?: string
  brandSlug?: string
  restaurantName?: string
  restaurantSlug?: string
  plan?: 'ar_menu' | 'full' | 'premium'
  templateKey?: string
  primaryColor?: string
  secondaryColor?: string
  createStarterCategory?: boolean
  adminEmail?: string
  adminPassword?: string
}

type TenantRpcRow = {
  brand_id: number
  brand_name: string
  brand_slug: string
  plan: 'ar_menu' | 'full' | 'premium'
  restaurant_id: number
  restaurant_name: string
  restaurant_slug: string
}

type TenantBrand = {
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
const TEMPLATE_PRESETS = {
  warm_gold: {
    primaryColor: '#f2b535',
    secondaryColor: '#c07808',
    createStarterCategory: true,
    theme: {
      night_bg: '#0f0b07',
      night_card: '#1d1610',
      night_card2: '#261d13',
      night_border: 'rgba(242,181,53,0.18)',
      night_text: '#ede6d4',
      night_dim: '#8a7a62',
      night_accent: '#f2b535',
      night_accent_text: '#0f0b07',
      night_thumb_bg: '#17100a',
      night_modal_bg: '#120d08',
      day_bg: '#f5f0e8',
      day_card: '#ffffff',
      day_card2: '#ede7d8',
      day_border: 'rgba(155,98,8,0.18)',
      day_text: '#1c1308',
      day_dim: '#8a7060',
      day_accent: '#c07808',
      day_accent_text: '#ffffff',
      day_thumb_bg: '#fff8ec',
      day_modal_bg: '#fffaf2',
    },
  },
  cream_cafe: {
    primaryColor: '#d97706',
    secondaryColor: '#2f7d57',
    createStarterCategory: true,
    theme: {
      night_bg: '#1b1710',
      night_card: '#272016',
      night_card2: '#312719',
      night_border: 'rgba(217,119,6,0.24)',
      night_text: '#fff3dc',
      night_dim: '#b69b78',
      night_accent: '#f59e0b',
      night_accent_text: '#1b1710',
      night_thumb_bg: '#241c12',
      night_modal_bg: '#17130d',
      day_bg: '#fff8ed',
      day_card: '#ffffff',
      day_card2: '#f7ead4',
      day_border: 'rgba(47,125,87,0.22)',
      day_text: '#2b1f14',
      day_dim: '#8b6f50',
      day_accent: '#d97706',
      day_accent_text: '#ffffff',
      day_thumb_bg: '#f0f7ee',
      day_modal_bg: '#fffaf1',
    },
  },
} as const

function cleanSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function isColor(value: unknown) {
  return typeof value === 'string' && (/^#[0-9a-fA-F]{6}$/.test(value) || value === '')
}

function templatePreset(key: unknown) {
  return key === 'cream_cafe' ? TEMPLATE_PRESETS.cream_cafe : TEMPLATE_PRESETS.warm_gold
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
  const preset = templatePreset(templateKey)
  const rows = {
    ...preset.theme,
    night_accent: primaryColor || preset.primaryColor,
    day_accent: primaryColor || preset.primaryColor,
    night_border: `rgba(${secondaryColor ? hexToRgb(secondaryColor) : '192,120,8'},0.22)`,
    day_border: `rgba(${secondaryColor ? hexToRgb(secondaryColor) : '47,125,87'},0.22)`,
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

function hexToRgb(hex: string) {
  const clean = hex.replace('#', '')
  const int = Number.parseInt(clean, 16)
  return `${(int >> 16) & 255},${(int >> 8) & 255},${int & 255}`
}

function tenantPreviewUrl(slug: string) {
  const url = new URL(CUSTOMER_APP_URL)
  url.searchParams.set('tenant', slug)
  return url.toString()
}

function isPlatformRole(role: unknown) {
  return ['super_admin', 'creator', 'dev'].includes(String(role))
}

function cleanEmail(value: unknown) {
  return String(value ?? '').trim().toLowerCase()
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

  return brands.map(brand => {
    const adminEmails = (brandUsers ?? [])
      .filter(row => Number(row.brand_id) === Number(brand.id))
      .map(row => emailById.get(String(row.user_id)) ?? '')
      .filter(Boolean)

    return {
      ...brand,
      adminEmails,
      restaurants: (brand.restaurants ?? []).map(restaurant => ({
        ...restaurant,
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
  const role = user?.app_metadata?.role
  if (!user || !isPlatformRole(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('brands')
    .select('id, name, slug, plan, created_at, restaurants(id, name, slug, status, custom_domain)')
    .order('created_at', { ascending: false })

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
  const brandName = String(body.brandName ?? '').trim()
  const restaurantName = String(body.restaurantName ?? '').trim()
  const brandSlug = cleanSlug(String(body.brandSlug || brandName))
  const restaurantSlug = cleanSlug(String(body.restaurantSlug || `${brandSlug}-main`))
  const plan = body.plan === 'full' || body.plan === 'premium' ? body.plan : 'ar_menu'
  const templateKey = body.templateKey === 'cream_cafe' ? 'cream_cafe' : 'warm_gold'
  const preset = templatePreset(templateKey)
  const primaryColor = isColor(body.primaryColor) && body.primaryColor ? body.primaryColor : preset.primaryColor
  const secondaryColor = isColor(body.secondaryColor) && body.secondaryColor ? body.secondaryColor : preset.secondaryColor
  const adminEmail = cleanEmail(body.adminEmail)
  const adminPassword = String(body.adminPassword ?? '')

  if (!brandName || !restaurantName) {
    return NextResponse.json({ error: 'Brand name and first branch name are required' }, { status: 400 })
  }
  if (!SLUG_RE.test(brandSlug) || !SLUG_RE.test(restaurantSlug)) {
    return NextResponse.json({ error: 'Slugs must use lowercase letters, numbers, and hyphens' }, { status: 400 })
  }
  if ((adminEmail || adminPassword) && (!adminEmail || adminPassword.length < 8)) {
    return NextResponse.json({ error: 'Admin email and password of at least 8 characters are required together' }, { status: 400 })
  }
  if (adminEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
    return NextResponse.json({ error: 'Admin email is not valid' }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('create_platform_tenant', {
    p_brand_name: brandName,
    p_brand_slug: brandSlug,
    p_restaurant_name: restaurantName,
    p_restaurant_slug: restaurantSlug,
    p_plan: plan,
    p_primary_color: primaryColor,
    p_secondary_color: secondaryColor,
    p_create_starter_category: body.createStarterCategory ?? preset.createStarterCategory,
  }).single()

  if (error) {
    const duplicateSlug = error.code === '23505'
    return NextResponse.json({
      error: duplicateSlug
        ? 'Brand slug, branch slug, or custom domain already exists'
        : error.message || 'Tenant creation failed before any rows were committed',
    }, { status: duplicateSlug ? 409 : 400 })
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

    const { data: createdUser, error: createUserError } = await service.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      app_metadata: { role: 'brand_owner' },
      user_metadata: {},
    })
    const duplicateUser = createUserError?.message?.toLowerCase().includes('already')
    let userId = createdUser.user?.id ?? ''

    if (createUserError && !duplicateUser) {
      return NextResponse.json({
        error: `Tenant created, but admin user creation failed: ${createUserError.message}`,
        brand,
        restaurant,
        previewUrl: tenantPreviewUrl(restaurant.slug),
      }, { status: 500 })
    }

    if (!userId) {
      const { data: users, error: listError } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 })
      if (listError) {
        return NextResponse.json({
          error: `Tenant created, but existing admin user lookup failed: ${listError.message}`,
          brand,
          restaurant,
          previewUrl: tenantPreviewUrl(restaurant.slug),
        }, { status: 500 })
      }
      userId = users.users.find(existing => existing.email?.toLowerCase() === adminEmail)?.id ?? ''
    }

    if (!userId) {
      return NextResponse.json({
        error: 'Tenant created, but admin user could not be found or linked',
        brand,
        restaurant,
        previewUrl: tenantPreviewUrl(restaurant.slug),
      }, { status: 500 })
    }

    const { error: metadataError } = await service.auth.admin.updateUserById(userId, {
      app_metadata: { role: 'brand_owner' },
      user_metadata: {},
    })
    if (metadataError) {
      return NextResponse.json({
        error: `Tenant created, but admin metadata update failed: ${metadataError.message}`,
        brand,
        restaurant,
        previewUrl: tenantPreviewUrl(restaurant.slug),
      }, { status: 500 })
    }

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
    adminUser = { id: userId, email: adminEmail }
  }

  return NextResponse.json({
    brand,
    restaurant,
    adminUser,
    oneTimePassword: adminEmail ? adminPassword : null,
    previewUrl: tenantPreviewUrl(restaurant.slug),
    credentialNote: adminEmail ? 'Password is shown once. Reset it if lost.' : null,
    note: themeWarning
      ? `Created database tenant, but theme preset save failed: ${themeWarning}`
      : 'Created database tenant. The live shared template opens it with ?tenant=<branch-slug>; wildcard domains/custom Vercel domains are separate infrastructure.',
  }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const role = user?.app_metadata?.role
  if (!user || !isPlatformRole(role)) {
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
