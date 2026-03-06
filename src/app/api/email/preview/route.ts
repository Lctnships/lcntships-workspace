import { NextRequest, NextResponse } from 'next/server'
import { render } from '@react-email/render'
import LeadEmail from '@/emails/LeadEmail'

export async function POST(request: NextRequest) {
  try {
    const { message, companyName, contactName, ctaText, ctaUrl, greeting } = await request.json()

    const html = await render(
      LeadEmail({
        companyName: companyName || 'Voorbeeld Bedrijf',
        contactName: contactName || 'Jan Jansen',
        message: message || 'Dit is een voorbeeld bericht...',
        ctaText: ctaText || 'Bekijk ons aanbod',
        ctaUrl: ctaUrl || 'https://lcntships.com',
        greeting: greeting || 'Hallo',
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
