import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { render } from '@react-email/render'
import LeadEmail from '@/emails/LeadEmail'

const resendApiKey = process.env.RESEND_API_KEY
const resend = resendApiKey ? new Resend(resendApiKey) : null

// Initialize Supabase client (service role preferred, anon key as fallback)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabaseAdmin = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
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
      from: from || 'Rivaldo | lcntships <rivaldo@lcntships.com>',
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

    // Save to sent_emails table so email history shows up in Sales Mode
    if (trackId && supabaseAdmin) {
      const { error: dbError } = await supabaseAdmin.from('sent_emails').insert({
        lead_id: trackId,
        subject,
        body: html,
        sent_at: new Date().toISOString(),
        status: 'sent',
        resend_id: data?.id || null,
        delivery_status: 'sent',
        last_event: 'sent',
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
