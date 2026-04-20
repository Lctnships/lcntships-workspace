import { NextRequest, NextResponse } from 'next/server'
import { withRateLimit } from '@/lib/with-rate-limit'
import nodemailer from 'nodemailer'
import { z } from 'zod'
import { parseJson } from '@/lib/api-validate'
import { requireAuth } from '@/lib/api-auth'

const SmtpBody = z.object({
  account: z.object({
    name: z.string().max(200).optional(),
    user: z.string().max(320).optional(),
    password: z.string().max(500).optional(),
    smtpHost: z.string().max(253).optional(),
    smtpPort: z.number().int().optional(),
  }).passthrough().optional(),
  to: z.union([z.string().max(2000), z.array(z.string().max(320)).max(1000)]).optional(),
  subject: z.string().max(2000).optional(),
  body: z.string().max(200000).optional(),
}).passthrough()

async function _POST(req: NextRequest) {
  const { error: __authError } = await requireAuth()
  if (__authError) return __authError

  const { data: __body, error: __validationError } = await parseJson(req, SmtpBody)
  if (__validationError) return __validationError
  const { account, to, subject, body } = __body

  if (!account || !to || !subject || !body) {
    return NextResponse.json({ error: 'account, to, subject en body zijn verplicht' }, { status: 400 })
  }

  const smtpHost = account.smtpHost === 'lctnships.com' ? 'mail.lctnships.com' : account.smtpHost

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: account.smtpPort || 587,
    secure: account.smtpPort === 465,
    auth: {
      user: account.user,
      pass: account.password,
    },
    // mail.lctnships.com cert is expired 25-3-2026; allow anyway
    tls: { rejectUnauthorized: false, servername: smtpHost },
  })

  try {
    await transporter.sendMail({
      from: `${account.name} <${account.user}>`,
      to,
      subject,
      text: body,
    })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Versturen mislukt'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export const POST = withRateLimit(_POST, { limit: 30, windowSec: 60, route: 'email-smtp:POST' })
