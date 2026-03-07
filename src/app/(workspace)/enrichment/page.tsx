'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Globe,
  Mail,
  Phone,
  MapPin,
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
  RefreshCw,
  Play,
  Pause,
  Square,
  Copy,
  Check,
  AlertCircle,
  Clock,
  Filter,
  Download,
  Search,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Edit2,
  X,
  Users,
  CheckSquare,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { supabase, SalesLead } from '@/lib/supabase'

type SortField = 'company_name' | 'city' | 'status' | 'enriched'
type SortDir = 'asc' | 'desc'
type FilterType = 'all' | 'with_email' | 'without_email' | 'not_scraped' | 'errors'

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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={e => { e.stopPropagation(); copyToClipboard(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="p-1 hover:bg-gray-100 rounded transition-colors"
      title="Kopieer"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-gray-400" />}
    </button>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    cold: 'bg-blue-100 text-blue-700',
    warm: 'bg-amber-100 text-amber-700',
    hot: 'bg-red-100 text-red-700',
    negotiation: 'bg-purple-100 text-purple-700',
    closed: 'bg-green-100 text-green-700',
    lost: 'bg-gray-100 text-gray-500',
    new: 'bg-slate-100 text-slate-600',
    contacted: 'bg-sky-100 text-sky-700',
    interested: 'bg-teal-100 text-teal-700',
    partner: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-rose-100 text-rose-700',
  }
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium capitalize', styles[status] || 'bg-gray-100 text-gray-500')}>
      {status}
    </span>
  )
}

interface EditEmailModalProps {
  lead: SalesLead
  onSave: (id: string, email: string, notes: string) => void
  onClose: () => void
}

function EditEmailModal({ lead, onSave, onClose }: EditEmailModalProps) {
  const [email, setEmail] = useState(lead.email || '')
  const [notes, setNotes] = useState(lead.notes || '')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md m-4 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Bewerk {lead.company_name}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="h-4 w-4" /></button>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@bedrijf.nl" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notities</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            placeholder="Voeg notities toe..."
          />
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Annuleren</Button>
          <Button size="sm" onClick={() => { onSave(lead.id, email, notes); onClose() }}>Opslaan</Button>
        </div>
      </div>
    </div>
  )
}

