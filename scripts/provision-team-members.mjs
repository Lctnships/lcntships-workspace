/**
 * Provision team members with confirmed accounts and set passwords.
 * Run once: node scripts/provision-team-members.mjs
 *
 * Uses service role keys from .env.local (or env vars).
 * Safe to re-run — existing users get their password reset.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.local if present
try {
  const env = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8')
  for (const line of env.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx).trim()
    const val = trimmed.slice(idx + 1).trim()
    if (!process.env[key]) process.env[key] = val
  }
} catch {
  // running in CI with env vars injected — fine
}

const PUBLIC_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const PUBLIC_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const WORKSPACE_URL = process.env.WORKSPACE_SUPABASE_URL
const WORKSPACE_SERVICE = process.env.WORKSPACE_SUPABASE_SERVICE_ROLE_KEY

if (!PUBLIC_URL || !PUBLIC_SERVICE || !WORKSPACE_URL || !WORKSPACE_SERVICE) {
  console.error('Missing required env vars. Check .env.local.')
  process.exit(1)
}

const pub = createClient(PUBLIC_URL, PUBLIC_SERVICE, { auth: { persistSession: false } })
const ws = createClient(WORKSPACE_URL, WORKSPACE_SERVICE, { auth: { persistSession: false } })

const MEMBERS = [
  { email: 'ferry@lctnships.com',   password: 'Ferry123',   full_name: 'Ferry',   role: 'member' },
  { email: 'raphiel@lctnships.com', password: 'Raphiel123', full_name: 'Raphiel', role: 'member' },
]

for (const member of MEMBERS) {
  console.log(`\nProvisioning ${member.email}...`)

  const { data: { users }, error: listError } = await pub.auth.admin.listUsers()
  if (listError) { console.error('listUsers error:', listError.message); process.exit(1) }

  const existing = users.find(u => u.email === member.email)

  let userId
  if (!existing) {
    // User doesn't exist — create with email_confirm: true so no magic link needed
    const { data, error } = await pub.auth.admin.createUser({
      email: member.email,
      password: member.password,
      email_confirm: true,
      user_metadata: { full_name: member.full_name },
    })
    if (error) { console.error('createUser error:', error.message); process.exit(1) }
    userId = data.user.id
    console.log(`  created  → ${userId}`)
  } else {
    // User exists — reset password and confirm email in case it was pending
    const { error } = await pub.auth.admin.updateUserById(existing.id, {
      password: member.password,
      email_confirm: true,
    })
    if (error) { console.error('updateUser error:', error.message); process.exit(1) }
    userId = existing.id
    const wasConfirmed = !!existing.email_confirmed_at
    console.log(`  exists   → ${userId} (email was ${wasConfirmed ? 'confirmed' : 'NOT confirmed — now fixed'})`)
  }

  // Mirror in workspace team_members
  const { error: upsertError } = await ws.from('team_members').upsert(
    { user_id: userId, email: member.email, full_name: member.full_name, role: member.role },
    { onConflict: 'user_id' }
  )
  if (upsertError) {
    console.warn(`  team_members upsert warning: ${upsertError.message}`)
  } else {
    console.log(`  team_members upserted as role="${member.role}"`)
  }
}

console.log('\n✅ Done. Both users can now log in.')
