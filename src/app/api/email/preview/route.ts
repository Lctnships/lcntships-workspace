import { NextRequest, NextResponse } from 'next/server'
import { render } from '@react-email/render'
import CampaignEmail from '@/emails/CampaignEmail'
import { requireAuth } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
  const { error: __authError } = await requireAuth()
  if (__authError) return __authError

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
        senderEmail: 'rivaldomacandrew@lctnships.com',
        primaryButtonText: ctaText || 'Bekijk lcntships',
        primaryButtonUrl: ctaUrl || 'https://lctnships.com',
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
