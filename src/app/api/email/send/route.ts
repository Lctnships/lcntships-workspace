import { NextRequest, NextResponse } from 'next/server'
import { withRateLimit } from '@/lib/with-rate-limit'
import { render } from '@react-email/render'
import { z } from 'zod'
import CampaignEmail from '@/emails/CampaignEmail'
import { parseJson } from '@/lib/api-validate'
import { requireAuth } from '@/lib/api-auth'
import { sendViaOutbox } from '@/lib/email-outbox'

const SendEmailBody = z.object({
  to: z.object({
    email: z.string().max(320).optional(),
    name: z.string().max(200).optional(),
    company: z.string().max(200).optional(),
  }).passthrough().optional(),
  subject: z.string().max(2000).optional(),
  message: z.string().max(200000).optional(),
  from: z.string().max(2000).optional(),
  greeting: z.string().max(2000).optional(),
  ctaText: z.string().max(200).optional(),
  ctaUrl: z.string().max(2000).optional(),
  trackId: z.string().max(200).optional(),
}).passthrough()

async function _POST(request: NextRequest) {
  const { user, error: __authError } = await requireAuth()
  if (__authError) return __authError

  try {
    const { data: __body, error: __validationError } = await parseJson(request, SendEmailBody)
    if (__validationError) return __validationError
    const { to, subject, message, from, greeting, ctaText, ctaUrl, trackId } = __body

    if (!to || !subject || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, or message' },
        { status: 400 }
      )
    }

    const trackingPixel = trackId
      ? `<img src="${process.env.NEXT_PUBLIC_APP_URL}/api/email/track?type=open&id=${trackId}" width="1" height="1" alt="" />`
      : ''

    const fullMessage = greeting
      ? `${greeting},\n\n${message}${trackingPixel}`
      : `${message}${trackingPixel}`

    const fromStr = from || 'Rivaldo van lcntships <rivaldomacandrew@lctnships.com>'
    const fromMatch = fromStr.match(/^(.+?)\s*<(.+?)>$/)
    const senderName = fromMatch ? fromMatch[1].split(' ')[0] : 'Rivaldo'
    const senderEmail = fromMatch ? fromMatch[2] : 'rivaldomacandrew@lctnships.com'

    const html = await render(
      CampaignEmail({
        companyName: to.company || 'Bedrijf',
        contactName: to.name || 'Contact',
        message: fullMessage,
        senderName,
        senderEmail,
        primaryButtonText: ctaText || 'Bekijk lcntships',
        primaryButtonUrl: ctaUrl || 'https://lctnships.com',
        secondaryButtonText: undefined,
        secondaryButtonUrl: undefined,
      })
    )

    const result = await sendViaOutbox({
      source: 'email/send',
      userId: user!.id,
      toEmail: to.email || '',
      toName: to.name ?? null,
      fromEmail: senderEmail,
      fromName: senderName,
      fromHeader: fromStr,
      subject,
      html,
      leadId: trackId || null,
      metadata: { trackId: trackId || null },
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? 'Failed to send email', outboxId: result.outboxId }, { status: 500 })
    }
    return NextResponse.json({ success: true, messageId: result.resendId, outboxId: result.outboxId })
  } catch (error) {
    console.error('Send email error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(_POST, { limit: 30, windowSec: 60, route: 'email-send:POST' })
