import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { requireAuth } from '@/lib/api-auth'
import { workspaceDb as supabaseAdmin } from '@/lib/supabase/workspace'

const ALLOWED_FROM_ADDRESSES = [
  'Rivaldo van lcntships <rivaldomacandrew@lctnships.com>',
  'Uriel van lcntships <uriel@lctnships.com>',
  'Rivaldo Mac Andrew <rivaldomacandrew@lctnships.com>',
  'lcntships <team@lcntships.com>',
]

const resendApiKey = process.env.RESEND_API_KEY
const resend = resendApiKey ? new Resend(resendApiKey) : null

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
    const fromAddress = from || 'Rivaldo van lcntships <rivaldomacandrew@lctnships.com>'
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

    // Parse sender info from the 'from' field (e.g. "Name <email>")
    const fromMatch = fromAddress.match(/^(.+?)\s*<(.+?)>$/)
    const fromName = fromMatch ? fromMatch[1].trim() : null
    const fromEmail = fromMatch ? fromMatch[2].trim() : fromAddress

    // Save to sent_emails table with Resend message ID — always, so Verzonden shows it
    {
      const { error: dbError } = await supabaseAdmin.from('sent_emails').insert({
        lead_id: leadId || null,
        user_id: user.id,
        subject,
        body: html,
        sent_at: new Date().toISOString(),
        status: 'sent',
        resend_id: data?.id || null,
        delivery_status: 'sent',
        last_event: 'sent',
        to_email: Array.isArray(to) ? to[0] : to,
        to_name: null,
        from_email: fromEmail,
        from_name: fromName,
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
