import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { workspaceDb } from '@/lib/supabase/workspace'
import { parseJson } from '@/lib/api-validate'

const InviteBody = z.object({
  email: z.string().max(320).optional(),
  full_name: z.string().max(200).optional(),
  role: z.string().max(64).optional(),
}).passthrough()

/**
 * POST /api/team/invite
 *
 * LCN-002 — admin-only invite endpoint.
 *
 * Security guarantees:
 *   1. Caller must be authenticated (middleware enforces this on /api/*; we
 *      also re-check here for defense-in-depth).
 *   2. Caller must have role='admin' in team_members.
 *   3. Service-role key is required — no silent fallback to the anon key.
 *   4. Response NEVER contains a password. The invitee receives a
 *      Supabase invite-email with a magic link to set their own password.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticated?
    const supabaseServer = await createClient()
    const {
      data: { user: caller },
    } = await supabaseServer.auth.getUser()

    if (!caller) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Admin?
    const { data: callerMember, error: roleError } = await workspaceDb
      .from('team_members')
      .select('role')
      .eq('user_id', caller.id)
      .maybeSingle()

    if (roleError) {
      return NextResponse.json({ error: 'Could not verify caller role' }, { status: 500 })
    }

    if (!callerMember || callerMember.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden — admin role required' },
        { status: 403 }
      )
    }

    // 3. Validate payload
    const { data: body, error: __validationError } = await parseJson(request, InviteBody)
    if (__validationError) return __validationError
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : ''
    const requestedRole = typeof body.role === 'string' ? body.role : 'member'

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Geldig emailadres is verplicht' }, { status: 400 })
    }

    if (!['admin', 'member', 'viewer'].includes(requestedRole)) {
      return NextResponse.json({ error: 'Ongeldige rol' }, { status: 400 })
    }

    // 4. Service-role required — NO anon fallback for admin actions
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: 'Server misconfigured: SUPABASE_SERVICE_ROLE_KEY missing' },
        { status: 500 }
      )
    }

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey
    )

    // 5. Send Supabase invite email — user sets their own password via magic link
    const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/login`
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: { full_name: fullName || email.split('@')[0] },
        redirectTo,
      }
    )

    if (inviteError) {
      if (inviteError.message?.toLowerCase().includes('already')) {
        return NextResponse.json({ error: 'Dit emailadres is al geregistreerd' }, { status: 409 })
      }
      return NextResponse.json({ error: inviteError.message }, { status: 500 })
    }

    // 6. Mirror in team_members
    if (inviteData?.user) {
      await workspaceDb.from('team_members').upsert(
        {
          user_id: inviteData.user.id,
          email,
          full_name: fullName || null,
          role: requestedRole,
        },
        { onConflict: 'user_id' }
      )
    }

    // 7. Response — explicitly no password leakage
    return NextResponse.json({
      success: true,
      message: `Uitnodiging verstuurd naar ${email}. Ze ontvangen een email met een link om hun wachtwoord in te stellen.`,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
