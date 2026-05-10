'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import { workspaceClient } from '@/lib/workspace-client'

// ─── Types ──────────────────────────────────────────────────────────────
type SalesEvent = {
  kind: 'sales'
  id: string
  type: 'meeting' | 'call' | 'follow_up' | 'demo' | 'other'
  title: string
  description: string | null
  date: string // YYYY-MM-DD
  start_time: string | null
  end_time: string | null
  location: string | null
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  lead_id: string | null
  assigned_to: string | null
}

type ProductionEvent = {
  kind: 'productie'
  id: string
  title: string
  description: string | null
  location: string | null
  date: string // YYYY-MM-DD (final_date or first proposed)
  start_time: string | null
  end_time: string | null
  phase: 'datum-vast' | 'in-productie' | 'stemmen-open' | 'afgerond'
  phaseLabel: string
}

type AgendaEvent = SalesEvent | ProductionEvent

// ─── Constants ──────────────────────────────────────────────────────────
const MONTH_NL = ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
  'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December']
const DAY_NL_SHORT = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za']
const DAY_NL_FULL = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag']
const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]

// ─── Helpers ────────────────────────────────────────────────────────────
function parseDate(s: string): Date {
  const p = s.split('-')
  return new Date(+p[0], +p[1] - 1, +p[2])
}

function formatDateLong(d: Date): string {
  return `${DAY_NL_SHORT[d.getDay()]} ${d.getDate()} ${MONTH_NL[d.getMonth()].toLowerCase()} ${d.getFullYear()}`
}

function timeMinutes(t: string | null): number {
  if (!t) return 0
  const p = t.split(':')
  return +p[0] * 60 + +p[1]
}

function salesTypeLabel(t: SalesEvent['type']): string {
  return ({ meeting: 'Meeting', call: 'Belafspraak', follow_up: 'Follow-up', demo: 'Demo', other: 'Overig' } as const)[t]
}

function salesEvClass(t: SalesEvent['type']): string {
  return ({ meeting: 'ev-meeting', call: 'ev-call', follow_up: 'ev-follow-up', demo: 'ev-demo', other: 'ev-other' } as const)[t]
}

function salesChipClass(t: SalesEvent['type']): string {
  return ({ meeting: 'chip-accent', call: 'chip-success', follow_up: 'chip-warning', demo: 'chip-purple', other: 'chip-neutral' } as const)[t]
}

function prodEvClass(p: ProductionEvent['phase']): string {
  return ({ 'datum-vast': 'ev-datum-vast', 'in-productie': 'ev-in-productie', 'stemmen-open': 'ev-stemmen-open', afgerond: 'ev-afgerond' } as const)[p]
}

function prodChipClass(p: ProductionEvent['phase']): string {
  return ({ 'datum-vast': 'chip-accent', 'in-productie': 'chip-success', 'stemmen-open': 'chip-warning', afgerond: 'chip-neutral' } as const)[p]
}

