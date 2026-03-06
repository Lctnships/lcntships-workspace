import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { render } from '@react-email/render'
import LeadEmail from '@/emails/LeadEmail'

const resendApiKey = process.env.RESEND_API_KEY
const resend = resendApiKey ? new Resend(resendApiKey) : null

// Initialize Supabase admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabaseAdmin = supabaseUrl && serviceKey 
  ? createClient(supabaseUrl, serviceKey)
  : null

export async function POST(request: NextRequest) {
  try {
    if (!resend) {
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      )
    }
    
    const { to, subject, message, from, greeting, ctaText, ctaUrl, trackId } = await request.json()

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

    // Render email with tracking
    const html = await render(
      LeadEmail({
        companyName: to.company || 'Bedrijf',
        contactName: to.name || 'Contact',
        message: message + trackingPixel,
        ctaText,
        ctaUrl,
        greeting: greeting || 'Hallo',
      })
    )

    // Send via Resend
    const { data, error } = await resend.emails.send({
      from: from || 'lcntships <team@lcntships.com>',
      to: to.email,
      subject,
      html,
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      )
    }

    // Save to database if we have a user context
    if (trackId && supabaseAdmin) {
      await supabaseAdmin.from('emails').insert({
        message_id: data?.id,
        to_emails: [{ name: to.name, email: to.email }],
        subject,
        body_html: html,
        folder: 'sent',
        sent_at: new Date().toISOString(),
      })
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
