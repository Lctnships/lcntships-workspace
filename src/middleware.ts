import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { updateSession } from '@/lib/supabase/middleware'

/**
 * Public API routes — intentionally no authentication required.
 *
 * - `/api/email/webhook` — Resend webhook, verified via HMAC signature (see LCN-009)
 * - `/api/email/track`   — email open/click tracking pixels, must load in mail clients
 *
 * All other `/api/*` routes require a valid Supabase session.
 */
const PUBLIC_API_ROUTES = [
  '/api/email/webhook',
  '/api/email/track',
]

function isPublicApiRoute(pathname: string): boolean {
  return PUBLIC_API_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // API routes: enforce auth at middleware layer (defense-in-depth,
  // per-route requireAuth() remains as belt-and-braces).
  if (pathname.startsWith('/api/')) {
    if (isPublicApiRoute(pathname)) {
      return NextResponse.next()
    }

    const response = NextResponse.next({ request: { headers: request.headers } })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            response.cookies.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set({ name, value: '', ...options })
          },
        },
      }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return response
  }

  // Page routes: existing session-refresh + login-redirect behaviour
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files:
     *   - _next/static, _next/image, favicon, manifest, robots, sitemap
     *   - any request with a static-asset extension
     * API routes ARE matched so we can enforce auth in middleware (LCN-001).
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|json|xml|txt)$).*)',
  ],
}
