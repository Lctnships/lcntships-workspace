'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { Camera, Video, Calendar, Plus, X, Users, Clock, Loader2 } from 'lucide-react'
import { workspaceClient } from '@/lib/workspace-client'
import { profilesApi } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────
type Production = {
  id: string
  title: string
  description: string | null
  location: string | null
  proposed_dates: string[] | null
  final_date: string | null
  status: 'open' | 'closed'
  lead_id: string | null
  created_at: string
}

type SalesLead = {
  id: string
  company_name: string
  status: 'cold' | 'warm' | 'hot' | 'voicemail' | 'negotiation' | 'closed' | 'lost'
  updated_at: string | null
  created_at: string | null
}

type Todo = {
  id: string
  title: string
  assigned_to_email: string | null
  assigned_to_name: string | null
  due_date: string | null
  done: boolean
  completed_at: string | null
  created_at: string
}

type TeamMember = {
  id: string
  full_name: string | null
  email: string | null
}

type ActivityRow = {
  id: string
  type: string
  summary: string | null
  created_at: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function greeting(): string {
  const h = new Date().getHours()
  if (h < 6) return 'Goedenacht'
  if (h < 12) return 'Goedemorgen'
  if (h < 18) return 'Goedemiddag'
  return 'Goedenavond'
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function formatShort(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diffMs / 60000)
  if (m < 60) return `${m} min geleden`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} uur geleden`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d} ${d === 1 ? 'dag' : 'dagen'} geleden`
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

function getProductionPhase(p: Production, today: Date): { label: string; tone: 'accent' | 'success' | 'warning' | 'neutral' } {
  if (p.status === 'closed' && p.final_date) {
    const finalDate = new Date(p.final_date)
    if (finalDate < today) return { label: 'afgerond', tone: 'neutral' }
    return { label: 'datum vast', tone: 'accent' }
  }
  if (p.final_date) return { label: 'in productie', tone: 'success' }
  return { label: 'stemmen open', tone: 'warning' }
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [productions, setProductions] = useState<Production[]>([])
  const [salesLeads, setSalesLeads] = useState<SalesLead[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [activities, setActivities] = useState<ActivityRow[]>([])

  const today = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const profile = await profilesApi.getCurrent().catch(() => null)
      if (!cancelled && profile?.full_name) {
        setUserName(profile.full_name.split(' ')[0])
      }
      if (!cancelled && profile && 'email' in profile && typeof profile.email === 'string') {
        setUserEmail(profile.email)
      }

      const [prodRes, leadsRes, todosRes, actRes] = await Promise.all([
        fetch('/api/productions').then(r => r.ok ? r.json() : []).catch(() => []),
        workspaceClient
          .from<SalesLead[]>('sales_leads')
          .select('id, company_name, status, updated_at, created_at'),
        workspaceClient
          .from<Todo[]>('workspace_todos')
          .select('id, title, due_date, done, assigned_to_name')
          .order('done', { ascending: true })
          .order('due_date', { ascending: true })
          .limit(20),
        workspaceClient
          .from<ActivityRow[]>('lead_activities')
          .select('id, type, summary, created_at')
          .order('created_at', { ascending: false })
          .limit(6)
          .then((r: { data: ActivityRow[] | null }) => r)
          .catch(() => ({ data: [] as ActivityRow[] })),
      ])

      if (cancelled) return
      setProductions((prodRes as Production[]) || [])
      setSalesLeads((leadsRes.data as SalesLead[]) || [])
      setTodos((todosRes.data as Todo[]) || [])
      setActivities((actRes.data as ActivityRow[]) || [])
    }
    load()
    return () => { cancelled = true }
  }, [])

  // ── Derived ─────────────────────────────────────────────────────────────────
  const studiosInPipeline = salesLeads.filter(l => l.status === 'closed').length
  const studiosGoal = 1000

  const activeProductions = productions.filter(p => p.status !== 'closed' || (p.final_date && new Date(p.final_date) >= today))
  const newFromSales = productions.filter(p => !p.final_date && (!p.proposed_dates || p.proposed_dates.length === 0)).length
  const datumVast = productions.filter(p => p.status === 'closed' && p.final_date && new Date(p.final_date) >= today).length
  const inProductie = productions.filter(p => p.final_date && p.status !== 'closed').length

  // Shoots this month
  const thisMonthShoots = productions.filter(p => {
    if (!p.final_date) return false
    const d = new Date(p.final_date)
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear() && d >= today
  })
  const nextShoot = thisMonthShoots.sort((a, b) => (a.final_date! < b.final_date! ? -1 : 1))[0]

  // Open todos today
  const openTodos = todos.filter(t => !t.done)
  const overdueTodos = openTodos.filter(t => t.due_date && new Date(t.due_date) < today)

  // Upcoming shoots (next 4)
  const upcomingShoots = useMemo(() => {
    return [...productions]
      .filter(p => p.final_date)
      .filter(p => new Date(p.final_date!) >= today)
      .sort((a, b) => (a.final_date! < b.final_date! ? -1 : 1))
      .slice(0, 4)
  }, [productions, today])

  // Pipeline counts
  const pipeNew = salesLeads.filter(l => l.status === 'cold').length
  const pipeContacted = salesLeads.filter(l => ['warm', 'voicemail'].includes(l.status)).length
  const pipeMeeting = salesLeads.filter(l => ['hot', 'negotiation'].includes(l.status)).length
  const pipeClosed = studiosInPipeline

  const todayLabel = useMemo(() => {
    return new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }, [])

  return (
    <div
      style={{
        margin: '-16px -16px 0',
        minHeight: 'calc(100vh - 64px)',
        background: 'var(--bg, #F9FAFE)',
      }}
    >
      <style jsx>{`
        .db-kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid var(--edge); margin-bottom: 30px; background: #fff; }
        .db-kpi-cell { padding: 20px 22px; border-right: 1px solid var(--edge); }
        .db-kpi-cell:last-child { border-right: none; }
        .db-kpi-label { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.20em; color: var(--ink-ghost); margin-bottom: 8px; }
        .db-kpi-value { font-size: 32px; font-weight: 800; letter-spacing: -0.03em; line-height: 1; color: var(--ink); }
        .db-kpi-value.danger { color: var(--danger); }
        .db-kpi-sub { font-size: 10.5px; color: var(--ink-ghost); margin-top: 4px; }
        .db-kpi-bar { margin-top: 10px; height: 3px; background: var(--edge); border-radius: 2px; }
        .db-kpi-bar-fill { height: 100%; background: var(--accent); border-radius: 2px; transition: width 0.4s; }

        .db-section-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.20em; color: var(--ink-ghost); margin-bottom: 10px; }
        .db-list-card { border: 1px solid var(--edge); background: #fff; }
        :global(.db-list-row) { display: flex !important; align-items: center; gap: 11px; padding: 12px 16px; border-bottom: 1px solid var(--edge-soft); cursor: pointer; transition: background 100ms; text-decoration: none; color: inherit; }
        :global(.db-list-row:last-child) { border-bottom: none; }
        :global(.db-list-row:hover) { background: oklch(0.988 0 0); }

        .db-row-icon { width: 34px; height: 34px; border-radius: 4px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .db-row-body { flex: 1; min-width: 0; }
        .db-row-title { font-size: 12.5px; font-weight: 700; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .db-row-sub { font-size: 10.5px; color: var(--ink-ghost); margin-top: 1px; }

        .db-phase-chip { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 9999px; font-size: 9px; font-weight: 700; text-transform: lowercase; white-space: nowrap; flex-shrink: 0; margin-left: auto; }
        .phase-accent { background: var(--accent); color: #fff; }
        .phase-success { background: oklch(0.96 0.04 145); color: oklch(0.65 0.16 145); }
        .phase-warning { background: oklch(0.97 0.05 72); color: oklch(0.50 0.14 65); }
        .phase-neutral { background: var(--surface); color: var(--ink-ghost); border: 1px solid var(--edge); }

        .db-task-row { display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-bottom: 1px solid var(--edge-soft); cursor: pointer; transition: background 100ms; }
        .db-task-row:last-child { border-bottom: none; }
        .db-task-row:hover { background: oklch(0.988 0 0); }
        .db-task-check { width: 12px; height: 12px; border-radius: 3px; border: 1.5px solid var(--edge); flex-shrink: 0; }
        .db-task-check.urgent { border-color: var(--danger); }
        .db-task-title { font-size: 12px; font-weight: 600; color: var(--ink); }
        .db-task-meta { font-size: 10px; color: var(--ink-ghost); margin-top: 1px; }
        .db-task-meta.urgent { color: var(--danger); font-weight: 600; }

        .db-pipe-card { border: 1px solid var(--edge); background: #fff; }
        .db-pipe-bar-row { padding: 16px 18px; border-bottom: 1px solid var(--edge-soft); }
        .db-pipe-bar-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .db-pipe-bar-label { font-size: 11.5px; font-weight: 600; color: var(--ink-muted); }
        .db-pipe-bar-val { font-size: 11px; font-family: ui-monospace, monospace; font-weight: 700; color: var(--ink-muted); }
        .db-pipe-track { height: 4px; background: var(--edge); border-radius: 2px; }
        .db-pipe-fill { height: 100%; background: var(--accent); border-radius: 2px; transition: width 0.4s; }
        .db-pipe-quad { display: grid; grid-template-columns: 1fr 1fr; }
        .db-pipe-quad-cell { padding: 12px 18px; border-bottom: 1px solid var(--edge-soft); border-right: 1px solid var(--edge-soft); }
        .db-pipe-quad-cell:nth-child(even) { border-right: none; }
        .db-pipe-quad-cell:nth-child(3), .db-pipe-quad-cell:nth-child(4) { border-bottom: none; }
        .db-pqc-label { font-size: 7.5px; text-transform: uppercase; letter-spacing: 0.16em; font-weight: 700; color: var(--ink-ghost); margin-bottom: 3px; }
        .db-pqc-val { font-size: 20px; font-weight: 800; color: var(--ink); }
        .db-pqc-val.success { color: oklch(0.65 0.16 145); }

        .db-feed-card { border: 1px solid var(--edge); background: #fff; }
        .db-feed-row { display: flex; align-items: flex-start; gap: 9px; padding: 10px 16px; border-bottom: 1px solid var(--edge-soft); }
        .db-feed-row:last-child { border-bottom: none; }
        .db-fdot { width: 6px; height: 6px; border-radius: 50%; margin-top: 4px; flex-shrink: 0; }
        .db-feed-txt { font-size: 11px; color: var(--ink-muted); line-height: 1.4; }
        .db-feed-time { font-size: 9.5px; color: var(--ink-ghost); margin-top: 2px; }
      `}</style>

      <div style={{ padding: '36px 40px 40px' }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.20em', textTransform: 'uppercase', color: 'var(--ink-ghost)', marginBottom: 6 }}>
          {todayLabel}
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.022em', color: 'var(--ink)', marginBottom: 32, fontFamily: 'inherit' }}>
          {greeting()}{userName ? `, ${userName}` : ''}.
        </h1>

        {/* KPI grid */}
        <div className="db-kpi-grid">
          <div className="db-kpi-cell">
            <div className="db-kpi-label">Studios in pipeline</div>
            <div className="db-kpi-value">{studiosInPipeline}</div>
            <div className="db-kpi-sub">van {studiosGoal.toLocaleString('nl-NL')} doel</div>
            <div className="db-kpi-bar">
              <div className="db-kpi-bar-fill" style={{ width: `${Math.min(100, (studiosInPipeline / studiosGoal) * 100)}%` }} />
            </div>
          </div>
          <div className="db-kpi-cell">
            <div className="db-kpi-label">Actieve producties</div>
            <div className="db-kpi-value">{activeProductions.length}</div>
            <div className="db-kpi-sub">
              {newFromSales > 0 && `${newFromSales} nieuw van sales`}
              {newFromSales > 0 && (datumVast > 0 || inProductie > 0) && ' · '}
              {datumVast > 0 && `${datumVast} datum vast`}
              {datumVast > 0 && inProductie > 0 && ' · '}
              {inProductie > 0 && `${inProductie} in prod.`}
              {activeProductions.length === 0 && 'Geen actieve producties'}
            </div>
          </div>
          <div className="db-kpi-cell">
            <div className="db-kpi-label">Shoots deze maand</div>
            <div className="db-kpi-value">{thisMonthShoots.length}</div>
            <div className="db-kpi-sub">
              {nextShoot && nextShoot.final_date ? `volgende: ${formatShort(nextShoot.final_date)}` : 'Geen geplande shoots'}
            </div>
          </div>
          <div className="db-kpi-cell">
            <div className="db-kpi-label">Open taken vandaag</div>
            <div className={`db-kpi-value${overdueTodos.length > 0 ? ' danger' : ''}`}>{openTodos.length}</div>
            <div className="db-kpi-sub">
              {overdueTodos.length > 0 ? `${overdueTodos.length} overschreden` : 'Geen overschreden'}
            </div>
          </div>
        </div>

        {/* Volgende shoots + Open taken */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
          <div>
            <div className="db-section-label">Volgende shoots</div>
            <div className="db-list-card">
              {upcomingShoots.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--ink-ghost)' }}>
                  Geen geplande shoots.
                </div>
              ) : (
                upcomingShoots.map(p => {
                  const phase = getProductionPhase(p, today)
                  return (
                    <Link key={p.id} href={`/marketing/agenda/${p.id}`} className="db-list-row">
                      <div className="db-row-icon" style={{ background: phase.tone === 'accent' ? 'var(--accent-tint)' : phase.tone === 'success' ? 'oklch(0.96 0.04 145)' : phase.tone === 'warning' ? 'oklch(0.97 0.05 72)' : 'var(--surface)' }}>
                        {phase.tone === 'accent' ? <Camera style={{ width: 15, height: 15, color: 'var(--accent)' }} /> :
                         phase.tone === 'success' ? <Video style={{ width: 15, height: 15, color: 'oklch(0.65 0.16 145)' }} /> :
                         <Calendar style={{ width: 15, height: 15, color: 'oklch(0.50 0.14 65)' }} />}
                      </div>
                      <div className="db-row-body">
                        <div className="db-row-title">{p.title}</div>
                        <div className="db-row-sub">
                          {p.final_date ? formatShort(p.final_date) : 'Datum open'}
                          {p.location && ` · ${p.location}`}
                        </div>
                      </div>
                      <span className={`db-phase-chip phase-${phase.tone}`}>{phase.label}</span>
                    </Link>
                  )
                })
              )}
            </div>
          </div>

          <TodoCard userEmail={userEmail} todos={todos} setTodos={setTodos} today={today} />
        </div>

        {/* Sales pipeline + Recente activiteit */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <div className="db-section-label">Sales pipeline</div>
            <div className="db-pipe-card">
              <div className="db-pipe-bar-row">
                <div className="db-pipe-bar-head">
                  <span className="db-pipe-bar-label">Voortgang naar {studiosGoal.toLocaleString('nl-NL')} studios</span>
                  <span className="db-pipe-bar-val">{studiosInPipeline} / {studiosGoal}</span>
                </div>
                <div className="db-pipe-track">
                  <div className="db-pipe-fill" style={{ width: `${Math.min(100, (studiosInPipeline / studiosGoal) * 100)}%` }} />
                </div>
              </div>
              <div className="db-pipe-quad">
                <div className="db-pipe-quad-cell">
                  <div className="db-pqc-label">Nieuw</div>
                  <div className="db-pqc-val">{pipeNew}</div>
                </div>
                <div className="db-pipe-quad-cell">
                  <div className="db-pqc-label">Benaderd</div>
                  <div className="db-pqc-val">{pipeContacted}</div>
                </div>
                <div className="db-pipe-quad-cell">
                  <div className="db-pqc-label">Afspraak</div>
                  <div className="db-pqc-val">{pipeMeeting}</div>
                </div>
                <div className="db-pipe-quad-cell">
                  <div className="db-pqc-label">Gesloten</div>
                  <div className="db-pqc-val success">{pipeClosed}</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="db-section-label">Recente activiteit</div>
            <div className="db-feed-card">
              {activities.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--ink-ghost)' }}>
                  Geen recente activiteit.
                </div>
              ) : (
                activities.map(a => (
                  <div key={a.id} className="db-feed-row">
                    <div className="db-fdot" style={{
                      background: a.type === 'call' ? 'oklch(0.65 0.16 145)' :
                                 a.type === 'email' ? 'var(--accent-bright, #08B9EE)' :
                                 a.type === 'voicemail' ? 'oklch(0.60 0.20 280)' :
                                 a.type === 'meeting' ? 'var(--accent)' :
                                 'var(--ink-ghost)'
                    }} />
                    <div>
                      <div className="db-feed-txt">{a.summary || a.type}</div>
                      <div className="db-feed-time">{relativeTime(a.created_at)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--edge)', padding: '10px 40px', marginTop: 'auto' }}>
        <span style={{ fontSize: 11, color: 'var(--ink-ghost)', fontFamily: 'ui-monospace, monospace' }}>
          Lctnships Workspace · Dashboard · {formatDate(new Date().toISOString())}
        </span>
      </div>
    </div>
  )
}

// ─── TodoCard ─────────────────────────────────────────────────────────────────
function TodoCard({
  userEmail,
  todos,
  setTodos,
  today,
}: {
  userEmail: string | null
  todos: Todo[]
  setTodos: React.Dispatch<React.SetStateAction<Todo[]>>
  today: Date
}) {
  const [team, setTeam] = useState<TeamMember[]>([])
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newAssignee, setNewAssignee] = useState('')
  const [newDue, setNewDue] = useState('')
  const [filter, setFilter] = useState<'mine' | 'open' | 'all' | 'done'>('open')
  const [saving, setSaving] = useState(false)

  const loadTeam = useCallback(async () => {
    const { data } = await workspaceClient
      .from<TeamMember[]>('team_members')
      .select('id, full_name, email')
      .order('full_name', { ascending: true })
    if (data) setTeam(data as TeamMember[])
  }, [])

  useEffect(() => { loadTeam() }, [loadTeam])

  const reloadTodos = useCallback(async () => {
    const { data } = await workspaceClient
      .from<Todo[]>('workspace_todos')
      .select('id, title, assigned_to_email, assigned_to_name, due_date, done, completed_at, created_at')
      .order('done', { ascending: true })
      .order('due_date', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(40)
    if (data) setTodos(data as Todo[])
  }, [setTodos])

  const submit = async () => {
    if (!newTitle.trim()) return
    setSaving(true)
    const assignee = team.find(t => t.email === newAssignee)
    await workspaceClient.from('workspace_todos').insert({
      title: newTitle.trim(),
      assigned_to_email: newAssignee || null,
      assigned_to_name: assignee?.full_name ?? null,
      assigned_by_email: userEmail,
      due_date: newDue || null,
    })
    setNewTitle(''); setNewAssignee(''); setNewDue('')
    setAdding(false)
    setSaving(false)
    await reloadTodos()
  }

  const toggle = async (t: Todo) => {
    // Optimistic
    setTodos(prev => prev.map(x => x.id === t.id ? { ...x, done: !x.done, completed_at: !x.done ? new Date().toISOString() : null } : x))
    await workspaceClient
      .from('workspace_todos')
      .update({
        done: !t.done,
        completed_at: !t.done ? new Date().toISOString() : null,
      })
      .eq('id', t.id)
  }

  const remove = async (id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id))
    await workspaceClient.from('workspace_todos').delete().eq('id', id)
  }

  const filtered = todos.filter(t => {
    if (filter === 'mine') return userEmail && t.assigned_to_email === userEmail
    if (filter === 'open') return !t.done
    if (filter === 'done') return t.done
    return true
  })

  const isOverdue = (t: Todo) => !t.done && t.due_date && new Date(t.due_date) < today
  const isDueToday = (t: Todo) => {
    if (t.done || !t.due_date) return false
    const d = new Date(t.due_date)
    return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
  }

  return (
    <div>
      <style jsx>{`
        .tc-filter-pills { display: inline-flex; background: var(--surface); border-radius: 6px; padding: 2px; gap: 0; border: 1px solid var(--edge); }
        .tc-filter-pill { padding: 3px 10px; border: none; background: transparent; font-size: 10.5px; font-weight: 600; color: var(--ink-ghost); border-radius: 4px; cursor: pointer; transition: all 120ms; }
        .tc-filter-pill.active { background: #fff; color: var(--ink); box-shadow: 0 1px 2px rgba(0,0,0,0.06); }
        .tc-new-btn { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border: 1px solid var(--edge); background: #fff; font-size: 10.5px; font-weight: 600; color: var(--ink-muted); border-radius: 6px; cursor: pointer; transition: all 120ms; }
        .tc-new-btn:hover { border-color: var(--ink-ghost); color: var(--ink); }
        .tc-add-box { padding: 10px 14px; background: var(--surface); border: 1px solid var(--edge); border-radius: 4px; margin-bottom: 8px; display: flex; flex-direction: column; gap: 6px; }
        .tc-input { width: 100%; box-sizing: border-box; border: 1px solid var(--edge); border-radius: 4px; padding: 6px 9px; font-size: 12px; color: var(--ink); background: #fff; outline: none; font-family: inherit; }
        .tc-input:focus { border-color: var(--accent); }
        .tc-add-actions { display: flex; gap: 6px; justify-content: flex-end; }
        .tc-add-cancel { padding: 4px 10px; border: none; background: none; font-size: 11px; font-weight: 600; color: var(--ink-ghost); cursor: pointer; border-radius: 4px; }
        .tc-add-cancel:hover { color: var(--ink); }
        .tc-add-save { padding: 4px 12px; border: none; background: var(--accent); color: #fff; font-size: 11px; font-weight: 700; cursor: pointer; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; }
        .tc-add-save:disabled { opacity: 0.5; cursor: not-allowed; }
        .tc-row { display: flex; align-items: flex-start; gap: 9px; padding: 10px 14px; border-bottom: 1px solid var(--edge-soft); transition: background 100ms; }
        .tc-row:last-child { border-bottom: none; }
        .tc-row:hover { background: oklch(0.988 0 0); }
        .tc-row:hover .tc-remove { opacity: 1; }
        .tc-row.overdue { background: oklch(0.97 0.03 27); }
        .tc-row.today { background: oklch(0.97 0.05 72); }
        .tc-row.done { opacity: 0.55; }
        .tc-check { width: 13px; height: 13px; margin-top: 1px; flex-shrink: 0; cursor: pointer; accent-color: var(--accent); }
        .tc-body { flex: 1; min-width: 0; }
        .tc-title { font-size: 12.5px; font-weight: 600; color: var(--ink); }
        .tc-title.done { text-decoration: line-through; color: var(--ink-ghost); }
        .tc-meta { display: flex; align-items: center; gap: 10px; margin-top: 2px; font-size: 10.5px; color: var(--ink-ghost); flex-wrap: wrap; }
        .tc-meta .tc-meta-item { display: inline-flex; align-items: center; gap: 3px; }
        .tc-meta.overdue { color: var(--danger); font-weight: 600; }
        .tc-meta.today { color: oklch(0.50 0.14 65); font-weight: 600; }
        .tc-remove { background: none; border: none; color: var(--ink-ghost); cursor: pointer; padding: 2px; opacity: 0; transition: opacity 120ms, color 120ms; }
        .tc-remove:hover { color: var(--danger); }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div className="db-section-label" style={{ marginBottom: 0 }}>Open taken</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="tc-filter-pills">
            {(['mine', 'open', 'all', 'done'] as const).map(f => (
              <button
                key={f}
                className={`tc-filter-pill${filter === f ? ' active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'mine' ? 'Mijn' : f === 'open' ? 'Open' : f === 'all' ? 'Alles' : 'Klaar'}
              </button>
            ))}
          </div>
          <button className="tc-new-btn" onClick={() => setAdding(!adding)}>
            <Plus style={{ width: 11, height: 11 }} />
            Nieuw
          </button>
        </div>
      </div>

      {adding && (
        <div className="tc-add-box">
          <input
            className="tc-input"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Wat moet er gedaan worden?"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter' && newTitle.trim()) submit() }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <select
              className="tc-input"
              value={newAssignee}
              onChange={(e) => setNewAssignee(e.target.value)}
            >
              <option value="">— Niemand toegewezen —</option>
              {team.map(t => (
                <option key={t.id} value={t.email ?? ''}>
                  {t.full_name ?? t.email ?? '?'}
                </option>
              ))}
            </select>
            <input
              type="date"
              className="tc-input"
              value={newDue}
              onChange={(e) => setNewDue(e.target.value)}
            />
          </div>
          <div className="tc-add-actions">
            <button className="tc-add-cancel" onClick={() => { setAdding(false); setNewTitle(''); setNewAssignee(''); setNewDue('') }}>
              Annuleren
            </button>
            <button className="tc-add-save" onClick={submit} disabled={saving || !newTitle.trim()}>
              {saving && <Loader2 style={{ width: 11, height: 11 }} className="animate-spin" />}
              Toevoegen
            </button>
          </div>
        </div>
      )}

      <div className="db-list-card">
        {filtered.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--ink-ghost)' }}>
            {filter === 'mine' ? 'Geen taken toegewezen aan jou.' :
             filter === 'open' ? 'Geen open taken — top!' :
             filter === 'done' ? 'Nog niets afgerond.' : 'Nog geen taken.'}
          </div>
        ) : (
          filtered.map(t => {
            const overdue = isOverdue(t)
            const dueToday = isDueToday(t)
            return (
              <div
                key={t.id}
                className={`tc-row${overdue ? ' overdue' : ''}${dueToday ? ' today' : ''}${t.done ? ' done' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={() => toggle(t)}
                  className="tc-check"
                />
                <div className="tc-body">
                  <div className={`tc-title${t.done ? ' done' : ''}`}>{t.title}</div>
                  <div className={`tc-meta${overdue ? ' overdue' : dueToday ? ' today' : ''}`}>
                    {t.assigned_to_name && (
                      <span className="tc-meta-item">
                        <Users style={{ width: 11, height: 11 }} />
                        {t.assigned_to_name}
                      </span>
                    )}
                    {t.due_date && (
                      <span className="tc-meta-item">
                        <Clock style={{ width: 11, height: 11 }} />
                        {new Date(t.due_date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                        {overdue && ' · te laat'}
                        {dueToday && ' · vandaag'}
                      </span>
                    )}
                  </div>
                </div>
                <button className="tc-remove" onClick={() => remove(t.id)} aria-label="Verwijderen">
                  <X style={{ width: 13, height: 13 }} />
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
