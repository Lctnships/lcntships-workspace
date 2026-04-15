// Debug endpoint: checks the whole email sending chain without sending.
// Hit this with the browser while logged in to see what's broken.
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { workspaceDb } from '@/lib/supabase/workspace'
import { requireAuth } from '@/lib/api-auth'

export async function GET() {
  const { error: __authError } = await requireAuth()
  if (__authError) return __authError

  const report: Record<string, unknown> = {}

  // 1. Env vars
  report.env = {
    RESEND_API_KEY_present: !!process.env.RESEND_API_KEY,
    RESEND_API_KEY_prefix: process.env.RESEND_API_KEY?.slice(0, 6) ?? null,
    WORKSPACE_SUPABASE_URL: process.env.WORKSPACE_SUPABASE_URL ?? null,
    WORKSPACE_SERVICE_ROLE_set: !!process.env.WORKSPACE_SUPABASE_SERVICE_ROLE_KEY,
  }

  // 2. Resend API reachability
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const { data, error } = await resend.domains.list()
      report.resend = error
        ? { ok: false, error }
        : { ok: true, domains: (data as unknown as { data?: Array<{ name: string; status: string }> })?.data?.map(d => ({ name: d.name, status: d.status })) }
    } catch (err) {
      report.resend = { ok: false, exception: err instanceof Error ? err.message : String(err) }
    }
  }

  // 3. Workspace DB insert test (roll back)
  try {
    const testId = crypto.randomUUID()
    const { error: insErr } = await workspaceDb.from('sent_emails').insert({
      id: testId,
      subject: '__DEBUG__ probe — ignore',
      status: 'sent',
      delivery_status: 'sent',
      last_event: 'sent',
      to_email: 'debug@example.com',
    })
    if (!insErr) {
      await workspaceDb.from('sent_emails').delete().eq('id', testId)
    }
    report.workspaceDb_insert = insErr ? { ok: false, error: insErr } : { ok: true }
  } catch (err) {
    report.workspaceDb_insert = { ok: false, exception: err instanceof Error ? err.message : String(err) }
  }

  return NextResponse.json(report, { status: 200 })
}
