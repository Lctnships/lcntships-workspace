import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

export async function POST(request: NextRequest) {
  try {
    const { email, full_name, role } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is verplicht' }, { status: 400 })
    }

    // Use service role key if available, otherwise anon key
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, key)

    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      // Admin flow: create user directly with confirmed email
      const tempPassword = `Welcome${Date.now()}!`
      const { data: { user }, error: createError } = await supabase.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: full_name || email.split('@')[0] },
      })

      if (createError) {
        if (createError.message?.includes('already been registered')) {
          return NextResponse.json({ error: 'Dit emailadres is al geregistreerd' }, { status: 409 })
        }
        return NextResponse.json({ error: createError.message }, { status: 500 })
      }

      // Store in team_members
      if (user) {
        await supabase.from('team_members').upsert({
          user_id: user.id,
          email,
          full_name: full_name || null,
          role: role || 'member',
        }, { onConflict: 'user_id' })

        // Send password reset so they can set their own password
        await supabase.auth.admin.generateLink({ type: 'recovery', email })
      }

      return NextResponse.json({
        success: true,
        message: `Account aangemaakt voor ${email}. Ze kunnen inloggen met een tijdelijk wachtwoord.`,
        tempPassword,
      })
    } else {
      // Non-admin flow: use signUp (sends confirmation email)
      const tempPassword = `Welcome${Date.now()}!`
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password: tempPassword,
        options: {
          data: { full_name: full_name || email.split('@')[0] },
        },
      })

      if (signUpError) {
        return NextResponse.json({ error: signUpError.message }, { status: 500 })
      }

      // Store in team_members table
      if (data?.user) {
        await supabase.from('team_members').upsert({
          user_id: data.user.id,
          email,
          full_name: full_name || null,
          role: role || 'member',
        }, { onConflict: 'user_id' })
      }

      return NextResponse.json({
        success: true,
        message: `Uitnodiging verstuurd naar ${email}. Ze ontvangen een bevestigingsmail.`,
        tempPassword,
      })
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
