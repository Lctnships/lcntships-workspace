import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Resend } from 'resend'
import { format, parseISO } from 'date-fns'
import { nl } from 'date-fns/locale'
import { workspaceDb } from '@/lib/supabase/workspace'
import { requireAuth } from '@/lib/api-auth'

const FROM = process.env.RESEND_FROM || 'lcntships <no-reply@lcntships.com>'

type Recipient = {
  email: string
  name: string | null
  source: 'crew' | 'voter' | 'creator'
  role?: string | null
}

type BriefShot = { shot: string; description: string; done: boolean }
type BriefEquipment = { name: string; description?: string }

type PreviewPayload = {
  subject: string
  body_html: string
  body_text: string
  recipients: Recipient[]
  production: {
    id: string
    title: string
    description: string | null
    location: string | null
    final_date: string | null
    proposed_dates: string[]
  }
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  try { return format(parseISO(d), 'EEEE d MMMM yyyy', { locale: nl }) } catch { return d }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

async function buildPreview(productionId: string): Promise<PreviewPayload | null> {
  const { data: production } = await workspaceDb
    .from('productions')
    .select('id, title, description, location, final_date, proposed_dates, created_by')
    .eq('id', productionId)
    .single()
  if (!production) return null

  const [
    { data: votes },
    { data: crew },
    { data: briefs },
  ] = await Promise.all([
    workspaceDb
      .from('production_votes')
      .select('voter_name, voter_email, available_dates')
      .eq('production_id', productionId),
    workspaceDb
      .from('production_crew')
      .select('name, email, role, confirmed')
      .eq('production_id', productionId),
    workspaceDb
      .from('content_briefs')
      .select('id, title, description, shoot_date, status, shotlist, equipment')
      .eq('production_id', productionId)
      .limit(1),
  ])

  const brief = (briefs ?? [])[0] ?? null
  const shots = (Array.isArray(brief?.shotlist) ? (brief!.shotlist as BriefShot[]) : []) as BriefShot[]
  const equipment = (Array.isArray(brief?.equipment) ? (brief!.equipment as BriefEquipment[]) : []) as BriefEquipment[]

  // Recipients
  const recipientsMap = new Map<string, Recipient>()
  for (const c of crew ?? []) {
    if (c.email) {
      recipientsMap.set(c.email.toLowerCase(), {
        email: c.email,
        name: c.name,
        source: 'crew',
        role: c.role,
      })
    }
  }
  for (const v of votes ?? []) {
    if (v.voter_email && !recipientsMap.has(v.voter_email.toLowerCase())) {
      recipientsMap.set(v.voter_email.toLowerCase(), {
        email: v.voter_email,
        name: v.voter_name,
        source: 'voter',
      })
    }
  }
  if (production.created_by) {
    try {
      const { data: creator } = await workspaceDb.auth.admin.getUserById(production.created_by)
      if (creator?.user?.email && !recipientsMap.has(creator.user.email.toLowerCase())) {
        recipientsMap.set(creator.user.email.toLowerCase(), {
          email: creator.user.email,
          name: null,
          source: 'creator',
        })
      }
    } catch (e) {
      console.error('notify: getUserById', e)
    }
  }
  const recipients = Array.from(recipientsMap.values())

  // Subject + body
  const dateStr = production.final_date ? fmtDate(production.final_date) : 'nog te plannen'
  const subject = production.final_date
    ? `Productie ${production.title} — ${fmtDate(production.final_date)}`
    : `Productie ${production.title} — briefing`

  // Crew list as HTML and text
  const crewHtml = (crew ?? []).length === 0
    ? '<p style="color:#6b7280;margin:0">Nog geen crew toegewezen.</p>'
    : `<ul style="margin:0;padding-left:20px">${(crew ?? []).map((c) => `<li>${escapeHtml(c.name ?? '')}${c.role ? ` — ${escapeHtml(c.role)}` : ''}${c.email ? ` <span style="color:#6b7280">(${escapeHtml(c.email)})</span>` : ''}${c.confirmed ? ' ✓' : ''}</li>`).join('')}</ul>`

  // Shotlist as HTML and text
  const shotlistHtml = shots.length === 0
    ? '<p style="color:#6b7280;margin:0">Nog geen shots in de briefing.</p>'
    : `<ol style="margin:0;padding-left:20px">${shots.map((s) => `<li><strong>${escapeHtml(s.shot)}</strong>${s.description ? `<br><span style="color:#6b7280;font-size:13px">${escapeHtml(s.description)}</span>` : ''}</li>`).join('')}</ol>`

  // Gear list — uit production_gear
  const { data: gear } = await workspaceDb
    .from('production_gear')
    .select('name, category, quantity, notes')
    .eq('production_id', productionId)
    .order('sort_order', { ascending: true })

  const gearByCategory: Record<string, Array<{ name: string; quantity: number; notes: string | null }>> = {
    equipment: [], prop: [], other: [],
  }
  for (const g of gear ?? []) {
    if (gearByCategory[g.category]) gearByCategory[g.category].push({ name: g.name, quantity: g.quantity, notes: g.notes })
  }
  const gearSection = (label: string, items: typeof gearByCategory.equipment) =>
    items.length === 0 ? '' :
    `<p style="margin:8px 0 4px;font-weight:600">${label}</p><ul style="margin:0 0 8px;padding-left:20px">${items.map((g) => `<li>${escapeHtml(g.name)}${g.quantity > 1 ? ` × ${g.quantity}` : ''}${g.notes ? ` <span style="color:#6b7280">— ${escapeHtml(g.notes)}</span>` : ''}</li>`).join('')}</ul>`

  const gearHtml = (gear ?? []).length === 0
    ? '<p style="color:#6b7280;margin:0">Nog geen gear toegevoegd.</p>'
    : [
        gearSection('Apparatuur', gearByCategory.equipment),
        gearSection('Props', gearByCategory.prop),
        gearSection('Overig', gearByCategory.other),
      ].join('')

  // Briefing
  const briefingHtml = brief
    ? `${brief.description ? `<p style="white-space:pre-wrap">${escapeHtml(brief.description)}</p>` : ''}`
    : production.description
      ? `<p style="white-space:pre-wrap">${escapeHtml(production.description)}</p>`
      : '<p style="color:#6b7280;margin:0">Geen aanvullende briefing.</p>'

  const body_html = `
<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#111827">
  <h1 style="font-size:22px;margin:0 0 4px;letter-spacing:-0.01em">${escapeHtml(production.title)}</h1>
  ${production.location ? `<p style="color:#6b7280;margin:0 0 16px">${escapeHtml(production.location)}</p>` : '<div style="height:8px"></div>'}

  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px 18px;margin-bottom:20px">
    <p style="margin:0;font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;font-weight:600">Productiedatum</p>
    <p style="margin:4px 0 0;font-size:18px;font-weight:600">${escapeHtml(dateStr)}</p>
  </div>

  <h2 style="font-size:15px;margin:24px 0 8px;color:#111827">Briefing</h2>
  ${briefingHtml}

  <h2 style="font-size:15px;margin:24px 0 8px;color:#111827">Shotlist</h2>
  ${shotlistHtml}

  <h2 style="font-size:15px;margin:24px 0 8px;color:#111827">Gear & inventaris</h2>
  ${gearHtml}

  <h2 style="font-size:15px;margin:24px 0 8px;color:#111827">Crew</h2>
  ${crewHtml}

  <p style="color:#6b7280;font-size:12px;margin-top:32px;border-top:1px solid #e5e7eb;padding-top:16px">— lcntships</p>
</div>`.trim()

  // Plain text fallback (zelfde info, geen html)
  const lines: string[] = []
  lines.push(production.title.toUpperCase())
  if (production.location) lines.push(production.location)
  lines.push('')
  lines.push(`Productiedatum: ${dateStr}`)
  lines.push('')
  lines.push('BRIEFING')
  if (brief?.description) lines.push(brief.description)
  else if (production.description) lines.push(production.description)
  else lines.push('(geen aanvullende briefing)')
  lines.push('')
  lines.push('SHOTLIST')
  if (shots.length === 0) lines.push('(nog geen shots)')
  else shots.forEach((s, i) => {
    lines.push(`${i + 1}. ${s.shot}${s.description ? ` — ${s.description}` : ''}`)
  })
  lines.push('')
  lines.push('GEAR & INVENTARIS')
  if ((gear ?? []).length === 0) lines.push('(geen gear)')
  else {
    if (gearByCategory.equipment.length > 0) {
      lines.push('Apparatuur:')
      gearByCategory.equipment.forEach((g) => lines.push(`  - ${g.name}${g.quantity > 1 ? ` × ${g.quantity}` : ''}${g.notes ? ` (${g.notes})` : ''}`))
    }
    if (gearByCategory.prop.length > 0) {
      lines.push('Props:')
      gearByCategory.prop.forEach((g) => lines.push(`  - ${g.name}${g.quantity > 1 ? ` × ${g.quantity}` : ''}${g.notes ? ` (${g.notes})` : ''}`))
    }
    if (gearByCategory.other.length > 0) {
      lines.push('Overig:')
      gearByCategory.other.forEach((g) => lines.push(`  - ${g.name}${g.quantity > 1 ? ` × ${g.quantity}` : ''}${g.notes ? ` (${g.notes})` : ''}`))
    }
  }
  lines.push('')
  lines.push('CREW')
  if ((crew ?? []).length === 0) lines.push('(geen crew toegewezen)')
  else (crew ?? []).forEach((c) => {
    lines.push(`- ${c.name ?? ''}${c.role ? ` — ${c.role}` : ''}${c.email ? ` (${c.email})` : ''}${c.confirmed ? ' [bevestigd]' : ''}`)
  })
  lines.push('')
  lines.push('— lcntships')

  return {
    subject,
    body_html,
    body_text: lines.join('\n'),
    recipients,
    production: {
      id: production.id,
      title: production.title,
      description: production.description,
      location: production.location,
      final_date: production.final_date,
      proposed_dates: production.proposed_dates,
    },
  }
}

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth()
  if (error) return error
  const { id } = await context.params
  const preview = await buildPreview(id)
  if (!preview) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(preview)
}

const sendSchema = z.object({
  subject: z.string().min(1).max(300),
  body_html: z.string().min(1).max(50000),
  body_text: z.string().max(50000).optional(),
  recipients: z.array(z.string().email()).min(1).max(50),
})

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { id } = await context.params

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY missing' }, { status: 500 })
  }
  const parsed = sendSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 })
  }

  const resend = new Resend(apiKey)
  const results = await Promise.allSettled(
    parsed.data.recipients.map((to) =>
      resend.emails.send({
        from: FROM,
        to,
        subject: parsed.data.subject,
        html: parsed.data.body_html,
        text: parsed.data.body_text ?? undefined,
      }),
    ),
  )

  const sent = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.length - sent

  await workspaceDb
    .from('production_activities')
    .insert({
      production_id: id,
      actor_email: user?.email ?? null,
      action_type: 'crew_notified',
      payload: {
        sent,
        failed,
        recipient_count: parsed.data.recipients.length,
        subject: parsed.data.subject,
      },
    })

  return NextResponse.json({ sent, failed, total: parsed.data.recipients.length })
}
