import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface EmailAccountRow {
  id: string
  name: string
  email: string
  username: string | null
  password_encrypted: string
  imap_host: string
  imap_port: number
  smtp_host: string
  smtp_port: number
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ accounts: [] })
  }

  const { data, error } = await supabase
    .from('email_accounts' as never)
    .select('*')
    .eq('user_id' as never, user.id)
    .order('created_at' as never, { ascending: true })

  if (error) {
    console.error('[EMAIL ACCOUNTS]', error)
    return NextResponse.json({ accounts: [] })
  }

  const accounts = (data || []) as unknown as EmailAccountRow[]

  // Map DB columns to frontend ImapAccount shape
  const mapped = accounts.map(acc => ({
    id: acc.id,
    name: acc.name,
    user: acc.username || acc.email,
    password: acc.password_encrypted,
    imapHost: acc.imap_host,
    imapPort: acc.imap_port,
    smtpHost: acc.smtp_host,
    smtpPort: acc.smtp_port,
    tls: true,
  }))

  return NextResponse.json({ accounts: mapped })
}
