import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Validates that the request comes from an authenticated user.
 * Returns the user object or a 401 NextResponse.
 */
export async function requireAuth() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  return { user, error: null }
}
