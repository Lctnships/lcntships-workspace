import { NextRequest, NextResponse } from 'next/server'
import { withRateLimit } from '@/lib/with-rate-limit'
import { z } from 'zod'
import { parseJson } from '@/lib/api-validate'
import { requireAuth } from '@/lib/api-auth'
import { assertPublicUrl, SsrfBlockedError } from '@/lib/ssrf-guard'

const EnrichBody = z.object({
  url: z.string().min(1).max(2000),
}).passthrough()

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const TIMEOUT_MS = 10000

const JUNK_EMAIL_DOMAINS = [
  'wix.com', 'squarespace.com', 'wordpress.com', 'wordpress.org',
  'sentry.io', 'schema.org', 'w3.org', 'cloudflare.com',
  'google.com', 'facebook.com', 'twitter.com', 'instagram.com',
  'youtube.com', 'example.com', 'placeholder.com', 'yourdomain.com',
  'domain.com', 'email.com', 'test.com', 'webflow.io',
]

const JUNK_EMAIL_PREFIXES = [
  'noreply@', 'no-reply@', 'mailer@', 'webmaster@', 'admin@',
  'postmaster@', 'bounce@', 'donotreply@', 'do-not-reply@',
]

const CONTACT_PATHS = [
  '/contact', '/contact-us', '/contactus', '/kontakt', '/kontakt-us',
  '/over-ons', '/about', '/about-us', '/impressum', '/imprint',
  '/reach-us', '/get-in-touch', '/bereikbaarheid',
]

function extractEmails(html: string): string[] {
  const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g
  const found = html.match(emailRegex) || []
  return found
    .map(e => e.toLowerCase().trim())
    .filter(e => {
      const domain = e.split('@')[1] || ''
      if (JUNK_EMAIL_DOMAINS.some(d => domain === d || domain.endsWith('.' + d))) return false
      if (JUNK_EMAIL_PREFIXES.some(p => e.startsWith(p))) return false
      if (e.includes('..') || e.startsWith('.') || e.endsWith('.')) return false
      if (domain.split('.').length < 2) return false
      return true
    })
    .filter((e, i, arr) => arr.indexOf(e) === i) // deduplicate
}

function extractSocials(html: string, baseUrl: string): {
  instagram?: string
  facebook?: string
  linkedin?: string
  twitter?: string
} {
  const socials: Record<string, string> = {}

  const patterns: [string, RegExp][] = [
    ['instagram', /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9._]+)/g],
    ['facebook', /(?:https?:\/\/)?(?:www\.)?facebook\.com\/([a-zA-Z0-9._\-]+)/g],
    ['linkedin', /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:company|in)\/([a-zA-Z0-9._\-]+)/g],
    ['twitter', /(?:https?:\/\/)?(?:www\.)?(?:twitter|x)\.com\/([a-zA-Z0-9._]+)/g],
  ]

  for (const [name, regex] of patterns) {
    const match = html.match(regex)
    if (match && match[0]) {
      let url = match[0]
      if (!url.startsWith('http')) url = 'https://' + url
      // skip generic/useless pages
      if (name === 'facebook' && (url.includes('facebook.com/sharer') || url.includes('facebook.com/share'))) continue
      if (name === 'twitter' && url.includes('/intent/')) continue
      socials[name] = url
    }
  }

  return socials
}

async function fetchPage(url: string, hops = 0): Promise<string | null> {
  if (hops > 3) return null
  try {
    // LCN-006 — re-validate every URL (incl. each redirect target) so
    // path-joins or 3xx Location headers cannot smuggle internal hosts past
    // the entry check.
    await assertPublicUrl(url)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
      },
      redirect: 'manual',
    })
    clearTimeout(timeout)
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location')
      if (!loc) return null
      const next = new URL(loc, url).href
      return fetchPage(next, hops + 1)
    }
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('text/html')) return null
    return await res.text()
  } catch {
    return null
  }
}

function normalizeUrl(url: string): string {
  try {
    if (!url.startsWith('http')) url = 'https://' + url
    const parsed = new URL(url)
    return parsed.origin
  } catch {
    return url
  }
}

function resolveContactUrl(base: string, path: string): string {
  try {
    return new URL(path, base).href
  } catch {
    return base + path
  }
}

async function _POST(req: NextRequest) {
  const { error: __authError } = await requireAuth()
  if (__authError) return __authError

  const { data: parsed, error: __validationError } = await parseJson(req, EnrichBody)
  if (__validationError) return __validationError
  const { url } = parsed
  if (!url) return NextResponse.json({ error: 'url is verplicht' }, { status: 400 })

  const baseUrl = normalizeUrl(url)

  // LCN-006 — entry-point SSRF check; gives a clean 400 instead of a generic null result.
  try {
    await assertPublicUrl(baseUrl)
  } catch (e) {
    if (e instanceof SsrfBlockedError) {
      return NextResponse.json({ error: `URL geweigerd: ${e.message}` }, { status: 400 })
    }
    throw e
  }

  let allEmails: string[] = []
  let socials = {}
  let pagesScraped = 0

  // Step 1: fetch homepage
  const homepage = await fetchPage(baseUrl)
  if (homepage) {
    pagesScraped++
    allEmails.push(...extractEmails(homepage))
    socials = { ...socials, ...extractSocials(homepage, baseUrl) }
  }

  // Step 2: if no email found, check contact/about pages
  if (allEmails.length === 0) {
    const contactChecks = CONTACT_PATHS.slice(0, 5) // check first 5
    for (const path of contactChecks) {
      if (allEmails.length > 0) break
      const contactUrl = resolveContactUrl(baseUrl, path)
      const page = await fetchPage(contactUrl)
      if (page) {
        pagesScraped++
        allEmails.push(...extractEmails(page))
        socials = { ...socials, ...extractSocials(page, baseUrl) }
      }
    }
  }

  // Deduplicate final emails
  allEmails = [...new Set(allEmails)]

  return NextResponse.json({
    emails: allEmails,
    socials,
    pagesScraped,
    success: true,
  })
}

export const POST = withRateLimit(_POST, { limit: 20, windowSec: 60, route: 'enrich-lead:POST' })
