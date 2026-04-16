/**
 * LCN-013 — thin wrapper that applies per-IP rate limiting to a
 * Next.js App Router route handler.
 *
 * Usage:
 *   export const POST = withRateLimit(handler, {
 *     limit: 60, windowSec: 60, route: 'leads:create'
 *   })
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getClientIp } from '@/lib/client-ip'
import { rateLimit, rateLimitKey, tooManyRequests } from '@/lib/rate-limit'

export type RouteHandler<Ctx = unknown> = (
  request: NextRequest,
  context: Ctx
) => Promise<Response | NextResponse> | Response | NextResponse

export interface RateLimitOptions {
  limit: number
  windowSec: number
  route: string
}

export function withRateLimit<Ctx = unknown>(
  handler: RouteHandler<Ctx>,
  opts: RateLimitOptions
): RouteHandler<Ctx> {
  return async (request, context) => {
    const ip = getClientIp(request.headers)
    const key = rateLimitKey(ip, opts.route)
    const res = await rateLimit(key, { limit: opts.limit, windowSec: opts.windowSec })
    if (!res.ok) {
      return tooManyRequests(res.retryAfter)
    }
    return handler(request, context)
  }
}
