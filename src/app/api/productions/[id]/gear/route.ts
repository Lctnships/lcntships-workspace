import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { workspaceDb } from '@/lib/supabase/workspace'
import { requireAuth } from '@/lib/api-auth'

const createSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.enum(['equipment', 'prop', 'other']).default('equipment'),
  quantity: z.number().int().min(1).max(999).default(1),
  notes: z.string().max(500).optional().nullable(),
})

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  category: z.enum(['equipment', 'prop', 'other']).optional(),
  quantity: z.number().int().min(1).max(999).optional(),
  notes: z.string().max(500).nullable().optional(),
  checked: z.boolean().optional(),
  sort_order: z.number().int().optional(),
})

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { id } = await context.params
  const parsed = createSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { data: existing } = await workspaceDb
    .from('production_gear')
    .select('sort_order')
    .eq('production_id', id)
    .order('sort_order', { ascending: false })
    .limit(1)
  const nextSort = (existing?.[0]?.sort_order ?? -1) + 1

  const { data, error: dbError } = await workspaceDb
    .from('production_gear')
    .insert({ production_id: id, ...parsed.data, sort_order: nextSort })
    .select()
    .single()

  if (dbError) return NextResponse.json({ error: 'Failed' }, { status: 500 })

  await workspaceDb
    .from('production_activities')
    .insert({
      production_id: id,
      actor_email: user?.email ?? null,
      action_type: 'gear_added',
      payload: { gear_id: data.id, name: parsed.data.name, category: parsed.data.category },
    })

  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth()
  if (error) return error
  const { id } = await context.params
  const gearId = req.nextUrl.searchParams.get('gearId')
  if (!gearId) return NextResponse.json({ error: 'gearId required' }, { status: 400 })
  const parsed = updateSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { data, error: dbError } = await workspaceDb
    .from('production_gear')
    .update(parsed.data)
    .eq('production_id', id)
    .eq('id', gearId)
    .select()
    .single()

  if (dbError) return NextResponse.json({ error: 'Failed' }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth()
  if (error) return error
  const { id } = await context.params
  const gearId = req.nextUrl.searchParams.get('gearId')
  if (!gearId) return NextResponse.json({ error: 'gearId required' }, { status: 400 })

  const { error: dbError } = await workspaceDb
    .from('production_gear')
    .delete()
    .eq('production_id', id)
    .eq('id', gearId)

  if (dbError) return NextResponse.json({ error: 'Failed' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
