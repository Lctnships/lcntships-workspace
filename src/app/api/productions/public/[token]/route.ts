import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { workspaceDb } from '@/lib/supabase/workspace'

const voteSchema = z.object({
  voter_name: z.string().min(1).max(100).trim(),
  voter_email: z.string().email().max(320).optional().nullable(),
  available_dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1).max(20),
  note: z.string().max(500).optional().nullable(),
})

async function getProductionByToken(token: string) {
  return workspaceDb
    .from('productions')
    .select('id, title, description, location, proposed_dates, status, final_date, deadline')
    .eq('share_token', token)
    .single()
}

function isExpired(deadline: string | null): boolean {
  if (!deadline) return false
  return new Date(deadline).getTime() < Date.now()
}

export async function GET(_req: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params
  const { data, error } = await getProductionByToken(token)
  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Auto-close if deadline passed and still open
  if (data.status === 'open' && isExpired(data.deadline)) {
    await workspaceDb.from('productions').update({ status: 'closed' }).eq('id', data.id)
    data.status = 'closed'
  }

  return NextResponse.json(data)
}

export async function POST(req: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params
  const body = await req.json().catch(() => null)
  const parsed = voteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ongeldige invoer' }, { status: 400 })
  }

  const { data: production, error: pErr } = await getProductionByToken(token)
  if (pErr || !production) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (production.status !== 'open' || isExpired(production.deadline)) {
    if (isExpired(production.deadline)) {
      await workspaceDb.from('productions').update({ status: 'closed' }).eq('id', production.id)
    }
    return NextResponse.json({ error: 'Deze poll is gesloten' }, { status: 403 })
  }

  const proposed = new Set(production.proposed_dates as string[])
  const invalid = parsed.data.available_dates.filter((d) => !proposed.has(d))
  if (invalid.length > 0) {
    return NextResponse.json({ error: 'Ongeldige datum(s) geselecteerd' }, { status: 400 })
  }

  const { error: dbError } = await workspaceDb.from('production_votes').insert({
    production_id: production.id,
    voter_name: parsed.data.voter_name,
    voter_email: parsed.data.voter_email ?? null,
    available_dates: parsed.data.available_dates,
    note: parsed.data.note ?? null,
  })

  if (dbError) {
    // Unique index (production_id, lower(voter_name)) violation
    if (dbError.code === '23505') {
      return NextResponse.json(
        { error: 'Er is al een stem met deze naam. Gebruik een andere naam of vraag de organisator om jouw vorige stem te verwijderen.', duplicate: true },
        { status: 409 },
      )
    }
    console.error('public vote POST', dbError)
    return NextResponse.json({ error: 'Kon niet opslaan' }, { status: 500 })
  }
  return NextResponse.json({ ok: true }, { status: 201 })
}
