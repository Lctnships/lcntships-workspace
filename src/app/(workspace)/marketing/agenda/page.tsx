'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Plus, ArrowRight, Users, ExternalLink, Loader2, X, FileText, Inbox } from 'lucide-react'
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

type ClosedStudio = {
  id: string
  company_name: string
  city: string | null
  address: string | null
  email: string | null
  phone: string | null
}

type Phase = 'new-sale' | 'datum-vast' | 'stemmen-open' | 'in-productie' | 'afgerond'
type FilterPill = 'urgent' | 'open' | null

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatShort(iso: string): string {
  return new Date(iso).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

function deadlineRelative(deadlineIso: string): string {
  const diffMs = new Date(deadlineIso).getTime() - Date.now()
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  if (diffMs < 0) return 'poll gesloten'
  if (days >= 1) return `poll sluit in ${days} d ${String(hours).padStart(2, '0')}:00`
  return `poll sluit binnen ${hours}u`
}

function getPhase(p: Production, today: Date): Phase {
  if (p.status === 'closed' && p.final_date) {
    const finalDate = new Date(p.final_date)
    if (finalDate < today) return 'afgerond'
    return 'datum-vast'
  }
  if (p.final_date) return 'in-productie'
  if (p.proposed_dates && p.proposed_dates.length > 0) return 'stemmen-open'
  return 'new-sale'
}

function phaseLabel(ph: Phase): string {
  return {
    'new-sale': 'nieuw · van sales',
    'datum-vast': 'datum vast',
    'stemmen-open': 'stemmen open',
    'in-productie': 'in productie',
    'afgerond': 'afgerond',
  }[ph]
}

function phaseChipClass(ph: Phase): string {
  return {
    'new-sale': 'pa-chip-new-sale',
    'datum-vast': 'pa-chip-accent',
    'stemmen-open': 'pa-chip-warning',
    'in-productie': 'pa-chip-success',
    'afgerond': 'pa-chip-neutral',
  }[ph]
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ProductiesPage() {
  const router = useRouter()
  const today = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d
  }, [])

  const [productions, setProductions] = useState<Production[]>([])
  const [closedStudios, setClosedStudios] = useState<ClosedStudio[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [phaseFilter, setPhaseFilter] = useState<Phase | ''>('')
  const [extraPill, setExtraPill] = useState<FilterPill>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [createPrefill, setCreatePrefill] = useState<ClosedStudio | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [prodRes, studiosRes] = await Promise.all([
      fetch('/api/productions').then(r => r.ok ? r.json() : []).catch(() => []),
      workspaceClient
        .from<ClosedStudio[]>('sales_leads')
        .select('id, company_name, city, address, email, phone')
        .eq('status', 'closed')
        .order('updated_at', { ascending: false }),
    ])
    setProductions((prodRes as Production[]) || [])
    setClosedStudios((studiosRes.data as ClosedStudio[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // ── Derived ─────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return productions.filter(p => {
      if (search) {
        const q = search.toLowerCase()
        if (!p.title.toLowerCase().includes(q)
          && !(p.location || '').toLowerCase().includes(q)
          && !(p.description || '').toLowerCase().includes(q)) return false
      }
      const ph = getPhase(p, today)
      if (phaseFilter && ph !== phaseFilter) return false
      if (extraPill === 'urgent') {
        // Production with final_date upcoming where T-3 not handled — proxy: final_date binnen 5 dagen + status='closed'
        if (!p.final_date) return false
        const days = (new Date(p.final_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        if (days > 5 || days < 0) return false
      }
      if (extraPill === 'open' && p.final_date) return false
      return true
    })
  }, [productions, search, phaseFilter, extraPill, today])

  // Group by phase
  const grouped = useMemo(() => {
    const order: Phase[] = ['new-sale', 'datum-vast', 'stemmen-open', 'in-productie', 'afgerond']
    const map: Record<Phase, Production[]> = {
      'new-sale': [],
      'datum-vast': [],
      'stemmen-open': [],
      'in-productie': [],
      'afgerond': [],
    }
    filtered.forEach(p => { map[getPhase(p, today)].push(p) })
    return order.map(ph => ({ phase: ph, items: map[ph] }))
  }, [filtered, today])

  // Stats (all productions, niet gefilterd)
  const stats = useMemo(() => {
    const s: Record<Phase, number> = { 'new-sale': 0, 'datum-vast': 0, 'stemmen-open': 0, 'in-productie': 0, 'afgerond': 0 }
    productions.forEach(p => { s[getPhase(p, today)]++ })
    return s
  }, [productions, today])

  const selected = useMemo(() => productions.find(p => p.id === selectedId) || null, [productions, selectedId])
  const selectedLead = useMemo(() => closedStudios.find(s => s.id === selectedLeadId) || null, [closedStudios, selectedLeadId])

  // Sales-leads die nog niet als productie zijn
  const leadsWithoutProduction = useMemo(() => {
    const linkedLeads = new Set(productions.map(p => p.lead_id).filter(Boolean))
    return closedStudios.filter(s => !linkedLeads.has(s.id))
  }, [closedStudios, productions])

  const startSetup = (lead: ClosedStudio) => {
    setCreatePrefill(lead)
    setShowCreate(true)
  }

  return (
    <>
      <style jsx global>{`
        .pa-chip { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 9999px; font-size: 9px; font-weight: 700; text-transform: lowercase; white-space: nowrap; }
        .pa-chip-accent { background: var(--accent); color: #fff; }
        .pa-chip-success { background: oklch(0.96 0.04 145); color: oklch(0.65 0.16 145); }
        .pa-chip-warning { background: oklch(0.97 0.05 72); color: oklch(0.50 0.14 65); }
        .pa-chip-neutral { background: var(--surface); color: var(--ink-ghost); border: 1px solid var(--edge); }
        .pa-chip-new-sale { background: #d9f4fd; color: #0778a8; }

        .pa-f-select {
          height: 30px; padding: 0 24px 0 9px; border: 1px solid var(--edge);
          border-radius: 6px; background: var(--surface); font-size: 10.5px;
          font-weight: 600; color: var(--ink-muted); outline: none;
          -webkit-appearance: none; appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23aaaaaa' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 8px center; cursor: pointer;
        }
        .pa-f-select:focus { border-color: var(--accent); }

        .pa-pill {
          height: 30px; padding: 0 12px; border: 1px solid var(--edge);
          border-radius: 6px; font-size: 10.5px; font-weight: 600;
          color: var(--ink-ghost); background: var(--surface); transition: all 130ms;
          cursor: pointer;
        }
        .pa-pill.active { background: var(--ink); color: #fff; border-color: var(--ink); }
        .pa-pill:hover:not(.active) { border-color: var(--ink-ghost); color: var(--ink-muted); }

        .pa-prod-row {
          display: grid;
          grid-template-columns: 32px 1fr 120px 130px 60px 86px 36px;
          align-items: center; padding: 0 24px;
          border-bottom: 1px solid var(--edge-soft);
          cursor: pointer; transition: background 100ms; position: relative;
        }
        .pa-prod-row:hover { background: oklch(0.988 0 0); }
        .pa-prod-row.selected { background: var(--accent-tint); }
        .pa-prod-row.urgent::before {
          content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 2.5px; background: var(--danger);
        }
        .pa-prod-row.action::before {
          content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 2.5px; background: var(--accent);
        }
        .pa-prod-row.new-sale::before {
          content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 2.5px; background: var(--accent-bright, #08B9EE);
        }
      `}</style>

      <div style={{ margin: '-16px -16px 0', minHeight: 'calc(100vh - 64px)', background: 'var(--bg, #F9FAFE)' }}>
        {/* Header */}
        <div
          style={{
            height: 58, background: 'var(--bg, #F9FAFE)', borderBottom: '1px solid var(--edge)',
            display: 'flex', alignItems: 'center', padding: '0 24px', gap: 10,
            position: 'sticky', top: 64, zIndex: 30,
          }}
        >
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.20em', textTransform: 'uppercase', color: 'var(--ink-ghost)', marginRight: 14, whiteSpace: 'nowrap' }}>
            Producties
          </span>
          <div style={{ position: 'relative', marginRight: 10 }}>
            <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-ghost)', width: 14, height: 14, pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Zoek op studio of titel…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: 240, padding: '6px 10px 6px 31px',
                border: '1px solid var(--edge)', borderRadius: 6,
                background: 'var(--surface)', fontSize: 11.5, color: 'var(--ink)',
                outline: 'none',
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <select
              className="pa-f-select"
              value={phaseFilter}
              onChange={(e) => setPhaseFilter(e.target.value as Phase | '')}
            >
              <option value="">Alle fasen</option>
              <option value="new-sale">Nieuw van sales</option>
              <option value="datum-vast">Datum vast</option>
              <option value="stemmen-open">Stemmen open</option>
              <option value="in-productie">In productie</option>
              <option value="afgerond">Afgerond</option>
            </select>
            <button
              className={`pa-pill${extraPill === 'urgent' ? ' active' : ''}`}
              onClick={() => setExtraPill(extraPill === 'urgent' ? null : 'urgent')}
            >
              Actie vereist
            </button>
            <button
              className={`pa-pill${extraPill === 'open' ? ' active' : ''}`}
              onClick={() => setExtraPill(extraPill === 'open' ? null : 'open')}
            >
              Datum open
            </button>
          </div>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => { setCreatePrefill(null); setShowCreate(true) }}
            style={{
              background: 'var(--accent)', color: '#fff', border: 'none',
              padding: '6px 16px', borderRadius: 9999, fontSize: 11, fontWeight: 700,
              letterSpacing: '0.03em', display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer',
            }}
          >
            <Plus style={{ width: 13, height: 13 }} />
            Nieuwe productie
          </button>
        </div>

        {/* Body grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', alignItems: 'start' }}>
          <div style={{ borderRight: '1px solid var(--edge)' }}>
            {/* Stats bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: '1px solid var(--edge)' }}>
              {([
                { phase: 'datum-vast' as Phase, label: 'Datum vast', value: stats['datum-vast'] },
                { phase: 'stemmen-open' as Phase, label: 'Stemmen open', value: stats['stemmen-open'] },
                { phase: 'in-productie' as Phase, label: 'In productie', value: stats['in-productie'] },
                { phase: 'afgerond' as Phase, label: 'Afgerond', value: stats['afgerond'] },
              ]).map(s => (
                <button
                  key={s.phase}
                  onClick={() => setPhaseFilter(phaseFilter === s.phase ? '' : s.phase)}
                  style={{
                    padding: '16px 24px',
                    borderRight: '1px solid var(--edge)',
                    border: 'none',
                    cursor: 'pointer',
                    background: phaseFilter === s.phase ? 'var(--accent-tint)' : 'transparent',
                    textAlign: 'left',
                    transition: 'background 100ms',
                  }}
                >
                  <div style={{ fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.20em', color: 'var(--ink-ghost)', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1, color: 'var(--ink)' }}>{s.value}</div>
                </button>
              ))}
            </div>

            {/* Setup-required leads (nieuw van sales — niet via production-table) */}
            {leadsWithoutProduction.length > 0 && (
              <>
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 24px', background: 'var(--surface)',
                    borderBottom: '1px solid var(--edge)',
                  }}
                >
                  <span style={{ fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.17em', color: '#0778a8' }}>
                    Nieuw — van sales (setup vereist)
                  </span>
                  <span style={{ fontSize: 8.5, color: '#0778a8', fontFamily: 'ui-monospace, monospace', background: '#d9f4fd', padding: '1px 6px', borderRadius: 9999 }}>
                    {leadsWithoutProduction.length}
                  </span>
                  <div style={{ flex: 1, height: 1, background: '#9de6f9', opacity: 0.4 }} />
                </div>
                {leadsWithoutProduction.slice(0, 5).map(lead => (
                  <div
                    key={lead.id}
                    className={`pa-prod-row new-sale${selectedLeadId === lead.id ? ' selected' : ''}`}
                    onClick={() => { setSelectedLeadId(lead.id); setSelectedId(null) }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px 0' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-bright, #08B9EE)' }} />
                    </div>
                    <div style={{ padding: '14px 16px 14px 0', minWidth: 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-ghost)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>
                        {lead.company_name}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.2 }}>
                        {lead.company_name}{lead.city && ` — ${lead.city}`}
                      </div>
                      <div style={{ fontSize: 9.5, color: 'var(--ink-ghost)', fontFamily: 'ui-monospace, monospace', marginTop: 2 }}>
                        gesloten · setup nodig
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', padding: '14px 12px 14px 0' }}>
                      <span className="pa-chip pa-chip-new-sale">nieuw · van sales</span>
                    </div>
                    <div style={{ padding: '14px 12px 14px 0' }}>
                      <div style={{ fontSize: 11, fontStyle: 'italic', color: 'var(--ink-ghost)' }}>nog in te plannen</div>
                    </div>
                    <div style={{ padding: '14px 12px 14px 0', fontSize: 10, color: 'var(--ink-ghost)', fontStyle: 'italic' }}>—</div>
                    <div style={{ padding: '14px 12px 14px 0', fontSize: 11, color: 'var(--ink-ghost)' }}>—</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '14px 0' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); startSetup(lead) }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          fontSize: 10.5, fontWeight: 700, color: '#0778a8',
                          border: 'none', background: 'none', padding: '4px 8px', borderRadius: 4, cursor: 'pointer',
                        }}
                      >
                        <ArrowRight style={{ width: 13, height: 13 }} />
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Production groups */}
            {loading ? (
              <div style={{ padding: 60, textAlign: 'center', fontSize: 13, color: 'var(--ink-ghost)' }}>
                <Loader2 style={{ width: 18, height: 18, display: 'inline-block', verticalAlign: 'middle', marginRight: 8 }} className="animate-spin" />
                Producties laden…
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center', fontSize: 13, color: 'var(--ink-ghost)' }}>
                Geen producties voor dit filter.
              </div>
            ) : (
              grouped.map(({ phase, items }) => {
                if (items.length === 0) return null
                return (
                  <div key={phase}>
                    <div
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 24px', background: 'var(--surface)',
                        borderBottom: '1px solid var(--edge)',
                        position: 'sticky', top: 122, zIndex: 1,
                      }}
                    >
                      <span style={{ fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.17em', color: phase === 'afgerond' ? 'var(--ink-ghost)' : 'var(--ink-muted)' }}>
                        {phaseLabel(phase)}
                      </span>
                      <span style={{ fontSize: 8.5, color: 'var(--ink-ghost)', fontFamily: 'ui-monospace, monospace', background: 'var(--edge-soft)', padding: '1px 6px', borderRadius: 9999 }}>
                        {items.length}
                      </span>
                      <div style={{ flex: 1, height: 1, background: 'var(--edge-soft)' }} />
                    </div>
                    {items.map(p => {
                      const ph = getPhase(p, today)
                      const isSelected = selectedId === p.id
                      const dot = ph === 'datum-vast' ? 'var(--accent)' :
                                  ph === 'in-productie' ? 'oklch(0.65 0.16 145)' :
                                  ph === 'stemmen-open' ? 'oklch(0.50 0.14 65)' :
                                  ph === 'afgerond' ? 'var(--ink-ghost)' :
                                  'var(--accent-bright, #08B9EE)'
                      const isUrgent = p.final_date && (() => {
                        const days = (new Date(p.final_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                        return days >= 0 && days <= 5
                      })()
                      const dim = ph === 'afgerond' ? { opacity: 0.4 } : {}
                      return (
                        <div
                          key={p.id}
                          className={`pa-prod-row${isSelected ? ' selected' : ''}${isUrgent && ph === 'datum-vast' ? ' urgent' : ''}`}
                          style={dim}
                          onClick={() => { setSelectedId(p.id); setSelectedLeadId(null) }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px 0' }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: dot }} />
                          </div>
                          <div style={{ padding: '14px 16px 14px 0', minWidth: 0 }}>
                            {p.location && (
                              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-ghost)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {p.location}
                              </div>
                            )}
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {p.title}
                            </div>
                            <div style={{ fontSize: 9.5, color: 'var(--ink-ghost)', fontFamily: 'ui-monospace, monospace', marginTop: 2 }}>
                              {p.id.slice(0, 8)}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', padding: '14px 12px 14px 0' }}>
                            <span className={`pa-chip ${phaseChipClass(ph)}`}>{phaseLabel(ph)}</span>
                          </div>
                          <div style={{ padding: '14px 12px 14px 0' }}>
                            {p.final_date ? (
                              <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-muted)', lineHeight: 1.2 }}>
                                {formatShort(p.final_date)}
                              </div>
                            ) : p.deadline ? (
                              <>
                                <div style={{ fontSize: 11, fontStyle: 'italic', color: 'var(--ink-ghost)' }}>datum open</div>
                                <div style={{ fontSize: 10, color: 'var(--danger)', fontWeight: 600, marginTop: 2 }}>
                                  {deadlineRelative(p.deadline)}
                                </div>
                              </>
                            ) : (
                              <div style={{ fontSize: 11, fontStyle: 'italic', color: 'var(--ink-ghost)' }}>
                                {p.proposed_dates && p.proposed_dates.length > 0 ? `${p.proposed_dates.length} voorgesteld` : 'datum open'}
                              </div>
                            )}
                          </div>
                          <div style={{ padding: '14px 12px 14px 0' }}>
                            <span style={{ fontSize: 10, color: 'var(--ink-ghost)', fontStyle: 'italic' }}>—</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '14px 12px 14px 0', fontSize: 11, fontWeight: 700, color: 'var(--ink-muted)' }}>
                            <Users style={{ width: 13, height: 13, color: 'var(--ink-ghost)' }} />
                            —
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '14px 0' }}>
                            <Link
                              href={`/marketing/agenda/${p.id}`}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 4,
                                fontSize: 10.5, fontWeight: 700, color: 'var(--accent)',
                                padding: '4px 8px', borderRadius: 4, textDecoration: 'none',
                              }}
                            >
                              <ExternalLink style={{ width: 13, height: 13 }} />
                            </Link>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })
            )}

            <div style={{ borderTop: '1px solid var(--edge)', padding: '10px 24px' }}>
              <span style={{ fontSize: 11, color: 'var(--ink-ghost)', fontFamily: 'ui-monospace, monospace' }}>
                Lctnships Workspace · Producties · {productions.length} totaal
              </span>
            </div>
          </div>

          {/* Right panel */}
          <div
            style={{
              position: 'sticky', top: 122, maxHeight: 'calc(100vh - 122px)',
              overflowY: 'auto', padding: 18,
              display: 'flex', flexDirection: 'column', gap: 14,
            }}
          >
            {selected ? (
              <DetailPanel
                production={selected}
                phase={getPhase(selected, today)}
                onOpen={() => router.push(`/marketing/agenda/${selected.id}`)}
              />
            ) : selectedLead ? (
              <LeadSetupPanel
                lead={selectedLead}
                onStartSetup={() => startSetup(selectedLead)}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '40px 20px', textAlign: 'center' }}>
                <Inbox style={{ width: 28, height: 28, color: 'var(--ink-ghost)', opacity: 0.22 }} />
                <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-ghost)' }}>Selecteer een productie</div>
                <div style={{ fontSize: 10.5, color: 'var(--ink-ghost)', opacity: 0.55 }}>Klik op een rij voor de samenvatting</div>
              </div>
            )}
          </div>
        </div>

        {/* Create modal */}
        {showCreate && (
          <CreateProductionModal
            prefillLead={createPrefill}
            onClose={() => { setShowCreate(false); setCreatePrefill(null) }}
            onCreated={(id) => { setShowCreate(false); setCreatePrefill(null); load(); router.push(`/marketing/agenda/${id}`) }}
          />
        )}
      </div>
    </>
  )
}

