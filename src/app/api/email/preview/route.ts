import { NextRequest, NextResponse } from 'next/server'
import { render } from '@react-email/render'
import { z } from 'zod'
import CampaignEmail from '@/emails/CampaignEmail'
import { parseJson } from '@/lib/api-validate'
import { requireAuth } from '@/lib/api-auth'

const PreviewBody = z.object({
  message: z.string().max(200000).optional(),
  companyName: z.string().max(200).optional(),
  contactName: z.string().max(200).optional(),
  ctaText: z.string().max(200).optional(),
  ctaUrl: z.string().max(2000).optional(),
  greeting: z.string().max(2000).optional(),
}).passthrough()

export async function POST(request: NextRequest) {
  const { error: __authError } = await requireAuth()
  if (__authError) return __authError

  try {
    const { data: __body, error: __validationError } = await parseJson(request, PreviewBody)
    if (__validationError) return __validationError
    const { message, companyName, contactName, ctaText, ctaUrl, greeting } = __body

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
