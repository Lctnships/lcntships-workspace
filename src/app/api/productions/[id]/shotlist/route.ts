import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { workspaceDb } from '@/lib/supabase/workspace'
import { requireAuth } from '@/lib/api-auth'

const createSchema = z.object({
  description: z.string().min(1).max(500),
  shot_number: z.number().int().min(0).max(9999).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
})

const updateSchema = z.object({
  description: z.string().min(1).max(500).optional(),
  shot_number: z.number().int().min(0).max(9999).nullable().optional(),
  location: z.string().max(200).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  done: z.boolean().optional(),
  sort_order: z.number().int().optional(),
})

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth()
  if (error) return error
  const { id } = await context.params
  const parsed = createSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { data: existing } = await workspaceDb
    .from('production_shotlist')
    .select('sort_order')
    .eq('production_id', id)
    .order('sort_order', { ascending: false })
    .limit(1)
  const nextSort = (existing?.[0]?.sort_order ?? -1) + 1

  const { data, error: dbError } = await workspaceDb
    .from('production_shotlist')
    .insert({ production_id: id, ...parsed.data, sort_order: nextSort })
    .select()
    .single()

  if (dbError) return NextResponse.json({ error: 'Failed' }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth()
  if (error) return error
  const { id } = await context.params
  const shotId = req.nextUrl.searchParams.get('shotId')
  if (!shotId) return NextResponse.json({ error: 'shotId required' }, { status: 400 })
  const parsed = updateSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { data, error: dbError } = await workspaceDb
    .from('production_shotlist')
    .update(parsed.data)
    .eq('production_id', id)
    .eq('id', shotId)
    .select()
    .single()

  if (dbError) return NextResponse.json({ error: 'Failed' }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth()
  if (error) return error
  const { id } = await context.params
  const shotId = req.nextUrl.searchParams.get('shotId')
  if (!shotId) return NextResponse.json({ error: 'shotId required' }, { status: 400 })

  const { error: dbError } = await workspaceDb
    .from('production_shotlist')
    .delete()
    .eq('production_id', id)
    .eq('id', shotId)

  if (dbError) return NextResponse.json({ error: 'Failed' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
