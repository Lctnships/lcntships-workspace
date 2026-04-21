import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { render } from '@react-email/render'
import { workspaceDb } from '@/lib/supabase/workspace'
import { requireAuth } from '@/lib/api-auth'
import { parseJson } from '@/lib/api-validate'
import { sendViaOutbox } from '@/lib/email-outbox'
import ContentBriefingEmail from '@/emails/ContentBriefingEmail'

const Body = z.object({
  recipients: z.array(z.string().email().max(320)).min(1).max(20),
  customMessage: z.string().max(2000).optional().nullable(),
})

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, error: authErr } = await requireAuth()
  if (authErr) return authErr
  const { id } = await ctx.params

  const { data: body, error: vErr } = await parseJson(req, Body)
  if (vErr) return vErr

  // Haal brief op
  const { data: brief, error: bErr } = await workspaceDb
    .from('content_briefs')
    .select('*')
    .eq('id', id)
    .single()

  if (bErr || !brief) {
    return NextResponse.json({ error: 'Brief niet gevonden' }, { status: 404 })
  }

  // Bepaal sender naam uit user metadata
  const senderName = (user!.user_metadata?.full_name as string | undefined) ?? 'lctnships'
  const fromEmail = user!.email ?? 'rivaldomacandrew@lctnships.com'
  const fromHeader = `${senderName} <${fromEmail}>`

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://workspace.lctnships.com'
  const briefUrl = `${appUrl}/b/${brief.share_link}`

  const html = await render(
    ContentBriefingEmail({
      briefTitle: brief.title ?? 'Content briefing',
      studioName: brief.studio_name ?? '',
      shootDate: brief.shoot_date,
      callTime: brief.call_time,
      endTime: brief.end_time,
      location: brief.studio_name,
      contactPerson: brief.contact_person,
      contactPhone: brief.contact_phone,
      description: brief.description,
      shotlist: (brief.shotlist ?? []) as Array<{ shot: string; description?: string }>,
      equipment: (brief.equipment ?? []) as string[],
      deliverables: brief.deliverables,
      notes: body!.customMessage ?? brief.notes,
      briefUrl,
      senderName,
    }),
  )

  const subject = `Content briefing: ${brief.title ?? brief.studio_name ?? 'Shoot'}`

  const results: Array<{ email: string; ok: boolean; outboxId: string; error?: string }> = []

  for (const recipient of body!.recipients) {
    const result = await sendViaOutbox({
      source: 'content-brief/send',
      userId: user!.id,
      toEmail: recipient,
      fromEmail,
      fromName: senderName,
      fromHeader,
      subject,
      html,
      metadata: { brief_id: brief.id, recipient },
    })

    results.push({
      email: recipient,
      ok: result.ok,
      outboxId: result.outboxId,
      error: result.error,
    })

    // Log in brief_shares (non-blocking)
    workspaceDb
      .from('brief_shares')
      .insert({
        brief_id: brief.id,
        recipient_email: recipient,
        outbox_id: result.outboxId || null,
      })
      .then(({ error: logErr }) => {
        if (logErr) console.error('brief_shares insert', logErr)
      })
  }

  // Update shared_with + status='shared'
  const existingShared = Array.isArray(brief.shared_with) ? brief.shared_with : []
  const merged = Array.from(new Set([...existingShared, ...body!.recipients]))
  await workspaceDb
    .from('content_briefs')
    .update({
      shared_with: merged,
      status: brief.status === 'draft' ? 'shared' : brief.status,
    })
    .eq('id', brief.id)

  return NextResponse.json({ results, briefUrl })
}
