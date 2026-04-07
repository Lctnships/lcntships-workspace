import { NextRequest, NextResponse } from 'next/server'
import { render } from '@react-email/render'
import LeadEmail from '@/emails/LeadEmail'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const html = await render(
    LeadEmail({
      companyName: searchParams.get('company') || 'FotoStudio XL',
      contactName: searchParams.get('contact') || 'Jan',
      message: searchParams.get('message') ||
        'Bedankt voor het prettige gesprek van zojuist. Zoals besproken stuur ik u graag wat meer informatie over hoe lcntships uw studio kan helpen met het verhuurproces.\n\nKort samengevat bieden wij:\n- Een professioneel platform waar huurders uw studio kunnen vinden en boeken\n- Volledige afhandeling van betalingen en administratie\n- Geen gedoe — wij regelen alles, u hoeft alleen de sleutel te overhandigen\n\nIk hoor graag of u nog vragen heeft. We kunnen ook een vrijblijvend vervolggesprek inplannen.',
      greeting: searchParams.get('greeting') || 'Beste Jan',
      ctaText: searchParams.get('ctaText') || 'Bekijk ons platform',
      ctaUrl: searchParams.get('ctaUrl') || 'https://lcntships.com',
    })
  )

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  })
}
