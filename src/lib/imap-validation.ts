import { NextResponse } from 'next/server'
import dns from 'dns/promises'
import net from 'net'

const ALLOWED_IMAP_HOSTS = [
  'imap.gmail.com',
  'imap.mail.yahoo.com',
  'outlook.office365.com',
  'imap-mail.outlook.com',
  'imap.mail.me.com',
  'imap.zoho.com',
  'imap.fastmail.com',
  'mail.privateemail.com',
  'imap.transip.email',
  'imap.strato.de',
  'imap.one.com',
  'imap.hostnet.nl',
  'imap.antagonist.nl',
  'mail.lctnships.com',
]

const BLOCKED_IP_RANGES = [
  // Loopback
  { start: '127.0.0.0', end: '127.255.255.255' },
  // Private networks
  { start: '10.0.0.0', end: '10.255.255.255' },
  { start: '172.16.0.0', end: '172.31.255.255' },
  { start: '192.168.0.0', end: '192.168.255.255' },
  // Link-local
  { start: '169.254.0.0', end: '169.254.255.255' },
  // Cloud metadata
  { start: '100.100.100.200', end: '100.100.100.200' },
]

function ipToNum(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0
}

function isBlockedIP(ip: string): boolean {
  if (!net.isIPv4(ip)) return false
  const num = ipToNum(ip)
  return BLOCKED_IP_RANGES.some(range => {
    const start = ipToNum(range.start)
    const end = ipToNum(range.end)
    return num >= start && num <= end
  })
}

/**
 * Validates an IMAP host against an allowlist and checks for SSRF.
 * If host is in the allowlist, it's allowed immediately.
 * Otherwise, resolves DNS and blocks private/internal IPs.
 */
export async function validateImapHost(host: string): Promise<{ valid: boolean; error?: NextResponse }> {
  if (!host || typeof host !== 'string') {
    return { valid: false, error: NextResponse.json({ error: 'Invalid host' }, { status: 400 }) }
  }

  // Strip whitespace
  const cleanHost = host.trim().toLowerCase()

  // Block IP addresses used directly (only allow hostnames)
  if (net.isIPv4(cleanHost) || net.isIPv6(cleanHost)) {
    return { valid: false, error: NextResponse.json({ error: 'Direct IP addresses are not allowed. Use a hostname.' }, { status: 400 }) }
  }

  // Allow known IMAP providers immediately
  if (ALLOWED_IMAP_HOSTS.includes(cleanHost)) {
    return { valid: true }
  }

  // For unknown hosts, resolve DNS and check for internal IPs
  try {
    const addresses = await dns.resolve4(cleanHost)
    for (const ip of addresses) {
      if (isBlockedIP(ip)) {
        return { valid: false, error: NextResponse.json({ error: 'Host resolves to a blocked IP range' }, { status: 403 }) }
      }
    }
  } catch {
    return { valid: false, error: NextResponse.json({ error: 'Could not resolve hostname' }, { status: 400 }) }
  }

  return { valid: true }
}
