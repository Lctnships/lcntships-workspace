// Workspace DB client — SERVER-ONLY.
// This DB is locked to service_role. NEVER import from Client Components.
// Access is gated by API routes that first authenticate via the public DB.

import { createClient } from '@supabase/supabase-js'

const url = process.env.WORKSPACE_SUPABASE_URL
const key = process.env.WORKSPACE_SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  throw new Error('Missing WORKSPACE_SUPABASE_URL or WORKSPACE_SUPABASE_SERVICE_ROLE_KEY')
}

export const workspaceDb = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
})
