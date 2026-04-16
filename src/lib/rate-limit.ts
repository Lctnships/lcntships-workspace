/**
 * LCN-013 — portable per-IP rate limiter.
 *
 * Backend selection at module load time:
 *   - If UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are present,
 *     use @upstash/ratelimit (sliding window) backed by Upstash Redis.
 *     This is the recommended production setup — shared state across all
 *     Vercel serverless instances.
 *   - Otherwise fall back to an in-memory Map. WARNING: the in-memory
 *     limiter is PER-INSTANCE only. On Vercel (or any multi-instance
 *     deploy) attackers can bypass by hitting different lambda instances.
 *     Do NOT rely on it in production without Upstash.
 */
import { NextResponse } from 'next/server'

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfter: number }

type Limiter = (
  key: string,
  opts: { limit: number; windowSec: number }
) => Promise<RateLimitResult>

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

let limiter: Limiter
let warnedMemoryInProd = false

if (UPSTASH_URL && UPSTASH_TOKEN) {
  // Lazy-require to avoid bundling issues when env vars are absent.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Ratelimit } = require('@upstash/ratelimit') as typeof import('@upstash/ratelimit')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Redis } = require('@upstash/redis') as typeof import('@upstash/redis')

  const redis = new Redis({ url: UPSTASH_URL, token: UPSTASH_TOKEN })

  // Cache one Ratelimit instance per (limit, windowSec) combination.
  const cache = new Map<string, InstanceType<typeof Ratelimit>>()

  limiter = async (key, { limit, windowSec }) => {
    const cacheKey = `${limit}:${windowSec}`
    let rl = cache.get(cacheKey)
    if (!rl) {
      rl = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
        analytics: false,
        prefix: 'lcn:rl',
      })
      cache.set(cacheKey, rl)
    }
    const res = await rl.limit(key)
    if (res.success) {
      return { ok: true, remaining: res.remaining }
    }
    const retryAfter = Math.max(1, Math.ceil((res.reset - Date.now()) / 1000))
    return { ok: false, retryAfter }
  }
} else {
  // In-memory sliding-window fallback. NOT safe across instances.
  type Bucket = { timestamps: number[] }
  const buckets = new Map<string, Bucket>()

  limiter = async (key, { limit, windowSec }) => {
    if (
      !warnedMemoryInProd &&
      process.env.NODE_ENV === 'production' &&
      process.env.VERCEL
    ) {
      warnedMemoryInProd = true
      // eslint-disable-next-line no-console
      console.warn(
        '[rate-limit] Using in-memory limiter in production. Limits are per-instance only. Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN for distributed enforcement.'
      )
    }
    const now = Date.now()
    const windowMs = windowSec * 1000
    const cutoff = now - windowMs
    let bucket = buckets.get(key)
    if (!bucket) {
      bucket = { timestamps: [] }
      buckets.set(key, bucket)
    }
    // Drop expired.
    bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff)
    if (bucket.timestamps.length >= limit) {
      const oldest = bucket.timestamps[0]!
      const retryAfter = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000))
      return { ok: false, retryAfter }
    }
    bucket.timestamps.push(now)
    // Opportunistic GC: if map grows large, prune empty buckets.
    if (buckets.size > 10_000) {
      for (const [k, b] of buckets) {
        if (b.timestamps.length === 0 || b.timestamps[b.timestamps.length - 1]! < cutoff) {
          buckets.delete(k)
        }
      }
    }
    return { ok: true, remaining: limit - bucket.timestamps.length }
  }
}

export async function rateLimit(
  key: string,
  opts: { limit: number; windowSec: number }
): Promise<RateLimitResult> {
  return limiter(key, opts)
}

export function rateLimitKey(ip: string, route: string): string {
  return `${route}:${ip}`
}

export function tooManyRequests(retryAfter: number): NextResponse {
  return NextResponse.json(
    { error: 'rate_limited', retryAfter },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
      },
    }
  )
}
