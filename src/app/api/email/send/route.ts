import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface Lead {
  email: string
  naam?: string
  studio?: string
  stad?: string
  [key: string]: string | undefined
}

function personalise(text: string, lead: Lead): string {
  let result = text
  for (const [key, value] of Object.entries(lead)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value || '')
  }
  return result
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'RESEND_API_KEY is not configured' },
        { status: 500 }
      )
    }

    const { leads, subject, htmlTemplate, batchIndex, batchSize = 100 } = await request.json()

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json(
        { error: 'No leads provided' },
        { status: 400 }
      )
    }

    if (!subject || !htmlTemplate) {
      return NextResponse.json(
        { error: 'Subject and template are required' },
        { status: 400 }
      )
    }

    // Send this batch (Resend Pro: up to 100/sec)
    const batch = leads.slice(0, batchSize)
    const results: Array<{ email: string; status: 'sent' | 'failed'; error?: string; id?: string }> = []

    const promises = batch.map(async (lead: Lead) => {
      try {
        const response = await resend.emails.send({
          from: 'Rivaldo <rivaldo@lcntships.com>',
          to: lead.email,
          subject: personalise(subject, lead),
          html: personalise(htmlTemplate, lead),
        })

        if (response.error) {
          return {
            email: lead.email,
            status: 'failed' as const,
            error: response.error.message,
          }
        }

        return {
          email: lead.email,
          status: 'sent' as const,
          id: response.data?.id,
        }
      } catch (err) {
        return {
          email: lead.email,
          status: 'failed' as const,
          error: err instanceof Error ? err.message : 'Unknown error',
        }
      }
    })

    const batchResults = await Promise.all(promises)
    results.push(...batchResults)

    const sent = results.filter(r => r.status === 'sent').length
    const failed = results.filter(r => r.status === 'failed').length

    return NextResponse.json({
      results,
      sent,
      failed,
      batchIndex: batchIndex ?? 0,
      totalInBatch: batch.length,
    })
  } catch (error) {
    console.error('Bulk send error:', error)
    return NextResponse.json(
      { error: 'Er ging iets mis bij het versturen.' },
      { status: 500 }
    )
  }
}
