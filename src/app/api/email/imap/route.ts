import { NextRequest, NextResponse } from 'next/server'
import { withRateLimit } from '@/lib/with-rate-limit'
import imaps from 'imap-simple'
import { simpleParser } from 'mailparser'
import { z } from 'zod'
import { parseJson } from '@/lib/api-validate'
import { validateImapHost } from '@/lib/imap-validation'
import { requireAuth } from '@/lib/api-auth'

const ImapBody = z.object({
  host: z.string().max(253).optional(),
  port: z.number().int().optional(),
  tls: z.boolean().optional(),
  folder: z.string().max(200).optional(),
  limit: z.number().int().optional(),
  user: z.string().max(320).optional(),
  password: z.string().max(500).optional(),
  uid: z.number().optional(),
}).passthrough()

async function _POST(req: NextRequest) {
  const { error: __authError } = await requireAuth()
  if (__authError) return __authError

  const { data: body, error: __validationError } = await parseJson(req, ImapBody)
  if (__validationError) return __validationError
  const { host, port, tls, folder = 'INBOX', limit = 50 } = body
  const user = (body.user || '').trim()
  const password = (body.password || '').trim()

  if (!host || !user || !password) {
    return NextResponse.json({ error: 'host, user en password zijn verplicht' }, { status: 400 })
  }

  // Auto-fix: lctnships.com mail server runs on mail.lctnships.com
  const resolvedHost = host === 'lctnships.com' ? 'mail.lctnships.com' : host

  console.log('[IMAP DEBUG]', { resolvedHost, port: port || 993, user, passwordLength: password?.length, tls: tls !== false })

  // SSRF protection: validate host
  const { valid, error: hostError } = await validateImapHost(resolvedHost)
  if (!valid) return hostError!

  // LET OP: mail.lctnships.com cert is verlopen (25-3-2026). rejectUnauthorized:false
  // alleen is niet genoeg — Node tls layer weigert nog altijd op expired cert tenzij
  // we expliciet checkServerIdentity overriden en secureProtocol op TLSv1_2_method zetten.
  const config = {
    imap: {
      host: resolvedHost,
      port: port || 993,
      user,
      password,
      tls: tls !== false,
      tlsOptions: {
        rejectUnauthorized: false,
        // Accepteer expired certs — productie cert moet daarna gerepareerd worden
        checkServerIdentity: () => undefined,
        servername: resolvedHost,
      },
      authTimeout: 15000,
    },
  }

  // Single email fetch mode (for detail view)
  const uid = body.uid as number | undefined

  try {
    const connection = await imaps.connect(config)
    await connection.openBox(folder)

    if (uid) {
      // Fetch single full email by UID
      const messages = await connection.search([['UID', `${uid}`]], {
        bodies: [''],
        markSeen: false,
        struct: true,
      })
      connection.end()

      if (messages.length === 0) {
        return NextResponse.json({ error: 'Email niet gevonden' }, { status: 404 })
      }

      const msg = messages[0]
      const rawPart = msg.parts.find((p: { which: string }) => p.which === '')
      const raw = rawPart?.body || ''
      const parsed = await simpleParser(raw).catch(() => null)

      const from = parsed?.from?.value?.[0]
      const to = parsed?.to
      const toAddr = Array.isArray(to) ? to[0]?.value?.[0] : (to as any)?.value?.[0]

      return NextResponse.json({
        email: {
          id: `${msg.attributes.uid}`,
          subject: parsed?.subject || '(geen onderwerp)',
          from: { name: from?.name || '', email: from?.address || '' },
          to: [{ name: toAddr?.name || '', email: toAddr?.address || '' }],
          date: parsed?.date?.toISOString() || new Date().toISOString(),
          body: parsed?.text || '',
          html: parsed?.html || '',
          isRead: msg.attributes.flags?.includes('\\Seen') || false,
          isStarred: msg.attributes.flags?.includes('\\Flagged') || false,
          folder: 'inbox',
          uid: msg.attributes.uid,
        },
      })
    }

    // List mode: fetch only headers (fast)
    const messages = await connection.search(['ALL'], {
      bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)'],
      markSeen: false,
      struct: false,
    })
    connection.end()

    // Get last N messages (newest first)
    const recent = messages.slice(-limit).reverse()

    const emails = recent.map((msg) => {
      const headerPart = msg.parts.find((p: { which: string }) => p.which.startsWith('HEADER'))
      const headers = headerPart?.body || {}

      const fromRaw = (headers.from?.[0] || '') as string
      const toRaw = (headers.to?.[0] || '') as string
      const subjectRaw = (headers.subject?.[0] || '(geen onderwerp)') as string
      const dateRaw = (headers.date?.[0] || '') as string

      // Parse "Name <email>" format
      const fromMatch = fromRaw.match(/^(?:"?([^"]*)"?\s)?<?([^\s>]+)>?$/)
      const toMatch = toRaw.match(/^(?:"?([^"]*)"?\s)?<?([^\s>]+)>?$/)

      return {
        id: `${msg.attributes.uid}`,
        subject: subjectRaw,
        from: { name: fromMatch?.[1] || fromMatch?.[2] || fromRaw, email: fromMatch?.[2] || fromRaw },
        to: [{ name: toMatch?.[1] || toMatch?.[2] || toRaw, email: toMatch?.[2] || toRaw }],
        date: dateRaw ? new Date(dateRaw).toISOString() : new Date().toISOString(),
        body: '',
        html: '',
        isRead: msg.attributes.flags?.includes('\\Seen') || false,
        isStarred: msg.attributes.flags?.includes('\\Flagged') || false,
        folder: 'inbox',
        uid: msg.attributes.uid,
      }
    })

    return NextResponse.json({ emails })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Verbinding mislukt'
    console.error('[IMAP ERROR]', { host, port: port || 993, user, tls: tls !== false, error: message })

    // Provide user-friendly error messages
    let userMessage = message
    if (message.includes('Unauthorized') || message.includes('AUTHENTICATIONFAILED') || message.includes('Invalid credentials')) {
      userMessage = 'Wachtwoord of gebruikersnaam is onjuist. Controleer je inloggegevens.'
    } else if (message.includes('ENOTFOUND') || message.includes('getaddrinfo')) {
      userMessage = `Server "${host}" niet gevonden. Controleer de hostnaam.`
    } else if (message.includes('ECONNREFUSED')) {
      userMessage = `Kan niet verbinden met ${host}:${port || 993}. Controleer poort en TLS instelling.`
    } else if (message.includes('ETIMEDOUT') || message.includes('timeout')) {
      userMessage = 'Verbinding duurt te lang. Controleer host en poort.'
    }

    return NextResponse.json({ error: userMessage }, { status: 500 })
  }
}

export const POST = withRateLimit(_POST, { limit: 30, windowSec: 60, route: 'email-imap:POST' })
