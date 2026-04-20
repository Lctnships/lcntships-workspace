import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { workspaceDb } from '@/lib/supabase/workspace'
import { requireAuth } from '@/lib/api-auth'
import { notifyFinalDate } from '@/lib/production-notify'

const updateSchema = z.object({
  status: z.enum(['open', 'closed']).optional(),
  final_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  deadline: z.string().datetime().nullable().optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  location: z.string().max(200).nullable().optional(),
})

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth()
  if (error) return error
  const { id } = await context.params

  const [{ data: production, error: pErr }, { data: votes, error: vErr }] = await Promise.all([
    workspaceDb
      .from('productions')
      .select('id, title, description, location, proposed_dates, share_token, status, final_date, deadline, created_at, updated_at')
      .eq('id', id)
      .single(),
    workspaceDb
      .from('production_votes')
      .select('id, voter_name, available_dates, note, created_at')
      .eq('production_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (pErr || !production) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (vErr) {
    console.error('votes GET', vErr)
  }
  return NextResponse.json({ production, votes: votes ?? [] })
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth()
  if (error) return error
  const { id } = await context.params

  const body = await req.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { data: before } = await workspaceDb
    .from('productions')
    .select('final_date')
    .eq('id', id)
    .single()

  const { data, error: dbError } = await workspaceDb
    .from('productions')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (dbError) {
    console.error('production PATCH', dbError)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }

  // Fire-and-forget notify when final_date is newly set or changed
  if (
    parsed.data.final_date &&
    before?.final_date !== parsed.data.final_date
  ) {
    notifyFinalDate(id).catch((e) => console.error('notify final date', e))
  }

  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth()
  if (error) return error
  const { id } = await context.params

  const { error: dbError } = await workspaceDb.from('productions').delete().eq('id', id)
  if (dbError) {
    console.error('production DELETE', dbError)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
