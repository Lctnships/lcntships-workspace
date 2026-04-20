import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/api-auth'
import { workspaceDb } from '@/lib/supabase/workspace'

const QuerySchema = z.object({
  status: z.enum(['pending', 'sending', 'sent', 'failed', 'cancelled', 'all']).optional(),
  limit: z.number().int().positive().max(200).optional(),
})

export async function GET(req: NextRequest) {
  const { error: authErr } = await requireAuth()
  if (authErr) return authErr

  const url = new URL(req.url)
  const parsed = QuerySchema.safeParse({
    status: url.searchParams.get('status') ?? undefined,
    limit: url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : undefined,
  })
  if (!parsed.success) return NextResponse.json({ error: 'bad query' }, { status: 400 })
  const { status, limit = 50 } = parsed.data

  let query = workspaceDb
    .from('email_outbox')
    .select('id, status, source, to_email, from_email, subject, attempts, max_attempts, last_error, resend_id, created_at, sent_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status && status !== 'all') query = query.eq('status', status)

  const { data, error } = await query
  if (error) {
    console.error('outbox list', error)
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 })
  }
  return NextResponse.json({ items: data ?? [] })
}
