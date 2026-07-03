import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cleanEmail, ensureAdminAuthUser, findAuthUserByEmail, isPlatformRole, storeInitialPassword } from '@/lib/adminAccounts'

type LinkRequest = {
  action?: 'link' | 'unlink'
  brandId?: number | string
  restaurantId?: number | string
  email?: unknown
  password?: unknown
}

async function requireSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isPlatformRole(user.app_metadata?.role)) return null
  return user
}

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(req: NextRequest) {
  const actingUser = await requireSuperAdmin()
  if (!actingUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const service = createAdminClient()
  if (!service) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is required for admin linking' }, { status: 500 })
  }

  const body = await req.json().catch(() => null) as LinkRequest | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 })

  const action = body.action === 'unlink' ? 'unlink' : 'link'
  const brandId = Number(body.brandId)
  const restaurantId = Number(body.restaurantId)
  const email = cleanEmail(body.email)
  const password = String(body.password ?? '')

  if (!Number.isInteger(brandId) || brandId <= 0) {
    return NextResponse.json({ error: 'Valid brandId is required' }, { status: 400 })
  }
  if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
    return NextResponse.json({ error: 'Valid restaurantId is required' }, { status: 400 })
  }
  if (!validEmail(email)) {
    return NextResponse.json({ error: 'Valid admin email is required' }, { status: 400 })
  }
  if (action === 'link' && password && password.length < 8) {
    return NextResponse.json({ error: 'Temporary password must be at least 8 characters when provided' }, { status: 400 })
  }

  const { data: restaurant, error: restaurantError } = await service
    .from('restaurants')
    .select('id, brand_id')
    .eq('id', restaurantId)
    .eq('brand_id', brandId)
    .maybeSingle()
  if (restaurantError) return NextResponse.json({ error: restaurantError.message }, { status: 500 })
  if (!restaurant) return NextResponse.json({ error: 'Branch does not belong to the selected tenant' }, { status: 404 })

  if (action === 'unlink') {
    const found = await findAuthUserByEmail(service, email)
    if (found.error) return NextResponse.json({ error: found.error.message }, { status: 500 })
    if (!found.user) return NextResponse.json({ error: 'Auth user not found' }, { status: 404 })

    const [{ error: brandError }, { error: branchError }] = await Promise.all([
      service.from('brand_users').delete().eq('brand_id', brandId).eq('user_id', found.user.id),
      service.from('restaurant_users').delete().eq('restaurant_id', restaurantId).eq('user_id', found.user.id),
    ])
    const error = brandError || branchError
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ linked: false, email, userId: found.user.id, brandId, restaurantId })
  }

  const existing = await findAuthUserByEmail(service, email)
  if (existing.error) return NextResponse.json({ error: existing.error.message }, { status: 500 })
  if (!existing.user && !password) {
    return NextResponse.json({ error: 'Password is required when creating a new auth user' }, { status: 400 })
  }

  const ensured = await ensureAdminAuthUser(service, email, password)
  if (ensured.error || !ensured.userId) {
    return NextResponse.json({ error: ensured.error?.message || 'Auth user could not be created or updated' }, { status: 500 })
  }

  const [{ error: brandLinkError }, { error: restaurantLinkError }] = await Promise.all([
    service.from('brand_users').upsert({ brand_id: brandId, user_id: ensured.userId, role: 'brand_owner' }, { onConflict: 'brand_id,user_id' }),
    service.from('restaurant_users').upsert({ restaurant_id: restaurantId, user_id: ensured.userId, role: 'branch_manager' }, { onConflict: 'restaurant_id,user_id' }),
  ])
  const linkError = brandLinkError || restaurantLinkError
  if (linkError) return NextResponse.json({ error: linkError.message }, { status: 500 })

  const passwordStoreError = await storeInitialPassword(service, {
    userId: ensured.userId,
    email,
    password,
    createdBy: actingUser.id,
  })

  return NextResponse.json({
    linked: true,
    email,
    userId: ensured.userId,
    brandId,
    restaurantId,
    storedInitialPassword: password || null,
    warning: passwordStoreError ? `Linked admin, but temporary password was not stored: ${passwordStoreError.message}` : null,
  })
}
