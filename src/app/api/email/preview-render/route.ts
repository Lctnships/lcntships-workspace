import { NextRequest, NextResponse } from 'next/server'
import { withRateLimit } from '@/lib/with-rate-limit'
import { render } from '@react-email/render'
import { z } from 'zod'
import CampaignEmail from '@/emails/CampaignEmail'
import { parseJson } from '@/lib/api-validate'
import { requireAuth } from '@/lib/api-auth'

const PreviewRenderBody = z.object({
  contactName: z.string().max(200).default(''),
  companyName: z.string().max(200).default(''),
  message: z.string().max(200000).default(''),
  senderName: z.string().max(200).default(''),
  senderEmail: z.string().max(320).default(''),
  primaryButtonText: z.string().max(200).default(''),
  primaryButtonUrl: z.string().max(2000).default(''),
  secondaryButtonText: z.string().max(200).optional(),
  secondaryButtonUrl: z.string().max(2000).optional(),
  attachments: z.array(z.any()).max(1000).optional(),
}).passthrough()

async function _POST(request: NextRequest) {
  const { error: __authError } = await requireAuth()
  if (__authError) return __authError

  try {
    const { data: __body, error: __validationError } = await parseJson(request, PreviewRenderBody)
    if (__validationError) return __validationError
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
    } = __body

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

export const POST = withRateLimit(_POST, { limit: 60, windowSec: 60, route: 'email-preview-render:POST' })