// ─── Lead Setup Panel (rechterpaneel voor "Nieuw van sales") ─────────────────
function LeadSetupPanel({
  lead,
  onStartSetup,
}: Readonly<{
  lead: ClosedStudio
  onStartSetup: () => void
}>) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ paddingBottom: 12, borderBottom: '1px solid var(--edge)' }}>
        <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-ghost)', marginBottom: 4 }}>
          {lead.city || 'Locatie onbekend'}
        </div>
        <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.015em', color: 'var(--ink)', lineHeight: 1.2, marginBottom: 6 }}>
          {lead.company_name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span className="pa-chip pa-chip-new-sale">nieuw · van sales</span>
        </div>
      </div>

      <div
        style={{
          padding: '8px 11px', background: '#d9f4fd', border: '1px solid #9de6f9',
          borderRadius: 4, fontSize: 10.5, color: '#0778a8', fontWeight: 600, lineHeight: 1.45,
        }}
      >
        Sale gesloten → setup vereist. Datum, brief en crew zijn nog in te plannen.
      </div>

      {/* Lead-gegevens widget */}
      <div style={{ border: '1px solid var(--edge)', borderRadius: 4, overflow: 'hidden', background: 'var(--bg, #F9FAFE)' }}>
        <div style={{ padding: '9px 13px', borderBottom: '1px solid var(--edge)', background: 'var(--surface)' }}>
          <span style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.20em', color: 'var(--ink-ghost)' }}>Studio-gegevens</span>
        </div>
        <div style={{ padding: '10px 13px', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 11.5, color: 'var(--ink-muted)' }}>
          {lead.address && (
            <div>
              <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-ghost)', marginBottom: 2 }}>Adres</div>
              {lead.address}
            </div>
          )}
          {lead.email && (
            <div>
              <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-ghost)', marginBottom: 2 }}>E-mail</div>
              <a href={`mailto:${lead.email}`} style={{ color: 'var(--accent)' }}>{lead.email}</a>
            </div>
          )}
          {lead.phone && (
            <div>
              <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-ghost)', marginBottom: 2 }}>Telefoon</div>
              <a href={`tel:${lead.phone}`} style={{ color: 'var(--ink-muted)' }}>{lead.phone}</a>
            </div>
          )}
        </div>
      </div>

      {/* Setup stappen */}
      <div style={{ border: '1px solid var(--edge)', borderRadius: 4, overflow: 'hidden', background: 'var(--bg, #F9FAFE)' }}>
        <div style={{ padding: '9px 13px', borderBottom: '1px solid var(--edge)', background: 'var(--surface)' }}>
          <span style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.20em', color: 'var(--ink-ghost)' }}>Setup stappen</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {[
            { task: 'Datum prikken', meta: 'Start de datum-poll voor de shoot' },
            { task: 'Brief aanmaken', meta: 'Shoot-type, shotlist, deliverables' },
            { task: 'Crew uitnodigen', meta: 'Actief na datum-bevestiging' },
          ].map((s, i) => (
            <div key={s.task} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '9px 13px', borderBottom: i < 2 ? '1px solid var(--edge-soft)' : 'none' }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', marginTop: 5, flexShrink: 0, background: 'var(--accent-bright, #08B9EE)' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-muted)', lineHeight: 1.3 }}>{s.task}</div>
                <div style={{ fontSize: 9.5, color: 'var(--ink-ghost)', marginTop: 1 }}>{s.meta}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onStartSetup}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, width: '100%',
          background: 'var(--accent)', color: '#fff', border: 'none',
          padding: '9px 14px', borderRadius: 6, fontSize: 11.5, fontWeight: 700,
          textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        <ArrowRight style={{ width: 14, height: 14 }} />
        Setup starten
      </button>
    </div>
  )
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────
function DetailPanel({
  production,
  phase,
  onOpen,
}: {
  production: Production
  phase: Phase
  onOpen: () => void
}) {
  const isNew = phase === 'new-sale'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ paddingBottom: 12, borderBottom: '1px solid var(--edge)' }}>
        {production.location && (
          <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-ghost)', marginBottom: 4 }}>
            {production.location}
          </div>
        )}
        <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.015em', color: 'var(--ink)', lineHeight: 1.2, marginBottom: 6 }}>
          {production.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span className={`pa-chip ${phaseChipClass(phase)}`}>{phaseLabel(phase)}</span>
          <span style={{ fontSize: 10, color: 'var(--ink-ghost)', fontFamily: 'ui-monospace, monospace' }}>
            {production.id.slice(0, 8)}
          </span>
        </div>
      </div>

      {isNew && (
        <div
          style={{
            padding: '8px 11px', background: '#d9f4fd', border: '1px solid #9de6f9',
            borderRadius: 4, fontSize: 10.5, color: '#0778a8', fontWeight: 600, lineHeight: 1.45,
          }}
        >
          Sale gesloten → setup vereist. Datum, brief en crew zijn nog in te plannen.
        </div>
      )}

      {/* Datum widget */}
      <div style={{ border: '1px solid var(--edge)', borderRadius: 4, overflow: 'hidden', background: 'var(--bg, #F9FAFE)' }}>
        <div style={{ padding: '9px 13px', borderBottom: '1px solid var(--edge)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.20em', color: 'var(--ink-ghost)' }}>Datum</span>
        </div>
        <div style={{ padding: '12px 13px', fontSize: 11.5, color: 'var(--ink-muted)' }}>
          {production.final_date
            ? formatShort(production.final_date)
            : production.proposed_dates && production.proposed_dates.length > 0
              ? `${production.proposed_dates.length} datum(s) voorgesteld${production.deadline ? ` · ${deadlineRelative(production.deadline)}` : ''}`
              : 'Nog niet gepland'}
        </div>
      </div>

      {/* Description widget */}
      {production.description && (
        <div style={{ border: '1px solid var(--edge)', borderRadius: 4, overflow: 'hidden', background: 'var(--bg, #F9FAFE)' }}>
          <div style={{ padding: '9px 13px', borderBottom: '1px solid var(--edge)', background: 'var(--surface)' }}>
            <span style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.20em', color: 'var(--ink-ghost)' }}>Beschrijving</span>
          </div>
          <div style={{ padding: '12px 13px', fontSize: 11.5, color: 'var(--ink-muted)', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
            {production.description}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button
          onClick={onOpen}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, width: '100%',
            background: 'var(--accent)', color: '#fff', border: 'none',
            padding: '9px 14px', borderRadius: 6, fontSize: 11.5, fontWeight: 700,
            textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <ArrowRight style={{ width: 14, height: 14 }} />
          {isNew ? 'Setup starten' : 'Productie openen'}
        </button>
        {!isNew && (
          <Link
            href={`/marketing/agenda/${production.id}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, width: '100%',
              background: 'transparent', color: 'var(--ink)', border: '1px solid var(--edge)',
              padding: '8px 14px', borderRadius: 6, fontSize: 11.5, fontWeight: 600,
              textAlign: 'left', textDecoration: 'none', boxSizing: 'border-box',
            }}
          >
            <FileText style={{ width: 14, height: 14 }} />
            Brief bekijken / bewerken
          </Link>
        )}
      </div>
    </div>
  )
}

// ─── Create Modal ─────────────────────────────────────────────────────────────
function CreateProductionModal({
  prefillLead,
  onClose,
  onCreated,
}: {
  prefillLead: ClosedStudio | null
  onClose: () => void
  onCreated: (id: string) => void
}) {
  const [title, setTitle] = useState(prefillLead?.company_name ?? '')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState(prefillLead?.city ?? '')
  const [dates, setDates] = useState<string[]>([''])
  const [deadline, setDeadline] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validDates = dates.filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))

  const submit = async () => {
    setError(null)
    if (!title.trim()) return setError('Titel is verplicht')
    let deadlineIso: string | null = null
    if (deadline) {
      const d = new Date(deadline)
      if (isNaN(d.getTime())) return setError('Ongeldige deadline')
      deadlineIso = d.toISOString()
    }
    setSubmitting(true)
    const res = await fetch('/api/productions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        proposed_dates: Array.from(new Set(validDates)),
        deadline: deadlineIso,
        lead_id: prefillLead?.id ?? null,
      }),
    })
    setSubmitting(false)
    if (!res.ok) {
      setError('Kon niet aanmaken')
      return
    }
    const created = await res.json().catch(() => null)
    if (!created?.id) {
      setError('Geen productie-id ontvangen')
      return
    }
    onCreated(created.id)
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 9, fontWeight: 700, letterSpacing: '0.18em',
    textTransform: 'uppercase', color: 'var(--ink-ghost)', marginBottom: 5,
  }
  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    border: '1px solid var(--edge)', borderRadius: 3,
    padding: '8px 10px', fontSize: 12, color: 'var(--ink)',
    background: '#fff', outline: 'none', fontFamily: 'inherit',
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', border: '1px solid var(--edge)', borderRadius: 6, width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
      >
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--edge)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
            Nieuwe productie{prefillLead ? ` — ${prefillLead.company_name}` : ''}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--ink-ghost)', cursor: 'pointer', padding: 2 }}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Titel *</label>
            <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Bijv. Editorial shoot — SS26" />
          </div>
          <div>
            <label style={labelStyle}>Locatie</label>
            <input style={inputStyle} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Amsterdam" />
          </div>
          <div>
            <label style={labelStyle}>Voorgestelde datums <span style={{ fontSize: 8, fontWeight: 500, letterSpacing: 0, textTransform: 'none', color: 'var(--ink-ghost)' }}>(optioneel — kan later via poll)</span></label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dates.map((d, i) => (
                <div key={i} style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="date"
                    style={inputStyle}
                    value={d}
                    onChange={(e) => {
                      const next = [...dates]; next[i] = e.target.value; setDates(next)
                    }}
                  />
                  {dates.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setDates(dates.filter((_, idx) => idx !== i))}
                      style={{ background: 'none', border: '1px solid var(--edge)', color: 'var(--ink-ghost)', cursor: 'pointer', borderRadius: 3, padding: '4px 8px' }}
                    >
                      <X style={{ width: 12, height: 12 }} />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setDates([...dates, ''])}
                style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', alignSelf: 'flex-start', padding: 0 }}
              >
                + Datum toevoegen
              </button>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Deadline poll</label>
            <input type="datetime-local" style={inputStyle} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Beschrijving</label>
            <textarea
              style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Korte beschrijving voor de poll-pagina…"
            />
          </div>
          {error && (
            <div style={{ padding: '6px 10px', background: 'oklch(0.97 0.03 27)', color: 'var(--danger)', fontSize: 12, borderRadius: 3 }}>
              {error}
            </div>
          )}
        </div>

        <div style={{ padding: '12px 24px', borderTop: '1px solid var(--edge)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={onClose}
            disabled={submitting}
            style={{ fontSize: 12, fontWeight: 600, padding: '8px 16px', borderRadius: 3, border: '1px solid var(--edge)', background: '#fff', color: 'var(--ink)', cursor: 'pointer' }}
          >
            Annuleren
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 700, padding: '8px 18px',
              borderRadius: 3, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer',
              opacity: submitting ? 0.5 : 1,
            }}
          >
            {submitting && <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" />}
            Aanmaken
          </button>
        </div>
      </div>
    </div>
  )
}
