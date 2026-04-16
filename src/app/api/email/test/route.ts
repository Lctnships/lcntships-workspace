import { NextRequest, NextResponse } from 'next/server'
import { withRateLimit } from '@/lib/with-rate-limit'
import { Resend } from 'resend'
import { z } from 'zod'
import { parseJson } from '@/lib/api-validate'
import { requireAuth } from '@/lib/api-auth'

const TestEmailBody = z.object({
  to: z.union([z.string().email().max(320), z.array(z.string().email().max(320)).max(1000)]).optional(),
  subject: z.string().max(2000).optional(),
  html: z.string().max(200000).optional(),
}).passthrough()

async function _POST(request: NextRequest) {
  const { error: __authError } = await requireAuth()
  if (__authError) return __authError

  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'RESEND_API_KEY is not configured' },
        { status: 500 }
      )
    }

    const resend = new Resend(process.env.RESEND_API_KEY)
    const { data: __body, error: __validationError } = await parseJson(request, TestEmailBody)
    if (__validationError) return __validationError
    const { to, subject, html } = __body

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: 'to, subject, and html are required' },
        { status: 400 }
      )
    }

    const response = await resend.emails.send({
      from: 'Rivaldo <rivaldomacandrew@lctnships.com>',
      to,
      subject,
      html,
    })

    if (response.error) {
      return NextResponse.json(
        { error: response.error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      id: response.data?.id,
    })
  } catch (error) {
    console.error('Test send error:', error)
    return NextResponse.json(
      { error: 'Er ging iets mis bij het versturen.' },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(_POST, { limit: 30, windowSec: 60, route: 'email-test:POST' })
