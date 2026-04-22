import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/api-auth'
import { parseJson } from '@/lib/api-validate'
import { sendViaOutbox } from '@/lib/email-outbox'

const RECIPIENTS = {
  rivaldo: 'rivaldomacandrew@lctnships.com',
  uriel: 'uriel@lctnships.com',
  gmail: 'mac.valdo1997@gmail.com',
} as const

const Body = z.object({
  recipient: z.enum(['rivaldo', 'uriel', 'gmail']),
  from: z.string().max(200).optional(),
})

export async function POST(request: NextRequest) {
  const { user, error: authErr } = await requireAuth()
  if (authErr) return authErr

  const { data: body, error: vErr } = await parseJson(request, Body)
  if (vErr) return vErr

  const steps: Array<{ step: string; ok: boolean; detail?: string }> = []

  if (!process.env.RESEND_API_KEY) {
    steps.push({ step: 'env', ok: false, detail: 'RESEND_API_KEY ontbreekt' })
    return NextResponse.json({ ok: false, steps }, { status: 500 })
  }
  steps.push({ step: 'env', ok: true })

  const to = RECIPIENTS[body!.recipient]
  const fromHeader = body!.from || 'lcntships test <rivaldomacandrew@lctnships.com>'
  const fromMatch = fromHeader.match(/^(.+?)\s*<(.+?)>$/)
  const fromName = fromMatch ? fromMatch[1].trim() : null
  const fromEmail = fromMatch ? fromMatch[2].trim() : fromHeader
  const subject = `[TEST] Email pipeline check — ${new Date().toLocaleString('nl-NL')}`
  const html = `
    <div style="font-family:system-ui;padding:24px">
      <h2>✅ Email pipeline check</h2>
      <p>Deze test-mail is verstuurd vanuit de workspace app.</p>
      <p>Timestamp: ${new Date().toLocaleString('nl-NL')}</p>
      <p>Als je dit ziet, werkt Resend end-to-end.</p>
    </div>
  `.trim()

  const result = await sendViaOutbox({
    source: 'health-check',
    userId: user!.id,
    toEmail: to,
    fromEmail,
    fromName,
    fromHeader,
    subject,
    html,
  })

  if (!result.ok) {
    steps.push({ step: 'outbox_send', ok: false, detail: result.error })
    return NextResponse.json({ ok: false, steps, outboxId: result.outboxId }, { status: 400 })
  }

  steps.push({ step: 'outbox_enqueue', ok: true, detail: result.outboxId })
  steps.push({ step: 'resend_send', ok: true, detail: result.resendId ?? undefined })
  steps.push({ step: 'db_log', ok: true })

  return NextResponse.json({ ok: true, steps, messageId: result.resendId, outboxId: result.outboxId })
}
