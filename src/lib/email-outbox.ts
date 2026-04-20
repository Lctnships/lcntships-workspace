/**
 * LCN-016 — Email outbox.
 *
 * Central helper voor het versturen van emails via Resend met persistentie.
 * Elke intent wordt eerst in email_outbox opgeslagen (status='pending'),
 * dan wordt Resend aangeroepen. Bij falen blijft de row staan en kan 'm
 * later retried worden.
 *
 * Daarnaast wordt een succesvolle send óók gelogd naar sent_emails (voor
 * backwards-compat met de Verzonden-folder in de UI).
 */

import { Resend } from 'resend'
import { workspaceDb } from '@/lib/supabase/workspace'

export interface OutboxSendInput {
  source: string // bv. 'sales/send', 'sales/campaign', 'health-check', 'production-notify'
  userId?: string | null
  toEmail: string
  toName?: string | null
  fromEmail: string
  fromName?: string | null
  fromHeader?: string // complete "Name <email>" format — valt terug op fromEmail
  subject: string
  html?: string | null
  text?: string | null
  leadId?: string | null
  metadata?: Record<string, unknown>
  maxAttempts?: number
}

export interface OutboxResult {
  ok: boolean
  outboxId: string
  resendId?: string | null
  error?: string
}

function buildFromHeader(input: OutboxSendInput): string {
  if (input.fromHeader) return input.fromHeader
  if (input.fromName) return `${input.fromName} <${input.fromEmail}>`
  return input.fromEmail
}

/**
 * Enqueue + send. Returns after Resend call — failures don't throw, they're
 * recorded on the outbox row and the caller gets ok:false with the error.
 */
export async function sendViaOutbox(input: OutboxSendInput): Promise<OutboxResult> {
  const fromHeader = buildFromHeader(input)

  // 1. Enqueue
  const { data: enq, error: enqErr } = await workspaceDb
    .from('email_outbox')
    .insert({
      source: input.source,
      user_id: input.userId ?? null,
      to_email: input.toEmail,
      to_name: input.toName ?? null,
      from_email: input.fromEmail,
      from_name: input.fromName ?? null,
      subject: input.subject,
      html: input.html ?? null,
      text_body: input.text ?? null,
      lead_id: input.leadId ?? null,
      metadata: input.metadata ?? {},
      max_attempts: input.maxAttempts ?? 3,
      status: 'pending',
    })
    .select('id')
    .single()

  if (enqErr || !enq) {
    return { ok: false, outboxId: '', error: `Outbox enqueue failed: ${enqErr?.message ?? 'unknown'}` }
  }

  // 2. Mark as sending + bump attempts
  await workspaceDb
    .from('email_outbox')
    .update({ status: 'sending', attempts: 1 })
    .eq('id', enq.id)

  // 3. Send via Resend
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    await workspaceDb
      .from('email_outbox')
      .update({ status: 'failed', last_error: 'RESEND_API_KEY missing' })
      .eq('id', enq.id)
    return { ok: false, outboxId: enq.id, error: 'RESEND_API_KEY missing' }
  }

  const resend = new Resend(apiKey)
  try {
    const payload: Parameters<typeof resend.emails.send>[0] = {
      from: fromHeader,
      to: input.toEmail,
      subject: input.subject,
      ...(input.html ? { html: input.html } : { html: '' }),
      ...(input.text ? { text: input.text } : {}),
    }
    const res = await resend.emails.send(payload)
    if (res.error) {
      await workspaceDb
        .from('email_outbox')
        .update({
          status: 'failed',
          last_error: `${res.error.name ?? 'error'}: ${res.error.message}`,
        })
        .eq('id', enq.id)
      return { ok: false, outboxId: enq.id, error: res.error.message }
    }
    const resendId = res.data?.id ?? null
    await workspaceDb
      .from('email_outbox')
      .update({ status: 'sent', resend_id: resendId, sent_at: new Date().toISOString() })
      .eq('id', enq.id)

    // Mirror in sent_emails (legacy UI compat)
    await workspaceDb.from('sent_emails').insert({
      user_id: input.userId ?? null,
      lead_id: input.leadId ?? null,
      subject: input.subject,
      body: input.html ?? input.text ?? '',
      sent_at: new Date().toISOString(),
      status: 'sent',
      resend_id: resendId,
      delivery_status: 'sent',
      last_event: 'sent',
      to_email: input.toEmail,
      to_name: input.toName ?? null,
      from_email: input.fromEmail,
      from_name: input.fromName ?? null,
    })

    return { ok: true, outboxId: enq.id, resendId }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await workspaceDb
      .from('email_outbox')
      .update({ status: 'failed', last_error: msg })
      .eq('id', enq.id)
    return { ok: false, outboxId: enq.id, error: msg }
  }
}

/**
 * Retry a previously failed outbox row. Increments attempts, swaps to
 * 'sending' then 'sent' or 'failed' based on result.
 */
export async function retryOutbox(outboxId: string): Promise<OutboxResult> {
  const { data: row, error: fetchErr } = await workspaceDb
    .from('email_outbox')
    .select('*')
    .eq('id', outboxId)
    .single()

  if (fetchErr || !row) {
    return { ok: false, outboxId, error: 'Outbox row not found' }
  }
  if (row.status === 'sent') {
    return { ok: true, outboxId, resendId: row.resend_id }
  }
  if (row.attempts >= row.max_attempts) {
    return { ok: false, outboxId, error: `Max attempts (${row.max_attempts}) reached` }
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { ok: false, outboxId, error: 'RESEND_API_KEY missing' }

  await workspaceDb
    .from('email_outbox')
    .update({ status: 'sending', attempts: row.attempts + 1 })
    .eq('id', outboxId)

  const resend = new Resend(apiKey)
  const fromHeader = row.from_name ? `${row.from_name} <${row.from_email}>` : row.from_email
  try {
    const payload: Parameters<typeof resend.emails.send>[0] = {
      from: fromHeader,
      to: row.to_email,
      subject: row.subject,
      ...(row.html ? { html: row.html } : { html: '' }),
      ...(row.text_body ? { text: row.text_body } : {}),
    }
    const res = await resend.emails.send(payload)
    if (res.error) {
      await workspaceDb
        .from('email_outbox')
        .update({ status: 'failed', last_error: res.error.message })
        .eq('id', outboxId)
      return { ok: false, outboxId, error: res.error.message }
    }
    const resendId = res.data?.id ?? null
    await workspaceDb
      .from('email_outbox')
      .update({ status: 'sent', resend_id: resendId, sent_at: new Date().toISOString() })
      .eq('id', outboxId)
    return { ok: true, outboxId, resendId }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await workspaceDb
      .from('email_outbox')
      .update({ status: 'failed', last_error: msg })
      .eq('id', outboxId)
    return { ok: false, outboxId, error: msg }
  }
}
