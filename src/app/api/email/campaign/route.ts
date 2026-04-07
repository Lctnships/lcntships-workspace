import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { render } from '@react-email/render'
import CampaignEmail from '@/emails/CampaignEmail'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const { leads, fromEmail, subject, message, ctaText, ctaUrl, attachments, greeting } = await request.json()

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json(
        { error: 'Geen leads geselecteerd' },
        { status: 400 }
      )
    }

    if (!fromEmail || !subject || !message) {
      return NextResponse.json(
        { error: 'Ontbrekende velden: fromEmail, subject of message' },
        { status: 400 }
      )
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'Resend API key niet geconfigureerd' },
        { status: 500 }
      )
    }

    // Filter alleen leads met email
    const leadsWithEmail = leads.filter((l: { email?: string }) => l.email && l.email.includes('@'))

    if (leadsWithEmail.length === 0) {
      return NextResponse.json(
        { error: 'Geen geldige emailadressen gevonden' },
        { status: 400 }
      )
    }

    // Verstuur emails
    let sent = 0
    const errors: string[] = []

    for (const lead of leadsWithEmail) {
      try {
        // Personaliseer het bericht
        const personalizedMessage = message
          .replace(/{company_name}/g, lead.company_name || '')
          .replace(/{contact_name}/g, lead.contact_name || '')

        const personalizedSubject = subject
          .replace(/{company_name}/g, lead.company_name || '')
          .replace(/{contact_name}/g, lead.contact_name || '')

        // Render React Email template
        const fullMessage = greeting
          ? `${greeting} ${lead.contact_name || ''},\n\n${personalizedMessage}`
          : personalizedMessage

        const html = await render(
          CampaignEmail({
            companyName: lead.company_name || '',
            contactName: lead.contact_name || '',
            message: fullMessage,
            senderName: 'Rivaldo',
            senderEmail: 'rivaldo@lcntships.com',
            primaryButtonText: ctaText || 'Bekijk lcntships',
            primaryButtonUrl: ctaUrl || 'https://lcntships.com',
          })
        )

        // Prepare attachments for Resend
        const emailAttachments = attachments?.map((att: { name: string; content: string; type: string }) => ({
          filename: att.name,
          content: att.content,
          contentType: att.type,
        }))

        await resend.emails.send({
          from: fromEmail,
          to: lead.email,
          subject: personalizedSubject,
          html,
          attachments: emailAttachments,
        })

        sent++

        // Kleine delay om rate limiting te voorkomen
        if (sent < leadsWithEmail.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      } catch (error) {
        console.error(`Error sending email to ${lead.email}:`, error)
        errors.push(`${lead.email}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return NextResponse.json({
      sent,
      total: leadsWithEmail.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Campaign error:', error)
    return NextResponse.json(
      { error: 'Er ging iets mis bij het versturen van de campagne' },
      { status: 500 }
    )
  }
}
