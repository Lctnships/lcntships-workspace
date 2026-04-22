import { NextRequest, NextResponse } from 'next/server'
import { workspaceDb } from '@/lib/supabase/workspace'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params

  const { data: brief, error } = await workspaceDb
    .from('content_briefs')
    .select('id, title, studio_name, description, shoot_date, call_time, end_time, contact_person, contact_phone, shotlist, equipment, deliverables, notes, status')
    .eq('share_link', token)
    .single()

  if (error || !brief) {
    return NextResponse.json({ error: 'Brief niet gevonden' }, { status: 404 })
  }

  // Mark any pending shares with this token as opened (first view only)
  workspaceDb
    .from('brief_shares')
    .update({ opened_at: new Date().toISOString() })
    .eq('brief_id', brief.id)
    .is('opened_at', null)
    .then(({ error: upErr }) => {
      if (upErr) console.error('mark opened', upErr)
    })

  return NextResponse.json({ brief })
}
