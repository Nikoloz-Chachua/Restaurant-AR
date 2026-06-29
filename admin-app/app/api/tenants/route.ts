import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type TenantRequest = {
  brandName?: string
  brandSlug?: string
  restaurantName?: string
  restaurantSlug?: string
  plan?: 'ar_menu' | 'full' | 'premium'
  primaryColor?: string
  secondaryColor?: string
  createStarterCategory?: boolean
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

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const CUSTOMER_APP_URL = (process.env.NEXT_PUBLIC_CUSTOMER_APP_URL || 'https://restaurant-ar.pages.dev').replace(/\/$/, '')

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

function tenantPreviewUrl(slug: string) {
  const url = new URL(CUSTOMER_APP_URL)
  url.searchParams.set('tenant', slug)
  return url.toString()
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const role = user?.app_metadata?.role ?? user?.user_metadata?.role
  if (!user || !['super_admin', 'creator', 'dev'].includes(String(role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('brands')
    .select('id, name, slug, plan, created_at, restaurants(id, name, slug, status, custom_domain)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ brands: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const role = user?.app_metadata?.role ?? user?.user_metadata?.role
  if (!user || !['super_admin', 'creator', 'dev'].includes(String(role))) {
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
  const primaryColor = isColor(body.primaryColor) ? body.primaryColor ?? '' : ''
  const secondaryColor = isColor(body.secondaryColor) ? body.secondaryColor ?? '' : ''

  if (!brandName || !restaurantName) {
    return NextResponse.json({ error: 'Brand name and first branch name are required' }, { status: 400 })
  }
  if (!SLUG_RE.test(brandSlug) || !SLUG_RE.test(restaurantSlug)) {
    return NextResponse.json({ error: 'Slugs must use lowercase letters, numbers, and hyphens' }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('create_platform_tenant', {
    p_brand_name: brandName,
    p_brand_slug: brandSlug,
    p_restaurant_name: restaurantName,
    p_restaurant_slug: restaurantSlug,
    p_plan: plan,
    p_primary_color: primaryColor,
    p_secondary_color: secondaryColor,
    p_create_starter_category: body.createStarterCategory !== false,
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

  return NextResponse.json({
    brand,
    restaurant,
    previewUrl: tenantPreviewUrl(restaurant.slug),
    note: 'Created database tenant. The live shared template opens it with ?tenant=<branch-slug>; wildcard domains/custom Vercel domains are separate infrastructure.',
  }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const role = user?.app_metadata?.role ?? user?.user_metadata?.role
  if (!user || !['super_admin', 'creator', 'dev'].includes(String(role))) {
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
  if (brand.slug === 'burger-lions') {
    return NextResponse.json({ error: 'Burger Lions is protected and cannot be deleted from this panel' }, { status: 400 })
  }

  const { error } = await supabase.from('brands').delete().eq('id', brandId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ deleted: true, brand })
}
