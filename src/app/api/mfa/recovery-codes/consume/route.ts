import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { workspaceDb } from '@/lib/supabase/workspace'
import { requireAuth } from '@/lib/api-auth'
import { codesMatch } from '@/lib/recovery-codes'

const schema = z.object({
  code: z.string().min(6).max(32),
})

/**
 * Consume a recovery code. On success, removes ALL TOTP factors for the user,
 * which forces them back to the enroll flow to set up a new authenticator.
 * This is intentional: recovery code = "I lost my phone, let me re-pair".
 */
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ongeldige code' }, { status: 400 })
  }

  const { data: codes, error: fetchErr } = await workspaceDb
    .from('mfa_recovery_codes')
    .select('id, code_hash')
    .eq('user_id', user!.id)
    .is('consumed_at', null)

  if (fetchErr || !codes) {
    return NextResponse.json({ error: 'Kon niet verifiëren' }, { status: 500 })
  }

  const match = codes.find((c) => codesMatch(parsed.data.code, c.code_hash))
  if (!match) {
    return NextResponse.json({ error: 'Ongeldige of al gebruikte code' }, { status: 401 })
  }

  // Mark the code as consumed
  const { error: updErr } = await workspaceDb
    .from('mfa_recovery_codes')
    .update({ consumed_at: new Date().toISOString() })
    .eq('id', match.id)

  if (updErr) {
    console.error('recovery consume update', updErr)
    return NextResponse.json({ error: 'Kon niet bijwerken' }, { status: 500 })
  }

  // Remove all TOTP factors so the user must re-enroll a fresh device
  try {
    const { data: factorsList } = await workspaceDb.auth.admin.mfa.listFactors({ userId: user!.id })
    const factors = factorsList?.factors ?? []
    for (const f of factors) {
      await workspaceDb.auth.admin.mfa.deleteFactor({ userId: user!.id, id: f.id })
    }
  } catch (e) {
    console.error('admin deleteFactor', e)
    return NextResponse.json({ error: 'Kon factor niet resetten' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
