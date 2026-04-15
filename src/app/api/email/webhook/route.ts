import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { z } from 'zod'
import { workspaceDb as supabaseAdmin } from '@/lib/supabase/workspace'

const WebhookPayload = z.object({
  type: z.string().max(200).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
}).passthrough()

const webhookSecret = process.env.RESEND_WEBHOOK_SECRET
const isProd = process.env.NODE_ENV === 'production'

// LCN-009 — accepted timestamp window (5 min, matches Svix default).
const TIMESTAMP_TOLERANCE_SECONDS = 5 * 60

type VerifyResult = { ok: true } | { ok: false; status: number; reason: string }

// Resend uses Svix for webhook signing. Header names are:
// svix-id, svix-timestamp, svix-signature
function verifySignature(rawBody: string, headers: Headers): VerifyResult {
  if (!webhookSecret) {
    // LCN-009 — in production we must fail closed; missing secret = misconfig.
    if (isProd) return { ok: false, status: 500, reason: 'webhook secret not configured' }
    return { ok: true }
  }

  const svixId = headers.get('svix-id')
  const svixTimestamp = headers.get('svix-timestamp')
  const svixSignature = headers.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return { ok: false, status: 401, reason: 'missing svix headers' }
  }

  // Replay protection: reject stale or future-dated timestamps.
  const tsSeconds = Number(svixTimestamp)
  if (!Number.isFinite(tsSeconds)) return { ok: false, status: 401, reason: 'bad timestamp' }
  const skew = Math.abs(Math.floor(Date.now() / 1000) - tsSeconds)
  if (skew > TIMESTAMP_TOLERANCE_SECONDS) {
    return { ok: false, status: 401, reason: 'timestamp outside tolerance' }
  }

  // Secret format: whsec_<base64>
  const secret = webhookSecret.startsWith('whsec_')
    ? webhookSecret.substring(6)
    : webhookSecret

  const signedPayload = `${svixId}.${svixTimestamp}.${rawBody}`
  const secretBytes = Buffer.from(secret, 'base64')
  const expectedSignature = crypto
    .createHmac('sha256', secretBytes)
    .update(signedPayload)
    .digest('base64')

  // svix-signature is a space separated list of "v1,<sig>"
  const signatures = svixSignature.split(' ').map(s => s.split(',')[1]).filter(Boolean)
  const expectedBuf = Buffer.from(expectedSignature)
  const matched = signatures.some((sig) => {
    try {
      const sigBuf = Buffer.from(sig)
      if (sigBuf.length !== expectedBuf.length) return false
      return crypto.timingSafeEqual(sigBuf, expectedBuf)
    } catch {
      return false
    }
  })
  return matched ? { ok: true } : { ok: false, status: 401, reason: 'signature mismatch' }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const verdict = verifySignature(rawBody, request.headers)
    if (!verdict.ok) {
      console.warn('[resend webhook] signature verification failed:', verdict.reason)
      return NextResponse.json({ error: 'Invalid signature' }, { status: verdict.status })
    }

    let payloadRaw: unknown
    try {
      payloadRaw = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    const validation = WebhookPayload.safeParse(payloadRaw)
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 })
    }
    const payload = validation.data as { type?: string; data?: Record<string, unknown> }
    const eventType: string = payload.type || ''
    const data = (payload.data || {}) as Record<string, any>

    const emailId: string | undefined = data.email_id || data.id

    if (!emailId) {
      return NextResponse.json({ ok: true, skipped: 'no email id' })
    }

    // Map Resend event type → internal status
    // Events: email.sent, email.delivered, email.delivery_delayed,
    //         email.bounced, email.complained, email.opened, email.clicked, email.failed
    const event = eventType.startsWith('email.')
      ? eventType.substring(6)
      : eventType

    const updateData: Record<string, unknown> = {
      delivery_status: event,
      last_event: event,
    }

    const now = new Date().toISOString()
    if (event === 'delivered') updateData.delivered_at = data.created_at || now
    if (event === 'bounced') {
      updateData.bounced_at = data.created_at || now
      if (data.bounce?.type) updateData.bounce_type = data.bounce.type
    }
    if (event === 'complained') updateData.complained_at = data.created_at || now
    if (event === 'opened') updateData.opened_at = data.created_at || now
    if (event === 'clicked') updateData.clicked_at = data.created_at || now

    const { error } = await supabaseAdmin
      .from('sent_emails')
      .update(updateData)
      .eq('resend_id', emailId)

    if (error) {
      console.error('[resend webhook] db update error:', error)
      return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, event, emailId })
  } catch (err) {
    console.error('[resend webhook] error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
