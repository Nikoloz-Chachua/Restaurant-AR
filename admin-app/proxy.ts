import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isAuthPage = pathname === '/login'
  const isProtected = pathname.startsWith('/dashboard') ||
                      pathname.startsWith('/dev-analytics') ||
                      pathname.startsWith('/menu') ||
                      pathname.startsWith('/tenants') ||
                      pathname.startsWith('/theme') ||
                      pathname === '/'

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If env vars are missing, send protected routes to login and let the rest through
  if (!supabaseUrl || !supabaseKey) {
    if (isProtected) return NextResponse.redirect(new URL('/login', request.url))
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    })

    const { data: { user } } = await supabase.auth.getUser()

    if (!user && isProtected) return NextResponse.redirect(new URL('/login', request.url))
    if (user && isAuthPage) return NextResponse.redirect(new URL('/menu', request.url))
  } catch {
    // Supabase unreachable — send protected routes to login, never return 500
    if (isProtected) return NextResponse.redirect(new URL('/login', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
