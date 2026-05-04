import { Resend } from 'resend'
import { format, parseISO } from 'date-fns'
import { nl } from 'date-fns/locale'
import { workspaceDb } from '@/lib/supabase/workspace'

const FROM = process.env.RESEND_FROM || 'lcntships <no-reply@lcntships.com>'

function formatDate(d: string) {
  try {
    return format(parseISO(d), 'EEEE d MMMM yyyy', { locale: nl })
  } catch {
    return d
  }
}

export async function notifyFinalDate(productionId: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('notifyFinalDate: RESEND_API_KEY missing, skipping')
    return
  }
  const resend = new Resend(apiKey)

  const { data: production } = await workspaceDb
    .from('productions')
    .select('id, title, location, final_date, created_by')
    .eq('id', productionId)
    .single()

  if (!production || !production.final_date) return

  const { data: votes } = await workspaceDb
    .from('production_votes')
    .select('voter_name, voter_email, available_dates')
    .eq('production_id', productionId)

  const dateStr = formatDate(production.final_date)
  const subject = `Finale datum gekozen: ${production.title}`
  const locationLine = production.location ? ` bij ${production.location}` : ''

  const recipients = new Set<string>()

  // Creator email
  if (production.created_by) {
    try {
      const { data: creator } = await workspaceDb.auth.admin.getUserById(production.created_by)
      if (creator?.user?.email) recipients.add(creator.user.email)
    } catch (e) {
      console.error('notify: getUserById', e)
    }
  }

  // Voters who supplied an email
  for (const v of votes ?? []) {
    if (v.voter_email) recipients.add(v.voter_email)
  }

  // Crew members who have an email
  const { data: crew } = await workspaceDb
    .from('production_crew')
    .select('email, name')
    .eq('production_id', productionId)
  for (const c of crew ?? []) {
    if (c.email) recipients.add(c.email)
  }

  if (recipients.size === 0) return

  await Promise.all(
    Array.from(recipients).map(async (to) => {
      const voter = (votes ?? []).find((v) => v.voter_email === to)
      const canMake = voter ? voter.available_dates.includes(production.final_date!) : null
      const greeting = voter ? `Hoi ${voter.voter_name},` : 'Hoi,'
      const statusLine =
        canMake === true
          ? 'Je gaf aan dat je deze datum kan — we zien je dan!'
          : canMake === false
            ? 'Je had deze datum niet aangegeven. Laat ons zo snel mogelijk weten of het toch lukt.'
            : ''

      const html = `
        <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(production.title)}</h1>
          <p>${escapeHtml(greeting)}</p>
          <p>De finale datum voor deze productie${escapeHtml(locationLine)} is:</p>
          <p style="font-size:18px;font-weight:600;padding:12px 16px;background:#f3f4f6;border-radius:8px;display:inline-block">
            ${escapeHtml(dateStr)}
          </p>
          ${statusLine ? `<p>${escapeHtml(statusLine)}</p>` : ''}
          <p style="color:#6b7280;font-size:12px;margin-top:24px">— lcntships</p>
        </div>
      `.trim()

      try {
        await resend.emails.send({ from: FROM, to, subject, html })
      } catch (e) {
        console.error('notify send', to, e)
      }
    }),
  )
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
