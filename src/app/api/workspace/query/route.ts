// Generic proxy to the Workspace DB.
// All workspace table CRUD flows through here.
// Auth: requires a valid Supabase session on the public DB.
// (Optional stricter check: also verify team_members membership.)
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { workspaceDb } from '@/lib/supabase/workspace'
import { createClient } from '@/lib/supabase/server'
import { parseJson } from '@/lib/api-validate'
import { withRateLimit } from '@/lib/with-rate-limit'

const FilterSchema = z.object({
  col: z.string().max(64),
  op: z.string().max(16),
  val: z.unknown(),
})

const QuerySchema = z.object({
  table: z.string().max(64),
  op: z.enum(['select', 'insert', 'update', 'delete', 'upsert']),
  columns: z.string().max(2000).optional(),
  values: z.unknown().optional(),
  filters: z.array(FilterSchema).max(1000).optional(),
  order: z.object({
    col: z.string().max(64),
    ascending: z.boolean().optional(),
  }).optional(),
  limit: z.number().int().optional(),
  single: z.boolean().optional(),
  maybeSingle: z.boolean().optional(),
  returning: z.boolean().optional(),
}).passthrough()

const ALLOWED_TABLES = new Set([
  // batch 1 (sales)
  'sales_leads', 'lead_contacts', 'lead_activities',
  'leads', 'sales_agenda', 'search_history', 'serpapi_usage',
  // batch 2 (email / customers / team)
  'customers', 'team_members',
  'email_accounts', 'email_templates', 'email_sequences',
  'sequence_emails', 'sequence_enrollments', 'sequence_email_logs',
  'emails', 'email_tracking', 'sent_emails', 'email_outbox',
  'workspace_documents',
  // batch 3 (briefings / uploads / content / portfolio)
  'processed_webhook_events',
  'briefings', 'briefing_responses',
  'upload_links', 'uploaded_files',
  'content_briefs', 'content_templates',
  'portfolio_items',
  'marketing_posts',
  // batch 4 (productions detail)
  'crew_members',
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

async function _POST(req: NextRequest) {
  try {
    // Auth: must be logged in on the public Supabase
    const auth = await createClient()
    const { data: { user } } = await auth.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: parsed, error: __validationError } = await parseJson(req, QuerySchema)
    if (__validationError) return __validationError
    const body = parsed as QueryBody
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
        if (body.returning) q = q.select(body.columns || '*')
        break
      case 'delete':
        q = q.delete()
        if (body.returning) q = q.select(body.columns || '*')
        break
      case 'upsert':
        q = q.upsert(body.values as object)
        if (body.returning !== false) q = q.select(body.columns || '*')
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

export const POST = withRateLimit(_POST, { limit: 60, windowSec: 60, route: 'workspace-query:POST' })
