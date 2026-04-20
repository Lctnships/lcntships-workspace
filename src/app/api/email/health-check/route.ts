import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { z } from 'zod'
import { requireAuth } from '@/lib/api-auth'
import { workspaceDb } from '@/lib/supabase/workspace'
import { parseJson } from '@/lib/api-validate'

const RECIPIENTS = {
  rivaldo: 'rivaldomacandrew@lctnships.com',
  uriel: 'uriel@lctnships.com',
} as const

const Body = z.object({
  recipient: z.enum(['rivaldo', 'uriel']),
  from: z.string().max(200).optional(),
})

/**
 * End-to-end email health check.
 * Runs the exact same pipeline as a real send: Resend API call + sent_emails
 * DB insert. Returns a step-by-step report so it's clear WHICH part fails
 * without needing a real customer to test on.
 */
export async function POST(request: NextRequest) {
  const { user, error: authErr } = await requireAuth()
  if (authErr) return authErr

  const { data: body, error: vErr } = await parseJson(request, Body)
  if (vErr) return vErr

  const steps: Array<{ step: string; ok: boolean; detail?: string }> = []

  // 1. Env vars
  if (!process.env.RESEND_API_KEY) {
    steps.push({ step: 'env', ok: false, detail: 'RESEND_API_KEY ontbreekt' })
    return NextResponse.json({ ok: false, steps }, { status: 500 })
  }
  steps.push({ step: 'env', ok: true })

  // 2. Resend send
  const resend = new Resend(process.env.RESEND_API_KEY)
  const to = RECIPIENTS[body!.recipient]
  const from = body!.from || 'lcntships test <rivaldomacandrew@lctnships.com>'
  const subject = `[TEST] Email pipeline check — ${new Date().toLocaleString('nl-NL')}`
  const html = `
    <div style="font-family:system-ui;padding:24px">
      <h2>✅ Email pipeline check</h2>
      <p>Deze test-mail is verstuurd vanuit de workspace app.</p>
      <p>Timestamp: ${new Date().toLocaleString('nl-NL')}</p>
      <p>Als je dit ziet, werkt Resend end-to-end.</p>
    </div>
  `
  const sendRes = await resend.emails.send({ from, to: to, subject, html })
  if (sendRes.error) {
    steps.push({
      step: 'resend',
      ok: false,
      detail: `${sendRes.error.name ?? 'error'}: ${sendRes.error.message}`,
    })
    return NextResponse.json({ ok: false, steps }, { status: 400 })
  }
  const messageId = sendRes.data?.id ?? null
  steps.push({ step: 'resend', ok: true, detail: messageId ?? undefined })

  // 3. Log to sent_emails (same as real flow)
  const fromMatch = from.match(/^(.+?)\s*<(.+?)>$/)
  const fromName = fromMatch ? fromMatch[1].trim() : null
  const fromEmail = fromMatch ? fromMatch[2].trim() : from
  const { error: dbErr } = await workspaceDb.from('sent_emails').insert({
    user_id: user!.id,
    subject,
    body: html,
    sent_at: new Date().toISOString(),
    status: 'sent',
    resend_id: messageId,
    delivery_status: 'sent',
    last_event: 'sent',
    to_email: to,
    from_email: fromEmail,
    from_name: fromName,
  })
  if (dbErr) {
    steps.push({ step: 'db_log', ok: false, detail: dbErr.message })
    return NextResponse.json({ ok: false, steps, messageId }, { status: 500 })
  }
  steps.push({ step: 'db_log', ok: true })

  return NextResponse.json({ ok: true, steps, messageId })
}
