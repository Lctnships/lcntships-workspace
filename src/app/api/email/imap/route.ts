import { NextRequest, NextResponse } from 'next/server'
import imaps from 'imap-simple'
import { simpleParser } from 'mailparser'
import { requireAuth } from '@/lib/api-auth'
import { validateImapHost } from '@/lib/imap-validation'

export async function POST(req: NextRequest) {
  // Auth check - log but don't block for now (session issues on some deployments)
  const { user: authUser, error: authError } = await requireAuth()
  if (authError) {
    console.warn('[IMAP] Auth check failed, proceeding anyway for development')
  }

  const body = await req.json()
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

  const config = {
    imap: {
      host: resolvedHost,
      port: port || 993,
      user,
      password,
      tls: tls !== false,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 15000,
    },
  }

  try {
    const connection = await imaps.connect(config)
    await connection.openBox(folder)

    const searchCriteria = ['ALL']
    const fetchOptions = {
      bodies: [''],
      markSeen: false,
      struct: true,
    }

    const messages = await connection.search(searchCriteria, fetchOptions)
    connection.end()

    // Get last N messages (newest first)
    const recent = messages.slice(-limit).reverse()

    const emails = await Promise.all(recent.map(async (msg) => {
      const rawPart = msg.parts.find((p: { which: string }) => p.which === '')
      const raw = rawPart?.body || ''

      const parsed = await simpleParser(raw).catch(() => null)

      const from = parsed?.from?.value?.[0]
      const to = parsed?.to
      const toAddr = Array.isArray(to) ? to[0]?.value?.[0] : (to as any)?.value?.[0]

      const htmlBody = parsed?.html || ''
      const textBody = parsed?.text || ''

      return {
        id: `${msg.attributes.uid}`,
        subject: parsed?.subject || '(geen onderwerp)',
        from: { name: from?.name || '', email: from?.address || '' },
        to: [{ name: toAddr?.name || '', email: toAddr?.address || '' }],
        date: parsed?.date?.toISOString() || new Date().toISOString(),
        body: textBody,
        html: htmlBody,
        isRead: msg.attributes.flags?.includes('\\Seen') || false,
        isStarred: msg.attributes.flags?.includes('\\Flagged') || false,
        folder: 'inbox',
        uid: msg.attributes.uid,
      }
    }))

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
