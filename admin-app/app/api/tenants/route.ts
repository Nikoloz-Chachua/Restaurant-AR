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
  starterMenu?: 'empty' | 'burger_lions_style'
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

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

  const body = await req.json() as TenantRequest
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

  const { data: brand, error: brandError } = await supabase
    .from('brands')
    .insert({
      name: brandName,
      slug: brandSlug,
      plan,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
    })
    .select('id, name, slug, plan')
    .single()

  if (brandError) return NextResponse.json({ error: brandError.message }, { status: 400 })

  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .insert({
      brand_id: brand.id,
      name: restaurantName,
      slug: restaurantSlug,
      status: 'active',
    })
    .select('id, name, slug, brand_id')
    .single()

  if (restaurantError) {
    await supabase.from('brands').delete().eq('id', brand.id)
    return NextResponse.json({ error: restaurantError.message }, { status: 400 })
  }

  const categoryRows = body.starterMenu === 'burger_lions_style'
    ? [
      { restaurant_id: restaurant.id, name_en: 'Burgers', name_ka: 'ბურგერები', sort_order: 1 },
      { restaurant_id: restaurant.id, name_en: 'Sides', name_ka: 'გარნირი | სოუსები', sort_order: 2 },
      { restaurant_id: restaurant.id, name_en: 'Desserts', name_ka: 'დესერტები', sort_order: 3 },
    ]
    : [
      { restaurant_id: restaurant.id, name_en: 'Featured', name_ka: 'რჩეული', sort_order: 1 },
    ]

  const { error: categoriesError } = await supabase.from('categories').insert(categoryRows)
  if (categoriesError) {
    await supabase.from('restaurants').delete().eq('id', restaurant.id)
    await supabase.from('brands').delete().eq('id', brand.id)
    return NextResponse.json({ error: categoriesError.message }, { status: 400 })
  }

  const themeRows = [
    { restaurant_id: restaurant.id, key: 'site_name', value: brandName },
    { restaurant_id: restaurant.id, key: 'site_name_ka', value: brandName },
    ...(primaryColor ? [{ restaurant_id: restaurant.id, key: 'night_accent', value: primaryColor }] : []),
    ...(secondaryColor ? [{ restaurant_id: restaurant.id, key: 'day_accent', value: secondaryColor }] : []),
  ]
  const { error: themeError } = await supabase.from('theme_config').upsert(themeRows, { onConflict: 'restaurant_id,key' })
  if (themeError) {
    await supabase.from('restaurants').delete().eq('id', restaurant.id)
    await supabase.from('brands').delete().eq('id', brand.id)
    return NextResponse.json({ error: themeError.message }, { status: 400 })
  }

  return NextResponse.json({
    brand,
    restaurant,
    previewUrl: `https://${restaurant.slug}.betareal.app`,
    note: 'Wildcard Worker routing is external infrastructure; this API creates the database tenant for the shared template.',
  }, { status: 201 })
}
