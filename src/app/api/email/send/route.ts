import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { render } from '@react-email/render'
import { z } from 'zod'
import CampaignEmail from '@/emails/CampaignEmail'
import { workspaceDb as supabaseAdmin } from '@/lib/supabase/workspace'
import { parseJson } from '@/lib/api-validate'
import { requireAuth } from '@/lib/api-auth'

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

const resendApiKey = process.env.RESEND_API_KEY
const resend = resendApiKey ? new Resend(resendApiKey) : null

export async function POST(request: NextRequest) {
  const { error: __authError } = await requireAuth()
  if (__authError) return __authError

  try {
    if (!resend) {
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      )
    }
    
    const { data: __body, error: __validationError } = await parseJson(request, SendEmailBody)
    if (__validationError) return __validationError
    const { to, subject, message, from, greeting, ctaText, ctaUrl, trackId } = __body

    if (!to || !subject || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, or message' },
        { status: 400 }
      )
    }

    // Generate tracking pixel if trackId is provided
    const trackingPixel = trackId
      ? `<img src="${process.env.NEXT_PUBLIC_APP_URL}/api/email/track?type=open&id=${trackId}" width="1" height="1" alt="" />`
      : ''

    // Build greeting into the message if provided
    const fullMessage = greeting
      ? `${greeting},\n\n${message}${trackingPixel}`
      : `${message}${trackingPixel}`

    // Parse sender info from 'from' field (e.g. "Rivaldo van lcntships <rivaldomacandrew@lctnships.com>")
    const fromStr = from || 'Rivaldo van lcntships <rivaldomacandrew@lctnships.com>'
    const fromMatch = fromStr.match(/^(.+?)\s*<(.+?)>$/)
    const senderName = fromMatch ? fromMatch[1].split(' ')[0] : 'Rivaldo'
    const senderEmail = fromMatch ? fromMatch[2] : 'rivaldomacandrew@lctnships.com'

    // Render email with CampaignEmail template
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

    // Send via Resend
    const { data, error } = await resend.emails.send({
      from: from || 'Rivaldo van lcntships <rivaldomacandrew@lctnships.com>',
      to: to?.email || '',
      subject,
      html,
    })

    if (error) {
      console.error('Resend error:', JSON.stringify(error))
      return NextResponse.json(
        { error: error.message || 'Failed to send email' },
        { status: 500 }
      )
    }

    // Save to sent_emails table so email shows up in Verzonden folder
    {
      const { error: dbError } = await supabaseAdmin.from('sent_emails').insert({
        lead_id: trackId || null,
        subject,
        body: html,
        sent_at: new Date().toISOString(),
        status: 'sent',
        resend_id: data?.id || null,
        delivery_status: 'sent',
        last_event: 'sent',
        to_email: to.email,
        to_name: to.name || null,
        from_email: senderEmail,
        from_name: senderName,
      })
      if (dbError) {
        console.error('Failed to log sent email to sent_emails:', dbError)
      }
    }

    return NextResponse.json({ 
      success: true, 
      messageId: data?.id 
    })

  } catch (error) {
    console.error('Send email error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
