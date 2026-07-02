import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type BrandMembership = {
  brand_id: number
  user_id: string
  role: string
}

type RestaurantMembership = {
  restaurant_id: number
  user_id: string
  role: string
}

type Brand = {
  id: number
  name: string
  slug: string
}

type Restaurant = {
  id: number
  name: string
  slug: string
  brand_id: number
}

function isPlatformRole(role: unknown) {
  return ['super_admin', 'creator', 'dev'].includes(String(role))
}

async function requireSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isPlatformRole(user.app_metadata?.role)) return null
  return user
}

function cleanEmail(value: unknown) {
  return String(value ?? '').trim().toLowerCase()
}

export async function GET() {
  const user = await requireSuperAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const service = createAdminClient()
  if (!service) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is required for account log' }, { status: 500 })
  }

  const [
    { data: users, error: usersError },
    { data: brandUsers, error: brandUsersError },
    { data: restaurantUsers, error: restaurantUsersError },
    { data: brands, error: brandsError },
    { data: restaurants, error: restaurantsError },
  ] = await Promise.all([
    service.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    service.from('brand_users').select('brand_id, user_id, role'),
    service.from('restaurant_users').select('restaurant_id, user_id, role'),
    service.from('brands').select('id, name, slug'),
    service.from('restaurants').select('id, name, slug, brand_id'),
  ])

  const error = usersError || brandUsersError || restaurantUsersError || brandsError || restaurantsError
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const brandById = new Map(((brands ?? []) as Brand[]).map(brand => [Number(brand.id), brand]))
  const restaurantById = new Map(((restaurants ?? []) as Restaurant[]).map(restaurant => [Number(restaurant.id), restaurant]))
  const brandMemberships = (brandUsers ?? []) as BrandMembership[]
  const restaurantMemberships = (restaurantUsers ?? []) as RestaurantMembership[]

  const accounts = (users.users ?? [])
    .map(account => {
      const userId = account.id
      const brandRows = brandMemberships.filter(row => String(row.user_id) === userId)
      const restaurantRows = restaurantMemberships.filter(row => String(row.user_id) === userId)
      return {
        id: userId,
        email: account.email ?? '',
        appRole: String(account.app_metadata?.role ?? ''),
        brandMemberships: brandRows.map(row => {
          const brand = brandById.get(Number(row.brand_id))
          return {
            role: row.role,
            brandId: Number(row.brand_id),
            name: brand?.name ?? '',
            slug: brand?.slug ?? '',
          }
        }),
        restaurantMemberships: restaurantRows.map(row => {
          const restaurant = restaurantById.get(Number(row.restaurant_id))
          const brand = restaurant ? brandById.get(Number(restaurant.brand_id)) : undefined
          return {
            role: row.role,
            restaurantId: Number(row.restaurant_id),
            name: restaurant?.name ?? '',
            slug: restaurant?.slug ?? '',
            brandName: brand?.name ?? '',
            brandSlug: brand?.slug ?? '',
          }
        }),
        createdAt: account.created_at ?? null,
        lastSignInAt: account.last_sign_in_at ?? null,
      }
    })
    .filter(account => account.email)
    .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')))

  return NextResponse.json({ accounts })
}

export async function POST(req: NextRequest) {
  const user = await requireSuperAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const service = createAdminClient()
  if (!service) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is required for password reset' }, { status: 500 })
  }

  const body = await req.json().catch(() => null) as { email?: unknown } | null
  const email = cleanEmail(body?.email)
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
  }

  const redirectTo = `${req.nextUrl.origin}/reset-password`
  const { error } = await service.auth.resetPasswordForEmail(email, { redirectTo })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ sent: true, email })
}

export async function DELETE(req: NextRequest) {
  const user = await requireSuperAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const service = createAdminClient()
  if (!service) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is required for account removal' }, { status: 500 })
  }

  const body = await req.json().catch(() => null) as { userId?: unknown } | null
  const userId = String(body?.userId ?? '').trim()
  if (!userId) {
    return NextResponse.json({ error: 'User id is required' }, { status: 400 })
  }
  if (userId === user.id) {
    return NextResponse.json({ error: 'You cannot remove your own super-admin account while signed in.' }, { status: 400 })
  }

  const { error: brandUsersError } = await service.from('brand_users').delete().eq('user_id', userId)
  if (brandUsersError) return NextResponse.json({ error: brandUsersError.message }, { status: 500 })

  const { error: restaurantUsersError } = await service.from('restaurant_users').delete().eq('user_id', userId)
  if (restaurantUsersError) return NextResponse.json({ error: restaurantUsersError.message }, { status: 500 })

  const { error: deleteUserError } = await service.auth.admin.deleteUser(userId)
  if (deleteUserError) return NextResponse.json({ error: deleteUserError.message }, { status: 500 })

  return NextResponse.json({ removed: true, userId })
}
