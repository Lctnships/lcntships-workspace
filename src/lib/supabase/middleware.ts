import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getMfaStatus } from '@/lib/mfa'

/**
 * Paths that must always bypass the MFA gate to avoid redirect loops.
 * - /login, /signup, /auth/* : unauthenticated or MFA challenge itself
 * - /settings/security/mfa-enroll : required to set up MFA
 * - /api/* : API auth is enforced separately in src/middleware.ts
 */
const MFA_BYPASS_PREFIXES = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/auth/',
  '/api/',
  '/settings/security/mfa-enroll',
]

function shouldBypassMfa(pathname: string): boolean {
  // Route groups like (auth) are stripped from URLs by Next.js — the
  // mfa-challenge page lives at /mfa-challenge, not /auth/mfa-challenge.
  if (
    pathname === '/mfa-challenge' ||
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password'
  )
    return true
  return MFA_BYPASS_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p)
  )
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          response = NextResponse.next({ request: { headers: request.headers } })
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set({ name, value, ...options })
          }
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isAuthPage =
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password'
  const isPublicPage = pathname.startsWith('/p/') || pathname.startsWith('/b/')

  // If not logged in and not on an auth/public page, redirect to login
  if (!user && !isAuthPage && !isPublicPage) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // If logged in and on an auth page, redirect to dashboard
  if (user && isAuthPage) {
    const dashboardUrl = new URL('/dashboard', request.url)
    return NextResponse.redirect(dashboardUrl)
  }

  // MFA enforcement disabled on main — set MFA_ENFORCEMENT=on to re-enable.
  if (
    user &&
    process.env.MFA_ENFORCEMENT === 'on' &&
    !shouldBypassMfa(pathname)
  ) {
    const { hasVerifiedFactor, currentAal, nextLevel } = await getMfaStatus(supabase)

    if (!hasVerifiedFactor) {
      const url = new URL('/settings/security/mfa-enroll', request.url)
      return NextResponse.redirect(url)
    }

    if (currentAal !== 'aal2' && nextLevel === 'aal2') {
      const url = new URL('/mfa-challenge', request.url)
      url.searchParams.set('redirect', pathname + request.nextUrl.search)
      return NextResponse.redirect(url)
    }
  }

  return response
}
