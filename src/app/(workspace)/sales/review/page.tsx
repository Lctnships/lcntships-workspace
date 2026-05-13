'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronLeft, ChevronRight, Check, X, Loader2 } from 'lucide-react'
import { workspaceClient } from '@/lib/workspace-client'

type LeadStatus =
  | 'cold'
  | 'warm'
  | 'hot'
  | 'voicemail'
  | 'negotiation'
  | 'closed'
  | 'lost'

interface SalesLead {
  id: string
  company_name: string
  contact_name: string | null
  city: string | null
  status: LeadStatus | string
  source: string | null
  updated_at: string
}

type GroupKey = 'pipeline' | 'archived' | 'pending'

interface WeeklyReview {
  id: string
  week_iso: string
  notes: string | null
  pipeline_ids: string[]
  archived_ids: string[]
  pending_ids: string[]
  closed_at: string | null
  closed_by: string | null
}

const COMPANY_GOAL_TARGET = 1000

function getISOWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return { year: d.getUTCFullYear(), week }
}

function weekIso(year: number, week: number): string {
  return `${year}-W${String(week).padStart(2, '0')}`
}

function getWeekRange(year: number, week: number): { start: Date; end: Date } {
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7))
  const dow = simple.getUTCDay()
  const monday = new Date(simple)
  if (dow <= 4) monday.setUTCDate(simple.getUTCDate() - simple.getUTCDay() + 1)
  else monday.setUTCDate(simple.getUTCDate() + 8 - simple.getUTCDay())
  const friday = new Date(monday)
  friday.setUTCDate(monday.getUTCDate() + 4)
  return { start: monday, end: friday }
}

function formatWeekRange(year: number, week: number): string {
  const { start, end } = getWeekRange(year, week)
  const monthsNL = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
  const sameMonth = start.getUTCMonth() === end.getUTCMonth()
  if (sameMonth) {
    return `${start.getUTCDate()}–${end.getUTCDate()} ${monthsNL[start.getUTCMonth()]} ${end.getUTCFullYear()}`
  }
  return `${start.getUTCDate()} ${monthsNL[start.getUTCMonth()]} – ${end.getUTCDate()} ${monthsNL[end.getUTCMonth()]} ${end.getUTCFullYear()}`
}

function shiftWeek(year: number, week: number, delta: number): { year: number; week: number } {
  const { start } = getWeekRange(year, week)
  start.setUTCDate(start.getUTCDate() + delta * 7)
  return getISOWeek(start)
}

function classifyGroup(status: string | null): GroupKey {
  const s = (status || 'cold').toLowerCase()
  if (s === 'warm' || s === 'hot' || s === 'negotiation' || s === 'closed') return 'pipeline'
  if (s === 'lost') return 'archived'
  return 'pending'
}

function statusLabel(group: GroupKey): string {
  if (group === 'pipeline') return 'Doorgezet'
  if (group === 'archived') return 'Gearchiveerd'
  return 'Te beoordelen'
}

