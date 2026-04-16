import { NextResponse } from 'next/server'
import { withRateLimit } from '@/lib/with-rate-limit'
import { Resend } from 'resend'
import { requireAuth } from '@/lib/api-auth'
import { workspaceDb as supabaseAdmin } from '@/lib/supabase/workspace'

const resendApiKey = process.env.RESEND_API_KEY
const resend = resendApiKey ? new Resend(resendApiKey) : null

export async function GET() {
  const { error: authError } = await requireAuth()
  if (authError) return authError
  try {
    if (!resend) {
      return NextResponse.json(
        { error: 'Services not configured' },
        { status: 500 }
      )
    }

    // Get all sent_emails that have a resend_id
    const { data: sentEmails, error: dbError } = await supabaseAdmin
      .from('sent_emails')
      .select('id, resend_id, delivery_status')
      .not('resend_id', 'is', null)

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    if (!sentEmails || sentEmails.length === 0) {
      return NextResponse.json({ message: 'No emails with resend_id to sync', synced: 0 })
    }

    let synced = 0
    let errors = 0
    const results: Array<{ resend_id: string; status: string; error?: string }> = []

    for (const email of sentEmails) {
      try {
        const resendEmail = await resend.emails.get(email.resend_id)

        if (!resendEmail.data) {
          results.push({ resend_id: email.resend_id, status: 'not_found' })
          continue
        }

        const data = resendEmail.data as any
        const lastEvent = data.last_event || data.status || 'unknown'

        const updateData: Record<string, any> = {
          delivery_status: lastEvent,
          last_event: lastEvent,
        }

        if (lastEvent === 'delivered' && !email.delivery_status?.includes('delivered')) {
          updateData.delivered_at = data.delivered_at || new Date().toISOString()
        }

        if (lastEvent === 'bounced') {
          updateData.bounced_at = data.bounced_at || new Date().toISOString()
          updateData.bounce_type = data.bounce_type || 'unknown'
        }

        if (lastEvent === 'complained') {
          updateData.complained_at = data.complained_at || new Date().toISOString()
        }

        if (data.opened_at) {
          updateData.opened_at = data.opened_at
        }

        if (data.clicked_at) {
          updateData.clicked_at = data.clicked_at
        }

        await supabaseAdmin
          .from('sent_emails')
          .update(updateData)
          .eq('id', email.id)

        synced++
        results.push({ resend_id: email.resend_id, status: lastEvent })
      } catch (err: any) {
        errors++
        results.push({ resend_id: email.resend_id, status: 'error', error: err.message })
      }

      // Rate limit: Resend allows 10 req/sec for GET
      await new Promise(r => setTimeout(r, 150))
    }

    return NextResponse.json({ synced, errors, total: sentEmails.length, results })
  } catch (error) {
    console.error('Resend sync error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Also fetch all recent emails from Resend and match by recipient
async function _POST() {
  const { error: authError2 } = await requireAuth()
  if (authError2) return authError2

  try {
    if (!resend) {
      return NextResponse.json(
        { error: 'Services not configured' },
        { status: 500 }
      )
    }

    // Fetch recent emails from Resend
    const resendEmails = await resend.emails.list()

    if (!resendEmails.data) {
      return NextResponse.json({ error: 'Failed to fetch from Resend' }, { status: 500 })
    }

    const emails = (resendEmails.data as any).data || resendEmails.data

    // Get all sent_emails from our DB
    const { data: dbEmails } = await supabaseAdmin
      .from('sent_emails')
      .select('id, resend_id, lead_id, subject, sent_at')

    // Update sent_emails that don't have resend_id yet by matching subject + time
    let matched = 0
    const emailList = Array.isArray(emails) ? emails : []

    for (const resendEmail of emailList) {
      const resendId = resendEmail.id
      const alreadyLinked = dbEmails?.some(e => e.resend_id === resendId)
      if (alreadyLinked) continue

      // Try to match by subject and approximate time
      const matchingDb = dbEmails?.find(e => {
        if (e.resend_id) return false
        if (e.subject !== resendEmail.subject) return false
        const dbTime = new Date(e.sent_at).getTime()
        const resendTime = new Date(resendEmail.created_at).getTime()
        return Math.abs(dbTime - resendTime) < 60000 * 5 // within 5 minutes
      })

      if (matchingDb) {
        const lastEvent = resendEmail.last_event || 'sent'
        await supabaseAdmin
          .from('sent_emails')
          .update({
            resend_id: resendId,
            delivery_status: lastEvent,
            last_event: lastEvent,
          })
          .eq('id', matchingDb.id)
        matched++
      }
    }

    return NextResponse.json({
      resend_total: emailList.length,
      matched,
      db_total: dbEmails?.length || 0,
    })
  } catch (error) {
    console.error('Resend match error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(_POST, { limit: 30, windowSec: 60, route: 'email-resend-sync:POST' })
