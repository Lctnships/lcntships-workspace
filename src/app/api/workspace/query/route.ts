// Generic proxy to the Workspace DB.
// All workspace table CRUD flows through here.
// Auth: requires a valid Supabase session on the public DB.
// (Optional stricter check: also verify team_members membership.)
import { NextRequest, NextResponse } from 'next/server'
import { workspaceDb } from '@/lib/supabase/workspace'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_TABLES = new Set([
  // batch 1 (sales)
  'sales_leads', 'lead_contacts', 'lead_activities',
  'leads', 'sales_agenda', 'search_history', 'serpapi_usage',
  // batch 2 (email / customers / team)
  'customers', 'team_members',
  'email_accounts', 'email_templates', 'email_sequences',
  'sequence_emails', 'sequence_enrollments', 'sequence_email_logs',
  'emails', 'email_tracking', 'sent_emails',
  // batch 3 (briefings / uploads / content / portfolio)
  'processed_webhook_events',
  'briefings', 'briefing_responses',
  'upload_links', 'uploaded_files',
  'content_briefs', 'content_templates',
  'portfolio_items',
])

type Filter = { col: string; op: string; val: unknown }

interface QueryBody {
  table: string
  op: 'select' | 'insert' | 'update' | 'delete' | 'upsert'
  columns?: string
  values?: unknown
  filters?: Filter[]
  order?: { col: string; ascending?: boolean }
  limit?: number
  single?: boolean
  maybeSingle?: boolean
  returning?: boolean
}

export async function POST(req: NextRequest) {
  try {
    // Auth: must be logged in on the public Supabase
    const auth = await createClient()
    const { data: { user } } = await auth.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json()) as QueryBody
    if (!body.table || !ALLOWED_TABLES.has(body.table)) {
      return NextResponse.json({ error: 'Invalid table' }, { status: 400 })
    }

    let q: ReturnType<typeof workspaceDb.from> | any = workspaceDb.from(body.table)

    switch (body.op) {
      case 'select':
        q = q.select(body.columns || '*')
        break
      case 'insert':
        q = q.insert(body.values as object)
        if (body.returning !== false) q = q.select()
        break
      case 'update':
        q = q.update(body.values as object)
        break
      case 'delete':
        q = q.delete()
        break
      case 'upsert':
        q = q.upsert(body.values as object)
        if (body.returning !== false) q = q.select()
        break
      default:
        return NextResponse.json({ error: 'Invalid op' }, { status: 400 })
    }

    for (const f of body.filters || []) {
      switch (f.op) {
        case 'eq': q = q.eq(f.col, f.val); break
        case 'neq': q = q.neq(f.col, f.val); break
        case 'in': q = q.in(f.col, f.val as unknown[]); break
        case 'is': q = q.is(f.col, f.val); break
        case 'not': q = q.not(f.col, 'is', f.val); break
        case 'gte': q = q.gte(f.col, f.val); break
        case 'lte': q = q.lte(f.col, f.val); break
        case 'ilike': q = q.ilike(f.col, String(f.val)); break
      }
    }

    if (body.order) q = q.order(body.order.col, { ascending: body.order.ascending ?? true })
    if (body.limit) q = q.limit(body.limit)
    if (body.single) q = q.single()
    if (body.maybeSingle) q = q.maybeSingle()

    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ data })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
