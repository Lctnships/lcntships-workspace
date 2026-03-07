import { NextRequest, NextResponse } from 'next/server'
import { render } from '@react-email/render'
import CampaignEmail from '@/emails/CampaignEmail'

export async function POST(request: NextRequest) {
  try {
    const {
      contactName,
      companyName,
      message,
      senderName,
      senderEmail,
      primaryButtonText,
      primaryButtonUrl,
      secondaryButtonText,
      secondaryButtonUrl,
      attachments,
    } = await request.json()

    const html = await render(
      CampaignEmail({
        contactName,
        companyName,
        message,
        senderName,
        senderEmail,
        primaryButtonText,
        primaryButtonUrl,
        secondaryButtonText,
        secondaryButtonUrl,
        attachments,
      })
    )

    return NextResponse.json({ html })
  } catch (error) {
    console.error('Preview render error:', error)
    return NextResponse.json(
      { error: 'Failed to render preview' },
      { status: 500 }
    )
  }
}