// ─── Page ───────────────────────────────────────────────────────────────
export default function AgendaPage() {
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const [salesEvents, setSalesEvents] = useState<SalesEvent[]>([])
  const [productions, setProductions] = useState<ProductionEvent[]>([])
  const [loading, setLoading] = useState(true)

  const [view, setView] = useState<'month' | 'week' | 'dag'>('month')
  const [layer, setLayer] = useState<'all' | 'sales' | 'productie'>('all')

  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [viewDay, setViewDay] = useState(today.getDate())

  const [selectedEvent, setSelectedEvent] = useState<AgendaEvent | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  // ── Load data ─────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    const [salesRes, prodRes] = await Promise.all([
      workspaceClient
        .from<SalesEvent[]>('sales_agenda')
        .select('id, title, description, type, date, start_time, end_time, location, status, lead_id, assigned_to')
        .order('date', { ascending: true }),
      fetch('/api/productions').then((r) => (r.ok ? r.json() : [])),
    ])

    const sales: SalesEvent[] = (salesRes.data || []).map((s) => ({
      ...s,
      kind: 'sales' as const,
    }))

    type RawProduction = {
      id: string
      title: string
      description: string | null
      location: string | null
      final_date: string | null
      proposed_dates: string[] | null
      status: 'open' | 'closed'
    }
    const prods: ProductionEvent[] = (prodRes as RawProduction[])
      .filter((p) => p.final_date || (p.proposed_dates && p.proposed_dates.length > 0))
      .map((p) => {
        const date = p.final_date || (p.proposed_dates && p.proposed_dates[0]) || ''
        let phase: ProductionEvent['phase']
        let phaseLabel: string
        if (p.status === 'closed' && p.final_date) {
          const dd = parseDate(p.final_date)
          if (dd < today) {
            phase = 'afgerond'; phaseLabel = 'afgerond'
          } else {
            phase = 'datum-vast'; phaseLabel = 'datum vast'
          }
        } else if (p.final_date) {
          phase = 'in-productie'; phaseLabel = 'in productie'
        } else {
          phase = 'stemmen-open'; phaseLabel = 'stemmen open'
        }
        return {
          kind: 'productie' as const,
          id: p.id,
          title: p.title,
          description: p.description,
          location: p.location,
          date,
          start_time: null,
          end_time: null,
          phase,
          phaseLabel,
        }
      })

    setSalesEvents(sales)
    setProductions(prods)
    setLoading(false)
  }, [today])

  useEffect(() => {
    load()
  }, [load])

  // ── Filtered events ───────────────────────────────────────────────────
  const allEvents: AgendaEvent[] = useMemo(() => {
    const arr: AgendaEvent[] = []
    if (layer !== 'productie') arr.push(...salesEvents)
    if (layer !== 'sales') arr.push(...productions)
    return arr
  }, [salesEvents, productions, layer])

  const eventsForMonth = useMemo(() => {
    return allEvents.filter((e) => {
      if (!e.date) return false
      const d = parseDate(e.date)
      return d.getFullYear() === viewYear && d.getMonth() === viewMonth
    })
  }, [allEvents, viewYear, viewMonth])

  // ── Period label ──────────────────────────────────────────────────────
  const weekStart = useMemo(() => {
    const d = new Date(viewYear, viewMonth, viewDay)
    const dow = (d.getDay() + 6) % 7 // Mon=0
    d.setDate(d.getDate() - dow)
    return d
  }, [viewYear, viewMonth, viewDay])

  const periodLabel = useMemo(() => {
    if (view === 'month') return `${MONTH_NL[viewMonth]} ${viewYear}`
    if (view === 'week') {
      const we = new Date(weekStart); we.setDate(we.getDate() + 6)
      return `${weekStart.getDate()} – ${we.getDate()} ${MONTH_NL[weekStart.getMonth()].toLowerCase()} ${weekStart.getFullYear()}`
    }
    const dd = new Date(viewYear, viewMonth, viewDay)
    return `${DAY_NL_FULL[dd.getDay()]} ${dd.getDate()} ${MONTH_NL[viewMonth].toLowerCase()} ${viewYear}`
  }, [view, viewYear, viewMonth, viewDay, weekStart])

  // ── Navigation ────────────────────────────────────────────────────────
  const prevPeriod = () => {
    if (view === 'month') {
      if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1) }
      else setViewMonth(viewMonth - 1)
    } else if (view === 'week') {
      const d = new Date(weekStart); d.setDate(d.getDate() - 7)
      setViewYear(d.getFullYear()); setViewMonth(d.getMonth()); setViewDay(d.getDate())
    } else {
      const d = new Date(viewYear, viewMonth, viewDay - 1)
      setViewYear(d.getFullYear()); setViewMonth(d.getMonth()); setViewDay(d.getDate())
    }
  }
  const nextPeriod = () => {
    if (view === 'month') {
      if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1) }
      else setViewMonth(viewMonth + 1)
    } else if (view === 'week') {
      const d = new Date(weekStart); d.setDate(d.getDate() + 7)
      setViewYear(d.getFullYear()); setViewMonth(d.getMonth()); setViewDay(d.getDate())
    } else {
      const d = new Date(viewYear, viewMonth, viewDay + 1)
      setViewYear(d.getFullYear()); setViewMonth(d.getMonth()); setViewDay(d.getDate())
    }
  }
  const goToday = () => {
    setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); setViewDay(today.getDate())
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <>
      <style jsx global>{`
        :root {
          --hour-h: 64px;
        }
        .agenda-root { font-size: 14px; line-height: 1.5; color: var(--ink); }
        .nav-btn {
          width: 27px; height: 27px; border: 1px solid var(--edge); border-radius: 50%;
          background: transparent; display: flex; align-items: center; justify-content: center;
          color: var(--ink-ghost); transition: all 130ms; cursor: pointer;
        }
        .nav-btn:hover { border-color: var(--ink-ghost); color: var(--ink-muted); }
        .today-btn {
          font-size: 10.5px; font-weight: 600; color: var(--ink-ghost);
          border: 1px solid var(--edge); background: none;
          padding: 4px 11px; border-radius: 9999px; transition: all 130ms; cursor: pointer;
        }
        .today-btn:hover { border-color: var(--ink-ghost); color: var(--ink-muted); }
        .view-tabs { display: flex; align-items: center; border: 1px solid var(--edge); border-radius: 9999px; background: var(--surface); padding: 2px; }
        .view-tab { font-size: 10.5px; font-weight: 600; color: var(--ink-ghost); border: none; background: none; padding: 4px 14px; border-radius: 9999px; transition: all 130ms; cursor: pointer; }
        .view-tab.active { background: var(--ink); color: #fff; }
        .view-tab:hover:not(.active) { color: var(--ink-muted); }
        .layer-pill { font-size: 10px; font-weight: 600; color: var(--ink-ghost); border: 1px solid var(--edge); background: none; padding: 4px 12px; border-radius: 9999px; transition: all 130ms; cursor: pointer; }
        .layer-pill.active { background: var(--ink); color: #fff; border-color: var(--ink); }
        .layer-pill:hover:not(.active) { border-color: var(--ink-ghost); color: var(--ink-muted); }
        .new-btn { background: var(--accent); color: #fff; border: none; padding: 6px 16px; border-radius: 9999px; font-size: 11px; font-weight: 700; letter-spacing: 0.03em; display: flex; align-items: center; gap: 5px; transition: opacity 130ms; cursor: pointer; }
        .new-btn:hover { opacity: 0.82; }

        /* Calendar grid */
        .cal-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); border-bottom: 1px solid var(--edge); background: var(--surface); }
        .cal-wd { padding: 8px 12px 6px; text-align: center; font-size: 8.5px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink-ghost); border-right: 1px solid var(--edge-soft); }
        .cal-wd:last-child { border-right: none; }
        .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); }
        .cal-cell { min-height: 100px; padding: 8px 10px; border-right: 1px solid var(--edge-soft); border-bottom: 1px solid var(--edge-soft); position: relative; transition: background 110ms; cursor: pointer; }
        .cal-cell:nth-child(7n) { border-right: none; }
        .cal-cell:hover { background: oklch(0.988 0 0); }
        .cal-cell.other-month { background: oklch(0.975 0 0); }
        .cal-cell.other-month .day-num { color: var(--ink-ghost); }
        .cal-cell.is-today { background: var(--accent-tint); }
        .cal-cell.is-today .day-num { color: var(--accent); font-weight: 900; }
        .day-num { font-size: 11px; font-weight: 700; color: var(--ink-muted); font-family: ui-monospace, monospace; margin-bottom: 5px; display: block; }
        .day-today-dot { display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: var(--accent); margin-left: 4px; vertical-align: middle; margin-bottom: 1px; }
        .cal-event { display: block; width: 100%; padding: 3px 7px 3px 6px; margin-bottom: 3px; border-radius: 3px; border-left: 2px solid transparent; font-size: 10px; font-weight: 600; line-height: 1.3; cursor: pointer; transition: opacity 130ms; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; border-style: solid; border-width: 0 0 0 2px; }
        .cal-event:hover { opacity: 0.8; }
        .ev-datum-vast   { background: var(--accent-tint);  border-left-color: var(--accent);     color: var(--accent); }
        .ev-in-productie { background: var(--success-tint, #ecfdf5); border-left-color: #10b981; color: #047857; }
        .ev-stemmen-open { background: var(--warning-tint, #fffbeb); border-left-color: #b45309; color: #b45309; }
        .ev-afgerond     { background: var(--surface);      border-left-color: var(--ink-ghost);  color: var(--ink-ghost); }
        .ev-meeting      { background: var(--accent-tint);  border-left-color: var(--accent);     color: var(--accent); }
        .ev-call         { background: var(--success-tint, #ecfdf5); border-left-color: #10b981; color: #047857; }
        .ev-follow-up    { background: var(--warning-tint, #fffbeb); border-left-color: #b45309; color: #b45309; }
        .ev-demo         { background: oklch(0.96 0.04 295); border-left-color: oklch(0.50 0.18 295); color: oklch(0.50 0.18 295); }
        .ev-other        { background: var(--surface); border-left-color: var(--ink-ghost); color: var(--ink-ghost); border: 1px solid var(--edge); }
        .cal-time { font-size: 9px; font-weight: 500; opacity: 0.7; }

        .legend-bar { display: flex; align-items: center; gap: 16px; padding: 9px 24px; border-bottom: 1px solid var(--edge); background: var(--surface); flex-wrap: wrap; }
        .legend-item { display: flex; align-items: center; gap: 5px; }
        .legend-dot { width: 8px; height: 8px; border-radius: 2px; }
        .legend-label { font-size: 9.5px; font-weight: 600; color: var(--ink-ghost); }
        .legend-sep { width: 1px; height: 14px; background: var(--edge); }
        .legend-total { font-size: 9.5px; color: var(--ink-ghost); margin-left: auto; font-family: ui-monospace, monospace; }

        .list-head { display: flex; align-items: center; justify-content: space-between; padding: 12px 24px; border-bottom: 1px solid var(--edge); }
        .list-eyebrow { font-size: 9px; font-weight: 700; letter-spacing: 0.20em; text-transform: uppercase; color: var(--ink-ghost); }
        .list-meta { font-size: 11px; color: var(--ink-ghost); }
        .date-divider { display: flex; align-items: center; gap: 12px; padding: 7px 24px; background: var(--surface); border-bottom: 1px solid var(--edge-soft); }
        .date-divider-label { font-size: 9.5px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-ghost); white-space: nowrap; }
        .date-divider-line { flex: 1; height: 1px; background: var(--edge-soft); }
        .ev-row { display: grid; grid-template-columns: 24px 1fr 130px 90px 80px; align-items: center; gap: 16px; padding: 13px 24px; border-bottom: 1px solid var(--edge-soft); cursor: pointer; transition: background 110ms; }
        .ev-row:hover { background: oklch(0.988 0 0); }
        .ev-row.past { opacity: 0.5; }
        .ev-type-dot { width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0; }
        .ev-title { font-size: 13px; font-weight: 700; color: var(--ink); }
        .ev-desc { font-size: 11px; color: var(--ink-faint); font-weight: 400; margin-top: 1px; }
        .ev-time-lbl { font-size: 9px; color: var(--ink-ghost); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 2px; }
        .ev-time-val { font-size: 11.5px; font-weight: 600; color: var(--ink-muted); font-family: ui-monospace, monospace; }
        .chip { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 9999px; font-size: 9.5px; font-weight: 600; letter-spacing: 0.025em; white-space: nowrap; }
        .chip-accent { background: var(--accent); color: #fff; }
        .chip-success { background: var(--success-tint, #ecfdf5); color: #047857; }
        .chip-warning { background: var(--warning-tint, #fffbeb); color: #b45309; }
        .chip-purple { background: oklch(0.96 0.04 295); color: oklch(0.50 0.18 295); }
        .chip-neutral { background: var(--surface); color: var(--ink-ghost); border: 1px solid var(--edge); }

        /* Week view */
        .week-header { display: grid; grid-template-columns: 52px repeat(7, 1fr); border-bottom: 1px solid var(--edge); background: var(--surface); }
        .week-gutter { border-right: 1px solid var(--edge); }
        .week-day-hd { padding: 10px 12px 8px; text-align: center; border-right: 1px solid var(--edge-soft); }
        .week-day-hd:last-child { border-right: none; }
        .wdh-wd { font-size: 8.5px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink-ghost); display: block; }
        .wdh-num { font-size: 17px; font-weight: 800; letter-spacing: -0.03em; color: var(--ink-muted); display: block; margin-top: 1px; }
        .wdh-num.today-num { color: #fff; background: var(--accent); border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; margin: 2px auto 0; font-size: 13px; }
        .week-body { display: flex; }
        .week-time-col { width: 52px; flex-shrink: 0; background: var(--surface); border-right: 1px solid var(--edge); }
        .week-time-lbl { height: var(--hour-h); display: flex; align-items: flex-start; justify-content: flex-end; padding: 4px 8px 0; font-size: 9px; font-weight: 600; color: var(--ink-ghost); font-family: ui-monospace, monospace; border-bottom: 1px solid var(--edge-soft); }
        .week-grid { flex: 1; display: grid; grid-template-columns: repeat(7, 1fr); position: relative; }
        .week-day-col { border-right: 1px solid var(--edge-soft); position: relative; }
        .week-day-col:last-child { border-right: none; }
        .week-hour { height: var(--hour-h); border-bottom: 1px solid var(--edge-soft); }
        .week-event { position: absolute; left: 4px; right: 4px; border-radius: 3px; border-left: 2px solid transparent; padding: 3px 6px; font-size: 10px; font-weight: 600; overflow: hidden; cursor: pointer; line-height: 1.3; }

        /* Day view */
        .day-wrap { display: flex; }
        .day-time-col { width: 64px; flex-shrink: 0; background: var(--surface); border-right: 1px solid var(--edge); }
        .day-time-lbl { height: var(--hour-h); display: flex; align-items: flex-start; justify-content: flex-end; padding: 4px 10px 0; font-size: 9px; font-weight: 600; color: var(--ink-ghost); font-family: ui-monospace, monospace; border-bottom: 1px solid var(--edge-soft); }
        .day-events-col { flex: 1; position: relative; }
        .day-hour { height: var(--hour-h); border-bottom: 1px solid var(--edge-soft); position: relative; cursor: pointer; }
        .day-event { position: absolute; left: 12px; right: 12px; border-radius: 4px; border-left: 2px solid transparent; padding: 5px 8px; font-size: 11px; font-weight: 600; cursor: pointer; overflow: hidden; }

        /* Modal */
        .modal-wrap { position: fixed; inset: 0; z-index: 300; background: rgba(5,15,22,0.38); display: flex; align-items: center; justify-content: center; }
        .modal { background: var(--bg, #F9FAFE); border: 1px solid var(--edge); border-radius: 8px; width: 520px; max-height: 90vh; overflow-y: auto; box-shadow: 0 8px 32px rgba(0,0,0,0.18); }
        .modal-head { padding: 20px 24px 16px; border-bottom: 1px solid var(--edge); display: flex; align-items: center; justify-content: space-between; }
        .modal-title { font-size: 14px; font-weight: 800; letter-spacing: -0.02em; }
        .modal-body { padding: 20px 24px; }
        .modal-field { margin-bottom: 18px; }
        .modal-lbl { display: block; font-size: 9px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink-ghost); margin-bottom: 6px; }
        .modal-input { width: 100%; border: 1px solid var(--edge); border-radius: 5px; padding: 9px 12px; font-size: 12px; color: var(--ink); background: var(--bg, #F9FAFE); outline: none; }
        .modal-input:focus { border-color: var(--accent); }
        .modal-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .type-btn { font-size: 10.5px; font-weight: 600; padding: 5px 13px; border-radius: 9999px; border: 1px solid var(--edge); background: none; color: var(--ink-ghost); cursor: pointer; }
        .type-btn.active { background: var(--ink); color: #fff; border-color: var(--ink); }
        .modal-foot { padding: 14px 24px 20px; border-top: 1px solid var(--edge); display: flex; justify-content: flex-end; gap: 10px; }
        .cancel-btn { font-size: 11px; font-weight: 600; padding: 8px 18px; border: 1px solid var(--edge); border-radius: 9999px; background: none; color: var(--ink-muted); cursor: pointer; }
        .save-btn { font-size: 11px; font-weight: 700; padding: 8px 20px; border: none; border-radius: 9999px; background: var(--accent); color: #fff; cursor: pointer; }
        .save-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Detail panel */
        .detail-panel { position: fixed; top: 64px; right: 0; bottom: 0; width: 380px; background: var(--bg, #F9FAFE); border-left: 1px solid var(--edge); z-index: 200; display: flex; flex-direction: column; box-shadow: -8px 0 24px rgba(0,0,0,0.06); }
        .detail-panel-head { padding: 20px 24px 16px; border-bottom: 1px solid var(--edge); display: flex; align-items: flex-start; gap: 12px; }
        .detail-title { font-size: 15px; font-weight: 800; letter-spacing: -0.02em; color: var(--ink); }
        .detail-subtitle { font-size: 11px; color: var(--ink-faint); margin-top: 2px; }
        .detail-section { padding: 16px 24px; border-bottom: 1px solid var(--edge); }
        .detail-lbl { font-size: 8.5px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink-ghost); margin-bottom: 4px; }
        .detail-val { font-size: 12px; color: var(--ink); font-weight: 500; }
        .detail-field { margin-bottom: 12px; }
        .detail-field:last-child { margin-bottom: 0; }
      `}</style>

      <div className="agenda-root">
        {/* ── Toolbar ── */}
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 16, padding: '12px 24px',
            borderBottom: '1px solid var(--edge)', background: 'var(--bg, #F9FAFE)',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.20em', textTransform: 'uppercase', color: 'var(--ink-ghost)' }}>
            Agenda
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button className="nav-btn" onClick={prevPeriod} aria-label="Vorige"><ChevronLeft size={14} /></button>
            <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.015em', color: 'var(--ink)', minWidth: 130, textAlign: 'center' }}>
              {periodLabel}
            </span>
            <button className="nav-btn" onClick={nextPeriod} aria-label="Volgende"><ChevronRight size={14} /></button>
            <button className="today-btn" onClick={goToday}>Vandaag</button>
          </div>
          <div style={{ flex: 1 }} />
          <div className="view-tabs">
            <button className={`view-tab ${view === 'dag' ? 'active' : ''}`} onClick={() => setView('dag')}>Dag</button>
            <button className={`view-tab ${view === 'week' ? 'active' : ''}`} onClick={() => setView('week')}>Week</button>
            <button className={`view-tab ${view === 'month' ? 'active' : ''}`} onClick={() => setView('month')}>Maand</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button className={`layer-pill ${layer === 'all' ? 'active' : ''}`} onClick={() => setLayer('all')}>Alles</button>
            <button className={`layer-pill ${layer === 'sales' ? 'active' : ''}`} onClick={() => setLayer('sales')}>Sales</button>
            <button className={`layer-pill ${layer === 'productie' ? 'active' : ''}`} onClick={() => setLayer('productie')}>Productie</button>
          </div>
          <div style={{ width: 1, height: 18, background: 'var(--edge)' }} />
          <button className="new-btn" onClick={() => setModalOpen(true)}>
            <Plus size={12} strokeWidth={2.5} /> Afspraak plannen
          </button>
        </div>

        {/* ── Views ── */}
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', fontSize: 13, color: 'var(--ink-ghost)' }}>
            Agenda laden…
          </div>
        ) : view === 'month' ? (
          <MonthView
            year={viewYear}
            month={viewMonth}
            today={today}
            events={eventsForMonth}
            layer={layer}
            allEvents={allEvents}
            onSelect={setSelectedEvent}
          />
        ) : view === 'week' ? (
          <WeekView weekStart={weekStart} today={today} salesEvents={salesEvents} layer={layer} onSelect={setSelectedEvent} />
        ) : (
          <DayView year={viewYear} month={viewMonth} day={viewDay} salesEvents={salesEvents} layer={layer} onSelect={setSelectedEvent} />
        )}

        {/* ── Detail panel ── */}
        {selectedEvent && (
          <DetailPanel
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
            onChanged={() => { setSelectedEvent(null); load() }}
          />
        )}

        {/* ── New event modal ── */}
        {modalOpen && (
          <NewEventModal
            onClose={() => setModalOpen(false)}
            onSaved={() => { setModalOpen(false); load() }}
          />
        )}
      </div>
    </>
  )
}

