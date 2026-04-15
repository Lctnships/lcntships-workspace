import { NextRequest, NextResponse } from 'next/server'
import Imap from 'imap'
import { z } from 'zod'
import { parseJson } from '@/lib/api-validate'
import { validateImapHost } from '@/lib/imap-validation'
import { requireAuth } from '@/lib/api-auth'

const MarkReadBody = z.object({
  host: z.string().max(253).optional(),
  port: z.number().int().optional(),
  tls: z.boolean().optional(),
  uid: z.union([z.string().max(200), z.number()]).optional(),
  user: z.string().max(320).optional(),
  password: z.string().max(500).optional(),
}).passthrough()

export async function POST(req: NextRequest) {
  const { error: __authError } = await requireAuth()
  if (__authError) return __authError

  const { data: _body, error: __validationError } = await parseJson(req, MarkReadBody)
  if (__validationError) return __validationError
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
