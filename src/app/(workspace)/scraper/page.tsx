'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Search,
  Globe,
  Mail,
  Phone,
  MapPin,
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
  Star,
  RefreshCw,
  Play,
  Pause,
  Square,
  Copy,
  Check,
  AlertCircle,
  Clock,
  Download,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Edit2,
  X,
  Users,
  CheckSquare,
  History,
  Zap,
  Filter,
  Trash2,
  Target,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Lead {
  id: string
  name: string
  website?: string
  phone?: string
  email?: string
  city?: string
  address?: string
  google_rating?: number
  google_reviews?: number
  google_url?: string
  google_place_id?: string
  thumbnail?: string
  categories?: string[]
  instagram?: string
  facebook?: string
  linkedin?: string
  twitter?: string
  source?: string
  search_query?: string
  status: string
  enriched: boolean
  enriched_at?: string
  enrichment_error?: string
  notes?: string
  created_at?: string
  _duplicate?: boolean
}

interface SearchHistory {
  id: string
  query: string
  city?: string
  results_count: number
  emails_found: number
  created_at: string
}

interface Usage {
  searches_used: number
  max_searches: number
}

type SortField = 'name' | 'city' | 'google_rating' | 'google_reviews' | 'status' | 'enriched'
type SortDir = 'asc' | 'desc'
type FilterType = 'all' | 'with_email' | 'without_email' | 'not_scraped' | 'errors'

const CITIES = ['Amsterdam', 'Rotterdam', 'Den Haag', 'Utrecht', 'Eindhoven', 'Groningen', 'Haarlem', 'Leiden', 'Arnhem', 'Tilburg']
const TYPES = ['Fotostudio', 'Filmstudio', 'Muziekstudio', 'Podcast Studio', 'Dansstudio', 'Creative Space', 'Evenementenlocatie', 'Recording Studio']
const STATUSES = ['new', 'contacted', 'interested', 'partner', 'rejected']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {
    const el = document.createElement('textarea')
    el.value = text
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
  })
}

function StarRating({ rating }: { rating?: number }) {
  if (!rating) return <span className="text-gray-300 text-xs">—</span>
  return (
    <span className="flex items-center gap-0.5 text-amber-400">
      <Star className="h-3.5 w-3.5 fill-current" />
      <span className="text-xs font-medium text-gray-700">{rating.toFixed(1)}</span>
    </span>
  )
}

function StatusBadge({ status, onChange }: { status: string; onChange?: (s: string) => void }) {
  const styles: Record<string, string> = {
    new: 'bg-slate-100 text-slate-600',
    contacted: 'bg-sky-100 text-sky-700',
    interested: 'bg-teal-100 text-teal-700',
    partner: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-rose-100 text-rose-700',
  }
  if (!onChange) {
    return <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium capitalize', styles[status] || 'bg-gray-100 text-gray-500')}>{status}</span>
  }
  return (
    <select
      value={status}
      onChange={e => onChange(e.target.value)}
      onClick={e => e.stopPropagation()}
      className={cn('text-xs px-2 py-0.5 rounded-full font-medium capitalize border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-400', styles[status] || 'bg-gray-100 text-gray-500')}
    >
      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
    </select>
  )
}