// ─── Month View ─────────────────────────────────────────────────────────
function MonthView({
  year, month, today, events, layer, allEvents, onSelect,
}: {
  year: number; month: number; today: Date
  events: AgendaEvent[]
  layer: 'all' | 'sales' | 'productie'
  allEvents: AgendaEvent[]
  onSelect: (e: AgendaEvent) => void
}) {
  const firstDay = new Date(year, month, 1)
  const startDow = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrev = new Date(year, month, 0).getDate()

  const evMap = useMemo(() => {
    const m: Record<number, AgendaEvent[]> = {}
    events.forEach((e) => {
      const d = parseDate(e.date).getDate()
      if (!m[d]) m[d] = []
      m[d].push(e)
    })
    return m
  }, [events])

  const cells: { day: number; otherMonth: boolean; isToday: boolean; evs: AgendaEvent[] }[] = []
  for (let i = startDow - 1; i >= 0; i--) {
    cells.push({ day: daysInPrev - i, otherMonth: true, isToday: false, evs: [] })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = year === today.getFullYear() && month === today.getMonth() && d === today.getDate()
    cells.push({ day: d, otherMonth: false, isToday, evs: evMap[d] || [] })
  }
  const trailing = (7 - ((startDow + daysInMonth) % 7)) % 7
  for (let t = 1; t <= trailing; t++) {
    cells.push({ day: t, otherMonth: true, isToday: false, evs: [] })
  }

  const grouped = useMemo(() => {
    const g: Record<string, AgendaEvent[]> = {}
    const order: string[] = []
    const sorted = [...events].sort((a, b) => {
      const aT = (a.date || '') + ((a.kind === 'productie' ? a.start_time : (a as SalesEvent).start_time) || '00:00')
      const bT = (b.date || '') + ((b.kind === 'productie' ? b.start_time : (b as SalesEvent).start_time) || '00:00')
      return aT < bT ? -1 : aT > bT ? 1 : 0
    })
    sorted.forEach((e) => {
      if (!g[e.date]) { g[e.date] = []; order.push(e.date) }
      g[e.date].push(e)
    })
    return { g, order }
  }, [events])

  return (
    <>
      <div className="cal-weekdays">
        {['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map((d) => (
          <div key={d} className="cal-wd">{d}</div>
        ))}
      </div>
      <div className="cal-grid">
        {cells.map((c, i) => (
          <div key={i} className={`cal-cell${c.otherMonth ? ' other-month' : ''}${c.isToday ? ' is-today' : ''}`}>
            <span className="day-num">
              {c.day}
              {c.isToday && <span className="day-today-dot" />}
            </span>
            {c.evs.map((e) => (
              <div
                key={e.id}
                className={`cal-event ${e.kind === 'productie' ? prodEvClass(e.phase) : salesEvClass(e.type)}`}
                onClick={() => onSelect(e)}
              >
                {e.title}
                {e.kind === 'sales' && e.start_time && <span className="cal-time"> · {e.start_time.slice(0, 5)}</span>}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="legend-bar">
        {layer !== 'sales' && (
          <>
            <LegendItem color="var(--accent)" label="Datum vast" />
            <LegendItem color="#10b981" label="In productie" />
            <LegendItem color="#b45309" label="Stemmen open" />
            <LegendItem color="var(--ink-ghost)" label="Afgerond" />
          </>
        )}
        {layer === 'all' && <div className="legend-sep" />}
        {layer !== 'productie' && (
          <>
            <LegendItem color="var(--accent)" label="Meeting" />
            <LegendItem color="#10b981" label="Belafspraak" />
            <LegendItem color="#b45309" label="Follow-up" />
            <LegendItem color="oklch(0.50 0.18 295)" label="Demo" />
          </>
        )}
        <span className="legend-total">
          {events.length} evenement{events.length !== 1 ? 'en' : ''} deze maand
          {layer !== 'all' && allEvents.length !== events.length && ` · ${allEvents.length} totaal`}
        </span>
      </div>

      {/* List */}
      <div className="list-head">
        <span className="list-eyebrow">Alle afspraken &amp; producties</span>
        <span className="list-meta">
          {events.length === 0 ? '0 evenementen' : `${events.length} evenement${events.length !== 1 ? 'en' : ''} · gesorteerd op datum`}
        </span>
      </div>
      {events.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', fontSize: 12, color: 'var(--ink-ghost)' }}>
          Geen evenementen voor dit filter.
        </div>
      ) : (
        grouped.order.map((dateStr) => {
          const d = parseDate(dateStr)
          const isPast = d < today && d.toDateString() !== today.toDateString()
          return (
            <div key={dateStr}>
              <div className="date-divider">
                <span className="date-divider-label">
                  {formatDateLong(d)}
                  {isPast && <span style={{ fontSize: 9, color: 'var(--ink-ghost)', marginLeft: 8, fontWeight: 500 }}>verstreken</span>}
                </span>
                <div className="date-divider-line" />
              </div>
              {grouped.g[dateStr].map((e) => (
                <div
                  key={e.id}
                  className={`ev-row${isPast ? ' past' : ''}`}
                  onClick={() => onSelect(e)}
                >
                  <div className="ev-type-dot" style={{ background: dotColor(e) }} />
                  <div>
                    <div className="ev-title">{e.title}</div>
                    <div className="ev-desc">
                      {e.kind === 'productie' ? (e.description || e.location || '') : (e.location || e.description || '')}
                    </div>
                  </div>
                  <div>
                    <span className={`chip ${e.kind === 'productie' ? prodChipClass(e.phase) : salesChipClass(e.type)}`}>
                      {e.kind === 'productie' ? e.phaseLabel : salesTypeLabel(e.type)}
                    </span>
                  </div>
                  <div>
                    <div className="ev-time-lbl">Tijdstip</div>
                    <div className="ev-time-val">
                      {e.kind === 'sales' && e.start_time
                        ? `${e.start_time.slice(0, 5)}${e.end_time ? '–' + e.end_time.slice(0, 5) : ''}`
                        : '—'}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-muted)', fontWeight: 600 }}>
                    {e.kind === 'productie' ? 'Productie' : 'Sales'}
                  </div>
                </div>
              ))}
            </div>
          )
        })
      )}
    </>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="legend-item">
      <div className="legend-dot" style={{ background: color }} />
      <span className="legend-label">{label}</span>
    </div>
  )
}

function dotColor(e: AgendaEvent): string {
  if (e.kind === 'productie') {
    return ({ 'datum-vast': 'var(--accent)', 'in-productie': '#10b981', 'stemmen-open': '#b45309', afgerond: 'var(--ink-ghost)' } as const)[e.phase]
  }
  return ({ meeting: 'var(--accent)', call: '#10b981', follow_up: '#b45309', demo: 'oklch(0.50 0.18 295)', other: 'var(--ink-ghost)' } as const)[e.type]
}

// ─── Week View ──────────────────────────────────────────────────────────
function WeekView({
  weekStart, today, salesEvents, layer, onSelect,
}: {
  weekStart: Date; today: Date
  salesEvents: SalesEvent[]
  layer: 'all' | 'sales' | 'productie'
  onSelect: (e: AgendaEvent) => void
}) {
  const days = [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const d = new Date(weekStart); d.setDate(d.getDate() + i); return d
  })

  const eventsForDate = (d: Date) => {
    if (layer === 'productie') return []
    const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return salesEvents.filter((e) => e.date === ymd && e.start_time)
  }

  return (
    <div>
      <div className="week-header">
        <div className="week-gutter" />
        {days.map((d) => {
          const isToday = d.toDateString() === today.toDateString()
          return (
            <div key={d.toISOString()} className="week-day-hd">
              <span className="wdh-wd">{DAY_NL_SHORT[d.getDay()]}</span>
              <span className={`wdh-num${isToday ? ' today-num' : ''}`}>{d.getDate()}</span>
            </div>
          )
        })}
      </div>
      <div className="week-body">
        <div className="week-time-col">
          {HOURS.map((h) => (
            <div key={h} className="week-time-lbl">{String(h).padStart(2, '0')}:00</div>
          ))}
        </div>
        <div className="week-grid">
          {days.map((d) => {
            const evs = eventsForDate(d)
            return (
              <div key={d.toISOString()} className="week-day-col">
                {HOURS.map((h) => <div key={h} className="week-hour" />)}
                {evs.map((e) => {
                  const startMin = timeMinutes(e.start_time)
                  const endMin = e.end_time ? timeMinutes(e.end_time) : startMin + 60
                  const top = ((startMin - HOURS[0] * 60) / 60) * 64
                  const height = Math.max(28, ((endMin - startMin) / 60) * 64 - 2)
                  return (
                    <div
                      key={e.id}
                      className={`week-event ${salesEvClass(e.type)}`}
                      style={{ top, height }}
                      onClick={() => onSelect(e)}
                    >
                      <div style={{ fontWeight: 700 }}>{e.title}</div>
                      <div style={{ fontSize: 9, opacity: 0.75 }}>
                        {e.start_time?.slice(0, 5)}{e.end_time ? '–' + e.end_time.slice(0, 5) : ''}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Day View ───────────────────────────────────────────────────────────
function DayView({
  year, month, day, salesEvents, layer, onSelect,
}: {
  year: number; month: number; day: number
  salesEvents: SalesEvent[]
  layer: 'all' | 'sales' | 'productie'
  onSelect: (e: AgendaEvent) => void
}) {
  const ymd = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const evs = layer === 'productie' ? [] : salesEvents.filter((e) => e.date === ymd && e.start_time)

  return (
    <div className="day-wrap">
      <div className="day-time-col">
        {HOURS.map((h) => (
          <div key={h} className="day-time-lbl">{String(h).padStart(2, '0')}:00</div>
        ))}
      </div>
      <div className="day-events-col">
        {HOURS.map((h) => <div key={h} className="day-hour" />)}
        {evs.map((e) => {
          const startMin = timeMinutes(e.start_time)
          const endMin = e.end_time ? timeMinutes(e.end_time) : startMin + 60
          const top = ((startMin - HOURS[0] * 60) / 60) * 64
          const height = Math.max(36, ((endMin - startMin) / 60) * 64 - 2)
          return (
            <div
              key={e.id}
              className={`day-event ${salesEvClass(e.type)}`}
              style={{ top, height }}
              onClick={() => onSelect(e)}
            >
              <div style={{ fontWeight: 700 }}>{e.title}</div>
              <div style={{ fontSize: 9.5, opacity: 0.75, fontWeight: 500 }}>
                {e.start_time?.slice(0, 5)}{e.end_time ? '–' + e.end_time.slice(0, 5) : ''}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Detail Panel ───────────────────────────────────────────────────────
function DetailPanel({
  event, onClose, onChanged,
}: {
  event: AgendaEvent
  onClose: () => void
  onChanged: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(event.title)
  const [date, setDate] = useState(event.date)
  const [location, setLocation] = useState(event.location || '')
  const [description, setDescription] = useState(event.description || '')
  // sales-only
  const [startTime, setStartTime] = useState(event.kind === 'sales' ? (event.start_time || '') : '')
  const [endTime, setEndTime] = useState(event.kind === 'sales' ? (event.end_time || '') : '')
  const [salesType, setSalesType] = useState<SalesEvent['type']>(event.kind === 'sales' ? event.type : 'meeting')
  // saving / errors
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cancel = () => {
    setTitle(event.title)
    setDate(event.date)
    setLocation(event.location || '')
    setDescription(event.description || '')
    if (event.kind === 'sales') {
      setStartTime(event.start_time || '')
      setEndTime(event.end_time || '')
      setSalesType(event.type)
    }
    setError(null)
    setEditing(false)
  }

  const save = async () => {
    if (!title.trim()) { setError('Titel is verplicht.'); return }
    setSaving(true); setError(null)
    try {
      if (event.kind === 'sales') {
        const { error: dbErr } = await workspaceClient
          .from('sales_agenda')
          .update({
            title: title.trim(),
            description: description.trim() || null,
            type: salesType,
            date,
            start_time: startTime || null,
            end_time: endTime || null,
            location: location.trim() || null,
          })
          .eq('id', event.id)
        if (dbErr) throw new Error(dbErr.message || 'Opslaan mislukt.')
      } else {
        const res = await fetch(`/api/productions/${event.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || null,
            location: location.trim() || null,
            final_date: date || null,
          }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Opslaan mislukt.')
        }
      }
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Opslaan mislukt.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!confirm('Weet je zeker dat je deze afspraak wilt verwijderen?')) return
    setDeleting(true); setError(null)
    try {
      if (event.kind === 'sales') {
        const { error: dbErr } = await workspaceClient
          .from('sales_agenda')
          .delete()
          .eq('id', event.id)
        if (dbErr) throw new Error(dbErr.message || 'Verwijderen mislukt.')
      } else {
        const res = await fetch(`/api/productions/${event.id}`, { method: 'DELETE' })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Verwijderen mislukt.')
        }
      }
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verwijderen mislukt.')
      setDeleting(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    border: '1px solid var(--edge)', borderRadius: 5,
    padding: '8px 10px', fontSize: 13, color: 'var(--ink)',
    background: '#fff', outline: 'none',
  }

  const types: { value: SalesEvent['type']; label: string }[] = [
    { value: 'meeting', label: 'Meeting' },
    { value: 'call', label: 'Belafspraak' },
    { value: 'follow_up', label: 'Follow-up' },
    { value: 'demo', label: 'Demo' },
    { value: 'other', label: 'Overig' },
  ]

  return (
    <div className="detail-panel">
      <div className="detail-panel-head">
        <div
          style={{
            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: dotColor(event), color: '#fff', fontSize: 13, fontWeight: 800,
          }}
        >
          {event.kind === 'productie' ? 'P' : 'S'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="detail-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {editing ? title || '—' : event.title}
          </div>
          <div className="detail-subtitle">
            {event.kind === 'productie' ? event.phaseLabel : salesTypeLabel(event.type)}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ border: 'none', background: 'none', color: 'var(--ink-ghost)', cursor: 'pointer', padding: 2 }}
          aria-label="Sluiten"
        >
          <X size={18} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {error && (
          <div style={{ background: 'var(--danger-tint)', border: '1px solid var(--danger)', padding: '8px 12px', borderRadius: 5, fontSize: 12, color: 'var(--danger)', margin: '12px 24px 0' }}>
            {error}
          </div>
        )}

        {editing ? (
          <div className="detail-section" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div className="detail-lbl">Titel</div>
              <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            {event.kind === 'sales' && (
              <div>
                <div className="detail-lbl">Type</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {types.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      className={`type-btn${salesType === t.value ? ' active' : ''}`}
                      onClick={() => setSalesType(t.value)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <div className="detail-lbl">Datum</div>
              <input style={inputStyle} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            {event.kind === 'sales' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div className="detail-lbl">Begintijd</div>
                  <input style={inputStyle} type="time" value={startTime ? startTime.slice(0, 5) : ''} onChange={(e) => setStartTime(e.target.value)} />
                </div>
                <div>
                  <div className="detail-lbl">Eindtijd</div>
                  <input style={inputStyle} type="time" value={endTime ? endTime.slice(0, 5) : ''} onChange={(e) => setEndTime(e.target.value)} />
                </div>
              </div>
            )}
            <div>
              <div className="detail-lbl">Locatie</div>
              <input style={inputStyle} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Amsterdam / Online" />
            </div>
            <div>
              <div className="detail-lbl">Notities</div>
              <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 70 }} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>
        ) : (
          <div className="detail-section">
            <div className="detail-field">
              <div className="detail-lbl">Datum</div>
              <div className="detail-val">{event.date ? formatDateLong(parseDate(event.date)) : '—'}</div>
            </div>
            {event.kind === 'sales' && event.start_time && (
              <div className="detail-field">
                <div className="detail-lbl">Tijdstip</div>
                <div className="detail-val">
                  {event.start_time.slice(0, 5)}{event.end_time ? '–' + event.end_time.slice(0, 5) : ''}
                </div>
              </div>
            )}
            {event.location && (
              <div className="detail-field">
                <div className="detail-lbl">Locatie</div>
                <div className="detail-val">{event.location}</div>
              </div>
            )}
            {event.description && (
              <div className="detail-field">
                <div className="detail-lbl">Notities</div>
                <div className="detail-val" style={{ whiteSpace: 'pre-wrap' }}>{event.description}</div>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ padding: '14px 24px 18px', borderTop: '1px solid var(--edge)', display: 'flex', gap: 8, justifyContent: 'space-between' }}>
        {editing ? (
          <>
            <button
              onClick={cancel}
              disabled={saving}
              style={{ fontSize: 11, fontWeight: 600, padding: '8px 16px', border: '1px solid var(--edge)', borderRadius: 9999, background: 'none', color: 'var(--ink-muted)', cursor: 'pointer' }}
            >
              Annuleren
            </button>
            <button
              onClick={save}
              disabled={saving}
              style={{ fontSize: 11, fontWeight: 700, padding: '8px 18px', border: 'none', borderRadius: 9999, background: 'var(--accent)', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}
            >
              {saving ? 'Opslaan…' : 'Opslaan'}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={remove}
              disabled={deleting}
              style={{ fontSize: 11, fontWeight: 600, padding: '8px 14px', border: '1px solid var(--edge)', borderRadius: 9999, background: 'none', color: 'var(--danger)', cursor: 'pointer' }}
            >
              {deleting ? 'Verwijderen…' : 'Verwijderen'}
            </button>
            <button
              onClick={() => setEditing(true)}
              style={{ fontSize: 11, fontWeight: 700, padding: '8px 18px', border: 'none', borderRadius: 9999, background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}
            >
              Bewerken
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── New Event Modal (writes to sales_agenda) ───────────────────────────
function NewEventModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<SalesEvent['type']>('meeting')
  const today = new Date()
  const todayYmd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const [date, setDate] = useState(todayYmd)
  const [start, setStart] = useState('10:00')
  const [end, setEnd] = useState('11:00')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    if (!title.trim()) {
      setError('Titel is verplicht.')
      return
    }
    setSaving(true)
    setError(null)
    const { error: dbErr } = await workspaceClient
      .from('sales_agenda')
      .insert([{
        title: title.trim(),
        description: notes.trim() || null,
        type,
        date,
        start_time: start,
        end_time: end,
        location: location.trim() || null,
        status: 'scheduled',
      }])
    setSaving(false)
    if (dbErr) {
      setError(dbErr.message || 'Opslaan mislukt.')
      return
    }
    onSaved()
  }

  const types: { value: SalesEvent['type']; label: string }[] = [
    { value: 'meeting', label: 'Meeting' },
    { value: 'call', label: 'Belafspraak' },
    { value: 'follow_up', label: 'Follow-up' },
    { value: 'demo', label: 'Demo' },
    { value: 'other', label: 'Overig' },
  ]

  return (
    <div className="modal-wrap" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span className="modal-title">Afspraak plannen</span>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--ink-ghost)' }} aria-label="Sluiten">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          {error && (
            <div style={{ background: 'var(--danger-tint)', border: '1px solid var(--danger)', padding: '8px 12px', borderRadius: 5, fontSize: 12, color: 'var(--danger)', marginBottom: 16 }}>
              {error}
            </div>
          )}
          <div className="modal-field">
            <label className="modal-lbl">Titel</label>
            <input className="modal-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Bijv. Kennismaking Studio Noord" />
          </div>
          <div className="modal-field">
            <label className="modal-lbl">Type</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {types.map((t) => (
                <button key={t.value} className={`type-btn${type === t.value ? ' active' : ''}`} onClick={() => setType(t.value)}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="modal-row modal-field">
            <div>
              <label className="modal-lbl">Datum</label>
              <input className="modal-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className="modal-lbl">Begintijd</label>
              <input className="modal-input" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
          </div>
          <div className="modal-row modal-field">
            <div>
              <label className="modal-lbl">Eindtijd</label>
              <input className="modal-input" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
            <div>
              <label className="modal-lbl">Locatie</label>
              <input className="modal-input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Amsterdam / Online" />
            </div>
          </div>
          <div className="modal-field">
            <label className="modal-lbl">Notities</label>
            <textarea
              className="modal-input"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Agendapunten, aandachtspunten…"
              style={{ resize: 'vertical' }}
            />
          </div>
        </div>
        <div className="modal-foot">
          <button className="cancel-btn" onClick={onClose}>Annuleren</button>
          <button className="save-btn" onClick={save} disabled={saving}>
            {saving ? 'Opslaan…' : 'Afspraak opslaan'}
          </button>
        </div>
      </div>
    </div>
  )
}
