#!/usr/bin/env node
// Migrate sales tables from public DB → workspace DB
// Run: node scripts/migrate-sales-data.mjs

import { createClient } from '@supabase/supabase-js'

const SOURCE_URL = 'https://ytmkmiofoluespwysfxa.supabase.co'
const SOURCE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0bWttaW9mb2x1ZXNwd3lzZnhhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTAzMzA1NCwiZXhwIjoyMDgwNjA5MDU0fQ.bU59oH1flj_wh1p1ofJ2A1D_Km52lq6igmJEJv3Ph3c'

const TARGET_URL = 'https://xiuplzawiionroxgwvsa.supabase.co'
const TARGET_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpdXBsemF3aWlvbnJveGd3dnNhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjA4NjY2NiwiZXhwIjoyMDkxNjYyNjY2fQ.B_eH2v-8aWgUN3wECjQsgwPnRGDU8uIjQ-A1FV_hXtg'

const src = createClient(SOURCE_URL, SOURCE_KEY, { auth: { persistSession: false } })
const dst = createClient(TARGET_URL, TARGET_KEY, { auth: { persistSession: false } })

// Order matters due to FKs
const TABLES = [
  // batch 1
  'sales_leads', 'lead_contacts', 'lead_activities', 'sales_agenda',
  'leads', 'search_history', 'serpapi_usage',
  // batch 2
  'customers', 'team_members',
  'email_accounts', 'email_templates', 'email_sequences',
  'sequence_emails', 'sequence_enrollments', 'sequence_email_logs',
  'emails', 'email_tracking', 'sent_emails',
  // batch 3
  'processed_webhook_events',
  'briefings', 'briefing_responses',
  'upload_links', 'uploaded_files',
  'content_templates', 'content_briefs',
  'portfolio_items',
]

const PK = { processed_webhook_events: 'stripe_event_id' }

async function migrateTable(table) {
  process.stdout.write(`→ ${table}: `)

  // Fetch all rows from source
  const { data, error } = await src.from(table).select('*')
  if (error) { console.error('FETCH ERROR', error); return }
  if (!data || data.length === 0) { console.log('empty'); return }

  const conflictCol = PK[table] || 'id'

  // Upsert in chunks of 100 (idempotent — safe to re-run)
  const CHUNK = 100
  let inserted = 0
  for (let i = 0; i < data.length; i += CHUNK) {
    const chunk = data.slice(i, i + CHUNK)
    const { error: insErr } = await dst.from(table).upsert(chunk, { onConflict: conflictCol })
    if (insErr) {
      console.error(`\nINSERT ERROR at offset ${i}:`, insErr)
      return
    }
    inserted += chunk.length
  }

  console.log(`${inserted}/${data.length} rows migrated`)
}

for (const t of TABLES) {
  await migrateTable(t)
}

console.log('\n✅ Migration complete')
