/**
 * LCN-006 — SSRF guard.
 *
 * Validates that a user-supplied URL is safe to fetch from a server-side
 * context: scheme is http(s), host is not a known sensitive name, and every
 * resolved IP address lies in a public unicast range. Blocks loopback,
 * link-local, RFC1918 private nets, CGNAT, multicast, broadcast, IPv6
 * unique-local, IPv6 link-local, IPv4-mapped IPv6, and cloud metadata IPs.
 */
import { lookup } from 'node:dns/promises'
import net from 'node:net'

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata.goog',
  'metadata',
])

const BLOCKED_IPS = new Set([
  '169.254.169.254', // AWS / Azure / GCP metadata
  '100.100.100.200', // Alibaba metadata
  'fd00:ec2::254',   // AWS IPv6 metadata
])

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.')
  if (parts.length !== 4) return null
  let n = 0
  for (const p of parts) {
    const o = Number(p)
    if (!Number.isInteger(o) || o < 0 || o > 255) return null
    n = (n << 8) + o
  }
  return n >>> 0
}

function inRange(ip: number, cidr: string): boolean {
  const [base, bits] = cidr.split('/')
  const baseInt = ipv4ToInt(base)
  if (baseInt === null) return false
  const mask = bits === '0' ? 0 : (~0 << (32 - Number(bits))) >>> 0
  return (ip & mask) === (baseInt & mask)
}

const IPV4_BLOCKED_RANGES = [
  '0.0.0.0/8',        // current network
  '10.0.0.0/8',       // RFC1918
  '100.64.0.0/10',    // CGNAT
  '127.0.0.0/8',      // loopback
  '169.254.0.0/16',   // link-local + metadata
  '172.16.0.0/12',    // RFC1918
  '192.0.0.0/24',     // IETF protocol
  '192.0.2.0/24',     // TEST-NET-1
  '192.168.0.0/16',   // RFC1918
  '198.18.0.0/15',    // benchmarking
  '198.51.100.0/24',  // TEST-NET-2
  '203.0.113.0/24',   // TEST-NET-3
  '224.0.0.0/4',      // multicast
  '240.0.0.0/4',      // reserved (incl. broadcast 255.255.255.255)
]

function isBlockedIPv4(ip: string): boolean {
  const n = ipv4ToInt(ip)
  if (n === null) return true
  return IPV4_BLOCKED_RANGES.some((r) => inRange(n, r))
}

function isBlockedIPv6(ip: string): boolean {
  const lower = ip.toLowerCase()
  if (lower === '::' || lower === '::1') return true              // unspecified, loopback
  if (lower.startsWith('fe80:')) return true                       // link-local
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true // ULA
  if (lower.startsWith('ff')) return true                          // multicast
  if (lower.startsWith('::ffff:')) {                               // IPv4-mapped
    const v4 = lower.slice('::ffff:'.length)
    if (net.isIPv4(v4)) return isBlockedIPv4(v4)
  }
  return false
}

function isBlockedAddress(ip: string): boolean {
  if (BLOCKED_IPS.has(ip.toLowerCase())) return true
  if (net.isIPv4(ip)) return isBlockedIPv4(ip)
  if (net.isIPv6(ip)) return isBlockedIPv6(ip)
  return true // unknown family — fail closed
}

export class SsrfBlockedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SsrfBlockedError'
  }
}

/**
 * Throws SsrfBlockedError if the URL is unsafe to fetch server-side.
 * Resolves all A/AAAA records and verifies every one is publicly routable.
 */
export async function assertPublicUrl(rawUrl: string): Promise<URL> {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new SsrfBlockedError('invalid URL')
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new SsrfBlockedError(`scheme not allowed: ${parsed.protocol}`)
  }

  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (!host) throw new SsrfBlockedError('empty hostname')
  if (BLOCKED_HOSTNAMES.has(host)) throw new SsrfBlockedError(`blocked host: ${host}`)
  if (host.endsWith('.local') || host.endsWith('.internal')) {
    throw new SsrfBlockedError(`blocked TLD: ${host}`)
  }

  // If the host is already a literal IP, check it directly.
  if (net.isIP(host)) {
    if (isBlockedAddress(host)) throw new SsrfBlockedError(`blocked IP: ${host}`)
    return parsed
  }

  // Otherwise resolve and check every record.
  let addrs: { address: string; family: number }[]
  try {
    addrs = await lookup(host, { all: true, verbatim: true })
  } catch {
    throw new SsrfBlockedError(`DNS lookup failed for ${host}`)
  }
  if (addrs.length === 0) throw new SsrfBlockedError(`no DNS records for ${host}`)

  for (const a of addrs) {
    if (isBlockedAddress(a.address)) {
      throw new SsrfBlockedError(`host ${host} resolves to blocked IP ${a.address}`)
    }
  }

  return parsed
}
