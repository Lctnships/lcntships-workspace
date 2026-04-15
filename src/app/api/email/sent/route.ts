import { NextResponse } from 'next/server'
import { workspaceDb } from '@/lib/supabase/workspace'
import { requireAuth } from '@/lib/api-auth'

// LCN-008 — this route only reads via workspaceDb (service-role to the
// workspace project). The previous public-anon fallback was unused and is
// removed so a missing service-role key cannot silently downgrade access.

interface SentEmailRow {
  id: string
  lead_id: string | null
  subject: string | null
  body: string | null
  sent_at: string | null
  status: string | null
  resend_id: string | null
  delivery_status: string | null
  last_event: string | null
  to_email: string | null
  to_name: string | null
  from_email: string | null
  from_name: string | null
}

interface LeadLite {
  id: string
  email: string | null
  company_name: string | null
  contact_name: string | null
}

export async function GET() {
  const { error: __authError } = await requireAuth()
  if (__authError) return __authError

  try {
    // Pull from our DB so we always have the body + full context
    const { data: rows, error } = await workspaceDb
      .from('sent_emails')
      .select('id, lead_id, subject, body, sent_at, status, resend_id, delivery_status, last_event, to_email, to_name, from_email, from_name')
      .order('sent_at', { ascending: false })
      .limit(200)

    if (error) {
      console.error('[SENT ROUTE] supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const sentRows = (rows || []) as SentEmailRow[]

    // Fallback: if to_email is missing (legacy rows), join with sales_leads
    const leadIds = Array.from(
      new Set(sentRows.filter(r => !r.to_email && r.lead_id).map(r => r.lead_id as string))
    )

    const leadMap = new Map<string, LeadLite>()
    if (leadIds.length > 0) {
      const { data: leads } = await workspaceDb
        .from('sales_leads')
        .select('id, email, company_name, contact_name')
        .in('id', leadIds)
      if (leads) {
        for (const l of leads as LeadLite[]) leadMap.set(l.id, l)
      }
    }

    const emails = sentRows.map(r => {
      const lead = r.lead_id ? leadMap.get(r.lead_id) : undefined
      const toEmail = r.to_email || lead?.email || ''
      const toName = r.to_name || lead?.contact_name || lead?.company_name || ''
      const fromEmail = r.from_email || 'rivaldomacandrew@lctnships.com'
      const fromName = r.from_name || 'lcntships'

      return {
        id: r.id,
        subject: r.subject || '(geen onderwerp)',
        from: { name: fromName, email: fromEmail },
        to: [{ name: toName, email: toEmail }],
        date: r.sent_at,
        body: r.body || '',
        html: r.body || '',
        preview: stripHtml(r.body || '').slice(0, 140),
        isRead: true,
        isStarred: false,
        folder: 'sent' as const,
        status: r.last_event || r.delivery_status || r.status || 'sent',
      }
    })

    return NextResponse.json({ emails })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Onbekende fout'
    console.error('[SENT ROUTE] error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}
