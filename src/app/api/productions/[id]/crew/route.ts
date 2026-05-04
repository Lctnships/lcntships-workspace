import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { workspaceDb } from '@/lib/supabase/workspace'
import { requireAuth } from '@/lib/api-auth'

const createSchema = z.object({
  team_member_id: z.string().uuid().optional().nullable(),
  email: z.string().email().optional().nullable(),
  name: z.string().min(1).max(120),
  role: z.string().max(120).optional().nullable(),
  confirmed: z.boolean().optional(),
})

const updateSchema = z.object({
  role: z.string().max(120).nullable().optional(),
  confirmed: z.boolean().optional(),
})

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { id } = await context.params
  const parsed = createSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { data, error: dbError } = await workspaceDb
    .from('production_crew')
    .insert({ production_id: id, ...parsed.data })
    .select()
    .single()

  if (dbError) return NextResponse.json({ error: 'Failed' }, { status: 500 })

  await workspaceDb
    .from('production_activities')
    .insert({
      production_id: id,
      actor_email: user?.email ?? null,
      action_type: 'crew_assigned',
      payload: { crew_id: data.id, name: parsed.data.name, role: parsed.data.role },
    })

  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth()
  if (error) return error
  const { id } = await context.params
  const crewId = req.nextUrl.searchParams.get('crewId')
  if (!crewId) return NextResponse.json({ error: 'crewId required' }, { status: 400 })
  const parsed = updateSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { data, error: dbError } = await workspaceDb
    .from('production_crew')
    .update(parsed.data)
    .eq('production_id', id)
    .eq('id', crewId)
    .select()
    .single()

  if (dbError) return NextResponse.json({ error: 'Failed' }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth()
  if (error) return error
  const { id } = await context.params
  const crewId = req.nextUrl.searchParams.get('crewId')
  if (!crewId) return NextResponse.json({ error: 'crewId required' }, { status: 400 })

  const { error: dbError } = await workspaceDb
    .from('production_crew')
    .delete()
    .eq('production_id', id)
    .eq('id', crewId)

  if (dbError) return NextResponse.json({ error: 'Failed' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
