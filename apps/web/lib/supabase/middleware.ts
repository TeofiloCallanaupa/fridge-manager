import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Refresh the Supabase auth session on every matched request.
 *
 * This runs inside the Next.js 16 proxy (proxy.ts). It:
 * 1. Creates a fresh Supabase client bound to the request cookies.
 * 2. Calls getUser() to validate/refresh the JWT.
 * 3. Forwards refreshed cookies to both the request (for Server Components)
 *    and the response (for the browser).
 * 4. Redirects unauthenticated users to /login (unless they're already
 *    on a public route).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Do not add code between createServerClient and getUser().
  // A simple mistake could cause random user logouts.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Public routes that don't require authentication
  const isPublicRoute =
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/signup') ||
    request.nextUrl.pathname.startsWith('/auth') ||
    request.nextUrl.pathname.startsWith('/invite')

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Enforce onboarding flow for authenticated users
  if (user && !request.nextUrl.pathname.startsWith('/auth/signout') && !request.nextUrl.pathname.startsWith('/invite')) {
    const [
      { data: profile },
      { data: households }
    ] = await Promise.all([
      supabase.from('profiles').select('display_name, avatar_config').eq('id', user.id).single(),
      supabase.from('household_members').select('household_id').eq('user_id', user.id).limit(1)
    ])

    const hasHousehold = households && households.length > 0
    const hasDisplayName = !!profile?.display_name
    const hasAvatar = !!profile?.avatar_config

    const path = request.nextUrl.pathname

    if (!hasDisplayName && path !== '/onboarding/profile') {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding/profile'
      return NextResponse.redirect(url)
    }

    if (hasDisplayName && !hasAvatar && path !== '/onboarding/avatar') {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding/avatar'
      return NextResponse.redirect(url)
    }

    if (hasDisplayName && hasAvatar && !hasHousehold && path !== '/onboarding/household') {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding/household'
      return NextResponse.redirect(url)
    }

    // Redirect away from onboarding if already fully onboarded
    if (hasDisplayName && hasAvatar && hasHousehold && path.startsWith('/onboarding')) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
