import { NextResponse } from 'next/server'
import { workspaceDb } from '@/lib/supabase/workspace'
import { requireAuth } from '@/lib/api-auth'
import { generateRecoveryCodes } from '@/lib/recovery-codes'

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error

  const { count, error: dbError } = await workspaceDb
    .from('mfa_recovery_codes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user!.id)
    .is('consumed_at', null)

  if (dbError) {
    console.error('recovery-codes GET', dbError)
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 })
  }
  return NextResponse.json({ remaining: count ?? 0 })
}

export async function POST() {
  const { user, error } = await requireAuth()
  if (error) return error

  // Invalidate any previous codes
  await workspaceDb.from('mfa_recovery_codes').delete().eq('user_id', user!.id)

  const { plaintext, hashes } = generateRecoveryCodes()

  const { error: dbError } = await workspaceDb.from('mfa_recovery_codes').insert(
    hashes.map((h) => ({ user_id: user!.id, code_hash: h })),
  )
  if (dbError) {
    console.error('recovery-codes POST', dbError)
    return NextResponse.json({ error: 'Failed to generate' }, { status: 500 })
  }
  return NextResponse.json({ codes: plaintext })
}
