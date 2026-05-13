'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Loader2, MapPin, Mail, Send, MoreHorizontal, ChevronUp, ChevronDown,
  Lock, Plus, Trash2, Check, X, Camera, Info, Clock,
} from 'lucide-react'
import { workspaceClient } from '@/lib/workspace-client'

// ─── Types ────────────────────────────────────────────────────────────────────
type Production = {
  id: string
  title: string
  description: string | null
  location: string | null
  proposed_dates: string[]
  share_token: string
  status: 'open' | 'closed'
  final_date: string | null
  deadline: string | null
  lead_id: string | null
  created_at: string
  updated_at: string
}

type Vote = { id: string; voter_name: string; available_dates: string[]; note: string | null; created_at: string }
type Note = { id: string; author_email: string | null; author_name: string | null; body: string; created_at: string }
type CrewMember = { id: string; team_member_id: string | null; crew_member_id: string | null; email: string | null; name: string; role: string | null; confirmed: boolean }
type CrewRegistryMember = { id: string; name: string; email: string | null; phone: string | null; default_role: string | null }
type GearItem = { id: string; name: string; category: 'equipment' | 'prop' | 'other'; quantity: number; notes: string | null; checked: boolean; sort_order: number }
type ShotlistItem = { id: string; shot_number: number | null; description: string; location: string | null; notes: string | null; done: boolean; sort_order: number }
type ProductionActivity = { id: string; actor_email: string | null; actor_name: string | null; action_type: string; payload: Record<string, unknown> | null; created_at: string }
type LinkedStudio = { id: string; company_name: string; contact_name: string | null; city: string | null; address: string | null; email: string | null; phone: string | null }

// ─── Helpers ──────────────────────────────────────────────────────────────────
const COLORS = ['#0E4F6D', 'oklch(0.50 0.12 155)', 'oklch(0.62 0.14 72)', 'oklch(0.52 0.18 22)', 'oklch(0.48 0.14 205)']

function fmtDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtTime(d: string): string {
  return new Date(d).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diffMs / 60000)
  if (m < 60) return `${m} min geleden`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} uur geleden`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d} ${d === 1 ? 'dag' : 'dagen'} geleden`
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}

function daysUntil(iso: string): { days: number; label: string } {
  const ms = new Date(iso).getTime() - Date.now()
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))
  if (days < 0) return { days, label: `${Math.abs(days)} dagen geleden` }
  if (days === 0) return { days, label: 'vandaag' }
  if (days === 1) return { days, label: 'morgen' }
  return { days, label: `over ${days} dagen` }
}

