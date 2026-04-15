/**
 * LCN-011 — extract the real client IP behind Cloudflare + Vercel.
 *
 * Order of trust:
 *   1. CF-Connecting-IP   (set by Cloudflare on every request, single IP)
 *   2. True-Client-IP     (CF Enterprise / some setups)
 *   3. X-Forwarded-For    (Vercel proxy chain, take left-most)
 *   4. X-Real-IP          (last-resort)
 *   5. '0.0.0.0'          (unknown — never block on this value alone)
 *
 * Use this for audit logs and as the rate-limit key. Do NOT trust
 * client-controlled headers like X-Forwarded-For when CF-Connecting-IP
 * is present.
 */
export function getClientIp(headers: Headers): string {
  const cf = headers.get('cf-connecting-ip')
  if (cf) return cf.trim()

  const trueClient = headers.get('true-client-ip')
  if (trueClient) return trueClient.trim()

  const xff = headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }

  const xRealIp = headers.get('x-real-ip')
  if (xRealIp) return xRealIp.trim()

  return '0.0.0.0'
}
