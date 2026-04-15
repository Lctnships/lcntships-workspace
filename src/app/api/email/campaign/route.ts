import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { render } from '@react-email/render'
import { z } from 'zod'
import CampaignEmail from '@/emails/CampaignEmail'
import { parseJson } from '@/lib/api-validate'
import { requireAuth } from '@/lib/api-auth'

const CampaignBody = z.object({
  leads: z.array(z.record(z.string(), z.unknown())).max(1000).optional(),
  fromEmail: z.string().max(2000).optional(),
  subject: z.string().max(2000).optional(),
  message: z.string().max(200000).optional(),
  ctaText: z.string().max(200).optional(),
  ctaUrl: z.string().max(2000).optional(),
  attachments: z.array(z.any()).max(1000).optional(),
  greeting: z.string().max(2000).optional(),
}).passthrough()

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function POST(request: NextRequest) {
  const { error: __authError } = await requireAuth()
  if (__authError) return __authError

  try {
    const { data: __body, error: __validationError } = await parseJson(request, CampaignBody)
    if (__validationError) return __validationError
    const { leads, fromEmail, subject, message, ctaText, ctaUrl, attachments, greeting } = __body

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

    if (!resend) {
      return NextResponse.json(
        { error: 'Resend API key niet geconfigureerd' },
        { status: 500 }
      )
    }

    // Filter alleen leads met email
    const leadsWithEmail = (leads as Array<Record<string, any>>).filter((l: { email?: string }) => l.email && l.email.includes('@'))

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
            senderEmail: 'rivaldomacandrew@lctnships.com',
            primaryButtonText: ctaText || 'Bekijk lcntships',
            primaryButtonUrl: ctaUrl || 'https://lctnships.com',
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
