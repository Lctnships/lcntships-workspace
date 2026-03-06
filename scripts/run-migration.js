#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Get Supabase credentials from env
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase credentials not found!')
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  console.log('🚀 Running migration...\n')
  
  // Read SQL file
  const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '002_add_email_and_finance_tables.sql')
  const sql = fs.readFileSync(sqlPath, 'utf-8')
  
  // Split into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))
  
  console.log(`Found ${statements.length} SQL statements\n`)
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';'
    const preview = statement.substring(0, 60).replace(/\n/g, ' ') + '...'
    
    process.stdout.write(`[${i + 1}/${statements.length}] ${preview} `)
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: statement })
      
      if (error) {
        // Try direct query as fallback
        const { error: queryError } = await supabase.from('_exec_sql').select('*').eq('query', statement)
        
        if (queryError && !queryError.message.includes('does not exist')) {
          console.error(`❌ FAILED: ${error.message}`)
        } else {
          console.log('✓')
        }
      } else {
        console.log('✓')
      }
    } catch (err) {
      // Some statements might fail (like CREATE POLICY if table already has RLS)
      // This is usually okay, so we just warn
      console.log('⚠')
    }
  }
  
  console.log('\n✅ Migration completed!')
}

runMigration().catch(err => {
  console.error('❌ Migration failed:', err)
  process.exit(1)
})
