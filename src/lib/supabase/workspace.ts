// Workspace DB client — SERVER-ONLY.
// This DB is locked to service_role. NEVER import from Client Components.
// Access is gated by API routes that first authenticate via the public DB.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

export function getWorkspaceDb(): SupabaseClient {
  if (_client) return _client
  const url = process.env.WORKSPACE_SUPABASE_URL
  const key = process.env.WORKSPACE_SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing WORKSPACE_SUPABASE_URL or WORKSPACE_SUPABASE_SERVICE_ROLE_KEY')
  }
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return _client
}

export const workspaceDb = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getWorkspaceDb() as unknown as Record<string, unknown>)[prop as string]
  },
})
