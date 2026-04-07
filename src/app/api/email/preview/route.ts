import { NextRequest, NextResponse } from 'next/server'
import { render } from '@react-email/render'
import CampaignEmail from '@/emails/CampaignEmail'

export async function POST(request: NextRequest) {
  try {
    const { message, companyName, contactName, ctaText, ctaUrl, greeting } = await request.json()

    const fullMessage = greeting
      ? `${greeting} ${contactName || ''},\n\n${message || 'Dit is een voorbeeld bericht...'}`
      : message || 'Dit is een voorbeeld bericht...'

    const html = await render(
      CampaignEmail({
        companyName: companyName || 'Voorbeeld Bedrijf',
        contactName: contactName || 'Jan Jansen',
        message: fullMessage,
        senderName: 'Rivaldo',
        senderEmail: 'rivaldo@lcntships.com',
        primaryButtonText: ctaText || 'Bekijk lcntships',
        primaryButtonUrl: ctaUrl || 'https://lcntships.com',
      })
    )

    return NextResponse.json({ html })
  } catch (error) {
    console.error('Preview error:', error)
    return NextResponse.json(
      { error: 'Fout bij genereren preview' },
      { status: 500 }
    )
  }
}
