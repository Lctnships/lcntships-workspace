import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/api-auth'

const ALLOWED_FROM_ADDRESSES = [
  'Rivaldo van lcntships <rivaldo@lcntships.com>',
  'lcntships <team@lcntships.com>',
  'Rivaldo Mac Andrew <rivaldomacandrew@lctnships.com>',
]

const resendApiKey = process.env.RESEND_API_KEY
const resend = resendApiKey ? new Resend(resendApiKey) : null

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabaseAdmin = supabaseUrl && (serviceKey || anonKey)
  ? createClient(supabaseUrl, (serviceKey || anonKey)!)
  : null

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await requireAuth()
    if (authError) return authError

    if (!resend) {
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      )
    }

    const { to, subject, html, text, from, leadId, attachments } = await request.json()

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate from address against allowlist
    const fromAddress = from || 'Rivaldo van lcntships <rivaldo@lcntships.com>'
    if (!ALLOWED_FROM_ADDRESSES.some(a => a.toLowerCase() === fromAddress.toLowerCase())) {
      return NextResponse.json({ error: 'From address not allowed' }, { status: 403 })
    }

    // Build email options
    const emailOptions: any = {
      from: fromAddress,
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

    // Save to sent_emails table with Resend message ID
    if (supabaseAdmin && leadId) {
      const { error: dbError } = await supabaseAdmin.from('sent_emails').insert({
        lead_id: leadId,
        user_id: user.id,
        subject,
        body: html,
        sent_at: new Date().toISOString(),
        status: 'sent',
        resend_id: data?.id || null,
        delivery_status: 'sent',
        last_event: 'sent',
      })
      if (dbError) {
        console.error('Failed to log sent email:', dbError)
      }
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
