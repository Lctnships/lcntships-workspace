'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Search, Plus, Check, X, Play, Camera, ExternalLink, Loader2, Globe } from 'lucide-react'
import { workspaceClient as supabase } from '@/lib/workspace-client'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Lead {
  id: string
  name: string
  website?: string
  phone?: string
  email?: string
  city?: string
  address?: string
  categories?: string[]
  instagram?: string
  facebook?: string
  linkedin?: string
  twitter?: string
  source?: string
  search_query?: string
  status: string
  enriched: boolean
  enrichment_error?: string
  notes?: string
  created_at?: string
  _duplicate?: boolean
}

interface SearchHistoryItem {
  id: string
  query: string
  city?: string
  results_count: number
  emails_found: number
  created_at: string
  failed?: boolean
}

type RowStatus = 'new' | 'in-pipe' | 'duplicate' | 'closed'
type FilterMode = 'new' | 'in-pipe' | 'duplicate' | null

const CITIES = ['Amsterdam', 'Rotterdam', 'Den Haag', 'Utrecht', 'Eindhoven', 'Groningen']
const TYPES = ['Fotostudio', 'Muziekstudio', 'Dansstudio', 'Podcaststudio', 'Multifunctioneel']

// ─── Helpers ──────────────────────────────────────────────────────────────────
function statusOf(lead: Lead, pipelineNames: Set<string>): RowStatus {
  if (lead._duplicate) return 'duplicate'
  if (pipelineNames.has(lead.name)) return 'in-pipe'
  if (lead.status === 'closed' || lead.status === 'partner') return 'closed'
  return 'new'
}

function statusLabel(s: RowStatus): string {
  return { 'new': 'nieuw', 'in-pipe': 'in pipeline', 'duplicate': 'dubbel', 'closed': 'gesloten' }[s]
}

function statusClass(s: RowStatus): string {
  return { 'new': 'st-new', 'in-pipe': 'st-pipe', 'duplicate': 'st-dup', 'closed': 'st-closed' }[s]
}

function formatRelativeDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffH = diffMs / (1000 * 60 * 60)
  if (diffH < 1) return `${Math.round(diffH * 60)} min geleden`
  if (diffH < 24) return d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
  if (diffH < 48) return `gisteren ${d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`
  return d.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ScraperPage() {
  // Data
  const [leads, setLeads] = useState<Lead[]>([])
  const [history, setHistory] = useState<SearchHistoryItem[]>([])
  const [pipelineNames, setPipelineNames] = useState<Set<string>>(new Set())

  // List filters (zoek-input bovenin = scraper trigger; type/stad = lokaal filter)
  const [searchInput, setSearchInput] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [filterMode, setFilterMode] = useState<FilterMode>(null)

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [added, setAdded] = useState<Set<string>>(new Set())

  // Loading
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  // Session stats
  const [sessionStats, setSessionStats] = useState({ found: 0, added: 0, alreadyInPipe: 0, duplicates: 0, skipped: 0 })

  // ── Load initial data ─────────────────────────────────────────────────────
  const loadInitial = useCallback(async () => {
    // Pipeline names
    const { data: pipelineData } = await supabase
      .from('sales_leads')
      .select('company_name')
      .order('created_at', { ascending: false })
    if (pipelineData) {
      const arr = pipelineData as Array<{ company_name: string }>
      setPipelineNames(new Set(arr.map(l => l.company_name)))
    }
    // Recent searches
    const res = await fetch('/api/search-leads')
    if (res.ok) {
      const data = await res.json()
      setHistory(data.history || [])
    }
  }, [])

  useEffect(() => { loadInitial() }, [loadInitial])

  // ── Search ────────────────────────────────────────────────────────────────
  const handleSearch = async () => {
    // Zoekbalk heeft voorrang; anders type + stad als query
    const fromInput = searchInput.trim()
    const fromFilters = [typeFilter, cityFilter].filter(Boolean).join(' ').trim()
    const q = fromInput || fromFilters
    if (!q) {
      setSearchError('Typ een zoekterm in of kies een studio-type / stad')
      return
    }
    const city = cityFilter || undefined
    setSearching(true)
    setSearchError(null)
    try {
      const res = await fetch('/api/search-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, city }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSearchError(data.error || 'Zoeken mislukt')
        return
      }
      const fresh: Lead[] = (data.leads as Lead[]).map(l => ({ ...l, _duplicate: pipelineNames.has(l.name) }))
      const newIds = new Set(fresh.map(l => l.id))
      setLeads(prev => [...fresh, ...prev.filter(l => !newIds.has(l.id))])
      setSessionStats(prev => ({
        found: prev.found + fresh.length,
        added: prev.added,
        alreadyInPipe: prev.alreadyInPipe + fresh.filter(l => pipelineNames.has(l.name)).length,
        duplicates: prev.duplicates + fresh.filter(l => l._duplicate).length,
        skipped: prev.skipped,
      }))
      // Reset alle list-filters na een succesvolle scrape zodat álle resultaten zichtbaar zijn
      setCityFilter('')
      setTypeFilter('')
      setFilterMode(null)
      // Refresh history
      const histRes = await fetch('/api/search-leads')
      if (histRes.ok) {
        const histData = await histRes.json()
        setHistory(histData.history || [])
      }
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Onbekende fout')
    } finally {
      setSearching(false)
    }
  }

  // ── Add to pipeline ───────────────────────────────────────────────────────
  const addToPipeline = async (lead: Lead) => {
    const payload = {
      company_name: lead.name,
      email: lead.email || undefined,
      phone: lead.phone || undefined,
      city: lead.city || undefined,
      address: lead.address || undefined,
      website: lead.website || undefined,
      status: 'cold' as const,
      source: 'scraper',
      notes: lead.notes || undefined,
      instagram: lead.instagram || undefined,
      facebook: lead.facebook || undefined,
      linkedin: lead.linkedin || undefined,
      twitter: lead.twitter || undefined,
    }
    const { data: existing } = await supabase.from('sales_leads').select('id').eq('company_name', lead.name).maybeSingle()
    const exists = existing as { id: string } | null
    const { error } = exists
      ? await supabase.from('sales_leads').update(payload).eq('id', exists.id)
      : await supabase.from('sales_leads').insert(payload)
    if (!error) {
      setAdded(prev => new Set([...prev, lead.id]))
      setPipelineNames(prev => new Set([...prev, lead.name]))
      setSessionStats(prev => ({ ...prev, added: prev.added + 1 }))
    }
  }

  const addSelected = async () => {
    const target = leads.filter(l => selected.has(l.id))
    await Promise.all(target.map(l => addToPipeline(l)))
    setSelected(new Set())
  }

  // ── Filter logic — losse substring-match op city + type (categories of naam) ──
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      if (cityFilter) {
        const cityLower = cityFilter.toLowerCase()
        const cityMatch = (l.city || '').toLowerCase().includes(cityLower)
          || (l.address || '').toLowerCase().includes(cityLower)
        if (!cityMatch) return false
      }
      if (typeFilter) {
        const tLower = typeFilter.toLowerCase()
        const inCats = (l.categories || []).some(c => c.toLowerCase().includes(tLower))
        const inName = l.name.toLowerCase().includes(tLower)
        if (!inCats && !inName) return false
      }
      const s = statusOf(l, pipelineNames)
      if (filterMode === 'new' && s !== 'new') return false
      if (filterMode === 'in-pipe' && s !== 'in-pipe') return false
      if (filterMode === 'duplicate' && s !== 'duplicate') return false
      return true
    })
  }, [leads, cityFilter, typeFilter, filterMode, pipelineNames])

  const toggleRow = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  const toggleFilterMode = (mode: FilterMode) => {
    setFilterMode(prev => prev === mode ? null : mode)
  }

  return (
    <>
      <style jsx global>{`
        .scr-root { font-size: 14px; line-height: 1.5; color: var(--ink); }
        .scr-input {
          width: 100%; padding: 7px 12px 7px 36px;
          border: 1px solid var(--edge); border-radius: 6px;
          background: var(--surface); font-size: 12.5px; color: var(--ink);
          outline: none; transition: border-color 130ms, background 130ms;
        }
        .scr-input:focus { border-color: var(--accent); background: var(--bg, #F9FAFE); }
        .scr-input::placeholder { color: var(--ink-ghost); }
        .scr-select {
          height: 32px; padding: 0 28px 0 10px; border: 1px solid var(--edge);
          border-radius: 6px; background: var(--surface); font-size: 11px;
          font-weight: 600; color: var(--ink-muted); outline: none;
          -webkit-appearance: none; appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23aaaaaa' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 9px center;
          cursor: pointer; transition: border-color 130ms;
        }
        .scr-select:focus { border-color: var(--accent); }
        .scr-pill {
          height: 32px; padding: 0 13px; border: 1px solid var(--edge);
          border-radius: 6px; font-size: 11px; font-weight: 600;
          color: var(--ink-ghost); background: var(--surface); transition: all 130ms;
          cursor: pointer; white-space: nowrap;
        }
        .scr-pill.active { background: var(--ink); color: #fff; border-color: var(--ink); }
        .scr-pill:hover:not(.active) { border-color: var(--ink-ghost); color: var(--ink-muted); }
        .scr-btn-primary {
          background: var(--accent); color: #fff; border: none;
          padding: 6px 16px; border-radius: 9999px;
          font-size: 11px; font-weight: 700; letter-spacing: 0.035em;
          display: inline-flex; align-items: center; gap: 5px; transition: opacity 130ms;
          cursor: pointer;
        }
        .scr-btn-primary:hover { opacity: 0.82; }
        .scr-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .scr-btn-outline {
          height: 32px; padding: 0 14px; border: 1px solid var(--edge);
          border-radius: 9999px; background: transparent; font-size: 11px;
          font-weight: 600; color: var(--ink); transition: all 130ms; cursor: pointer;
        }
        .scr-btn-outline:hover { border-color: var(--ink-ghost); background: var(--surface); }

        .scr-table { width: 100%; border-collapse: collapse; }
        .scr-table thead tr { border-bottom: 1px solid var(--edge); }
        .scr-table th {
          padding: 8px 12px 7px; font-size: 8px; font-weight: 700; letter-spacing: 0.18em;
          text-transform: uppercase; color: var(--ink-ghost); text-align: left;
          white-space: nowrap; background: var(--surface);
        }
        .scr-table th:first-child { padding-left: 28px; }
        .scr-table th:last-child { padding-right: 28px; }
        .scr-table td { padding: 13px 12px; border-bottom: 1px solid var(--edge-soft); vertical-align: middle; }
        .scr-table td:first-child { padding-left: 28px; }
        .scr-table td:last-child { padding-right: 28px; }
        .scr-row { cursor: pointer; transition: background 110ms; }
        .scr-row:hover { background: oklch(0.988 0 0); }
        .scr-row.selected { background: var(--accent-tint); }

        .scr-check {
          width: 14px; height: 14px; border-radius: 3px;
          border: 1.5px solid var(--edge); background: var(--bg, #F9FAFE);
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: all 130ms;
        }
        .scr-check.on { background: var(--accent); border-color: var(--accent); }
        .scr-check.on::after { content: ''; display: block; width: 7px; height: 4px; border-left: 1.5px solid #fff; border-bottom: 1.5px solid #fff; transform: rotate(-45deg) translateY(-1px); }

        .scr-cat-chip {
          display: inline-flex; align-items: center; padding: 2px 8px;
          border-radius: 9999px; font-size: 9.5px; font-weight: 600;
          background: var(--surface); border: 1px solid var(--edge); color: var(--ink-faint); white-space: nowrap;
        }

        .scr-status-chip {
          display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px;
          border-radius: 9999px; font-size: 9.5px; font-weight: 600;
          text-transform: lowercase; white-space: nowrap;
        }
        .scr-status-chip .scr-dot { width: 5px; height: 5px; border-radius: 50%; }
        .st-new { background: var(--surface); border: 1px solid var(--edge); color: var(--ink-ghost); }
        .st-new .scr-dot { background: var(--ink-ghost); }
        .st-pipe { background: var(--accent-tint); color: var(--accent); }
        .st-pipe .scr-dot { background: var(--accent); }
        .st-dup { background: oklch(0.97 0.05 72); color: oklch(0.50 0.14 65); }
        .st-dup .scr-dot { background: oklch(0.50 0.14 65); }
        .st-closed { background: oklch(0.96 0.04 145); color: oklch(0.65 0.16 145); }
        .st-closed .scr-dot { background: oklch(0.65 0.16 145); }

        .scr-add-btn {
          width: 28px; height: 28px; border: 1px solid var(--edge); border-radius: 50%;
          background: transparent; display: flex; align-items: center; justify-content: center;
          color: var(--ink-ghost); transition: all 130ms; cursor: pointer;
        }
        .scr-add-btn:hover:not(.done) { border-color: var(--accent); color: var(--accent); background: var(--accent-tint); }
        .scr-add-btn.done { border-color: oklch(0.65 0.16 145); color: oklch(0.65 0.16 145); background: oklch(0.96 0.04 145); cursor: default; }

        .scr-panel { border: 1px solid var(--edge); border-radius: 4px; background: var(--bg, #F9FAFE); overflow: hidden; }
        .scr-panel-head { padding: 10px 14px; border-bottom: 1px solid var(--edge); background: var(--surface); }
        .scr-panel-eye { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.20em; color: var(--ink-ghost); }
        .scr-panel-body { padding: 14px; }

        .scr-field-label { font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.16em; color: var(--ink-ghost); margin-bottom: 5px; }
        .scr-form-input {
          width: 100%; border: 1px solid var(--edge); border-radius: 5px;
          padding: 7px 10px; font-size: 12px; color: var(--ink); background: var(--bg, #F9FAFE);
          outline: none; transition: border-color 130ms; box-sizing: border-box;
        }
        .scr-form-input:focus { border-color: var(--accent); }

        .scr-city-tag {
          padding: 3px 10px; border-radius: 9999px; font-size: 10.5px; font-weight: 600;
          border: 1px solid var(--edge); color: var(--ink-ghost); background: var(--surface);
          cursor: pointer; transition: all 120ms;
        }
        .scr-city-tag.on { background: var(--accent); color: #fff; border-color: var(--accent); }
        .scr-city-tag:hover:not(.on) { border-color: var(--ink-ghost); color: var(--ink-muted); }

        .scr-run-btn {
          display: flex; width: 100%; align-items: center; justify-content: center; gap: 7px;
          background: var(--accent); color: #fff; border: none;
          padding: 10px; border-radius: 6px; font-size: 12px; font-weight: 700;
          letter-spacing: 0.03em; transition: opacity 130ms; cursor: pointer;
        }
        .scr-run-btn:hover:not(:disabled) { opacity: 0.82; }
        .scr-run-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .scr-stat-row { display: flex; align-items: center; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid var(--edge-soft); }
        .scr-stat-row:last-child { border-bottom: none; }
        .scr-stat-lbl { font-size: 11px; color: var(--ink-ghost); }
        .scr-stat-val { font-size: 12px; font-weight: 700; color: var(--ink-muted); font-family: ui-monospace, monospace; }

        .scr-run-history-row { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--edge-soft); }
        .scr-run-history-row:last-child { border-bottom: none; }
        .scr-run-dot { width: 6px; height: 6px; border-radius: 50%; background: oklch(0.65 0.16 145); flex-shrink: 0; }
        .scr-run-dot.fail { background: var(--danger); }
        .scr-run-title { font-size: 11px; font-weight: 600; color: var(--ink-muted); }
        .scr-run-sub { font-size: 10px; color: var(--ink-ghost); }
        .scr-run-count { font-size: 10.5px; font-weight: 700; color: var(--ink-ghost); font-family: ui-monospace, monospace; }

        .scr-bulk-bar {
          position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
          background: var(--ink); color: #fff; border-radius: 10px;
          display: flex; align-items: center; gap: 12px; padding: 10px 18px;
          box-shadow: 0 4px 20px rgba(5,15,22,0.22); z-index: 200; white-space: nowrap;
        }
        .scr-bulk-btn { font-size: 11.5px; font-weight: 600; color: rgba(255,255,255,0.72); border: none; background: none; padding: 3px 8px; border-radius: 5px; transition: all 120ms; cursor: pointer; }
        .scr-bulk-btn:hover { color: #fff; background: rgba(255,255,255,0.1); }
        .scr-bulk-btn.primary { background: var(--accent); color: #fff; padding: 5px 12px; border-radius: 7px; }
        .scr-bulk-btn.primary:hover { opacity: 0.85; background: var(--accent); }
      `}</style>

      <div className="scr-root" style={{ margin: '-16px -16px 0', minHeight: 'calc(100vh - 64px)', background: 'var(--bg, #F9FAFE)' }}>
        {/* Header */}
        <div
          style={{
            height: 58, background: 'var(--bg, #F9FAFE)', borderBottom: '1px solid var(--edge)',
            display: 'flex', alignItems: 'center', padding: '0 24px', gap: 12,
            position: 'sticky', top: 64, zIndex: 30,
          }}
        >
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.20em', textTransform: 'uppercase', color: 'var(--ink-ghost)', marginRight: 16, whiteSpace: 'nowrap' }}>
            Lead Scraper
          </span>
          <div style={{ flex: 1, maxWidth: 480, position: 'relative' }}>
            <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-ghost)', width: 14, height: 14 }} />
            <input
              className="scr-input"
              placeholder='Zoekterm voor scraper, bv. "fotostudio Amsterdam"'
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <select className="scr-select" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
              <option value="">Alle steden</option>
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="scr-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">Alle types</option>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button className={`scr-pill${filterMode === 'new' ? ' active' : ''}`} onClick={() => toggleFilterMode('new')}>Nieuw</button>
            <button className={`scr-pill${filterMode === 'in-pipe' ? ' active' : ''}`} onClick={() => toggleFilterMode('in-pipe')}>In pipeline</button>
            <button className={`scr-pill${filterMode === 'duplicate' ? ' active' : ''}`} onClick={() => toggleFilterMode('duplicate')}>Dubbel</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
            <button className="scr-btn-outline">Exporteren</button>
            <button className="scr-btn-primary" onClick={handleSearch} disabled={searching}>
              {searching ? <Loader2 className="animate-spin" style={{ width: 13, height: 13 }} /> : <Play style={{ width: 13, height: 13 }} />}
              Scraper starten
            </button>
          </div>
        </div>

        {/* Body grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', alignItems: 'start' }}>
          {/* Results column */}
          <div style={{ borderRight: '1px solid var(--edge)' }}>
            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 28px', borderBottom: '1px solid var(--edge)', background: 'var(--surface)',
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-ghost)' }}>
                Resultaten
              </span>
              <span style={{ fontSize: 10, color: 'var(--ink-ghost)', fontFamily: 'ui-monospace, monospace' }}>
                {filteredLeads.length} studio{filteredLeads.length !== 1 ? "'s" : ''} gevonden
              </span>
            </div>

            {searchError && (
              <div style={{ padding: '12px 28px', background: 'oklch(0.97 0.03 27)', color: 'var(--danger)', fontSize: 12, borderBottom: '1px solid var(--edge)' }}>
                {searchError}
              </div>
            )}

            <table className="scr-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}></th>
                  <th style={{ width: 220 }}>Studio</th>
                  <th style={{ width: 140 }}>Type</th>
                  <th>Contact</th>
                  <th style={{ width: 130 }}>Status</th>
                  <th style={{ width: 44 }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 40, textAlign: 'center', fontSize: 13, color: 'var(--ink-ghost)' }}>
                      {searching ? 'Bezig met zoeken…' : 'Geen resultaten. Start een nieuwe zoekopdracht in het paneel rechts.'}
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map(lead => {
                    const status = statusOf(lead, pipelineNames)
                    const isDone = added.has(lead.id) || status === 'in-pipe' || status === 'closed'
                    const isSelected = selected.has(lead.id)
                    const primaryCat = lead.categories?.[0] || 'Studio'
                    return (
                      <tr
                        key={lead.id}
                        className={`scr-row${isSelected ? ' selected' : ''}`}
                        onClick={() => toggleRow(lead.id)}
                      >
                        <td>
                          <div
                            className={`scr-check${isSelected ? ' on' : ''}`}
                            onClick={(e) => { e.stopPropagation(); toggleRow(lead.id) }}
                          />
                        </td>
                        <td>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{lead.name}</div>
                          {lead.city && (
                            <div style={{ fontSize: 11, color: 'var(--ink-ghost)', fontWeight: 500, marginTop: 1 }}>{lead.city}</div>
                          )}
                        </td>
                        <td>
                          <span className="scr-cat-chip">{primaryCat}</span>
                        </td>
                        <td>
                          {lead.website && (
                            <a
                              href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'underline', textUnderlineOffset: 2 }}
                            >
                              <Globe style={{ width: 11, height: 11 }} />
                              {lead.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                            </a>
                          )}
                          {lead.instagram && (
                            <div style={{ marginTop: 2 }}>
                              <a
                                href={lead.instagram.startsWith('http') ? lead.instagram : `https://instagram.com/${lead.instagram.replace('@', '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'underline', textUnderlineOffset: 2 }}
                              >
                                <Camera style={{ width: 11, height: 11 }} />
                                {lead.instagram}
                              </a>
                            </div>
                          )}
                          {lead.phone && (
                            <div style={{ fontSize: 11, color: 'var(--ink-muted)', fontFamily: 'ui-monospace, monospace', marginTop: 2 }}>
                              {lead.phone}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className={`scr-status-chip ${statusClass(status)}`}>
                            <span className="scr-dot" />
                            {statusLabel(status)}
                          </span>
                        </td>
                        <td>
                          <button
                            className={`scr-add-btn${isDone ? ' done' : ''}`}
                            onClick={(e) => { e.stopPropagation(); if (!isDone) addToPipeline(lead) }}
                            disabled={isDone}
                            title={isDone ? 'Al in pipeline' : 'Toevoegen aan pipeline'}
                          >
                            {isDone ? <Check style={{ width: 14, height: 14 }} /> : <Plus style={{ width: 14, height: 14 }} />}
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>

            <div style={{ borderTop: '1px solid var(--edge)', padding: '11px 28px' }}>
              <span style={{ fontSize: 11, color: 'var(--ink-ghost)', fontFamily: 'ui-monospace, monospace' }}>
                Lctnships Workspace &middot; Lead Scraper &middot; Google Maps + Instagram
              </span>
            </div>
          </div>

          {/* Sidebar */}
          <div
            style={{
              position: 'sticky', top: 122, maxHeight: 'calc(100vh - 122px)',
              overflowY: 'auto', padding: 20,
              display: 'flex', flexDirection: 'column', gap: 14,
            }}
          >
            {/* Session stats */}
            <div className="scr-panel">
              <div className="scr-panel-head">
                <span className="scr-panel-eye">Sessie</span>
              </div>
              <div style={{ padding: '0 14px' }}>
                <div className="scr-stat-row">
                  <span className="scr-stat-lbl">Gevonden</span>
                  <span className="scr-stat-val">{sessionStats.found}</span>
                </div>
                <div className="scr-stat-row">
                  <span className="scr-stat-lbl">Toegevoegd aan pipeline</span>
                  <span className="scr-stat-val">{sessionStats.added}</span>
                </div>
                <div className="scr-stat-row">
                  <span className="scr-stat-lbl">Al in pipeline</span>
                  <span className="scr-stat-val">{sessionStats.alreadyInPipe}</span>
                </div>
                <div className="scr-stat-row">
                  <span className="scr-stat-lbl">Dubbel gevonden</span>
                  <span className="scr-stat-val">{sessionStats.duplicates}</span>
                </div>
                <div className="scr-stat-row">
                  <span className="scr-stat-lbl">Overgeslagen</span>
                  <span className="scr-stat-val">{sessionStats.skipped}</span>
                </div>
              </div>
            </div>

            {/* Recent searches */}
            <div className="scr-panel">
              <div className="scr-panel-head">
                <span className="scr-panel-eye">Recente zoekopdrachten</span>
              </div>
              <div style={{ padding: '0 14px' }}>
                {history.length === 0 ? (
                  <div style={{ padding: '12px 0', fontSize: 11, color: 'var(--ink-ghost)' }}>
                    Nog geen zoekopdrachten.
                  </div>
                ) : (
                  history.slice(0, 6).map(h => (
                    <div key={h.id} className="scr-run-history-row">
                      <div className={`scr-run-dot${h.results_count === 0 ? ' fail' : ''}`} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="scr-run-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {h.query}
                        </div>
                        <div className="scr-run-sub">
                          {formatRelativeDate(h.created_at)}{h.results_count === 0 ? ' · mislukt' : ''}
                        </div>
                      </div>
                      <span className="scr-run-count">{h.results_count === 0 ? '—' : h.results_count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="scr-bulk-bar">
            <span style={{ fontSize: 12, fontWeight: 700 }}>{selected.size} geselecteerd</span>
            <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.18)' }} />
            <button className="scr-bulk-btn primary" onClick={addSelected}>
              <Plus style={{ width: 12, height: 12, display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
              Toevoegen aan pipeline
            </button>
            <button className="scr-bulk-btn" onClick={() => setSelected(new Set())}>Deselecteren</button>
            <button className="scr-bulk-btn" onClick={() => setSelected(new Set())} aria-label="Sluiten">
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>
        )}
      </div>
    </>
  )
}
