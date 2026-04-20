import { createServerClient, type CookieOptions } from '@supabase/ssr'
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
  '/auth/',
  '/api/',
  '/settings/security/mfa-enroll',
]

function shouldBypassMfa(pathname: string): boolean {
  // Route groups like (auth) are stripped from URLs by Next.js — the
  // mfa-challenge page lives at /mfa-challenge, not /auth/mfa-challenge.
  if (pathname === '/mfa-challenge' || pathname === '/login' || pathname === '/signup') return true
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
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isAuthPage = pathname === '/login' || pathname === '/signup'
  const isPublicPage = pathname.startsWith('/p/')

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

  // MFA enforcement (LCN-010). Escape hatch: MFA_ENFORCEMENT=off
  if (
    user &&
    process.env.MFA_ENFORCEMENT !== 'off' &&
    !shouldBypassMfa(pathname)
  ) {
    const { hasVerifiedFactor, currentAal, nextLevel } = await getMfaStatus(supabase)

    if (!hasVerifiedFactor) {
      const url = new URL('/settings/security/mfa-enroll', request.url)
      return NextResponse.redirect(url)
    }

    // Has a verified factor but hasn't completed the challenge this session.
    // Per Supabase: nextLevel becomes 'aal2' once a verified factor exists.
    if (currentAal !== 'aal2' && nextLevel === 'aal2') {
      const url = new URL('/mfa-challenge', request.url)
      url.searchParams.set('redirect', pathname + request.nextUrl.search)
      return NextResponse.redirect(url)
    }
  }

  return response
}
