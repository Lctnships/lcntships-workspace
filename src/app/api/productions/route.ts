import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { z } from 'zod'
import { workspaceDb } from '@/lib/supabase/workspace'
import { requireAuth } from '@/lib/api-auth'

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  proposed_dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1).max(20),
})

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error

  const { data, error: dbError } = await workspaceDb
    .from('productions')
    .select('id, title, description, location, proposed_dates, share_token, status, final_date, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (dbError) {
    console.error('productions GET', dbError)
    return NextResponse.json({ error: 'Failed to load productions' }, { status: 500 })
  }
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 })
  }

  const share_token = randomBytes(18).toString('base64url')

  const { data, error: dbError } = await workspaceDb
    .from('productions')
    .insert({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      location: parsed.data.location ?? null,
      proposed_dates: parsed.data.proposed_dates,
      share_token,
      created_by: user!.id,
    })
    .select('id, title, description, location, proposed_dates, share_token, status, final_date, created_at, updated_at')
    .single()

  if (dbError) {
    console.error('productions POST', dbError)
    return NextResponse.json({ error: 'Failed to create production' }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
