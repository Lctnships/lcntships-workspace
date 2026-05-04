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

  const [
    { data: production, error: pErr },
    { data: votes, error: vErr },
    { data: notes },
    { data: crew },
    { data: gear },
    { data: shotlist },
    { data: activities },
  ] = await Promise.all([
    workspaceDb
      .from('productions')
      .select('id, title, description, location, proposed_dates, share_token, status, final_date, deadline, lead_id, created_at, updated_at')
      .eq('id', id)
      .single(),
    workspaceDb
      .from('production_votes')
      .select('id, voter_name, available_dates, note, created_at')
      .eq('production_id', id)
      .order('created_at', { ascending: false }),
    workspaceDb
      .from('production_notes')
      .select('id, author_email, author_name, body, created_at, updated_at')
      .eq('production_id', id)
      .order('created_at', { ascending: false }),
    workspaceDb
      .from('production_crew')
      .select('id, team_member_id, email, name, role, confirmed, created_at')
      .eq('production_id', id)
      .order('created_at', { ascending: true }),
    workspaceDb
      .from('production_gear')
      .select('id, name, category, quantity, notes, checked, sort_order, created_at')
      .eq('production_id', id)
      .order('sort_order', { ascending: true }),
    workspaceDb
      .from('production_shotlist')
      .select('id, shot_number, description, location, notes, done, sort_order, created_at')
      .eq('production_id', id)
      .order('sort_order', { ascending: true }),
    workspaceDb
      .from('production_activities')
      .select('id, actor_email, actor_name, action_type, payload, created_at')
      .eq('production_id', id)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  if (pErr || !production) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (vErr) {
    console.error('votes GET', vErr)
  }
  return NextResponse.json({
    production,
    votes: votes ?? [],
    notes: notes ?? [],
    crew: crew ?? [],
    gear: gear ?? [],
    shotlist: shotlist ?? [],
    activities: activities ?? [],
  })
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { id } = await context.params

  const body = await req.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { data: before } = await workspaceDb
    .from('productions')
    .select('final_date, status, deadline')
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

  // Activity logging
  const actor_email = user?.email ?? null
  const activities: Array<{ action_type: string; payload: Record<string, unknown> }> = []
  if (parsed.data.status && before?.status !== parsed.data.status) {
    activities.push({ action_type: 'status_changed', payload: { from: before?.status, to: parsed.data.status } })
  }
  if ('final_date' in parsed.data && before?.final_date !== parsed.data.final_date) {
    activities.push({
      action_type: parsed.data.final_date ? 'final_date_set' : 'final_date_cleared',
      payload: { from: before?.final_date, to: parsed.data.final_date },
    })
  }
  if ('deadline' in parsed.data && before?.deadline !== parsed.data.deadline) {
    activities.push({ action_type: 'deadline_changed', payload: { from: before?.deadline, to: parsed.data.deadline } })
  }
  if (activities.length > 0) {
    await workspaceDb
      .from('production_activities')
      .insert(activities.map((a) => ({ production_id: id, actor_email, ...a })))
      .then(() => {})
  }

  // Fire-and-forget notify when final_date is newly set or changed
  if (
    parsed.data.final_date &&
    before?.final_date !== parsed.data.final_date
  ) {
    notifyFinalDate(id).catch((e) => console.error('notify final date', e))

    // Sync final_date → gekoppelde content_briefs.shoot_date
    await workspaceDb
      .from('content_briefs')
      .update({ shoot_date: parsed.data.final_date })
      .eq('production_id', id)
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
