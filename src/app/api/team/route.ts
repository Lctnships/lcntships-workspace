import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET() {
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    // Try admin API first (requires service role key)
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { data: { users }, error } = await supabase.auth.admin.listUsers()
      if (!error) {
        const { data: roles } = await supabase.from('team_members').select('user_id, role, full_name')
        const roleMap = new Map((roles || []).map(r => [r.user_id, r]))

        const members = users.map(user => {
          const roleInfo = roleMap.get(user.id)
          return {
            id: user.id,
            email: user.email || '',
            full_name: roleInfo?.full_name || user.user_metadata?.full_name || null,
            role: roleInfo?.role || 'member',
            created_at: user.created_at,
            last_sign_in_at: user.last_sign_in_at,
          }
        })
        return NextResponse.json({ members })
      }
    }

    // Fallback: read from team_members table only
    const { data: members, error } = await supabase
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