export default function WeeklyReviewPage() {
  const today = useMemo(() => new Date(), [])
  const initialWeek = useMemo(() => getISOWeek(today), [today])
  const [year, setYear] = useState(initialWeek.year)
  const [week, setWeek] = useState(initialWeek.week)
  const iso = weekIso(year, week)

  const [leads, setLeads] = useState<SalesLead[]>([])
  const [allCount, setAllCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [review, setReview] = useState<WeeklyReview | null>(null)
  const [prevReview, setPrevReview] = useState<WeeklyReview | null>(null)
  const [notes, setNotes] = useState('')
  const [closing, setClosing] = useState(false)
  const [reasonOpen, setReasonOpen] = useState<string | null>(null)
  const [reasonText, setReasonText] = useState('')

  const isClosed = !!review?.closed_at

  const fetchData = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const { start, end } = getWeekRange(year, week)
      const startISO = start.toISOString()
      const endExclusive = new Date(end)
      endExclusive.setUTCDate(endExclusive.getUTCDate() + 1)
      const endISO = endExclusive.toISOString()

      const leadsRes = await workspaceClient
        .from('sales_leads')
        .select('id, company_name, contact_name, city, status, source, updated_at')
        .gte('updated_at', startISO)
        .lte('updated_at', endISO)
        .order('updated_at', { ascending: false })
        .limit(500)

      if (leadsRes.error) throw new Error(leadsRes.error.message)
      setLeads((leadsRes.data as SalesLead[]) || [])

      const totalRes = await workspaceClient
        .from('sales_leads')
        .select('id')
        .limit(1500)
      if (!totalRes.error) setAllCount((totalRes.data as { id: string }[] | null)?.length || 0)

      const reviewRes = await workspaceClient
        .from('weekly_reviews')
        .select('*')
        .eq('week_iso', iso)
        .maybeSingle()
      if (!reviewRes.error && reviewRes.data) {
        const r = reviewRes.data as WeeklyReview
        setReview(r)
        setNotes(r.notes || '')
      } else {
        setReview(null)
        setNotes('')
      }

      const prev = shiftWeek(year, week, -1)
      const prevIso = weekIso(prev.year, prev.week)
      const prevRes = await workspaceClient
        .from('weekly_reviews')
        .select('*')
        .eq('week_iso', prevIso)
        .maybeSingle()
      if (!prevRes.error && prevRes.data) setPrevReview(prevRes.data as WeeklyReview)
      else setPrevReview(null)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Onbekende fout')
    } finally {
      setLoading(false)
    }
  }, [year, week, iso])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const grouped = useMemo(() => {
    const g: Record<GroupKey, SalesLead[]> = { pipeline: [], archived: [], pending: [] }
    for (const l of leads) g[classifyGroup(l.status)].push(l)
    return g
  }, [leads])

  const kpis = useMemo(() => ({
    called: leads.length,
    archived: grouped.archived.length,
    pipeline: grouped.pipeline.length,
    goalCurrent: allCount,
    goalTarget: COMPANY_GOAL_TARGET,
  }), [leads.length, grouped.archived.length, grouped.pipeline.length, allCount])

  const goalPct = Math.min(100, (kpis.goalCurrent / kpis.goalTarget) * 100)

  const updateLeadStatus = async (id: string, status: LeadStatus) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l))
    const res = await workspaceClient
      .from('sales_leads')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (res.error) {
      setErr(res.error.message)
      fetchData()
    }
  }

  const forwardToPipeline = (id: string) => {
    if (isClosed) return
    updateLeadStatus(id, 'warm')
  }

  const openReason = (id: string) => {
    if (isClosed) return
    setReasonOpen(id)
    setReasonText('')
  }

  const archiveLead = async (id: string) => {
    if (isClosed) return
    const reason = reasonText.trim()
    setReasonOpen(null)
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status: 'lost' } : l))
    const updates: { status: string; updated_at: string; notes?: string } = {
      status: 'lost',
      updated_at: new Date().toISOString(),
    }
    if (reason) {
      const lead = leads.find(l => l.id === id)
      const existing = (lead as SalesLead & { notes?: string | null } | undefined)?.notes || ''
      updates.notes = existing ? `${existing}\n\n[Review ${iso}] ${reason}` : `[Review ${iso}] ${reason}`
    }
    const res = await workspaceClient.from('sales_leads').update(updates).eq('id', id)
    if (res.error) {
      setErr(res.error.message)
      fetchData()
    }
  }

  const persistNotes = useCallback(async (value: string) => {
    const payload = {
      week_iso: iso,
      notes: value,
      pipeline_ids: grouped.pipeline.map(l => l.id),
      archived_ids: grouped.archived.map(l => l.id),
      pending_ids: grouped.pending.map(l => l.id),
      updated_at: new Date().toISOString(),
    }
    if (review) {
      await workspaceClient.from('weekly_reviews').update(payload).eq('id', review.id)
    } else {
      const res = await workspaceClient.from('weekly_reviews').insert(payload)
      if (!res.error && res.data && Array.isArray(res.data) && res.data[0]) {
        setReview(res.data[0] as WeeklyReview)
      }
    }
  }, [iso, grouped, review])

  useEffect(() => {
    if (loading) return
    const t = setTimeout(() => { persistNotes(notes) }, 700)
    return () => clearTimeout(t)
  }, [notes, loading, persistNotes])

  const closeReview = async () => {
    if (isClosed) return
    setClosing(true)
    const payload = {
      week_iso: iso,
      notes,
      pipeline_ids: grouped.pipeline.map(l => l.id),
      archived_ids: grouped.archived.map(l => l.id),
      pending_ids: grouped.pending.map(l => l.id),
      closed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    if (review) {
      const res = await workspaceClient.from('weekly_reviews').update(payload).eq('id', review.id)
      if (!res.error) setReview({ ...review, ...payload })
    } else {
      const res = await workspaceClient.from('weekly_reviews').insert(payload)
      if (!res.error && res.data && Array.isArray(res.data) && res.data[0]) {
        setReview(res.data[0] as WeeklyReview)
      }
    }
    setClosing(false)
  }

  const navWeek = (delta: number) => {
    const { year: y, week: w } = shiftWeek(year, week, delta)
    setYear(y); setWeek(w)
  }

  return (
    <div style={{ margin: '-16px -16px 0 -16px', minHeight: 'calc(100vh - 0px)', background: 'var(--bg)', overflowX: 'hidden' }}>
      {/* Header */}
      <header className="wr-header">
        <Link href="/sales" className="wr-back" aria-label="Terug">
          <ArrowLeft style={{ width: 16, height: 16 }} />
        </Link>
        <div className="wr-header-left">
          <span className="wr-eyebrow">Wekelijkse review</span>
          <span className="wr-title">Week {week} · {formatWeekRange(year, week)}</span>
        </div>
        <div style={{ flex: 1 }} />
        <div className="wr-actions">
          <button className="wr-week-nav" onClick={() => navWeek(-1)} aria-label="Vorige week">
            <ChevronLeft style={{ width: 13, height: 13 }} />
          </button>
          <button className="wr-week-nav" onClick={() => navWeek(1)} aria-label="Volgende week">
            <ChevronRight style={{ width: 13, height: 13 }} />
          </button>
          <button
            className="wr-btn-primary"
            onClick={closeReview}
            disabled={isClosed || closing}
            style={{ opacity: isClosed ? 0.55 : 1, cursor: isClosed ? 'default' : 'pointer' }}
          >
            {closing ? <Loader2 className="wr-spin" style={{ width: 13, height: 13 }} /> : <Check style={{ width: 13, height: 13 }} />}
            {isClosed ? 'Afgerond' : 'Review afronden'}
          </button>
        </div>
      </header>

      {/* KPI bar */}
      <div className="wr-kpi-bar">
        <div className="wr-kpi">
          <div className="wr-kpi-label">Gebeld deze week</div>
          <div className="wr-kpi-value">{kpis.called}</div>
          <div className="wr-kpi-sub">studios gecontacteerd</div>
        </div>
        <div className="wr-kpi">
          <div className="wr-kpi-label">Niet geschikt</div>
          <div className="wr-kpi-value danger">{kpis.archived}</div>
          <div className="wr-kpi-sub">gearchiveerd</div>
        </div>
        <div className="wr-kpi">
          <div className="wr-kpi-label">Doorgezet naar pipeline</div>
          <div className="wr-kpi-value success">{kpis.pipeline}</div>
          <div className="wr-kpi-sub">actieve leads</div>
        </div>
        <div className="wr-kpi">
          <div className="wr-kpi-label">Doel voortgang</div>
          <div className="wr-kpi-frac-wrap">
            <span className="wr-kpi-frac">{kpis.goalCurrent}</span>
            <span className="wr-kpi-frac-denom">/ {kpis.goalTarget}</span>
          </div>
          <div className="wr-kpi-track"><div className="wr-kpi-fill" style={{ width: `${goalPct}%` }} /></div>
          <div className="wr-kpi-sub" style={{ marginTop: 5 }}>{goalPct.toFixed(1)}% van jaardoel</div>
        </div>
      </div>

      {/* Layout */}
      <div className="wr-main">
        <div className="wr-checklist">
          <div className="wr-section-head">
            <span className="wr-section-title">Studios beoordeeld deze week</span>
            <span className="wr-count-badge">{kpis.called}</span>
          </div>

          {loading ? (
            <div style={{ padding: '40px 32px', textAlign: 'center', color: 'var(--ink-ghost)' }}>
              <Loader2 className="wr-spin" style={{ width: 20, height: 20 }} /> Laden…
            </div>
          ) : err ? (
            <div style={{ padding: 24, color: 'var(--danger)', fontSize: 12 }}>Fout: {err}</div>
          ) : (
            <>
              <GroupBlock
                tone="success"
                label="Doorgezet → pipeline"
                items={grouped.pipeline}
                group="pipeline"
                isClosed={isClosed}
                onForward={forwardToPipeline}
                onReject={openReason}
                reasonOpen={reasonOpen}
                reasonText={reasonText}
                setReasonText={setReasonText}
                onArchive={archiveLead}
                onCancelReason={() => setReasonOpen(null)}
              />
              <GroupBlock
                tone="danger"
                label="Niet geschikt — gearchiveerd"
                items={grouped.archived}
                group="archived"
                isClosed={isClosed}
                onForward={forwardToPipeline}
                onReject={openReason}
                reasonOpen={reasonOpen}
                reasonText={reasonText}
                setReasonText={setReasonText}
                onArchive={archiveLead}
                onCancelReason={() => setReasonOpen(null)}
              />
              <GroupBlock
                tone="warning"
                label="Nog te beoordelen"
                items={grouped.pending}
                group="pending"
                isClosed={isClosed}
                onForward={forwardToPipeline}
                onReject={openReason}
                reasonOpen={reasonOpen}
                reasonText={reasonText}
                setReasonText={setReasonText}
                onArchive={archiveLead}
                onCancelReason={() => setReasonOpen(null)}
              />
            </>
          )}

          <div className="wr-footer">
            <span>Lctnships Workspace · Wekelijkse Review · Week {week} · {formatWeekRange(year, week)}</span>
          </div>
        </div>

        {/* Right column */}
        <aside className="wr-right">
          <div className="wr-widget">
            <div className="wr-w-head">
              <span className="wr-w-eye">Volgende stap</span>
              <span className="wr-w-meta">{grouped.pending.length} te beoordelen</span>
            </div>
            <div className="wr-w-body">
              {grouped.pending.length === 0 ? (
                <div style={{ fontSize: 11, color: 'var(--ink-ghost)' }}>Alle leads beoordeeld.</div>
              ) : grouped.pending.slice(0, 8).map(l => (
                <div className="wr-ns-item" key={l.id}>
                  <div className="wr-ns-dot" />
                  <span className="wr-ns-name">{l.company_name}</span>
                  <span className="wr-ns-city">{l.city || '—'}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="wr-widget">
            <div className="wr-w-head"><span className="wr-w-eye">Week notities</span></div>
            <div className="wr-w-body">
              <textarea
                className="wr-notes"
                rows={5}
                placeholder={`Aantekeningen voor week ${week}…`}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                disabled={isClosed}
              />
            </div>
          </div>

          <div className="wr-widget">
            <div className="wr-w-head">
              <span className="wr-w-eye">Vorige week</span>
              <span className="wr-w-meta">Week {shiftWeek(year, week, -1).week}</span>
            </div>
            <div className="wr-w-body">
              <PrevStat label="Gebeld" value={prevReview ? (prevReview.pipeline_ids.length + prevReview.archived_ids.length + prevReview.pending_ids.length) : 0} />
              <PrevStat label="Niet geschikt" value={prevReview?.archived_ids.length || 0} tone="red" />
              <PrevStat label="Pipeline" value={prevReview?.pipeline_ids.length || 0} tone="green" />
            </div>
          </div>
        </aside>
      </div>

      <style jsx>{`
        .wr-header {
          position: sticky; top: 0; z-index: 100;
          height: 58px;
          background: var(--bg);
          border-bottom: 1px solid var(--edge);
          display: flex; align-items: center;
          padding: 0 40px; gap: 0;
        }
        .wr-back {
          display: flex; align-items: center; justify-content: center;
          width: 28px; height: 28px;
          color: var(--ink-ghost);
          margin-right: 12px;
          background: transparent; border: none;
        }
        .wr-back:hover { color: var(--ink-muted); }
        .wr-header-left { display: flex; flex-direction: column; gap: 1px; }
        .wr-eyebrow {
          font-size: 8px; font-weight: 700;
          letter-spacing: 0.22em; text-transform: uppercase;
          color: var(--ink-ghost); line-height: 1;
        }
        .wr-title {
          font-size: 13px; font-weight: 800;
          color: var(--ink); letter-spacing: -0.01em; line-height: 1.2;
        }
        .wr-actions { display: flex; align-items: center; gap: 6px; }
        .wr-week-nav {
          width: 28px; height: 28px;
          border: 1px solid var(--edge); border-radius: 50%;
          background: transparent;
          display: flex; align-items: center; justify-content: center;
          color: var(--ink-ghost); cursor: pointer;
          transition: all 130ms;
        }
        .wr-week-nav:hover { border-color: var(--ink-ghost); color: var(--ink-muted); }
        .wr-btn-primary {
          background: var(--accent, #0E4F6D); color: #fff;
          border: none; padding: 7px 18px;
          border-radius: 9999px;
          font-size: 11px; font-weight: 700;
          letter-spacing: 0.03em;
          display: flex; align-items: center; gap: 6px;
          cursor: pointer;
        }
        .wr-btn-primary:hover { opacity: 0.82; }
        .wr-spin { animation: wrspin 0.9s linear infinite; }
        @keyframes wrspin { to { transform: rotate(360deg); } }

        .wr-kpi-bar {
          display: grid; grid-template-columns: repeat(4, 1fr);
          border-bottom: 1px solid var(--edge);
        }
        .wr-kpi { padding: 18px 32px; border-right: 1px solid var(--edge); }
        .wr-kpi:last-child { border-right: none; }
        .wr-kpi-label {
          font-size: 7.5px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.22em;
          color: var(--ink-ghost); margin-bottom: 5px;
        }
        .wr-kpi-value {
          font-size: 30px; font-weight: 900;
          letter-spacing: -0.03em; line-height: 1;
          color: var(--ink);
        }
        .wr-kpi-value.danger { color: var(--danger, #dc2626); }
        .wr-kpi-value.success { color: var(--success, #15803d); }
        .wr-kpi-sub { font-size: 10px; color: var(--ink-ghost); margin-top: 4px; }
        .wr-kpi-frac-wrap { display: flex; align-items: baseline; gap: 6px; }
        .wr-kpi-frac {
          font-size: 30px; font-weight: 900;
          letter-spacing: -0.03em; line-height: 1;
          color: var(--accent, #0E4F6D);
        }
        .wr-kpi-frac-denom {
          font-size: 14px; font-weight: 700; color: var(--ink-ghost);
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
        }
        .wr-kpi-track {
          height: 4px; background: var(--edge);
          border-radius: 2px; margin-top: 8px; overflow: hidden;
        }
        .wr-kpi-fill { height: 100%; background: var(--accent, #0E4F6D); border-radius: 2px; }

        .wr-main {
          display: grid; grid-template-columns: minmax(0, 1fr) 260px;
          align-items: start;
        }
        .wr-checklist {
          border-right: 1px solid var(--edge);
          min-height: calc(100vh - 58px - 80px);
        }
        .wr-section-head {
          display: flex; align-items: center; gap: 10px;
          padding: 22px 32px 14px;
        }
        .wr-section-title { font-size: 12px; font-weight: 800; color: var(--ink); }
        .wr-count-badge {
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 22px; height: 18px; padding: 0 6px;
          border-radius: 9999px;
          font-size: 9px; font-weight: 800;
          background: var(--surface); border: 1px solid var(--edge);
          color: var(--ink-ghost);
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
        }
        .wr-footer {
          border-top: 1px solid var(--edge);
          padding: 11px 32px;
          font-size: 11px; color: var(--ink-ghost);
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
        }

        .wr-right {
          position: sticky; top: 58px;
          max-height: calc(100vh - 58px);
          overflow-y: auto;
          padding: 16px 14px;
          display: flex; flex-direction: column; gap: 12px;
        }
        .wr-widget {
          border: 1px solid var(--edge); border-radius: 4px;
          overflow: hidden; background: var(--bg);
        }
        .wr-w-head {
          padding: 8px 12px;
          border-bottom: 1px solid var(--edge);
          background: var(--surface);
          display: flex; align-items: center; justify-content: space-between;
        }
        .wr-w-eye {
          font-size: 7.5px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.22em;
          color: var(--ink-ghost);
        }
        .wr-w-meta {
          font-size: 9.5px; color: var(--ink-ghost);
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
        }
        .wr-w-body { padding: 10px 12px; }
        .wr-ns-item {
          display: flex; align-items: center; gap: 8px;
          padding: 7px 0;
          border-bottom: 1px solid var(--edge-soft, #e5e5e5);
        }
        .wr-ns-item:last-child { border-bottom: none; }
        .wr-ns-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #b45309; flex-shrink: 0;
        }
        .wr-ns-name {
          font-size: 11px; font-weight: 600;
          color: var(--ink-muted); flex: 1;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .wr-ns-city { font-size: 9.5px; color: var(--ink-ghost); flex-shrink: 0; }

        .wr-notes {
          width: 100%; border: none; background: transparent;
          font-size: 11.5px; color: var(--ink-muted);
          resize: none; outline: none; line-height: 1.6;
          font-family: inherit;
          min-height: 90px;
        }
      `}</style>
    </div>
  )
}

interface GroupBlockProps {
  tone: 'success' | 'danger' | 'warning'
  label: string
  items: SalesLead[]
  group: GroupKey
  isClosed: boolean
  onForward: (id: string) => void
  onReject: (id: string) => void
  reasonOpen: string | null
  reasonText: string
  setReasonText: (v: string) => void
  onArchive: (id: string) => void
  onCancelReason: () => void
}

function GroupBlock({
  tone, label, items, group, isClosed,
  onForward, onReject, reasonOpen, reasonText, setReasonText, onArchive, onCancelReason,
}: GroupBlockProps) {
  return (
    <div className="gb-block">
      <div className={`gb-head gb-${tone}`}>
        {tone === 'success' && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1.5 5l2.5 2.5 4.5-4.5" />
          </svg>
        )}
        {tone === 'danger' && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 2l6 6M8 2L2 8" />
          </svg>
        )}
        {tone === 'warning' && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="5" cy="5" r="4" />
            <path d="M5 3v2.5l1.5 1.5" />
          </svg>
        )}
        <span className="gb-label">{label}</span>
        <span className="gb-count">{items.length} studio{items.length === 1 ? '' : 's'}</span>
      </div>

      {items.length === 0 && (
        <div className="gb-empty">Geen leads in deze groep deze week.</div>
      )}

      {items.map(lead => (
        <div key={lead.id}>
          <div className="gb-row">
            <div className="gb-check">
              {group === 'pipeline' && <div className="gb-cdone"><Check style={{ width: 11, height: 11, color: '#fff' }} /></div>}
              {group === 'archived' && <div className="gb-cno"><X style={{ width: 10, height: 10, color: 'var(--danger, #dc2626)' }} /></div>}
              {group === 'pending' && <div className="gb-cempty" />}
            </div>
            <div className="gb-info">
              <div className="gb-name-wrap">
                <span className="gb-name">{lead.company_name}</span>
                <span className="gb-city">{lead.city || '—'}{lead.contact_name ? ` · ${lead.contact_name}` : ''}</span>
              </div>
              {lead.source && <span className="gb-chip gb-chip-type">{lead.source}</span>}
              <span className={`gb-chip gb-chip-${group}`}>{statusLabel(group)}</span>
            </div>
            {!isClosed && (
              <div className={`gb-actions${group === 'pending' ? ' always' : ''}`}>
                {group !== 'pipeline' && (
                  <button className="gb-btn" onClick={() => onForward(lead.id)}>Doorsturen</button>
                )}
                {group !== 'archived' && (
                  <button className="gb-btn gb-btn-danger" onClick={() => onReject(lead.id)}>Niet geschikt</button>
                )}
              </div>
            )}
          </div>

          {reasonOpen === lead.id && (
            <div className="gb-reason open">
              <div className="gb-reason-label">Reden voor archivering</div>
              <textarea
                className="gb-reason-ta"
                rows={2}
                placeholder="Waarom voldoet deze studio niet? (bijv. te klein, te duur, verkeerd type…)"
                value={reasonText}
                onChange={e => setReasonText(e.target.value)}
              />
              <div className="gb-reason-actions">
                <button className="gb-archive" onClick={() => onArchive(lead.id)}>Archiveren</button>
                <button className="gb-cancel" onClick={onCancelReason}>Annuleren</button>
              </div>
            </div>
          )}
        </div>
      ))}

      <style jsx>{`
        .gb-block { margin-bottom: 0; }
        .gb-head {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 32px;
          background: var(--surface);
          border-top: 1px solid var(--edge);
          border-bottom: 1px solid var(--edge);
        }
        .gb-head.gb-success { border-left: 3px solid var(--success, #15803d); color: var(--success, #15803d); }
        .gb-head.gb-danger { border-left: 3px solid var(--danger, #dc2626); color: var(--danger, #dc2626); }
        .gb-head.gb-warning { border-left: 3px solid #b45309; color: #b45309; }
        .gb-label {
          font-size: 9px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.18em;
          color: var(--ink-ghost);
        }
        .gb-count {
          font-size: 9px;
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-weight: 700; color: var(--ink-ghost);
          margin-left: auto;
        }
        .gb-empty {
          padding: 14px 32px;
          font-size: 11px; color: var(--ink-ghost);
          border-bottom: 1px solid var(--edge-soft, #e5e5e5);
        }

        .gb-row {
          display: flex; align-items: center; gap: 12px;
          padding: 11px 32px;
          border-bottom: 1px solid var(--edge-soft, #e5e5e5);
          position: relative;
        }
        .gb-row:hover { background: #fafafa; }
        .gb-row:hover .gb-actions { opacity: 1; pointer-events: auto; }

        .gb-check {
          width: 20px; height: 20px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .gb-cdone {
          width: 18px; height: 18px; border-radius: 50%;
          background: var(--success, #15803d);
          display: flex; align-items: center; justify-content: center;
        }
        .gb-cno {
          width: 18px; height: 18px; border-radius: 50%;
          background: #fef2f2;
          border: 1px solid var(--danger, #dc2626);
          display: flex; align-items: center; justify-content: center;
        }
        .gb-cempty {
          width: 18px; height: 18px; border-radius: 4px;
          border: 1.5px solid var(--edge);
          background: transparent;
        }

        .gb-info {
          flex: 1;
          display: flex; align-items: center; gap: 10px;
          min-width: 0;
        }
        .gb-name-wrap { display: flex; flex-direction: column; min-width: 0; }
        .gb-name {
          font-size: 12.5px; font-weight: 700; color: var(--ink);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .gb-city {
          font-size: 10px; color: var(--ink-ghost); font-weight: 500;
        }
        .gb-chip {
          display: inline-flex; align-items: center;
          padding: 3px 9px; border-radius: 9999px;
          font-size: 9px; font-weight: 700;
          white-space: nowrap; flex-shrink: 0;
        }
        .gb-chip-type {
          background: var(--surface);
          border: 1px solid var(--edge);
          color: var(--ink-ghost);
        }
        .gb-chip-pipeline { background: #ecfdf5; color: var(--success, #15803d); }
        .gb-chip-archived { background: #fef2f2; color: var(--danger, #dc2626); }
        .gb-chip-pending { background: #fffbeb; color: #b45309; }

        .gb-actions {
          display: flex; align-items: center; gap: 5px;
          flex-shrink: 0;
          opacity: 0; pointer-events: none;
          transition: opacity 130ms;
        }
        .gb-actions.always { opacity: 1; pointer-events: auto; }
        .gb-btn {
          padding: 4px 12px;
          border-radius: 9999px;
          font-size: 10px; font-weight: 700;
          border: 1px solid var(--edge);
          background: var(--bg);
          color: var(--ink-muted);
          cursor: pointer;
          letter-spacing: 0.02em;
        }
        .gb-btn:hover { border-color: var(--ink-ghost); background: var(--surface); }
        .gb-btn-danger { color: var(--danger, #dc2626); border-color: #fecaca; }
        .gb-btn-danger:hover { background: #fef2f2; border-color: var(--danger, #dc2626); }

        .gb-reason {
          padding: 10px 32px 14px calc(32px + 20px + 12px);
          background: #fef2f2;
          border-top: 1px solid #fecaca;
          border-bottom: 1px solid #fecaca;
        }
        .gb-reason-label {
          font-size: 8.5px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.18em;
          color: var(--danger, #dc2626);
          margin-bottom: 6px;
        }
        .gb-reason-ta {
          width: 100%;
          border: 1px solid #fca5a5;
          border-radius: 4px;
          background: var(--bg);
          padding: 8px 10px;
          font-size: 11.5px;
          color: var(--ink-muted);
          resize: none;
          outline: none;
          line-height: 1.5;
          font-family: inherit;
        }
        .gb-reason-ta:focus { border-color: var(--danger, #dc2626); }
        .gb-reason-actions {
          display: flex; align-items: center; gap: 8px;
          margin-top: 8px;
        }
        .gb-archive {
          padding: 5px 14px;
          border-radius: 9999px;
          font-size: 10.5px; font-weight: 700;
          background: var(--danger, #dc2626); color: #fff;
          border: none; cursor: pointer;
          letter-spacing: 0.02em;
        }
        .gb-archive:hover { opacity: 0.82; }
        .gb-cancel {
          padding: 5px 12px;
          border-radius: 9999px;
          font-size: 10.5px; font-weight: 600;
          background: transparent;
          color: var(--ink-ghost);
          border: 1px solid #fecaca;
          cursor: pointer;
        }
        .gb-cancel:hover { border-color: var(--ink-ghost); color: var(--ink-muted); }
      `}</style>
    </div>
  )
}

function PrevStat({ label, value, tone }: { label: string; value: number; tone?: 'red' | 'green' }) {
  const color = tone === 'red' ? 'var(--danger, #dc2626)' : tone === 'green' ? 'var(--success, #15803d)' : 'var(--ink-muted)'
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '6px 0', borderBottom: '1px solid var(--edge-soft, #e5e5e5)',
    }}>
      <span style={{ fontSize: 10.5, color: 'var(--ink-ghost)' }}>{label}</span>
      <span style={{
        fontSize: 11, fontWeight: 800, color,
        fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
      }}>{value}</span>
    </div>
  )
}