function deadlineRelative(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now()
  if (ms < 0) return 'gesloten'
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const mins = Math.floor((ms % (1000 * 60 * 60)) / 60000)
  if (days >= 1) return `${days} d ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
  return `${hours} u ${String(mins).padStart(2, '0')}`
}

function avatarColor(name: string): string {
  const idx = name.charCodeAt(0) % COLORS.length
  return COLORS[idx]
}

function getInitial(name: string): string {
  return (name || '?').trim()[0]?.toUpperCase() || '?'
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ProductionDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id

  const [production, setProduction] = useState<Production | null>(null)
  const [votes, setVotes] = useState<Vote[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [crew, setCrew] = useState<CrewMember[]>([])
  const [gear, setGear] = useState<GearItem[]>([])
  const [shotlist, setShotlist] = useState<ShotlistItem[]>([])
  const [activities, setActivities] = useState<ProductionActivity[]>([])
  const [studio, setStudio] = useState<LinkedStudio | null>(null)
  const [loading, setLoading] = useState(true)
  const [studioExpanded, setStudioExpanded] = useState(false)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    crew: true, brief: true, equip: true, comm: false, notes: false,
  })
  // Add crew modal
  const [showAddCrew, setShowAddCrew] = useState(false)
  const [crewRegistry, setCrewRegistry] = useState<CrewRegistryMember[]>([])
  const [crewMode, setCrewMode] = useState<'select' | 'new'>('select')
  const [selectedCrewId, setSelectedCrewId] = useState<string>('')
  const [newCrewName, setNewCrewName] = useState('')
  const [newCrewRole, setNewCrewRole] = useState('')
  const [newCrewEmail, setNewCrewEmail] = useState('')
  const [newCrewPhone, setNewCrewPhone] = useState('')
  const [saveToRegistry, setSaveToRegistry] = useState(true)
  const [addingCrew, setAddingCrew] = useState(false)
  const [addCrewError, setAddCrewError] = useState<string | null>(null)

  // Laad crew-registry bij open
  useEffect(() => {
    if (!showAddCrew) return
    workspaceClient
      .from<CrewRegistryMember[]>('crew_members')
      .select('id, name, email, phone, default_role')
      .order('name', { ascending: true })
      .then(({ data }) => {
        if (data) setCrewRegistry(data as CrewRegistryMember[])
      })
  }, [showAddCrew])

  const openCrewModal = () => {
    setAddCrewError(null)
    setCrewMode(crewRegistry.length > 0 ? 'select' : 'new')
    setSelectedCrewId('')
    setNewCrewName(''); setNewCrewRole(''); setNewCrewEmail(''); setNewCrewPhone('')
    setSaveToRegistry(true)
    setShowAddCrew(true)
  }

  const submitCrew = async () => {
    let payload: { name: string; role: string | null; email: string | null; crew_member_id?: string | null }

    if (crewMode === 'select') {
      const member = crewRegistry.find(m => m.id === selectedCrewId)
      if (!member) { setAddCrewError('Kies een crewlid'); return }
      payload = {
        name: member.name,
        role: member.default_role,
        email: member.email,
        crew_member_id: member.id,
      }
    } else {
      if (!newCrewName.trim()) { setAddCrewError('Naam is verplicht'); return }
      // Eerst opslaan in registry indien gewenst
      let registryId: string | null = null
      if (saveToRegistry) {
        const { data: created } = await workspaceClient
          .from<CrewRegistryMember[]>('crew_members')
          .insert({
            name: newCrewName.trim(),
            email: newCrewEmail.trim() || null,
            phone: newCrewPhone.trim() || null,
            default_role: newCrewRole.trim() || null,
          })
          .select()
          .single()
        if (created && 'id' in created) registryId = (created as unknown as CrewRegistryMember).id
      }
      payload = {
        name: newCrewName.trim(),
        role: newCrewRole.trim() || null,
        email: newCrewEmail.trim() || null,
        crew_member_id: registryId,
      }
    }

    setAddingCrew(true); setAddCrewError(null)
    const res = await fetch(`/api/productions/${id}/crew`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setAddingCrew(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setAddCrewError(data.error || 'Crewlid toevoegen mislukt')
      return
    }
    setNewCrewName(''); setNewCrewRole(''); setNewCrewEmail(''); setNewCrewPhone('')
    setSelectedCrewId('')
    setShowAddCrew(false)
    load()
  }
  const [activityFilter, setActivityFilter] = useState<'all' | 'status' | 'crew' | 'brief' | 'mail' | 'gear'>('all')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/productions/${id}`)
    if (!res.ok) { setLoading(false); return }
    const data = await res.json()
    setProduction(data.production)
    setVotes(data.votes ?? [])
    setNotes(data.notes ?? [])
    setCrew(data.crew ?? [])
    setGear(data.gear ?? [])
    setShotlist(data.shotlist ?? [])
    setActivities(data.activities ?? [])

    if (data.production?.lead_id) {
      const { data: studioData } = await workspaceClient
        .from<LinkedStudio[]>('sales_leads')
        .select('id, company_name, contact_name, city, address, email, phone')
        .eq('id', data.production.lead_id)
        .single()
      if (studioData) setStudio(studioData as unknown as LinkedStudio)
    }
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  const isDatumVast = !!production?.final_date
  const isStemmenOpen = !production?.final_date && (production?.proposed_dates?.length || 0) > 0
  const isInProductie = isDatumVast && production?.status !== 'closed'

  // Vote stats: per datum aantal stemmen
  const voteStats = useMemo(() => {
    if (!production) return []
    const stats: Record<string, { date: string; count: number; voters: string[] }> = {}
    for (const d of production.proposed_dates || []) {
      stats[d] = { date: d, count: 0, voters: [] }
    }
    for (const v of votes) {
      for (const d of v.available_dates || []) {
        if (stats[d]) {
          stats[d].count++
          stats[d].voters.push(v.voter_name)
        }
      }
    }
    return Object.values(stats).sort((a, b) => b.count - a.count)
  }, [production, votes])

  const bestDate = voteStats[0]
  const maxVotes = bestDate?.count || 1

  // T-3 / T-1 / T0 / T+1 / T+7 markers
  const timeline = useMemo(() => {
    if (!production?.final_date) return []
    const d0 = new Date(production.final_date); d0.setHours(0, 0, 0, 0)
    const now = new Date(); now.setHours(0, 0, 0, 0)
    const offsets = [-7, -3, -1, 0, 1, 7]
    return offsets.map(off => {
      const d = new Date(d0); d.setDate(d.getDate() + off)
      const tasks: Record<number, string> = {
        '-7': 'Brief afronden',
        '-3': 'Gear bevestigen',
        '-1': 'Call sheet uit',
        0: 'Shoot dag',
        1: 'Ruwe selects',
        7: 'Finale edit',
      }
      const label = (off > 0 ? '+' : '') + off
      return {
        label: `T${off === 0 ? '0' : label}`,
        task: tasks[off] || '',
        date: d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }),
        state: off === 0 ? 't0' : (d < now ? 'done' : 'open'),
      }
    })
  }, [production])

  // Filter activities
  const filteredActivities = useMemo(() => {
    if (activityFilter === 'all') return activities
    const map: Record<string, string[]> = {
      status: ['status_changed', 'final_date_set', 'final_date_cleared'],
      crew: ['crew_added', 'crew_removed', 'crew_confirmed'],
      brief: ['shotlist_added', 'shotlist_updated', 'brief_updated'],
      mail: ['email_sent', 'notify_sent'],
      gear: ['gear_added', 'gear_updated', 'gear_removed'],
    }
    const allowed = map[activityFilter] || []
    return activities.filter(a => allowed.some(t => a.action_type.includes(t)))
  }, [activities, activityFilter])

  const toggleSection = (k: string) => {
    setOpenSections(prev => ({ ...prev, [k]: !prev[k] }))
  }

  const prikDatum = async (date: string) => {
    await fetch(`/api/productions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ final_date: date, status: 'closed' }),
    })
    load()
  }

  if (loading || !production) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 64px)', color: 'var(--ink-ghost)' }}>
        <Loader2 className="animate-spin" style={{ width: 22, height: 22, marginRight: 10 }} />
        <span style={{ fontSize: 13 }}>Productie laden…</span>
      </div>
    )
  }

  const phaseChip = isInProductie ? { label: 'in productie', cls: 'pd-chip-success' } :
                    isDatumVast ? { label: 'datum vast', cls: 'pd-chip-accent' } :
                    isStemmenOpen ? { label: 'stemmen open', cls: 'pd-chip-warning' } :
                    { label: 'nieuw · setup', cls: 'pd-chip-new-sale' }

  return (
    <>
      <style jsx global>{`
        .pd-chip { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 9999px; font-size: 10.5px; font-weight: 600; letter-spacing: 0.03em; text-transform: lowercase; white-space: nowrap; }
        .pd-chip-accent { background: var(--accent); color: #fff; }
        .pd-chip-success { background: oklch(0.96 0.04 145); color: oklch(0.62 0.16 145); }
        .pd-chip-warning { background: oklch(0.97 0.05 72); color: oklch(0.50 0.14 65); }
        .pd-chip-neutral { background: var(--surface); color: var(--ink-faint); border: 1px solid var(--edge); }
        .pd-chip-new-sale { background: #d9f4fd; color: #0778a8; }
        .pd-btn-primary { background: var(--accent); color: #fff; border: none; padding: 7px 18px; border-radius: 9999px; font-size: 12px; font-weight: 700; letter-spacing: 0.035em; cursor: pointer; transition: opacity 130ms; }
        .pd-btn-primary:hover { opacity: 0.82; }
        .pd-btn-outline { background: transparent; color: var(--ink); border: 1px solid var(--edge); padding: 6px 18px; border-radius: 9999px; font-size: 12px; font-weight: 600; letter-spacing: 0.03em; cursor: pointer; transition: all 130ms; }
        .pd-btn-outline:hover { border-color: var(--ink-ghost); background: var(--surface); }
        .pd-btn-icon { width: 30px; height: 30px; border: 1px solid var(--edge); border-radius: 50%; background: transparent; display: flex; align-items: center; justify-content: center; color: var(--ink-ghost); cursor: pointer; transition: all 130ms; }
        .pd-btn-icon:hover { border-color: var(--ink-ghost); color: var(--ink-muted); }
        .pd-sec-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 24px; cursor: pointer; transition: background 100ms; user-select: none; }
        .pd-sec-head:hover { background: oklch(0.988 0 0); }
        .pd-sec-title { font-size: 10.5px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: var(--ink); }
        .pd-sec-badge { font-size: 10px; font-weight: 500; color: var(--ink-ghost); margin-left: 9px; }
      `}</style>

      <div style={{ margin: '-16px -16px 0', minHeight: 'calc(100vh - 64px)', background: 'var(--bg, #F9FAFE)' }}>
        {/* Header */}
        <div
          style={{
            background: 'var(--bg, #F9FAFE)', borderBottom: '1px solid var(--edge)',
            padding: '18px 24px 0', position: 'sticky', top: 64, zIndex: 30,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 9 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <button
                className="pd-btn-icon"
                onClick={() => router.push('/marketing/agenda')}
                title="Terug naar producties"
              >
                <ArrowLeft style={{ width: 15, height: 15 }} />
              </button>
              <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.022em', lineHeight: 1.1, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {production.title}
              </h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
              <button className="pd-btn-outline" onClick={() => router.push(`/marketing/agenda/${id}/brief`)}>
                Brief bewerken
              </button>
              <button className="pd-btn-outline">Deel publiek</button>
              <button className="pd-btn-primary">
                {isStemmenOpen ? 'Stuur poll' : 'Stuur naar crew'}
              </button>
              <button className="pd-btn-icon"><MoreHorizontal style={{ width: 15, height: 15 }} /></button>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, paddingBottom: 12, flexWrap: 'wrap' }}>
            <span className={`pd-chip ${phaseChip.cls}`}>{phaseChip.label}</span>
            <span style={{ color: 'var(--ink-ghost)', fontSize: 11 }}>·</span>
            {isDatumVast ? (
              <>
                <span style={{ fontSize: 12, color: 'var(--ink-muted)', fontWeight: 500 }}>{fmtDate(production.final_date)}</span>
                <span style={{ color: 'var(--ink-ghost)', fontSize: 11 }}>·</span>
                <span style={{ fontSize: 12, color: 'var(--ink-ghost)', fontWeight: 500 }}>{daysUntil(production.final_date!).label}</span>
              </>
            ) : isStemmenOpen ? (
              <>
                <span style={{ fontSize: 12, color: 'var(--ink-muted)', fontWeight: 500 }}>datum nog niet gekozen</span>
                {production.deadline && (
                  <>
                    <span style={{ color: 'var(--ink-ghost)', fontSize: 11 }}>·</span>
                    <span style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 700 }}>
                      stemmen sluiten in {deadlineRelative(production.deadline)}
                    </span>
                  </>
                )}
              </>
            ) : (
              <span style={{ fontSize: 12, color: 'var(--ink-ghost)', fontWeight: 500, fontStyle: 'italic' }}>
                setup vereist — datum en brief nog in te plannen
              </span>
            )}
          </div>
        </div>

        {/* Studio panel (expandable) */}
        {studio && (
          <div style={{ borderBottom: '1px solid var(--edge)', background: 'var(--bg, #F9FAFE)' }}>
            <button
              onClick={() => setStudioExpanded(!studioExpanded)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 24px', cursor: 'pointer', background: 'none', border: 'none',
                userSelect: 'none', textAlign: 'left',
              }}
            >
              <MapPin style={{ width: 13, height: 13, color: 'var(--ink-ghost)' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{studio.company_name}</span>
              {studio.address && (
                <>
                  <span style={{ color: 'var(--ink-ghost)', fontSize: 11 }}>·</span>
                  <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{studio.address}{studio.city ? `, ${studio.city}` : ''}</span>
                </>
              )}
              {studioExpanded ? <ChevronUp style={{ width: 16, height: 16, color: 'var(--ink-ghost)', marginLeft: 'auto' }} /> : <ChevronDown style={{ width: 16, height: 16, color: 'var(--ink-ghost)', marginLeft: 'auto' }} />}
            </button>
            {studioExpanded && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 28, padding: '14px 24px 18px', borderTop: '1px solid var(--edge-soft)' }}>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--ink-ghost)', marginBottom: 4 }}>Contactpersoon</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
                    {studio.contact_name || '—'}
                    {studio.phone && <><br /><a href={`tel:${studio.phone}`} style={{ color: 'var(--accent)' }}>{studio.phone}</a></>}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--ink-ghost)', marginBottom: 4 }}>E-mail</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
                    {studio.email ? <a href={`mailto:${studio.email}`} style={{ color: 'var(--accent)' }}>{studio.email}</a> : '—'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--ink-ghost)', marginBottom: 4 }}>Stad</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', lineHeight: 1.5 }}>{studio.city || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--ink-ghost)', marginBottom: 4 }}>Sleutel</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', lineHeight: 1.5 }}>Via studio-contact</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Timeline strip */}
        {timeline.length > 0 && (
          <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--edge)', padding: '18px 60px 14px' }}>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: 0, right: 0, top: 37, height: 1, background: 'var(--edge)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
                {timeline.map((m, i) => {
                  const align = i === 0 ? 'flex-start' : i === timeline.length - 1 ? 'flex-end' : 'center'
                  const textAlign = i === 0 ? 'left' : i === timeline.length - 1 ? 'right' : 'center'
                  const isT0 = m.state === 't0'
                  const isDone = m.state === 'done'
                  return (
                    <div key={m.label} style={{ display: 'flex', flexDirection: 'column', alignItems: align as 'flex-start' | 'flex-end' | 'center', gap: 5, flex: 1 }}>
                      <span style={{ fontSize: 8.5, fontWeight: isT0 ? 800 : 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: isT0 ? 'var(--accent)' : 'var(--ink-ghost)' }}>{m.label}</span>
                      <div style={{
                        width: isT0 ? 14 : 10, height: isT0 ? 14 : 10, borderRadius: '50%',
                        background: isT0 ? 'var(--accent)' : isDone ? 'oklch(0.62 0.16 145)' : 'var(--edge)',
                        border: '2px solid var(--surface)', position: 'relative', zIndex: 1, flexShrink: 0,
                      }} />
                      <div style={{
                        fontSize: isT0 ? 12 : 11, fontWeight: isT0 ? 700 : isDone ? 600 : 500,
                        color: isT0 ? 'var(--accent)' : isDone ? 'oklch(0.62 0.16 145)' : 'var(--ink-faint)',
                        textAlign: textAlign as 'left' | 'right' | 'center', lineHeight: 1.3,
                      }}>
                        {m.task}
                      </div>
                      <div style={{ fontSize: 9, color: isT0 ? 'var(--accent)' : 'var(--ink-ghost)', fontWeight: isT0 ? 600 : 400 }}>{m.date}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Main grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', alignItems: 'start' }}>
          {/* Left column */}
          <div style={{ borderRight: '1px solid var(--edge)' }}>
            {/* Crew section */}
            <CollapsibleSection
              title="Crew"
              badge={`${crew.length} ${isStemmenOpen ? 'voorgesteld · nog niet uitgenodigd' : 'personen'}`}
              open={openSections.crew}
              onToggle={() => toggleSection('crew')}
            >
              {isStemmenOpen && crew.length > 0 && (
                <div
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                    padding: '11px 14px', background: 'var(--surface)', border: '1px solid var(--edge)',
                    borderRadius: 5, fontSize: 11.5, color: 'var(--ink-ghost)', marginBottom: 14,
                  }}
                >
                  <Clock style={{ width: 14, height: 14, marginTop: 1, flexShrink: 0 }} />
                  <div style={{ lineHeight: 1.4 }}>
                    <strong style={{ color: 'var(--ink-muted)', fontWeight: 600, display: 'block', marginBottom: 2 }}>
                      Crewleden worden uitgenodigd zodra de datum vaststaat
                    </strong>
                    Onderstaande roster is voorgesteld — uitnodigingen worden verstuurd na datum-prik
                  </div>
                </div>
              )}
              {crew.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: 'var(--ink-ghost)', fontStyle: 'italic' }}>
                  Nog geen crewleden toegevoegd
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', opacity: isStemmenOpen ? 0.42 : 1 }}>
                  <tbody>
                    {crew.map(c => (
                      <tr key={c.id} style={{ borderBottom: '1px solid var(--edge-soft)' }}>
                        <td style={{ padding: '9px 0', width: 36 }}>
                          <div style={{ width: 26, height: 26, borderRadius: '50%', background: avatarColor(c.name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: '#fff' }}>
                            {getInitial(c.name)}
                          </div>
                        </td>
                        <td style={{ padding: '9px 0', fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{c.name}</td>
                        <td style={{ padding: '9px 0', fontSize: 11.5, color: 'var(--ink-faint)' }}>{c.role || '—'}</td>
                        <td style={{ padding: '9px 0', width: 150 }}>
                          {isStemmenOpen ? (
                            <span className="pd-chip pd-chip-neutral">nog niet uitgenodigd</span>
                          ) : c.confirmed ? (
                            <span className="pd-chip pd-chip-success">bevestigd</span>
                          ) : (
                            <span className="pd-chip pd-chip-warning">wacht</span>
                          )}
                        </td>
                        <td style={{ padding: '9px 0', width: 30 }}>
                          {!isStemmenOpen && c.email && (
                            <a href={`mailto:${c.email}`} title="E-mail" style={{ color: 'var(--ink-ghost)' }}>
                              <Mail style={{ width: 14, height: 14 }} />
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {!isStemmenOpen && (
                <button
                  onClick={openCrewModal}
                  style={{
                    marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontSize: 11, fontWeight: 600, color: 'var(--accent)',
                    border: '1px dashed var(--edge)', background: 'none',
                    padding: '5px 13px', borderRadius: 5, cursor: 'pointer',
                  }}
                >
                  <Plus style={{ width: 12, height: 12 }} />
                  crewlid toevoegen
                </button>
              )}
            </CollapsibleSection>

            {/* Brief & shotlist */}
            {isStemmenOpen ? (
              <div style={{ borderBottom: '1px solid var(--edge)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span className="pd-sec-title">Brief & shotlist</span>
                  </div>
                  <Lock style={{ width: 14, height: 14, color: 'var(--ink-ghost)' }} />
                </div>
                <div style={{ padding: '28px 24px', textAlign: 'center', borderTop: '1px solid var(--edge-soft)' }}>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-ghost)', fontStyle: 'italic', marginBottom: 5 }}>
                    wordt actief zodra de datum vaststaat
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-ghost)' }}>
                    Brief en shotlist worden voorbereid na datum-bevestiging
                  </div>
                </div>
              </div>
            ) : (
              <CollapsibleSection
                title="Brief & shotlist"
                badge={`${shotlist.filter(s => s.done).length} / ${shotlist.length} ingevuld`}
                open={openSections.brief}
                onToggle={() => toggleSection('brief')}
              >
                {shotlist.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: 'var(--ink-ghost)', fontStyle: 'italic' }}>
                    Nog geen shots toegevoegd
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {shotlist.map(s => (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '7px 0', borderBottom: '1px solid var(--edge-soft)' }}>
                        <div
                          style={{
                            width: 14, height: 14, borderRadius: 3,
                            border: '1.5px solid var(--edge)', flexShrink: 0,
                            background: s.done ? 'oklch(0.62 0.16 145)' : 'transparent',
                            borderColor: s.done ? 'oklch(0.62 0.16 145)' : 'var(--edge)',
                            position: 'relative',
                          }}
                        >
                          {s.done && <Check style={{ width: 10, height: 10, color: '#fff', position: 'absolute', top: 0, left: 0 }} />}
                        </div>
                        <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--ink-ghost)', fontFamily: 'ui-monospace, monospace', minWidth: 18 }}>
                          {String(s.shot_number || '').padStart(2, '0')}
                        </span>
                        <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink)', flex: 1 }}>{s.description}</span>
                        {s.notes && <span style={{ fontSize: 11, color: 'var(--ink-ghost)' }}>{s.notes}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleSection>
            )}

            {/* Equipment */}
            <CollapsibleSection
              title="Equipment"
              badge={isStemmenOpen ? 'concept' : `${gear.length} items · ${gear.filter(g => g.checked).length} bevestigd`}
              open={openSections.equip}
              onToggle={() => toggleSection('equip')}
            >
              {isStemmenOpen && (
                <div
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                    padding: '11px 14px', background: 'var(--surface)', border: '1px solid var(--edge)',
                    borderRadius: 5, fontSize: 11.5, color: 'var(--ink-ghost)', marginBottom: 14,
                  }}
                >
                  <Info style={{ width: 14, height: 14, marginTop: 1, flexShrink: 0 }} />
                  <div style={{ lineHeight: 1.4 }}>
                    Gear kan alvast worden voorbereid — bevestiging volgt na datum-prik
                  </div>
                </div>
              )}
              {gear.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: 'var(--ink-ghost)', fontStyle: 'italic' }}>
                  Nog geen equipment toegevoegd
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', opacity: isStemmenOpen ? 0.5 : 1 }}>
                  <tbody>
                    {gear.map(g => (
                      <tr key={g.id} style={{ borderBottom: '1px solid var(--edge-soft)' }}>
                        <td style={{ padding: '8px 0', fontSize: 12.5, fontWeight: 500, color: 'var(--ink)' }}>{g.name}</td>
                        <td style={{ padding: '8px 0', width: 36, fontSize: 11, color: 'var(--ink-ghost)', textAlign: 'center', fontFamily: 'ui-monospace, monospace' }}>×{g.quantity}</td>
                        <td style={{ padding: '8px 0', width: 80, fontSize: 11, color: 'var(--ink-ghost)' }}>{g.notes || '—'}</td>
                        <td style={{ padding: '8px 0', width: 24 }}>
                          <div
                            style={{
                              width: 15, height: 15, borderRadius: 3,
                              border: '1.5px solid var(--edge)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                              background: g.checked ? 'oklch(0.62 0.16 145)' : 'transparent',
                              borderColor: g.checked ? 'oklch(0.62 0.16 145)' : 'var(--edge)',
                            }}
                          >
                            {g.checked && <Check style={{ width: 10, height: 10, color: '#fff' }} />}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CollapsibleSection>

            {/* Communicatie */}
            <CollapsibleSection
              title="Communicatie"
              badge={`${activities.filter(a => a.action_type.includes('email')).length} verstuurd`}
              open={openSections.comm}
              onToggle={() => toggleSection('comm')}
            >
              <p style={{ fontSize: 12.5, color: 'var(--ink-ghost)' }}>
                {activities.filter(a => a.action_type.includes('email')).length} verstuurde berichten
              </p>
            </CollapsibleSection>

            {/* Notities */}
            <CollapsibleSection
              title="Notities"
              badge={`${notes.length}`}
              open={openSections.notes}
              onToggle={() => toggleSection('notes')}
            >
              {notes.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: 'var(--ink-ghost)', fontStyle: 'italic' }}>
                  Nog geen notities
                </div>
              ) : (
                notes.map(n => (
                  <div key={n.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--edge-soft)' }}>
                    <div style={{ fontSize: 11, color: 'var(--ink-ghost)', marginBottom: 4 }}>
                      {n.author_name || n.author_email || 'Anoniem'} · {relativeTime(n.created_at)}
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-muted)', whiteSpace: 'pre-wrap' }}>{n.body}</div>
                  </div>
                ))
              )}
            </CollapsibleSection>

            <div style={{ borderTop: '1px solid var(--edge)', padding: '11px 24px' }}>
              <span style={{ fontSize: 11, color: 'var(--ink-ghost)', fontFamily: 'ui-monospace, monospace' }}>
                Productie #{production.id.slice(0, 8)} · aangemaakt {relativeTime(production.created_at)} · laatst bewerkt {relativeTime(production.updated_at)}
              </span>
            </div>
          </div>

          {/* Right column */}
          <div
            style={{
              position: 'sticky', top: 220, maxHeight: 'calc(100vh - 220px)',
              overflowY: 'auto', padding: 20,
              display: 'flex', flexDirection: 'column', gap: 16,
            }}
          >
            {isStemmenOpen ? (
              <>
                {/* Vote card */}
                <div style={{ border: '1px solid var(--edge)', borderRadius: 5, padding: '14px 15px', background: 'var(--bg, #F9FAFE)' }}>
                  <div style={{ fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--ink-ghost)', marginBottom: 4 }}>
                    Poll · stemresultaten
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginBottom: 14 }}>
                    {votes.length} gestemd
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {voteStats.map((v, i) => {
                      const isBest = i === 0 && v.count > 0
                      const date = new Date(v.date).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })
                      return (
                        <div key={v.date}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-muted)', minWidth: 68 }}>{date}</span>
                            <div style={{ flex: 1, height: 5, background: 'var(--surface)', borderRadius: 3, overflow: 'hidden' }}>
                              <div
                                style={{
                                  height: '100%', borderRadius: 3,
                                  width: `${(v.count / maxVotes) * 100}%`,
                                  background: isBest ? 'oklch(0.62 0.16 145)' : 'var(--accent)',
                                }}
                              />
                            </div>
                            <span style={{ fontSize: 10.5, color: 'var(--ink-ghost)', minWidth: 18, textAlign: 'right' }}>{v.count}</span>
                          </div>
                          {v.voters.length > 0 && (
                            <div style={{
                              fontSize: 9.5, color: isBest ? 'oklch(0.62 0.16 145)' : 'var(--ink-ghost)',
                              paddingLeft: 77, marginTop: -5,
                            }}>
                              {v.voters.join(', ')}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  {bestDate && bestDate.count > 0 && (
                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--edge)' }}>
                      <div style={{ fontSize: 10.5, color: 'var(--ink-ghost)', marginBottom: 8 }}>
                        {new Date(bestDate.date).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })} heeft de meeste stemmen
                      </div>
                      <button
                        onClick={() => prikDatum(bestDate.date)}
                        style={{
                          display: 'block', width: '100%', background: 'var(--accent)', color: '#fff',
                          border: 'none', padding: 9, borderRadius: 6, fontSize: 12, fontWeight: 700,
                          letterSpacing: '0.03em', textAlign: 'center', cursor: 'pointer',
                        }}
                      >
                        Prik datum vast — {new Date(bestDate.date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Next action card */}
                <NextActionCard production={production} crew={crew} gear={gear} timeline={timeline} />
              </>
            )}

            {/* Activity feed */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--ink-ghost)' }}>
                  Activiteit
                </span>
                <select
                  value={activityFilter}
                  onChange={(e) => setActivityFilter(e.target.value as typeof activityFilter)}
                  style={{
                    fontSize: 10, fontWeight: 600, color: 'var(--ink-ghost)',
                    border: '1px solid var(--edge)', borderRadius: 4, padding: '2px 8px 2px 6px',
                    background: 'none', cursor: 'pointer',
                  }}
                >
                  <option value="all">alles</option>
                  <option value="status">status</option>
                  <option value="crew">crew</option>
                  <option value="brief">brief</option>
                  <option value="mail">mail</option>
                  <option value="gear">gear</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {filteredActivities.length === 0 ? (
                  <div style={{ padding: '12px 0', fontSize: 11, color: 'var(--ink-ghost)' }}>
                    Geen activiteit voor dit filter
                  </div>
                ) : (
                  filteredActivities.slice(0, 10).map(a => {
                    let dot = 'var(--ink-ghost)'
                    if (a.action_type.includes('status') || a.action_type.includes('final_date')) dot = 'var(--accent)'
                    else if (a.action_type.includes('crew')) dot = 'oklch(0.62 0.16 145)'
                    else if (a.action_type.includes('brief') || a.action_type.includes('shotlist')) dot = 'var(--accent-bright, #08B9EE)'
                    else if (a.action_type.includes('email') || a.action_type.includes('notify')) dot = 'oklch(0.70 0.14 72)'
                    return (
                      <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '8px 0', borderBottom: '1px solid var(--edge-soft)' }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', marginTop: 4, flexShrink: 0, background: dot }} />
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--ink-muted)', lineHeight: 1.4 }}>
                            {a.action_type.replace(/_/g, ' ')}
                          </div>
                          <div style={{ fontSize: 9.5, color: 'var(--ink-ghost)', marginTop: 1 }}>
                            {relativeTime(a.created_at)}
                            {a.actor_name && ` · ${a.actor_name}`}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Add crew modal */}
        {showAddCrew && (
          <div
            onClick={() => setShowAddCrew(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ background: '#fff', border: '1px solid var(--edge)', borderRadius: 6, width: '100%', maxWidth: 440, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
            >
              <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--edge)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.02em' }}>Crewlid toevoegen</span>
                <button onClick={() => setShowAddCrew(false)} style={{ background: 'none', border: 'none', color: 'var(--ink-ghost)', cursor: 'pointer', padding: 2 }}>
                  <X style={{ width: 16, height: 16 }} />
                </button>
              </div>
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Mode toggle */}
                <div style={{ display: 'inline-flex', background: 'var(--surface)', borderRadius: 6, padding: 2, border: '1px solid var(--edge)', alignSelf: 'flex-start' }}>
                  <button
                    onClick={() => setCrewMode('select')}
                    style={{
                      padding: '4px 12px', border: 'none', background: crewMode === 'select' ? '#fff' : 'transparent',
                      fontSize: 11, fontWeight: 600, color: crewMode === 'select' ? 'var(--ink)' : 'var(--ink-ghost)',
                      borderRadius: 4, cursor: 'pointer', boxShadow: crewMode === 'select' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    }}
                  >
                    Crew ({crewRegistry.length})
                  </button>
                  <button
                    onClick={() => setCrewMode('new')}
                    style={{
                      padding: '4px 12px', border: 'none', background: crewMode === 'new' ? '#fff' : 'transparent',
                      fontSize: 11, fontWeight: 600, color: crewMode === 'new' ? 'var(--ink)' : 'var(--ink-ghost)',
                      borderRadius: 4, cursor: 'pointer', boxShadow: crewMode === 'new' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    }}
                  >
                    Nieuw profiel
                  </button>
                </div>

                {crewMode === 'select' ? (
                  <>
                    {crewRegistry.length === 0 ? (
                      <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: 'var(--ink-ghost)', background: 'var(--surface)', borderRadius: 4, fontStyle: 'italic' }}>
                        Nog geen profielen in de database. Maak er een via &quot;Nieuw profiel&quot;.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
                        {crewRegistry.map(m => {
                          const isSel = selectedCrewId === m.id
                          return (
                            <button
                              key={m.id}
                              onClick={() => setSelectedCrewId(m.id)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '10px 12px', textAlign: 'left',
                                border: `1px solid ${isSel ? 'var(--accent)' : 'var(--edge)'}`,
                                borderRadius: 4,
                                background: isSel ? 'var(--accent-tint)' : '#fff',
                                cursor: 'pointer', transition: 'all 130ms',
                              }}
                            >
                              <div
                                style={{
                                  width: 30, height: 30, borderRadius: '50%',
                                  background: avatarColor(m.name), color: '#fff',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 11, fontWeight: 800, flexShrink: 0,
                                }}
                              >
                                {getInitial(m.name)}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>{m.name}</div>
                                <div style={{ fontSize: 10.5, color: 'var(--ink-ghost)' }}>
                                  {m.default_role || '—'}
                                  {m.email && ` · ${m.email}`}
                                </div>
                              </div>
                              {isSel && <Check style={{ width: 14, height: 14, color: 'var(--accent)' }} />}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-ghost)', marginBottom: 5 }}>Naam *</label>
                      <input
                        type="text"
                        value={newCrewName}
                        onChange={(e) => setNewCrewName(e.target.value)}
                        placeholder="Bijv. Anna Visser"
                        autoFocus
                        style={{ width: '100%', boxSizing: 'border-box', border: '1px solid var(--edge)', borderRadius: 3, padding: '8px 10px', fontSize: 12, color: 'var(--ink)', background: '#fff', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-ghost)', marginBottom: 5 }}>Rol</label>
                      <input
                        type="text"
                        value={newCrewRole}
                        onChange={(e) => setNewCrewRole(e.target.value)}
                        placeholder="Bijv. Fotograaf · Videograaf · Stylist"
                        style={{ width: '100%', boxSizing: 'border-box', border: '1px solid var(--edge)', borderRadius: 3, padding: '8px 10px', fontSize: 12, color: 'var(--ink)', background: '#fff', outline: 'none' }}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-ghost)', marginBottom: 5 }}>E-mail</label>
                        <input
                          type="email"
                          value={newCrewEmail}
                          onChange={(e) => setNewCrewEmail(e.target.value)}
                          placeholder="naam@email.com"
                          style={{ width: '100%', boxSizing: 'border-box', border: '1px solid var(--edge)', borderRadius: 3, padding: '8px 10px', fontSize: 12, color: 'var(--ink)', background: '#fff', outline: 'none' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-ghost)', marginBottom: 5 }}>Telefoon</label>
                        <input
                          type="tel"
                          value={newCrewPhone}
                          onChange={(e) => setNewCrewPhone(e.target.value)}
                          placeholder="+31 6 ..."
                          style={{ width: '100%', boxSizing: 'border-box', border: '1px solid var(--edge)', borderRadius: 3, padding: '8px 10px', fontSize: 12, color: 'var(--ink)', background: '#fff', outline: 'none' }}
                        />
                      </div>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--ink-muted)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={saveToRegistry}
                        onChange={(e) => setSaveToRegistry(e.target.checked)}
                        style={{ accentColor: 'var(--accent)', width: 13, height: 13 }}
                      />
                      Bewaar dit profiel in de crew-database (voor hergebruik)
                    </label>
                  </>
                )}

                {addCrewError && (
                  <div style={{ padding: '6px 10px', background: 'oklch(0.97 0.03 27)', color: 'var(--danger)', fontSize: 12, borderRadius: 3 }}>
                    {addCrewError}
                  </div>
                )}
              </div>
              <div style={{ padding: '12px 24px', borderTop: '1px solid var(--edge)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  onClick={() => setShowAddCrew(false)}
                  disabled={addingCrew}
                  style={{ fontSize: 12, fontWeight: 600, padding: '8px 16px', borderRadius: 3, border: '1px solid var(--edge)', background: '#fff', color: 'var(--ink)', cursor: 'pointer' }}
                >
                  Annuleren
                </button>
                <button
                  onClick={submitCrew}
                  disabled={addingCrew}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontSize: 12, fontWeight: 700, padding: '8px 18px',
                    borderRadius: 3, border: 'none', background: 'var(--accent)', color: '#fff',
                    cursor: 'pointer', opacity: addingCrew ? 0.5 : 1,
                  }}
                >
                  {addingCrew && <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" />}
                  Toevoegen
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function CollapsibleSection({
  title, badge, open, onToggle, children,
}: Readonly<{
  title: string
  badge?: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}>) {
  return (
    <div style={{ borderBottom: '1px solid var(--edge)' }}>
      <button
        onClick={onToggle}
        className="pd-sec-head"
        style={{ width: '100%', border: 'none', textAlign: 'left' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span className="pd-sec-title">{title}</span>
          {badge && <span className="pd-sec-badge">{badge}</span>}
        </div>
        {open ? <ChevronUp style={{ width: 16, height: 16, color: 'var(--ink-ghost)' }} /> : <ChevronDown style={{ width: 16, height: 16, color: 'var(--ink-ghost)' }} />}
      </button>
      {open && (
        <div style={{ padding: '4px 24px 22px' }}>
          {children}
        </div>
      )}
    </div>
  )
}

function NextActionCard({
  production, crew, gear, timeline,
}: Readonly<{
  production: Production
  crew: CrewMember[]
  gear: GearItem[]
  timeline: Array<{ label: string; task: string; date: string; state: string }>
}>) {
  // Find next pending milestone
  const next = timeline.find(t => t.state === 'open' || t.state === 't0')
  const unconfirmedGear = gear.filter(g => !g.checked).length
  const unconfirmedCrew = crew.filter(c => !c.confirmed).length

  let task = next ? `${next.label} · ${next.task}` : 'Productie aanmaken'
  let meta = next ? next.date : ''

  if (unconfirmedGear > 0 && next?.label.includes('T-3')) {
    meta = `${next.date} · ${unconfirmedGear} gear-item${unconfirmedGear > 1 ? 's' : ''} onbevestigd`
  } else if (unconfirmedCrew > 0) {
    meta = `${meta}${meta ? ' · ' : ''}${unconfirmedCrew} crew nog niet bevestigd`
  }

  if (production.status === 'closed' && !next) {
    task = 'Productie afgerond'
    meta = ''
  }

  return (
    <div style={{ border: '1px solid var(--edge)', borderRadius: 5, padding: '13px 15px', background: 'var(--bg, #F9FAFE)' }}>
      <div style={{ fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--ink-ghost)', marginBottom: 7 }}>
        Volgende actie
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 3 }}>{task}</div>
      {meta && <div style={{ fontSize: 10.5, color: 'var(--ink-ghost)' }}>{meta}</div>}
    </div>
  )
}
