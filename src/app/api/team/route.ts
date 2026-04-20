import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { workspaceDb } from '@/lib/supabase/workspace'
import { requireAuth } from '@/lib/api-auth'

// LCN-008 — no anon fallback. Admin API requires the service-role key;
// if it isn't configured we skip straight to the table fallback rather
// than silently widening privileges with the public anon key.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function GET() {
  const { error: __authError } = await requireAuth()
  if (__authError) return __authError

  try {
    // Try admin API first — only when both URL and SERVICE ROLE are present.
    if (supabaseUrl && serviceRoleKey) {
      const supabase = createClient(supabaseUrl, serviceRoleKey)
      const { data: { users }, error } = await supabase.auth.admin.listUsers()
      if (!error) {
        const { data: roles } = await workspaceDb.from('team_members').select('user_id, role, full_name')
        const roleMap = new Map((roles || []).map(r => [r.user_id, r]))

        const userIds = users.map((u) => u.id)
        const { data: codesRows } = await workspaceDb
          .from('mfa_recovery_codes')
          .select('user_id')
          .in('user_id', userIds)
          .is('consumed_at', null)
        const recoveryCount = new Map<string, number>()
        for (const row of codesRows ?? []) {
          recoveryCount.set(row.user_id, (recoveryCount.get(row.user_id) ?? 0) + 1)
        }

        const mfaChecks = await Promise.all(
          users.map(async (u) => {
            try {
              const { data } = await supabase.auth.admin.mfa.listFactors({ userId: u.id })
              const hasVerified = (data?.factors ?? []).some((f) => f.status === 'verified')
              return [u.id, hasVerified] as const
            } catch {
              return [u.id, false] as const
            }
          }),
        )
        const mfaMap = new Map(mfaChecks)

        const members = users.map(user => {
          const roleInfo = roleMap.get(user.id)
          return {
            id: user.id,
            email: user.email || '',
            full_name: roleInfo?.full_name || user.user_metadata?.full_name || null,
            role: roleInfo?.role || 'member',
            created_at: user.created_at,
            last_sign_in_at: user.last_sign_in_at,
            mfa_enabled: mfaMap.get(user.id) ?? false,
            recovery_codes_remaining: recoveryCount.get(user.id) ?? 0,
          }
        })
        return NextResponse.json({ members })
      }
    }

    // Fallback: read from team_members table only
    const { data: members, error } = await workspaceDb
      .from('team_members')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      // Table might not exist yet - return empty
      return NextResponse.json({ members: [] })
    }

    return NextResponse.json({ members: members || [] })
  } catch {
    return NextResponse.json({ members: [] })
  }
}