export default function EnrichmentPage() {
  const [leads, setLeads] = useState<SalesLead[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [cityFilter, setCityFilter] = useState('')
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('company_name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editLead, setEditLead] = useState<SalesLead | null>(null)

  // Enrichment state
  const [running, setRunning] = useState(false)
  const [paused, setPaused] = useState(false)
  const [progress, setProgress] = useState({ total: 0, done: 0, emails: 0, errors: 0 })
  const pausedRef = useRef(false)
  const abortRef = useRef(false)

  // Inline copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const loadLeads = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('sales_leads')
      .select('*')
      .order('company_name', { ascending: true })
    setLeads((data as SalesLead[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadLeads() }, [loadLeads])

  // Stats
  const total = leads.length
  const withEmail = leads.filter(l => l.email).length
  const withoutEmail = leads.filter(l => !l.email && l.website).length
  const notScraped = leads.filter(l => !l.enriched && l.website).length
  const errors = leads.filter(l => l.enrichment_error).length

  // Cities for filter
  const cities = [...new Set(leads.map(l => l.city).filter(Boolean))].sort() as string[]

  // Filtering
  const filtered = leads.filter(lead => {
    if (filter === 'with_email' && !lead.email) return false
    if (filter === 'without_email' && (lead.email || !lead.website)) return false
    if (filter === 'not_scraped' && (lead.enriched || !lead.website)) return false
    if (filter === 'errors' && !lead.enrichment_error) return false
    if (cityFilter && lead.city !== cityFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        lead.company_name.toLowerCase().includes(q) ||
        (lead.city || '').toLowerCase().includes(q) ||
        (lead.email || '').toLowerCase().includes(q) ||
        (lead.website || '').toLowerCase().includes(q)
      )
    }
    return true
  })

  // Sorting
  const sorted = [...filtered].sort((a, b) => {
    let av = '', bv = ''
    if (sortField === 'company_name') { av = a.company_name || ''; bv = b.company_name || '' }
    if (sortField === 'city') { av = a.city || ''; bv = b.city || '' }
    if (sortField === 'status') { av = a.status || ''; bv = b.status || '' }
    if (sortField === 'enriched') { av = String(a.enriched); bv = String(b.enriched) }
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
  })

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp className="h-3.5 w-3.5 text-gray-300" />
    return sortDir === 'asc'
      ? <ChevronUp className="h-3.5 w-3.5 text-indigo-600" />
      : <ChevronDown className="h-3.5 w-3.5 text-indigo-600" />
  }

  // Selection
  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectAll = () => setSelected(new Set(sorted.map(l => l.id)))
  const selectNone = () => setSelected(new Set())
  const selectWithEmail = () => setSelected(new Set(sorted.filter(l => l.email).map(l => l.id)))

  // Update a single lead in state
  const updateLead = (id: string, updates: Partial<SalesLead>) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l))
  }

  // Enrich single lead
  const enrichSingle = async (lead: SalesLead) => {
    if (!lead.website) return
    updateLead(lead.id, { enrichment_error: undefined, enriched: false })
    try {
      const res = await fetch('/api/enrich-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: lead.website }),
      })
      const data = await res.json()
      const email = data.emails?.[0] || null
      const updates = {
        email: email || lead.email || null,
        instagram: data.socials?.instagram || lead.instagram || null,
        facebook: data.socials?.facebook || lead.facebook || null,
        linkedin: data.socials?.linkedin || lead.linkedin || null,
        twitter: data.socials?.twitter || lead.twitter || null,
        enriched: true,
        enriched_at: new Date().toISOString(),
        enrichment_error: undefined,
      }
      await supabase.from('sales_leads').update(updates).eq('id', lead.id)
      updateLead(lead.id, updates)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Onbekende fout'
      await supabase.from('sales_leads').update({ enrichment_error: msg }).eq('id', lead.id)
      updateLead(lead.id, { enrichment_error: msg })
    }
  }

  // Bulk enrichment
  const startBulkEnrichment = async (targetLeads: SalesLead[]) => {
    const queue = targetLeads.filter(l => l.website)
    if (queue.length === 0) return

    setRunning(true)
    setPaused(false)
    pausedRef.current = false
    abortRef.current = false
    setProgress({ total: queue.length, done: 0, emails: 0, errors: 0 })

    const CONCURRENCY = 3
    const DELAY_MS = 500

    for (let i = 0; i < queue.length; i += CONCURRENCY) {
      if (abortRef.current) break
      while (pausedRef.current) {
        await new Promise(r => setTimeout(r, 300))
        if (abortRef.current) break
      }
      if (abortRef.current) break

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
          const updates = {
            email: email || lead.email || null,
            instagram: data.socials?.instagram || null,
            facebook: data.socials?.facebook || null,
            linkedin: data.socials?.linkedin || null,
            twitter: data.socials?.twitter || null,
            enriched: true,
            enriched_at: new Date().toISOString(),
            enrichment_error: undefined,
          }
          await supabase.from('sales_leads').update(updates).eq('id', lead.id)
          updateLead(lead.id, updates)
          setProgress(p => ({ ...p, done: p.done + 1, emails: p.emails + (email ? 1 : 0) }))
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Fout'
          await supabase.from('sales_leads').update({ enrichment_error: msg }).eq('id', lead.id)
          updateLead(lead.id, { enrichment_error: msg })
          setProgress(p => ({ ...p, done: p.done + 1, errors: p.errors + 1 }))
        }
      }))

      if (i + CONCURRENCY < queue.length && !abortRef.current) {
        await new Promise(r => setTimeout(r, DELAY_MS))
      }
    }

    setRunning(false)
    setPaused(false)
  }

  const togglePause = () => { pausedRef.current = !pausedRef.current; setPaused(pausedRef.current) }
  const stopEnrichment = () => { abortRef.current = true; pausedRef.current = false; setPaused(false) }

  // Save email/notes edit
  const saveEdit = async (id: string, email: string, notes: string) => {
    await supabase.from('sales_leads').update({ email: email || null, notes: notes || null }).eq('id', id)
    updateLead(id, { email: email || undefined, notes: notes || undefined })
  }

  // Export CSV
  const exportCSV = () => {
    const targetLeads = selected.size > 0 ? sorted.filter(l => selected.has(l.id)) : sorted
    const rows = [
      ['Naam', 'Stad', 'Email', 'Telefoon', 'Website', 'Instagram', 'Facebook', 'LinkedIn', 'Status', 'Notities'],
      ...targetLeads.map(l => [
        l.company_name, l.city || '', l.email || '', l.phone || '',
        l.website || '', l.instagram || '', l.facebook || '', l.linkedin || '',
        l.status || '', l.notes || '',
      ]),
    ]
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Copy all emails
  const copyAllEmails = () => {
    const targetLeads = selected.size > 0 ? sorted.filter(l => selected.has(l.id)) : sorted
    const emails = targetLeads.filter(l => l.email).map(l => l.email).join('\n')
    copyToClipboard(emails)
  }

  // Change status bulk
  const bulkChangeStatus = async (status: string) => {
    if (selected.size === 0) return
    const ids = [...selected]
    await supabase.from('sales_leads').update({ status }).in('id', ids)
    ids.forEach(id => updateLead(id, { status: status as SalesLead['status'] }))
  }

  const progressPercent = progress.total > 0 ? (progress.done / progress.total) * 100 : 0

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lead Enrichment</h1>
          <p className="text-sm text-gray-500 mt-1">Automatisch emails en socials vinden via website scraping</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadLeads} disabled={loading} className="gap-2">
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            Vernieuwen
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Totaal leads', value: total, icon: Users, color: 'text-gray-600', bg: 'bg-gray-50' },
          { label: 'Met email', value: withEmail, icon: Mail, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Zonder email', value: withoutEmail, icon: Globe, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Nog te scrapen', value: notScraped, icon: Clock, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Fouten', value: errors, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', stat.bg)}>
              <stat.icon className={cn('h-4.5 w-4.5', stat.color)} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Enrichment controls */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="font-semibold text-gray-900">Bulk Enrichment</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {notScraped} leads nog te scrapen · 3 concurrent · 500ms delay
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {!running ? (
              <>
                <Button
                  onClick={() => startBulkEnrichment(leads.filter(l => !l.enriched && l.website))}
                  disabled={notScraped === 0}
                  className="gap-2"
                >
                  <Play className="h-4 w-4" />
                  Start Enrichment ({notScraped})
                </Button>
                <Button
                  variant="outline"
                  onClick={() => startBulkEnrichment(leads.filter(l => l.enrichment_error && l.website))}
                  disabled={errors === 0}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Fouten opnieuw ({errors})
                </Button>
                <Button
                  variant="outline"
                  onClick={() => startBulkEnrichment(leads.filter(l => !l.email && l.website))}
                  disabled={withoutEmail === 0}
                  className="gap-2"
                >
                  Zonder email opnieuw ({withoutEmail})
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={togglePause} className="gap-2">
                  {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  {paused ? 'Hervatten' : 'Pauzeren'}
                </Button>
                <Button variant="outline" onClick={stopEnrichment} className="gap-2 text-red-600 border-red-200 hover:bg-red-50">
                  <Square className="h-4 w-4" />
                  Stoppen
                </Button>
              </>
            )}
          </div>
        </div>

        {(running || progress.done > 0) && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                {progress.done} / {progress.total} verrijkt
                {' · '}
                <span className="text-green-600">{progress.emails} emails gevonden</span>
                {progress.errors > 0 && <span className="text-red-500"> · {progress.errors} fouten</span>}
                {paused && <span className="text-amber-600"> · Gepauzeerd</span>}
              </span>
              <span className="font-medium text-gray-900">{Math.round(progressPercent)}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className={cn('h-2 rounded-full transition-all', paused ? 'bg-amber-400' : 'bg-indigo-600')}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Filters + Search */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Zoeken..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 rounded-xl bg-white"
          />
        </div>

        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {([
            { id: 'all', label: 'Alle' },
            { id: 'with_email', label: 'Met email' },
            { id: 'without_email', label: 'Geen email' },
            { id: 'not_scraped', label: 'Niet gescraped' },
            { id: 'errors', label: 'Fouten' },
          ] as { id: FilterType; label: string }[]).map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                filter === f.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <select
          value={cityFilter}
          onChange={e => setCityFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Alle steden</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <div className="flex items-center gap-1 text-sm text-gray-500">
          <Filter className="h-3.5 w-3.5" />
          {sorted.length} leads
        </div>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-indigo-700">{selected.size} geselecteerd</span>
          <Button size="sm" variant="outline" onClick={copyAllEmails} className="gap-2 bg-white">
            <Copy className="h-3.5 w-3.5" />
            Kopieer emails
          </Button>
          <Button size="sm" variant="outline" onClick={exportCSV} className="gap-2 bg-white">
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
          <select
            onChange={e => { if (e.target.value) bulkChangeStatus(e.target.value) }}
            className="px-2 py-1 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none"
            defaultValue=""
          >
            <option value="">Status wijzigen...</option>
            {['cold', 'warm', 'hot', 'negotiation', 'closed', 'lost'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button onClick={selectNone} className="text-sm text-indigo-600 hover:text-indigo-800 ml-auto">Deselecteer</button>
        </div>
      )}

      {/* Select helpers */}
      <div className="flex items-center gap-2 text-sm">
        <button onClick={selectAll} className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
          <CheckSquare className="h-3.5 w-3.5" /> Selecteer alles ({sorted.length})
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

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.size === sorted.length && sorted.length > 0}
                    onChange={e => e.target.checked ? selectAll() : selectNone()}
                    className="rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  <button onClick={() => toggleSort('company_name')} className="flex items-center gap-1 hover:text-gray-900">
                    Naam <SortIcon field="company_name" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  <button onClick={() => toggleSort('city')} className="flex items-center gap-1 hover:text-gray-900">
                    Stad <SortIcon field="city" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Website</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Socials</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  <button onClick={() => toggleSort('status')} className="flex items-center gap-1 hover:text-gray-900">
                    Status <SortIcon field="status" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  <button onClick={() => toggleSort('enriched')} className="flex items-center gap-1 hover:text-gray-900">
                    Enrichment <SortIcon field="enriched" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Acties</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-200" />
                    Leads laden...
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                    <Users className="h-10 w-10 mx-auto mb-2 text-gray-200" />
                    Geen leads gevonden
                  </td>
                </tr>
              ) : sorted.map(lead => (
                <tr
                  key={lead.id}
                  className={cn(
                    'hover:bg-gray-50 transition-colors',
                    selected.has(lead.id) && 'bg-indigo-50/50'
                  )}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(lead.id)}
                      onChange={() => toggleSelect(lead.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 max-w-[180px] truncate">{lead.company_name}</div>
                    {lead.phone && (
                      <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3" />{lead.phone}
                      </div>
                    )}
                    {lead.notes && (
                      <div className="text-xs text-amber-600 mt-0.5 truncate max-w-[180px]">{lead.notes}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {lead.city && (
                      <span className="flex items-center gap-1 text-gray-600">
                        <MapPin className="h-3 w-3 text-gray-400" />{lead.city}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {lead.website ? (
                      <a
                        href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 max-w-[140px] truncate"
                      >
                        <Globe className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{lead.website.replace(/^https?:\/\/(www\.)?/, '')}</span>
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                    ) : (
                      <span className="text-gray-300 text-xs">geen website</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {lead.email ? (
                      <div className="flex items-center gap-1">
                        <span
                          className="text-gray-700 max-w-[160px] truncate cursor-pointer hover:text-indigo-600"
                          onClick={() => { copyToClipboard(lead.email!); setCopiedId(lead.id); setTimeout(() => setCopiedId(null), 1500) }}
                          title={lead.email}
                        >
                          {lead.email}
                        </span>
                        {copiedId === lead.id
                          ? <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                          : <CopyButton text={lead.email} />
                        }
                      </div>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {lead.instagram && (
                        <a href={lead.instagram} target="_blank" rel="noopener noreferrer" title="Instagram">
                          <Instagram className="h-4 w-4 text-pink-500 hover:text-pink-700" />
                        </a>
                      )}
                      {lead.facebook && (
                        <a href={lead.facebook} target="_blank" rel="noopener noreferrer" title="Facebook">
                          <Facebook className="h-4 w-4 text-blue-600 hover:text-blue-800" />
                        </a>
                      )}
                      {lead.linkedin && (
                        <a href={lead.linkedin} target="_blank" rel="noopener noreferrer" title="LinkedIn">
                          <Linkedin className="h-4 w-4 text-blue-500 hover:text-blue-700" />
                        </a>
                      )}
                      {lead.twitter && (
                        <a href={lead.twitter} target="_blank" rel="noopener noreferrer" title="Twitter/X">
                          <Twitter className="h-4 w-4 text-gray-700 hover:text-black" />
                        </a>
                      )}
                      {!lead.instagram && !lead.facebook && !lead.linkedin && !lead.twitter && (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={lead.status || 'new'} />
                  </td>
                  <td className="px-4 py-3">
                    {lead.enrichment_error ? (
                      <span className="flex items-center gap-1 text-xs text-red-500" title={lead.enrichment_error}>
                        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                        Fout
                      </span>
                    ) : lead.enriched ? (
                      <span className="flex items-center gap-1 text-xs text-green-600">
                        <Check className="h-3.5 w-3.5" />
                        Klaar
                      </span>
                    ) : lead.website ? (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="h-3.5 w-3.5" />
                        In wachtrij
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">geen website</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditLead(lead)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Bewerk"
                      >
                        <Edit2 className="h-3.5 w-3.5 text-gray-400" />
                      </button>
                      {lead.website && (
                        <button
                          onClick={() => enrichSingle(lead)}
                          className="p-1.5 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Opnieuw scrapen"
                        >
                          <RefreshCw className="h-3.5 w-3.5 text-indigo-400" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit modal */}
      {editLead && (
        <EditEmailModal
          lead={editLead}
          onSave={saveEdit}
          onClose={() => setEditLead(null)}
        />
      )}
    </div>
  )
}
