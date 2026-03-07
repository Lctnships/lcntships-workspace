import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resendApiKey = process.env.RESEND_API_KEY
const resend = resendApiKey ? new Resend(resendApiKey) : null

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
    
    const { to, subject, html, text, from, leadId, userId, attachments } = await request.json()

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Build email options
    const emailOptions: any = {
      from: from || 'lcntships <team@lcntships.com>',
      to: to,
      subject,
      html,
    }
    
    if (text) {
      emailOptions.text = text
    }
    
    // Handle attachments if provided
    if (attachments && attachments.length > 0) {
      emailOptions.attachments = attachments.map((att: any) => ({
        filename: att.name,
        content: att.url.split(',')[1], // Remove data URL prefix
        content_type: att.type,
      }))
    }

    // Send via Resend
    const { data, error } = await resend.emails.send(emailOptions)

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      )
    }

    // Save to sent_emails table
    if (supabaseAdmin && leadId && userId) {
      await supabaseAdmin.from('sent_emails').insert({
        lead_id: leadId,
        user_id: userId,
        subject,
        body: html,
        sent_at: new Date().toISOString(),
        status: 'sent',
      })
    }

    return NextResponse.json({ 
      success: true, 
      messageId: data?.id 
    })

  } catch (error) {
    console.error('Bulk send error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
