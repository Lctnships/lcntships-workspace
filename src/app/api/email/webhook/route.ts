import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { workspaceDb as supabaseAdmin } from '@/lib/supabase/workspace'

const webhookSecret = process.env.RESEND_WEBHOOK_SECRET

// Resend uses Svix for webhook signing. Header names are:
// svix-id, svix-timestamp, svix-signature
function verifySignature(rawBody: string, headers: Headers): boolean {
  if (!webhookSecret) return true // no secret configured → skip verification

  const svixId = headers.get('svix-id')
  const svixTimestamp = headers.get('svix-timestamp')
  const svixSignature = headers.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) return false

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
  const signatures = svixSignature.split(' ').map(s => s.split(',')[1])
  return signatures.some(sig => {
    try {
      return crypto.timingSafeEqual(
        Buffer.from(sig),
        Buffer.from(expectedSignature)
      )
    } catch {
      return false
    }
  })
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    if (!verifySignature(rawBody, request.headers)) {
      console.warn('[resend webhook] signature verification failed')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const payload = JSON.parse(rawBody)
    const eventType: string = payload.type || ''
    const data = payload.data || {}
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
