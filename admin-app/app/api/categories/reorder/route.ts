import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isPlatformRole } from '@/lib/adminAccounts'
import { normalizeCategoryPosition, planCategoryOrder } from '@/lib/categoryOrdering'

type CategoryRequest = {
  id?: number | string | null
  restaurantId?: number | string | null
  name_en?: unknown
  name_ka?: unknown
  sort_order?: unknown
}

type CategoryRow = {
  id: number
  restaurant_id: number
  name_en: string
  name_ka: string
  sort_order: number
}
type CategoryOrderRow = {
  id: number
  sort_order: number
}

async function canManageRestaurant(userId: string, role: unknown, restaurantId: number) {
  const service = createAdminClient()
  if (!service) return { allowed: false, error: 'SUPABASE_SERVICE_ROLE_KEY is required for category ordering' }
  if (isPlatformRole(role)) return { allowed: true, service }

  const { data: restaurantUser, error: restaurantUserError } = await service
    .from('restaurant_users')
    .select('restaurant_id')
    .eq('restaurant_id', restaurantId)
    .eq('user_id', userId)
    .maybeSingle()
  if (restaurantUserError) return { allowed: false, error: restaurantUserError.message }
  if (restaurantUser) return { allowed: true, service }

  const { data: restaurant, error: restaurantError } = await service
    .from('restaurants')
    .select('brand_id')
    .eq('id', restaurantId)
    .maybeSingle()
  if (restaurantError) return { allowed: false, error: restaurantError.message }
  if (!restaurant) return { allowed: false, error: 'Restaurant not found' }

  const { data: brandUser, error: brandUserError } = await service
    .from('brand_users')
    .select('brand_id')
    .eq('brand_id', Number(restaurant.brand_id))
    .eq('user_id', userId)
    .maybeSingle()
  if (brandUserError) return { allowed: false, error: brandUserError.message }

  return { allowed: Boolean(brandUser), service, error: brandUser ? undefined : 'Forbidden' }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null) as CategoryRequest | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 })

  const restaurantId = Number(body.restaurantId)
  const categoryId = body.id === null || body.id === undefined || body.id === '' ? null : Number(body.id)
  const nameEn = String(body.name_en ?? '').trim()
  const nameKa = String(body.name_ka ?? '').trim()
  if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
    return NextResponse.json({ error: 'Valid restaurantId is required' }, { status: 400 })
  }
  if (categoryId !== null && (!Number.isInteger(categoryId) || categoryId <= 0)) {
    return NextResponse.json({ error: 'Valid category id is required' }, { status: 400 })
  }
  if (!nameEn && !nameKa) {
    return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
  }

  const access = await canManageRestaurant(user.id, user.app_metadata?.role, restaurantId)
  if (!access.service) return NextResponse.json({ error: access.error }, { status: 500 })
  if (!access.allowed) return NextResponse.json({ error: access.error || 'Forbidden' }, { status: access.error === 'Restaurant not found' ? 404 : 403 })
  const service = access.service

  const { data: currentRows, error: currentError } = await service
    .from('categories')
    .select('id, restaurant_id, name_en, name_ka, sort_order')
    .eq('restaurant_id', restaurantId)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true })
  if (currentError) return NextResponse.json({ error: currentError.message }, { status: 500 })

  let savedCategory: CategoryRow
  if (categoryId) {
    const existing = (currentRows ?? []).find(category => Number(category.id) === categoryId)
    if (!existing) return NextResponse.json({ error: 'Category not found for this restaurant' }, { status: 404 })
    const { data, error } = await service
      .from('categories')
      .update({ name_en: nameEn, name_ka: nameKa })
      .eq('id', categoryId)
      .eq('restaurant_id', restaurantId)
      .select('id, restaurant_id, name_en, name_ka, sort_order')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    savedCategory = data as CategoryRow
  } else {
    const temporaryOrder = (currentRows ?? []).length + 1000
    const { data, error } = await service
      .from('categories')
      .insert({ restaurant_id: restaurantId, name_en: nameEn, name_ka: nameKa, sort_order: temporaryOrder })
      .select('id, restaurant_id, name_en, name_ka, sort_order')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    savedCategory = data as CategoryRow
  }

  const categories = categoryId ? (currentRows ?? []) : [...(currentRows ?? []), savedCategory]
  const maxPosition = categoryId ? categories.length : categories.length
  const targetPosition = normalizeCategoryPosition(body.sort_order, savedCategory.sort_order || maxPosition, maxPosition)
  const finalOrder = planCategoryOrder(categories, savedCategory, targetPosition) as CategoryOrderRow[]
  const offset = Math.max(...finalOrder.map(row => row.sort_order), 0) + 1000

  for (const row of finalOrder) {
    const { error } = await service
      .from('categories')
      .update({ sort_order: offset + row.sort_order })
      .eq('id', row.id)
      .eq('restaurant_id', restaurantId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  for (const row of finalOrder) {
    const { error } = await service
      .from('categories')
      .update({ sort_order: row.sort_order })
      .eq('id', row.id)
      .eq('restaurant_id', restaurantId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: categoriesAfter, error: afterError } = await service
    .from('categories')
    .select('id, name_en, name_ka, sort_order')
    .eq('restaurant_id', restaurantId)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true })
  if (afterError) return NextResponse.json({ error: afterError.message }, { status: 500 })

  return NextResponse.json({ category: savedCategory, categories: categoriesAfter ?? [] })
}