function EnrichmentIcon({ lead }: { lead: Lead }) {
  if (!lead.website) return <span className="text-gray-300 text-xs">—</span>
  if (lead.enrichment_error) return <span title={lead.enrichment_error}><AlertCircle className="h-4 w-4 text-red-400" /></span>
  if (lead.enriched) return <Check className="h-4 w-4 text-green-500" />
  return <Clock className="h-4 w-4 text-gray-300 animate-pulse" />
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditLeadModal({ lead, onSave, onClose }: { lead: Lead; onSave: (id: string, updates: Partial<Lead>) => void; onClose: () => void }) {
  const [email, setEmail] = useState(lead.email || '')
  const [phone, setPhone] = useState(lead.phone || '')
  const [notes, setNotes] = useState(lead.notes || '')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md m-4 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 truncate">{lead.name}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg flex-shrink-0"><X className="h-4 w-4" /></button>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
          <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@bedrijf.nl" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Telefoon</label>
          <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+31 20 123 4567" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Notities</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            placeholder="Voeg notities toe..." />
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Annuleren</Button>
          <Button size="sm" onClick={() => { onSave(lead.id, { email: email || undefined, phone: phone || undefined, notes: notes || undefined }); onClose() }}>Opslaan</Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ScraperPage() {
  // Search state
  const [query, setQuery] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  // Data
  const [leads, setLeads] = useState<Lead[]>([])
  const [history, setHistory] = useState<SearchHistory[]>([])
  const [usage, setUsage] = useState<Usage>({ searches_used: 0, max_searches: 100 })
  const [showHistory, setShowHistory] = useState(false)

  // Enrichment
  const [enriching, setEnriching] = useState(false)
  const [enrichPaused, setEnrichPaused] = useState(false)
  const [enrichProgress, setEnrichProgress] = useState({ total: 0, done: 0, emails: 0, errors: 0 })
  const enrichPausedRef = useRef(false)
  const enrichAbortRef = useRef(false)

  // Table state
  const [filter, setFilter] = useState<FilterType>('all')
  const [cityFilter, setCityFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [minRating, setMinRating] = useState('')
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editLead, setEditLead] = useState<Lead | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Load initial data
  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    // Load existing leads
    const { data: leadsData } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    if (leadsData) setLeads(leadsData as Lead[])

    // Load usage + history
    const res = await fetch('/api/search-leads')
    if (res.ok) {
      const data = await res.json()
      setUsage(data.usage || { searches_used: 0, max_searches: 100 })
      setHistory(data.history || [])
    }
  }

  const updateLead = (id: string, updates: Partial<Lead>) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l))
  }

  // ── Search ────────────────────────────────────────────────────────────────

  const handleSearch = async (overrideQuery?: string, overrideCity?: string) => {
    const q = overrideQuery ?? (selectedType ? `${selectedType} ${selectedCity}`.trim() : query)
    const c = overrideCity ?? selectedCity
    if (!q.trim()) return

    setSearching(true)
    setSearchError(null)
    setSelected(new Set())

    try {
      const res = await fetch('/api/search-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, city: c || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSearchError(data.error || 'Zoeken mislukt')
        return
      }

      // Prepend new leads to the list (avoiding duplicates already in state)
      const newIds = new Set(data.leads.map((l: Lead) => l.id))
      setLeads(prev => [
        ...data.leads,
        ...prev.filter((l: Lead) => !newIds.has(l.id)),
      ])
      setUsage(data.usage || usage)

      // Auto-start enrichment on new leads with websites
      const toEnrich = data.leads.filter((l: Lead) => l.website && !l.enriched && !l.enrichment_error)
      if (toEnrich.length > 0) {
        startEnrichment(toEnrich)
      }

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

  // ── Enrichment ────────────────────────────────────────────────────────────

  const startEnrichment = useCallback(async (targetLeads: Lead[]) => {
    const queue = targetLeads.filter(l => l.website)
    if (queue.length === 0) return

    setEnriching(true)
    setEnrichPaused(false)
    enrichPausedRef.current = false
    enrichAbortRef.current = false
    setEnrichProgress({ total: queue.length, done: 0, emails: 0, errors: 0 })

    const CONCURRENCY = 3
    const DELAY_MS = 500

    for (let i = 0; i < queue.length; i += CONCURRENCY) {
      if (enrichAbortRef.current) break
      while (enrichPausedRef.current) {
        await new Promise(r => setTimeout(r, 300))
        if (enrichAbortRef.current) break
      }
      if (enrichAbortRef.current) break

      const batch = queue.slice(i, i + CONCURRENCY)
      await Promise.all(batch.map(async (lead) => {
        try {
          const res = await fetch('/api/enrich-lead', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: lead.website }),
          })
          const data = await res.json()
          const email = data.emails?.[0] || null
          const updates: Partial<Lead> = {
            email: email || lead.email || undefined,
            instagram: data.socials?.instagram || undefined,
            facebook: data.socials?.facebook || undefined,
            linkedin: data.socials?.linkedin || undefined,
            twitter: data.socials?.twitter || undefined,
            enriched: true,
            enriched_at: new Date().toISOString(),
            enrichment_error: undefined,
          }
          await supabase.from('leads').update(updates).eq('id', lead.id)
          updateLead(lead.id, updates)
          setEnrichProgress(p => ({ ...p, done: p.done + 1, emails: p.emails + (email ? 1 : 0) }))
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Fout'
          await supabase.from('leads').update({ enrichment_error: msg }).eq('id', lead.id)
          updateLead(lead.id, { enrichment_error: msg })
          setEnrichProgress(p => ({ ...p, done: p.done + 1, errors: p.errors + 1 }))
        }
      }))

      if (i + CONCURRENCY < queue.length && !enrichAbortRef.current) {
        await new Promise(r => setTimeout(r, DELAY_MS))
      }
    }

    setEnriching(false)
    setEnrichPaused(false)
  }, [])

  const toggleEnrichPause = () => { enrichPausedRef.current = !enrichPausedRef.current; setEnrichPaused(enrichPausedRef.current) }
  const stopEnrichment = () => { enrichAbortRef.current = true; enrichPausedRef.current = false; setEnrichPaused(false) }

  // ── Table filtering & sorting ─────────────────────────────────────────────

  const filtered = leads.filter(lead => {
    if (filter === 'with_email' && !lead.email) return false
    if (filter === 'without_email' && (lead.email || !lead.website)) return false
    if (filter === 'not_scraped' && (lead.enriched || !lead.website)) return false
    if (filter === 'errors' && !lead.enrichment_error) return false
    if (cityFilter && lead.city !== cityFilter) return false
    if (statusFilter && lead.status !== statusFilter) return false
    if (minRating && (lead.google_rating || 0) < Number(minRating)) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        lead.name.toLowerCase().includes(q) ||
        (lead.city || '').toLowerCase().includes(q) ||
        (lead.email || '').toLowerCase().includes(q) ||
        (lead.website || '').toLowerCase().includes(q)
      )
    }
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    let av: string | number = '', bv: string | number = ''
    if (sortField === 'name') { av = a.name || ''; bv = b.name || '' }
    if (sortField === 'city') { av = a.city || ''; bv = b.city || '' }
    if (sortField === 'google_rating') { av = a.google_rating || 0; bv = b.google_rating || 0 }
    if (sortField === 'google_reviews') { av = a.google_reviews || 0; bv = b.google_reviews || 0 }
    if (sortField === 'status') { av = a.status || ''; bv = b.status || '' }
    if (sortField === 'enriched') { av = String(a.enriched); bv = String(b.enriched) }
    if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av
    return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
  })

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp className="h-3 w-3 text-gray-300" />
    return sortDir === 'asc' ? <ChevronUp className="h-3 w-3 text-indigo-600" /> : <ChevronDown className="h-3 w-3 text-indigo-600" />
  }

  // ── Selection & bulk actions ──────────────────────────────────────────────

  const toggleSelect = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const selectAll = () => setSelected(new Set(sorted.map(l => l.id)))
  const selectNone = () => setSelected(new Set())
  const selectWithEmail = () => setSelected(new Set(sorted.filter(l => l.email).map(l => l.id)))

  const copyAllEmails = () => {
    const target = selected.size > 0 ? sorted.filter(l => selected.has(l.id)) : sorted
    copyToClipboard(target.filter(l => l.email).map(l => l.email).join('\n'))
  }

  const exportCSV = () => {
    const target = selected.size > 0 ? sorted.filter(l => selected.has(l.id)) : sorted
    const rows = [
      ['Naam', 'Stad', 'Email', 'Telefoon', 'Website', 'Rating', 'Reviews', 'Instagram', 'Facebook', 'LinkedIn', 'Status', 'Notities'],
      ...target.map(l => [l.name, l.city || '', l.email || '', l.phone || '', l.website || '', l.google_rating || '', l.google_reviews || '', l.instagram || '', l.facebook || '', l.linkedin || '', l.status, l.notes || '']),
    ]
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const bulkChangeStatus = async (status: string) => {
    if (selected.size === 0) return
    const ids = [...selected]
    await supabase.from('leads').update({ status }).in('id', ids)
    ids.forEach(id => updateLead(id, { status }))
  }

  const bulkReScrape = () => {
    const target = selected.size > 0 ? sorted.filter(l => selected.has(l.id) && l.website) : sorted.filter(l => l.website && !l.enriched)
    startEnrichment(target)
  }

  const bulkDelete = async () => {
    if (selected.size === 0) return
    if (!confirm(`Weet je zeker dat je ${selected.size} leads wilt verwijderen?`)) return
    const ids = [...selected]
    await supabase.from('leads').delete().in('id', ids)
    setLeads(prev => prev.filter(l => !ids.includes(l.id)))
    setSelected(new Set())
  }

  const saveLead = async (id: string, updates: Partial<Lead>) => {
    await supabase.from('leads').update(updates).eq('id', id)
    updateLead(id, updates)
  }

  const changeStatus = async (id: string, status: string) => {
    await supabase.from('leads').update({ status }).eq('id', id)
    updateLead(id, { status })
  }

  const reScrapeOne = (lead: Lead) => startEnrichment([lead])

  const [pipelineAdded, setPipelineAdded] = useState<Set<string>>(new Set())

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
    const { error } = existing
      ? await supabase.from('sales_leads').update(payload).eq('id', existing.id)
      : await supabase.from('sales_leads').insert(payload)
    if (!error) {
      setPipelineAdded(prev => new Set([...prev, lead.id]))
      setTimeout(() => setPipelineAdded(prev => { const n = new Set(prev); n.delete(lead.id); return n }), 2000)
    }
  }

  const bulkAddToPipeline = async () => {
    if (selected.size === 0) return
    const target = sorted.filter(l => selected.has(l.id))
    await Promise.all(target.map(l => addToPipeline(l)))
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  const totalLeads = leads.length
  const withEmail = leads.filter(l => l.email).length
  const notScraped = leads.filter(l => !l.enriched && l.website).length
  const enrichProgressPercent = enrichProgress.total > 0 ? (enrichProgress.done / enrichProgress.total) * 100 : 0
  const cities = [...new Set(leads.map(l => l.city).filter(Boolean))].sort() as string[]
  const usagePercent = (usage.searches_used / usage.max_searches) * 100

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Zap className="h-6 w-6 text-indigo-500" />
            Lead Scraper
          </h1>
          <p className="text-sm text-gray-500 mt-1">Vind bedrijven via Google Maps en scrape automatisch hun emails</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={cn('flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-colors',
              showHistory ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50')}
          >
            <History className="h-4 w-4" />
            Geschiedenis
          </button>
          <Button variant="outline" size="sm" onClick={loadInitialData} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Vernieuwen
          </Button>
        </div>
      </div>

      {/* ── Search Box ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="bijv. fotostudio Amsterdam, podcast studio Utrecht..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50"
            />
          </div>

          <select
            value={selectedType}
            onChange={e => { setSelectedType(e.target.value); if (e.target.value) setQuery('') }}
            className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Type studio...</option>
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <select
            value={selectedCity}
            onChange={e => setSelectedCity(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Alle steden</option>
            {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <Button
            onClick={() => handleSearch()}
            disabled={searching || (!query.trim() && !selectedType)}
            className="gap-2 px-6"
          >
            {searching ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {searching ? 'Zoeken...' : 'Zoek'}
          </Button>
        </div>

        {/* Usage bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>SerpAPI gebruik deze maand</span>
              <span className={cn('font-medium', usagePercent >= 80 ? 'text-red-500' : usagePercent >= 60 ? 'text-amber-500' : 'text-gray-600')}>
                {usage.searches_used} / {usage.max_searches} searches
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className={cn('h-1.5 rounded-full transition-all', usagePercent >= 80 ? 'bg-red-400' : usagePercent >= 60 ? 'bg-amber-400' : 'bg-indigo-500')}
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>
          </div>
          {usagePercent >= 80 && (
            <span className="text-xs text-red-500 font-medium flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" /> Bijna op
            </span>
          )}
        </div>

        {searchError && (
          <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-red-600 text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {searchError}
          </div>
        )}
      </div>

      {/* ── History panel ──────────────────────────────────────────────────── */}
      {showHistory && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <History className="h-4 w-4 text-gray-400" />
            Zoekgeschiedenis
          </h2>
          {history.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Nog geen zoekopdrachten</p>
          ) : (
            <div className="space-y-2">
              {history.map(h => (
                <div key={h.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{h.query}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(h.created_at).toLocaleDateString('nl-NL')} · {h.results_count} resultaten · {h.emails_found} emails
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleSearch(h.query, h.city || '')} className="gap-1.5">
                    <Play className="h-3.5 w-3.5" />
                    Opnieuw
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Enrichment progress ────────────────────────────────────────────── */}
      {(enriching || enrichProgress.done > 0) && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">
                  Emails zoeken... {enrichProgress.done}/{enrichProgress.total}
                  <span className="text-green-600 ml-2">· {enrichProgress.emails} gevonden</span>
                  {enrichProgress.errors > 0 && <span className="text-red-400 ml-2">· {enrichProgress.errors} fouten</span>}
                  {enrichPaused && <span className="text-amber-500 ml-2">· Gepauzeerd</span>}
                </span>
                <span className="font-medium">{Math.round(enrichProgressPercent)}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className={cn('h-2 rounded-full transition-all', enrichPaused ? 'bg-amber-400' : 'bg-indigo-600')}
                  style={{ width: `${enrichProgressPercent}%` }}
                />
              </div>
            </div>
            {enriching && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={toggleEnrichPause} className="gap-1.5">
                  {enrichPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                  {enrichPaused ? 'Hervatten' : 'Pauzeer'}
                </Button>
                <Button size="sm" variant="outline" onClick={stopEnrichment} className="gap-1.5 text-red-500 border-red-200 hover:bg-red-50">
                  <Square className="h-3.5 w-3.5" />
                  Stop
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      {leads.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{totalLeads}</p>
            <p className="text-xs text-gray-500 mt-1">Totaal leads</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{withEmail}</p>
            <p className="text-xs text-gray-500 mt-1">Met email</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold text-indigo-600">{notScraped}</p>
            <p className="text-xs text-gray-500 mt-1">Nog te scrapen</p>
          </div>
        </div>
      )}

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      {leads.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Filteren op naam, email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 rounded-xl" />
          </div>

          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            {([
              { id: 'all', label: 'Alle' },
              { id: 'with_email', label: 'Met email' },
              { id: 'without_email', label: 'Geen email' },
              { id: 'not_scraped', label: 'Te scrapen' },
              { id: 'errors', label: 'Fouten' },
            ] as { id: FilterType; label: string }[]).map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                  filter === f.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700')}>
                {f.label}
              </button>
            ))}
          </div>

          <select value={cityFilter} onChange={e => setCityFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none">
            <option value="">Alle steden</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none">
            <option value="">Alle statussen</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select value={minRating} onChange={e => setMinRating(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none">
            <option value="">Min. rating</option>
            {['3', '3.5', '4', '4.5'].map(r => <option key={r} value={r}>★ {r}+</option>)}
          </select>

          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" />{sorted.length} leads
          </span>
        </div>
      )}

      {/* ── Select helpers + bulk actions ──────────────────────────────────── */}
      {leads.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap text-sm">
          <button onClick={selectAll} className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
            <CheckSquare className="h-3.5 w-3.5" /> Alles ({sorted.length})
          </button>
          <span className="text-gray-300">·</span>
          <button onClick={selectWithEmail} className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
            <Mail className="h-3.5 w-3.5" /> Met email ({sorted.filter(l => l.email).length})
          </button>
          {selected.size > 0 && (
            <>
              <span className="text-gray-300">·</span>
              <button onClick={selectNone} className="text-gray-500 hover:text-gray-700">Wis selectie</button>
            </>
          )}
        </div>
      )}

      {selected.size > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-indigo-700">{selected.size} geselecteerd</span>
          <Button size="sm" variant="outline" onClick={copyAllEmails} className="gap-1.5 bg-white">
            <Copy className="h-3.5 w-3.5" /> Kopieer emails
          </Button>
          <Button size="sm" variant="outline" onClick={exportCSV} className="gap-1.5 bg-white">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
          <Button size="sm" variant="outline" onClick={bulkReScrape} className="gap-1.5 bg-white">
            <RefreshCw className="h-3.5 w-3.5" /> Opnieuw scrapen
          </Button>
          <select onChange={e => { if (e.target.value) bulkChangeStatus(e.target.value) }} defaultValue=""
            className="px-2 py-1 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none">
            <option value="">Status wijzigen...</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <Button size="sm" variant="outline" onClick={bulkAddToPipeline} className="gap-1.5 bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50">
            <Target className="h-3.5 w-3.5" /> Naar Pipeline
          </Button>
          <Button size="sm" variant="outline" onClick={bulkDelete} className="gap-1.5 bg-white text-red-500 border-red-200 hover:bg-red-50 ml-auto">
            <Trash2 className="h-3.5 w-3.5" /> Verwijder
          </Button>
        </div>
      )}

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      {leads.length === 0 && !searching ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <Zap className="h-16 w-16 mx-auto mb-4 text-gray-200" />
          <h2 className="text-xl font-semibold text-gray-700">Zoek je eerste leads</h2>
          <p className="text-gray-400 mt-2 text-sm">Typ een zoekopdracht hierboven, bijv. &quot;podcast studio Amsterdam&quot;</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="w-10 px-4 py-3">
                    <input type="checkbox"
                      checked={selected.size === sorted.length && sorted.length > 0}
                      onChange={e => e.target.checked ? selectAll() : selectNone()}
                      className="rounded" />
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 min-w-[180px]">
                    <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-gray-900">
                      Naam <SortIcon field="name" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    <button onClick={() => toggleSort('city')} className="flex items-center gap-1 hover:text-gray-900">
                      Stad <SortIcon field="city" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Telefoon</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Website</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Socials</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    <button onClick={() => toggleSort('google_rating')} className="flex items-center gap-1 hover:text-gray-900">
                      Rating <SortIcon field="google_rating" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    <button onClick={() => toggleSort('status')} className="flex items-center gap-1 hover:text-gray-900">
                      Status <SortIcon field="status" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    <button onClick={() => toggleSort('enriched')} className="flex items-center gap-1 hover:text-gray-900">
                      Email status <SortIcon field="enriched" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center text-gray-400">
                      <Users className="h-10 w-10 mx-auto mb-2 text-gray-200" />
                      Geen leads voor deze filters
                    </td>
                  </tr>
                ) : sorted.map(lead => (
                  <tr key={lead.id} className={cn('hover:bg-gray-50/80 transition-colors', selected.has(lead.id) && 'bg-indigo-50/40')}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.has(lead.id)} onChange={() => toggleSelect(lead.id)} className="rounded" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {lead.thumbnail && (
                          <img src={lead.thumbnail} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0 bg-gray-100" onError={e => (e.currentTarget.style.display = 'none')} />
                        )}
                        <div>
                          <p className="font-medium text-gray-900 max-w-[160px] truncate">{lead.name}</p>
                          {lead.notes && <p className="text-xs text-amber-600 truncate max-w-[160px]">{lead.notes}</p>}
                          {lead._duplicate && <span className="text-xs text-indigo-400">al aanwezig</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {lead.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-gray-300" />{lead.city}</span>}
                    </td>
                    <td className="px-4 py-3">
                      {lead.phone ? (
                        <div className="flex items-center gap-1">
                          <span className="text-gray-600 text-xs">{lead.phone}</span>
                          <button onClick={() => { copyToClipboard(lead.phone!); setCopiedId(lead.id + '_phone'); setTimeout(() => setCopiedId(null), 1500) }} className="p-1 hover:bg-gray-100 rounded">
                            {copiedId === lead.id + '_phone' ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-gray-300" />}
                          </button>
                        </div>
                      ) : <span className="text-gray-200 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {lead.website ? (
                        <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                          target="_blank" rel="noopener noreferrer"
                          className="text-indigo-500 hover:text-indigo-700 flex items-center gap-1 max-w-[130px]">
                          <Globe className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate text-xs">{lead.website.replace(/^https?:\/\/(www\.)?/, '')}</span>
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </a>
                      ) : <span className="text-gray-200 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {lead.email ? (
                        <div className="flex items-center gap-1">
                          <span
                            className="text-green-700 font-medium max-w-[150px] truncate cursor-pointer hover:text-green-900 text-xs"
                            onClick={() => { copyToClipboard(lead.email!); setCopiedId(lead.id); setTimeout(() => setCopiedId(null), 1500) }}
                            title={lead.email}
                          >
                            {lead.email}
                          </span>
                          {copiedId === lead.id
                            ? <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                            : <button onClick={() => { copyToClipboard(lead.email!); setCopiedId(lead.id); setTimeout(() => setCopiedId(null), 1500) }} className="p-0.5 hover:bg-gray-100 rounded flex-shrink-0">
                                <Copy className="h-3 w-3 text-gray-300" />
                              </button>
                          }
                        </div>
                      ) : <span className="text-gray-200 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {lead.instagram && <a href={lead.instagram} target="_blank" rel="noopener noreferrer"><Instagram className="h-4 w-4 text-pink-400 hover:text-pink-600" /></a>}
                        {lead.facebook && <a href={lead.facebook} target="_blank" rel="noopener noreferrer"><Facebook className="h-4 w-4 text-blue-500 hover:text-blue-700" /></a>}
                        {lead.linkedin && <a href={lead.linkedin} target="_blank" rel="noopener noreferrer"><Linkedin className="h-4 w-4 text-blue-400 hover:text-blue-600" /></a>}
                        {lead.twitter && <a href={lead.twitter} target="_blank" rel="noopener noreferrer"><Twitter className="h-4 w-4 text-gray-500 hover:text-black" /></a>}
                        {!lead.instagram && !lead.facebook && !lead.linkedin && !lead.twitter && <span className="text-gray-200 text-xs">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        <StarRating rating={lead.google_rating} />
                        {lead.google_reviews && <p className="text-xs text-gray-400">{lead.google_reviews} reviews</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={lead.status} onChange={(s) => changeStatus(lead.id, s)} />
                    </td>
                    <td className="px-4 py-3">
                      <EnrichmentIcon lead={lead} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditLead(lead)} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Bewerk">
                          <Edit2 className="h-3.5 w-3.5 text-gray-400" />
                        </button>
                        {lead.website && (
                          <button onClick={() => reScrapeOne(lead)} className="p-1.5 hover:bg-indigo-50 rounded-lg" title="Scrape opnieuw">
                            <RefreshCw className="h-3.5 w-3.5 text-indigo-300" />
                          </button>
                        )}
                        {lead.google_url && (
                          <a href={lead.google_url} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-gray-100 rounded-lg" title="Open in Google Maps">
                            <MapPin className="h-3.5 w-3.5 text-gray-300" />
                          </a>
                        )}
                        <button
                          onClick={() => addToPipeline(lead)}
                          className={cn('p-1.5 rounded-lg transition-colors', pipelineAdded.has(lead.id) ? 'bg-indigo-100' : 'hover:bg-indigo-50')}
                          title="Voeg toe aan sales pipeline"
                        >
                          {pipelineAdded.has(lead.id)
                            ? <Check className="h-3.5 w-3.5 text-indigo-600" />
                            : <Target className="h-3.5 w-3.5 text-indigo-300" />
                          }
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Edit modal ─────────────────────────────────────────────────────── */}
      {editLead && <EditLeadModal lead={editLead} onSave={saveLead} onClose={() => setEditLead(null)} />}
    </div>
  )
}
