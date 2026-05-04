import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { workspaceDb } from '@/lib/supabase/workspace'
import { requireAuth } from '@/lib/api-auth'

const createSchema = z.object({
  body: z.string().min(1).max(5000),
  author_name: z.string().max(120).optional().nullable(),
})

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { id } = await context.params
  const parsed = createSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { data, error: dbError } = await workspaceDb
    .from('production_notes')
    .insert({
      production_id: id,
      author_email: user?.email ?? null,
      author_name: parsed.data.author_name ?? null,
      body: parsed.data.body,
    })
    .select()
    .single()

  if (dbError) return NextResponse.json({ error: 'Failed' }, { status: 500 })

  await workspaceDb
    .from('production_activities')
    .insert({
      production_id: id,
      actor_email: user?.email ?? null,
      action_type: 'note_added',
      payload: { note_id: data.id },
    })

  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth()
  if (error) return error
  const { id } = await context.params
  const noteId = req.nextUrl.searchParams.get('noteId')
  if (!noteId) return NextResponse.json({ error: 'noteId required' }, { status: 400 })

  const { error: dbError } = await workspaceDb
    .from('production_notes')
    .delete()
    .eq('production_id', id)
    .eq('id', noteId)

  if (dbError) return NextResponse.json({ error: 'Failed' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
