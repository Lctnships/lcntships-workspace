import { createClient } from '@supabase/supabase-js'

const PUBLIC_URL = 'https://ytmkmiofoluespwysfxa.supabase.co'
const PUBLIC_SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0bWttaW9mb2x1ZXNwd3lzZnhhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTAzMzA1NCwiZXhwIjoyMDgwNjA5MDU0fQ.bU59oH1flj_wh1p1ofJ2A1D_Km52lq6igmJEJv3Ph3c'

const WORKSPACE_URL = 'https://xiuplzawiionroxgwvsa.supabase.co'
const WORKSPACE_SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpdXBsemF3aWlvbnJveGd3dnNhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjA4NjY2NiwiZXhwIjoyMDkxNjYyNjY2fQ.B_eH2v-8aWgUN3wECjQsgwPnRGDU8uIjQ-A1FV_hXtg'

const EMAIL = 'playwright-test@lctnships.com'
const PASSWORD = 'TestPassword123!'

const pub = createClient(PUBLIC_URL, PUBLIC_SERVICE, { auth: { persistSession: false } })
const ws = createClient(WORKSPACE_URL, WORKSPACE_SERVICE, { auth: { persistSession: false } })

const { data: { users } } = await pub.auth.admin.listUsers()
let user = users.find(u => u.email === EMAIL)
if (!user) {
  const { data, error } = await pub.auth.admin.createUser({
    email: EMAIL, password: PASSWORD, email_confirm: true,
    user_metadata: { full_name: 'Playwright Test' },
  })
  if (error) { console.error(error); process.exit(1) }
  user = data.user
  console.log('created user', user.id)
} else {
  await pub.auth.admin.updateUserById(user.id, { password: PASSWORD })
  console.log('user exists, password reset', user.id)
}

await ws.from('team_members').upsert({
  user_id: user.id, email: EMAIL, full_name: 'Playwright Test', role: 'admin',
}, { onConflict: 'user_id' })

console.log(`\n✅ ready\nemail:    ${EMAIL}\npassword: ${PASSWORD}`)
