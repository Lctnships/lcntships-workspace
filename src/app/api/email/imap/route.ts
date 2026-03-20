import { NextRequest, NextResponse } from 'next/server'
import imaps from 'imap-simple'
import { simpleParser } from 'mailparser'
import { requireAuth } from '@/lib/api-auth'
import { validateImapHost } from '@/lib/imap-validation'

export async function POST(req: NextRequest) {
  const { user: authUser, error: authError } = await requireAuth()
  if (authError) return authError

  const { host, port, user, password, tls, folder = 'INBOX', limit = 50 } = await req.json()

  if (!host || !user || !password) {
    return NextResponse.json({ error: 'host, user en password zijn verplicht' }, { status: 400 })
  }

  // SSRF protection: validate host
  const { valid, error: hostError } = await validateImapHost(host)
  if (!valid) return hostError!

  const config = {
    imap: {
      host,
      port: port || 993,
      user,
      password,
      tls: tls !== false,
      tlsOptions: { rejectUnauthorized: true },
      authTimeout: 10000,
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
    console.error('[IMAP ERROR]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
