import { NextRequest, NextResponse } from 'next/server'
import imaps from 'imap-simple'

export async function POST(req: NextRequest) {
  const { host, port, user, password, tls, folder = 'INBOX', limit = 50 } = await req.json()

  if (!host || !user || !password) {
    return NextResponse.json({ error: 'host, user en password zijn verplicht' }, { status: 400 })
  }

  const config = {
    imap: {
      host,
      port: port || 993,
      user,
      password,
      tls: tls !== false,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 10000,
    },
  }

  try {
    const connection = await imaps.connect(config)
    await connection.openBox(folder)

    const searchCriteria = ['ALL']
    const fetchOptions = {
      bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)', 'TEXT'],
      markSeen: false,
      struct: true,
    }

    const messages = await connection.search(searchCriteria, fetchOptions)
    connection.end()

    // Get last N messages (newest first)
    const recent = messages.slice(-limit).reverse()

    const emails = recent.map((msg) => {
      const headerPart = msg.parts.find((p: { which: string }) => p.which.startsWith('HEADER'))
      const bodyPart = msg.parts.find((p: { which: string }) => p.which === 'TEXT')

      const headers = headerPart?.body || {}
      const from = headers.from?.[0] || ''
      const to = headers.to?.[0] || ''
      const subject = headers.subject?.[0] || '(geen onderwerp)'
      const date = headers.date?.[0] || new Date().toISOString()

      // Parse from field
      const fromMatch = from.match(/^(.+?)\s*<(.+?)>$/)
      const fromName = fromMatch ? fromMatch[1].trim().replace(/^"|"$/g, '') : from
      const fromEmail = fromMatch ? fromMatch[2] : from

      return {
        id: `${msg.attributes.uid}`,
        subject,
        from: { name: fromName, email: fromEmail },
        to: [{ name: '', email: to.replace(/<|>/g, '').trim() }],
        date: new Date(date).toISOString(),
        body: bodyPart?.body?.slice(0, 500) || '',
        isRead: msg.attributes.flags?.includes('\\Seen') || false,
        isStarred: msg.attributes.flags?.includes('\\Flagged') || false,
        folder: 'inbox',
        uid: msg.attributes.uid,
      }
    })

    return NextResponse.json({ emails })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Verbinding mislukt'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
