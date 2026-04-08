import { NextRequest, NextResponse } from 'next/server'
import Imap from 'imap'
import { requireAuth } from '@/lib/api-auth'
import { validateImapHost } from '@/lib/imap-validation'

export async function POST(req: NextRequest) {
  const { user: authUser, error: authError } = await requireAuth()
  if (authError) return authError

  const _body = await req.json()
  const { host, port, tls, uid } = _body
  const user = (_body.user || '').trim()
  const password = (_body.password || '').trim()

  if (!host || !user || !password || !uid) {
    return NextResponse.json({ error: 'host, user, password en uid zijn verplicht' }, { status: 400 })
  }

  const resolvedHost = host === 'lctnships.com' ? 'mail.lctnships.com' : host

  // SSRF protection: validate host
  const { valid, error: hostError } = await validateImapHost(resolvedHost)
  if (!valid) return hostError!

  return new Promise<NextResponse>((resolve) => {
    const imap = new Imap({
      host: resolvedHost,
      port: port || 993,
      user,
      password,
      tls: tls !== false,
      tlsOptions: { rejectUnauthorized: false },
    })

    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err) => {
        if (err) {
          imap.end()
          return resolve(NextResponse.json({ error: err.message }, { status: 500 }))
        }
        imap.addFlags(uid, '\\Seen', (flagErr) => {
          imap.end()
          if (flagErr) return resolve(NextResponse.json({ error: flagErr.message }, { status: 500 }))
          resolve(NextResponse.json({ ok: true }))
        })
      })
    })

    imap.once('error', (err: Error) => {
      resolve(NextResponse.json({ error: err.message }, { status: 500 }))
    })

    imap.connect()
  })
}
