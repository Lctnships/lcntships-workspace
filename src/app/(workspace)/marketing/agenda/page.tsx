'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import { nl } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import {
  Calendar,
  Plus,
  Copy,
  Check,
  Loader2,
  Trash2,
  X,
  Users,
  Lock,
  Unlock,
  Star,
  Clapperboard,
  ExternalLink,
  CalendarDays,
  List,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import { workspaceClient } from '@/lib/workspace-client'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventInput, EventClickArg } from '@fullcalendar/core'
import nlLocale from '@fullcalendar/core/locales/nl'

type SalesAgendaItem = {
  id: string
  title: string
  description: string | null
  type: 'meeting' | 'call' | 'follow_up' | 'demo' | 'other'
  date: string
  start_time: string | null
  end_time: string | null
  location: string | null
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  assigned_to: string | null
}

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
  contact_name: string | null
  city: string | null
  address: string | null
  email: string | null
  phone: string | null
}

type Vote = {
  id: string
  voter_name: string
  available_dates: string[]
  note: string | null
  created_at: string
}

function formatDate(d: string) {
  try {
    return format(parseISO(d), 'EEE d MMM yyyy', { locale: nl })
  } catch {
    return d
  }
}

export default function ProductieAgendaPage() {
  const [productions, setProductions] = useState<Production[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState<Production | null>(null)
  const [votes, setVotes] = useState<Vote[]>([])
  const [loadingVotes, setLoadingVotes] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [view, setView] = useState<'list' | 'calendar'>('calendar')
  const [meetings, setMeetings] = useState<SalesAgendaItem[]>([])
  const [showSalesMeetings, setShowSalesMeetings] = useState(true)
  const [closedStudios, setClosedStudios] = useState<ClosedStudio[]>([])
  const [prefillLead, setPrefillLead] = useState<ClosedStudio | null>(null)

  const loadProductions = useCallback(async () => {
    setLoading(true)
    const [prodRes, meetingsRes, studiosRes] = await Promise.all([
      fetch('/api/productions'),
      workspaceClient
        .from<SalesAgendaItem[]>('sales_agenda')
        .select('id, title, description, type, date, start_time, end_time, location, status, assigned_to')
        .order('date', { ascending: true }),
      workspaceClient
        .from<ClosedStudio[]>('sales_leads')
        .select('id, company_name, contact_name, city, address, email, phone')
        .eq('status', 'closed')
        .order('updated_at', { ascending: false }),
    ])
    if (prodRes.ok) setProductions(await prodRes.json())
    if (meetingsRes.data) setMeetings(meetingsRes.data as SalesAgendaItem[])
    if (studiosRes.data) setClosedStudios(studiosRes.data as ClosedStudio[])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadProductions()
  }, [loadProductions])

  const loadDetail = useCallback(async (id: string) => {
    setLoadingVotes(true)
    const res = await fetch(`/api/productions/${id}`)
    if (res.ok) {
      const data = await res.json()
      setSelected(data.production)
      setVotes(data.votes)
    }
    setLoadingVotes(false)
  }, [])

  const copyLink = async (token: string, id: string) => {
    const base =
      process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost')
        ? process.env.NEXT_PUBLIC_APP_URL
        : typeof window !== 'undefined' && !window.location.origin.includes('localhost')
          ? window.location.origin
          : 'https://workspace.lctnships.com'
    const url = `${base.replace(/\/$/, '')}/p/${token}`
    await navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  const toggleStatus = async (p: Production) => {
    const next = p.status === 'open' ? 'closed' : 'open'
    const res = await fetch(`/api/productions/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    if (res.ok) {
      await loadProductions()
      if (selected?.id === p.id) await loadDetail(p.id)
    }
  }

  const setFinalDate = async (p: Production, date: string | null) => {
    const res = await fetch(`/api/productions/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ final_date: date }),
    })
    if (res.ok) {
      await loadProductions()
      if (selected?.id === p.id) await loadDetail(p.id)
    }
  }

  const deleteProduction = async (id: string) => {
    if (!confirm('Weet je zeker dat je deze productie wilt verwijderen?')) return
    const res = await fetch(`/api/productions/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setSelected(null)
      setVotes([])
      await loadProductions()
    }
  }

  const router = useRouter()
  const createBriefFromProduction = async (p: Production) => {
    // Check of er al een brief is voor deze productie
    const existing = await workspaceClient
      .from<Array<{ id: string }>>('content_briefs')
      .select('id')
      .eq('production_id', p.id)
      .limit(1)
    if (existing.data && existing.data.length > 0) {
      router.push(`/content?brief=${existing.data[0].id}`)
      return
    }
    const { data, error } = await workspaceClient
      .from<Array<{ id: string }>>('content_briefs')
      .insert({
        production_id: p.id,
        studio_name: p.location ?? p.title,
        title: p.title,
        description: p.description,
        shoot_date: p.final_date ?? (p.proposed_dates[0] ?? null),
        status: 'draft',
        shotlist: [],
        equipment: [],
        share_link: crypto.randomUUID(),
      })
      .select()
    if (error) {
      alert(`Kon brief niet aanmaken: ${error.message}`)
      return
    }
    const row = Array.isArray(data) ? data[0] : null
    if (row) {
      router.push(`/content?brief=${row.id}`)
    } else {
      router.push('/content')
    }
  }

  // Studios die wel "closed" zijn maar nog geen productie hebben gepland
  const plannedLeadIds = new Set(
    productions.map((p) => p.lead_id).filter((id): id is string => !!id),
  )
  const unplannedStudios = closedStudios.filter((s) => !plannedLeadIds.has(s.id))

  // Producties deze week (ma-zo van vandaag)
  const now = new Date()
  const dayOfWeek = (now.getDay() + 6) % 7 // 0 = maandag
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek)
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
  const productionsThisWeek = productions.filter((p) => {
    if (!p.final_date) return false
    const d = new Date(p.final_date + 'T12:00:00')
    return d >= weekStart && d < weekEnd
  })
  const weekCount = productionsThisWeek.length

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Productie Agenda</h1>
          <p className="text-sm text-gray-500 mt-1">
            Plan productiedagen en laat het team stemmen op beschikbare datums.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setView('calendar')}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition',
                view === 'calendar' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900',
              )}
            >
              <CalendarDays className="h-4 w-4" />
              Kalender
            </button>
            <button
              onClick={() => setView('list')}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition',
                view === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900',
              )}
            >
              <List className="h-4 w-4" />
              Lijst
            </button>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showSalesMeetings}
              onChange={(e) => setShowSalesMeetings(e.target.checked)}
              className="rounded border-gray-300"
            />
            Sales meetings tonen
          </label>
          <Button onClick={() => { setPrefillLead(null); setCreating(true) }}>
            <Plus className="h-4 w-4 mr-2" />
            Nieuwe productie
          </Button>
        </div>
      </div>

      {/* Week indicator */}
      {!loading && (
        <div
          className={cn(
            'mb-6 rounded-xl border px-5 py-4 flex items-center justify-between',
            weekCount >= 2
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-red-50 border-red-200',
          )}
        >
          <div>
            <p className={cn('text-sm font-semibold', weekCount >= 2 ? 'text-emerald-900' : 'text-red-900')}>
              {weekCount >= 2
                ? `${weekCount} producties deze week — minimum gehaald`
                : `Deze week ${weekCount}/2 producties gepland`}
            </p>
            <p className={cn('text-xs mt-0.5', weekCount >= 2 ? 'text-emerald-700' : 'text-red-700')}>
              {weekCount >= 2
                ? 'Goed bezig.'
                : `Je hebt ${2 - weekCount} extra productie${2 - weekCount === 1 ? '' : 's'} nodig om je weekdoel te halen.`}
            </p>
          </div>
          {productionsThisWeek.length > 0 && (
            <div className="flex flex-wrap gap-1.5 max-w-md justify-end">
              {productionsThisWeek.map((p) => (
                <span
                  key={p.id}
                  className="text-xs px-2.5 py-1 bg-white border border-gray-200 rounded-md text-gray-700"
                >
                  {p.title}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Producties nog in te plannen — tabel */}
      {!loading && (
        <ProductionsTable
          productions={productions.filter((p) => !p.final_date)}
          unplannedStudios={unplannedStudios}
          onOpenProduction={(id) => router.push(`/marketing/agenda/${id}`)}
          onOpenStudio={(leadId) => router.push(`/sales/${leadId}/producties`)}
          onCopyLink={copyLink}
          copiedId={copiedId}
          onPlanForStudio={(s) => { setPrefillLead(s); setCreating(true) }}
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      ) : view === 'list' && productions.length === 0 ? (
        <div className="border border-dashed border-gray-200 rounded-xl py-16 text-center">
          <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Nog geen producties. Klik op "Nieuwe productie" om te beginnen.</p>
        </div>
      ) : view === 'calendar' ? (
        <ProductieKalender
          productions={productions}
          meetings={showSalesMeetings ? meetings : []}
          onEventClick={(id) => router.push(`/marketing/agenda/${id}`)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {productions.map((p) => (
            <div
              key={p.id}
              className={cn(
                'border border-gray-100 rounded-xl p-4 bg-white hover:shadow-sm transition cursor-pointer',
                selected?.id === p.id && 'ring-2 ring-gray-900',
              )}
              onClick={() => loadDetail(p.id)}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-gray-900 line-clamp-1">{p.title}</h3>
                <Badge variant={p.status === 'open' ? 'default' : 'secondary'}>
                  {p.status === 'open' ? 'Open' : 'Gesloten'}
                </Badge>
              </div>
              {p.location && <p className="text-xs text-gray-500 mb-1">{p.location}</p>}
              {p.deadline && (
                <p className="text-xs text-gray-400 mb-2">
                  Sluit {format(parseISO(p.deadline), 'd MMM HH:mm', { locale: nl })}
                </p>
              )}
              <div className="flex flex-wrap gap-1 mb-3">
                {p.proposed_dates.slice(0, 3).map((d) => (
                  <span
                    key={d}
                    className={cn(
                      'text-xs px-2 py-0.5 rounded-md border',
                      p.final_date === d
                        ? 'bg-green-50 border-green-300 text-green-800'
                        : 'bg-gray-50 border-gray-200 text-gray-700',
                    )}
                  >
                    {formatDate(d)}
                  </span>
                ))}
                {p.proposed_dates.length > 3 && (
                  <span className="text-xs text-gray-400">+{p.proposed_dates.length - 3}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    copyLink(p.share_token, p.id)
                  }}
                >
                  {copiedId === p.id ? (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1.5" />
                      Gekopieerd
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 mr-1.5" />
                      Deel-link
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <DetailPanel
          production={selected}
          votes={votes}
          loading={loadingVotes}
          onClose={() => {
            setSelected(null)
            setVotes([])
          }}
          onToggleStatus={() => toggleStatus(selected)}
          onSetFinal={(d) => setFinalDate(selected, d)}
          onDelete={() => deleteProduction(selected.id)}
          onCopyLink={() => copyLink(selected.share_token, selected.id)}
          onCreateBrief={() => createBriefFromProduction(selected)}
          copied={copiedId === selected.id}
          linkedStudio={closedStudios.find((s) => s.id === selected.lead_id) ?? null}
        />
      )}

      {creating && (
        <CreateDialog
          prefillLead={prefillLead}
          onClose={() => { setCreating(false); setPrefillLead(null) }}
          onCreated={(productionId) => {
            setCreating(false)
            setPrefillLead(null)
            router.push(`/marketing/agenda/${productionId}`)
          }}
        />
      )}
    </div>
  )
}

function CreateDialog({
  onClose,
  onCreated,
  prefillLead,
}: {
  onClose: () => void
  onCreated: (productionId: string) => void
  prefillLead: ClosedStudio | null
}) {
  const [title, setTitle] = useState(prefillLead?.company_name ?? '')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState(prefillLead?.city ?? '')
  const [dates, setDates] = useState<string[]>([''])
  const [deadline, setDeadline] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validDates = dates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))

  const submit = async () => {
    setError(null)
    if (!title.trim()) return setError('Titel is verplicht')
    if (validDates.length === 0) return setError('Voeg minstens één datum toe')

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

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Nieuwe productie</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Titel *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Bijv. Shoot nieuwe studio"
            />
          </div>
          <div>
            <Label htmlFor="location">Locatie</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Bijv. Amsterdam"
            />
          </div>
          <div>
            <Label htmlFor="description">Omschrijving</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Korte beschrijving voor het team..."
              rows={3}
            />
          </div>
          <div>
            <Label>Voorgestelde datums *</Label>
            <div className="space-y-2 mt-1">
              {dates.map((d, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    type="date"
                    value={d}
                    onChange={(e) => {
                      const next = [...dates]
                      next[i] = e.target.value
                      setDates(next)
                    }}
                  />
                  {dates.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDates(dates.filter((_, idx) => idx !== i))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setDates([...dates, ''])}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Datum toevoegen
              </Button>
            </div>
          </div>
          <div>
            <Label htmlFor="deadline">Deadline (optioneel)</Label>
            <Input
              id="deadline"
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">Na deze tijd sluit de poll automatisch.</p>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Annuleren
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Aanmaken
          </Button>
        </div>
      </div>
    </div>
  )
}

function DetailPanel({
  production,
  votes,
  loading,
  onClose,
  onToggleStatus,
  onSetFinal,
  onDelete,
  onCopyLink,
  onCreateBrief,
  copied,
  linkedStudio,
}: {
  production: Production
  votes: Vote[]
  loading: boolean
  onClose: () => void
  onToggleStatus: () => void
  onSetFinal: (d: string | null) => void
  onDelete: () => void
  onCopyLink: () => void
  onCreateBrief: () => void
  copied: boolean
  linkedStudio: ClosedStudio | null
}) {
  const tally = useMemo(() => {
    const m = new Map<string, string[]>()
    production.proposed_dates.forEach((d) => m.set(d, []))
    votes.forEach((v) => {
      v.available_dates.forEach((d) => {
        if (m.has(d)) m.get(d)!.push(v.voter_name)
      })
    })
    return m
  }, [production.proposed_dates, votes])

  const bestCount = Math.max(0, ...Array.from(tally.values()).map((a) => a.length))

  return (
    <div className="fixed inset-0 z-40 bg-black/30 flex justify-end" onClick={onClose}>
      <div
        className="bg-white w-full max-w-xl h-full overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-gray-900">{production.title}</h2>
            {production.location && <p className="text-sm text-gray-500 mt-0.5">{production.location}</p>}
            {linkedStudio && (
              <div className="mt-2">
                <a
                  href={`/sales/${linkedStudio.id}/producties`}
                  className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  Studio: {linkedStudio.company_name}
                  {linkedStudio.contact_name ? ` — ${linkedStudio.contact_name}` : ''}
                </a>
                {linkedStudio.address && (
                  <p className="text-xs text-gray-500 mt-0.5">{linkedStudio.address}{linkedStudio.city ? `, ${linkedStudio.city}` : ''}</p>
                )}
              </div>
            )}
            {production.description && (
              <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{production.description}</p>
            )}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={onCopyLink}>
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  Gekopieerd
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  Deel-link kopiëren
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={onToggleStatus}>
              {production.status === 'open' ? (
                <>
                  <Lock className="h-3.5 w-3.5 mr-1.5" />
                  Sluiten
                </>
              ) : (
                <>
                  <Unlock className="h-3.5 w-3.5 mr-1.5" />
                  Heropenen
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={onCreateBrief}>
              <Clapperboard className="h-3.5 w-3.5 mr-1.5" />
              Maak content brief
            </Button>
            <Button variant="outline" size="sm" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Verwijderen
            </Button>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-400" />
              Resultaten ({votes.length} {votes.length === 1 ? 'stem' : 'stemmen'})
            </h3>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            ) : (
              <div className="space-y-2">
                {production.proposed_dates.map((d) => {
                  const names = tally.get(d) ?? []
                  const isFinal = production.final_date === d
                  const isBest = names.length === bestCount && bestCount > 0
                  return (
                    <div
                      key={d}
                      className={cn(
                        'border rounded-lg p-3',
                        isFinal
                          ? 'border-green-300 bg-green-50'
                          : isBest
                            ? 'border-gray-900'
                            : 'border-gray-100',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{formatDate(d)}</span>
                          {isFinal && (
                            <Badge className="bg-green-600 hover:bg-green-600">Finale datum</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-700">
                            {names.length} / {votes.length}
                          </span>
                          <Button
                            variant={isFinal ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => onSetFinal(isFinal ? null : d)}
                            className="h-7 px-2"
                          >
                            <Star className={cn('h-3.5 w-3.5', isFinal && 'fill-current')} />
                          </Button>
                        </div>
                      </div>
                      {names.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {names.map((n) => (
                            <span key={n} className="text-xs bg-white border border-gray-200 rounded px-2 py-0.5">
                              {n}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {votes.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Stemmen</h3>
              <div className="space-y-2">
                {votes.map((v) => (
                  <div key={v.id} className="border border-gray-100 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-gray-900">{v.voter_name}</span>
                      <span className="text-xs text-gray-400">
                        {format(parseISO(v.created_at), 'd MMM HH:mm', { locale: nl })}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {v.available_dates.map((d) => (
                        <span key={d} className="text-xs bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5">
                          {formatDate(d)}
                        </span>
                      ))}
                    </div>
                    {v.note && <p className="text-xs text-gray-600 mt-1.5 italic">"{v.note}"</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

type TableRow =
  | {
      kind: 'production'
      id: string
      title: string
      city: string
      contact: string
      proposedStart: string | null
      proposedEnd: string | null
      proposedDates: string[]
      voteCount: number
      deadline: string | null
      status: 'open' | 'closed'
      production: Production
    }
  | {
      kind: 'studio'
      id: string
      title: string
      city: string
      contact: string
      proposedStart: null
      proposedEnd: null
      proposedDates: []
      voteCount: 0
      deadline: null
      status: 'no_production'
      studio: ClosedStudio
    }

type SortKey = 'title' | 'city' | 'status' | 'proposedStart' | 'proposedEnd' | 'votes' | 'deadline'

function ProductionsTable({
  productions,
  unplannedStudios,
  onOpenProduction,
  onOpenStudio,
  onCopyLink,
  copiedId,
  onPlanForStudio,
}: {
  productions: Production[]
  unplannedStudios: ClosedStudio[]
  onOpenProduction: (id: string) => void
  onOpenStudio: (leadId: string) => void
  onCopyLink: (token: string, id: string) => void
  copiedId: string | null
  onPlanForStudio: (s: ClosedStudio) => void
}) {
  const [search, setSearch] = useState('')
  const [cityFilter, setCityFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed' | 'no_production'>('all')
  const [startFrom, setStartFrom] = useState('')
  const [endTo, setEndTo] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('proposedStart')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const rows: TableRow[] = useMemo(() => {
    const out: TableRow[] = []
    for (const p of productions) {
      const sorted = [...p.proposed_dates].sort()
      out.push({
        kind: 'production',
        id: p.id,
        title: p.title,
        city: p.location ?? '',
        contact: '',
        proposedStart: sorted[0] ?? null,
        proposedEnd: sorted[sorted.length - 1] ?? null,
        proposedDates: sorted,
        voteCount: 0,
        deadline: p.deadline,
        status: p.status,
        production: p,
      })
    }
    for (const s of unplannedStudios) {
      out.push({
        kind: 'studio',
        id: s.id,
        title: s.company_name,
        city: s.city ?? '',
        contact: s.contact_name ?? '',
        proposedStart: null,
        proposedEnd: null,
        proposedDates: [],
        voteCount: 0,
        deadline: null,
        status: 'no_production',
        studio: s,
      })
    }
    return out
  }, [productions, unplannedStudios])

  const cities = useMemo(() => {
    const set = new Set<string>()
    rows.forEach((r) => { if (r.city) set.add(r.city) })
    return Array.from(set).sort()
  }, [rows])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (search && !`${r.title} ${r.city} ${r.contact}`.toLowerCase().includes(search.toLowerCase())) return false
      if (cityFilter !== 'all' && r.city !== cityFilter) return false
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (startFrom && r.proposedStart && r.proposedStart < startFrom) return false
      if (endTo && r.proposedEnd && r.proposedEnd > endTo) return false
      if ((startFrom || endTo) && r.kind === 'studio') return false
      return true
    })
  }, [rows, search, cityFilter, statusFilter, startFrom, endTo])

  const sorted = useMemo(() => {
    const arr = [...filtered]
    arr.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      const get = (r: TableRow): string | number => {
        switch (sortKey) {
          case 'title': return r.title.toLowerCase()
          case 'city': return r.city.toLowerCase()
          case 'status': return r.status
          case 'proposedStart': return r.proposedStart ?? '9999'
          case 'proposedEnd': return r.proposedEnd ?? '9999'
          case 'votes': return r.voteCount
          case 'deadline': return r.deadline ?? '9999'
        }
      }
      const av = get(a)
      const bv = get(b)
      if (av < bv) return -1 * dir
      if (av > bv) return 1 * dir
      return 0
    })
    return arr
  }, [filtered, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="h-3 w-3 text-gray-300" />
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3 text-gray-700" /> : <ArrowDown className="h-3 w-3 text-gray-700" />
  }

  const statusLabel = (s: TableRow['status']) => {
    if (s === 'open') return { text: 'Stemronde open', cls: 'bg-blue-50 text-blue-700 border-blue-200' }
    if (s === 'closed') return { text: 'Wacht op finale', cls: 'bg-amber-50 text-amber-700 border-amber-200' }
    return { text: 'Geen productie', cls: 'bg-gray-50 text-gray-600 border-gray-200' }
  }

  const hasFilters = search || cityFilter !== 'all' || statusFilter !== 'all' || startFrom || endTo

  return (
    <div className="mb-6 rounded-xl border border-gray-100 bg-white">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Producties nog in te plannen</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {sorted.length} {sorted.length === 1 ? 'regel' : 'regels'}
            {hasFilters && rows.length !== sorted.length ? ` (van ${rows.length})` : ''}
            {' — geen officiële datum'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="px-5 py-3 border-b border-gray-100 grid grid-cols-1 md:grid-cols-6 gap-2">
        <div className="md:col-span-2 relative">
          <Search className="h-3.5 w-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Zoek studio, contact, stad..."
            className="pl-8 h-8 text-sm"
          />
        </div>
        <select
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="h-8 text-sm border border-gray-200 rounded-md px-2 bg-white"
        >
          <option value="all">Alle steden</option>
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="h-8 text-sm border border-gray-200 rounded-md px-2 bg-white"
        >
          <option value="all">Alle statussen</option>
          <option value="open">Stemronde open</option>
          <option value="closed">Wacht op finale</option>
          <option value="no_production">Geen productie</option>
        </select>
        <Input
          type="date"
          value={startFrom}
          onChange={(e) => setStartFrom(e.target.value)}
          className="h-8 text-sm"
          title="Vanaf"
        />
        <Input
          type="date"
          value={endTo}
          onChange={(e) => setEndTo(e.target.value)}
          className="h-8 text-sm"
          title="Tot en met"
        />
      </div>

      {sorted.length === 0 ? (
        <div className="px-5 py-12 text-center text-sm text-gray-500">
          {hasFilters ? 'Geen resultaten met deze filters.' : 'Alles is ingepland — top!'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-b-xl">
          <table className="w-full text-sm table-auto">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left font-semibold px-5 py-2.5">
                  <button onClick={() => toggleSort('title')} className="flex items-center gap-1 hover:text-gray-900">
                    Studio / titel <SortIcon k="title" />
                  </button>
                </th>
                <th className="text-left font-semibold px-3 py-2.5">
                  <button onClick={() => toggleSort('city')} className="flex items-center gap-1 hover:text-gray-900">
                    Stad <SortIcon k="city" />
                  </button>
                </th>
                <th className="text-left font-semibold px-3 py-2.5">
                  <button onClick={() => toggleSort('status')} className="flex items-center gap-1 hover:text-gray-900">
                    Status <SortIcon k="status" />
                  </button>
                </th>
                <th className="text-left font-semibold px-3 py-2.5">
                  <button onClick={() => toggleSort('proposedStart')} className="flex items-center gap-1 hover:text-gray-900">
                    Start <SortIcon k="proposedStart" />
                  </button>
                </th>
                <th className="text-left font-semibold px-3 py-2.5">
                  <button onClick={() => toggleSort('proposedEnd')} className="flex items-center gap-1 hover:text-gray-900">
                    Eind <SortIcon k="proposedEnd" />
                  </button>
                </th>
                <th className="text-left font-semibold px-3 py-2.5">
                  <button onClick={() => toggleSort('deadline')} className="flex items-center gap-1 hover:text-gray-900">
                    Deadline <SortIcon k="deadline" />
                  </button>
                </th>
                <th className="text-right font-semibold px-5 py-2.5 whitespace-nowrap w-[1%]">Actie</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => {
                const lbl = statusLabel(r.status)
                return (
                  <tr
                    key={`${r.kind}-${r.id}`}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition cursor-pointer"
                    onClick={() => r.kind === 'production' ? onOpenProduction(r.id) : onOpenStudio(r.id)}
                  >
                    <td className="px-5 py-3">
                      <div className="font-medium text-gray-900">{r.title}</div>
                      {r.contact && <div className="text-xs text-gray-500">{r.contact}</div>}
                      {r.kind === 'studio' && r.studio.address && (
                        <div className="text-xs text-gray-400">{r.studio.address}</div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-gray-700">{r.city || <span className="text-gray-300">—</span>}</td>
                    <td className="px-3 py-3">
                      <span className={cn('inline-flex text-xs px-2 py-0.5 rounded-md border', lbl.cls)}>
                        {lbl.text}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-700">
                      {r.proposedStart ? formatDate(r.proposedStart) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-3 text-gray-700">
                      {r.proposedEnd && r.proposedEnd !== r.proposedStart
                        ? formatDate(r.proposedEnd)
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-3 text-gray-600 text-xs">
                      {r.deadline
                        ? format(parseISO(r.deadline), 'd MMM HH:mm', { locale: nl })
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap w-[1%]" onClick={(e) => e.stopPropagation()}>
                      {r.kind === 'production' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2"
                            onClick={() => onCopyLink(r.production.share_token, r.id)}
                          >
                            {copiedId === r.id ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2.5 text-xs"
                            onClick={() => onOpenProduction(r.id)}
                          >
                            Open
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2.5 text-xs"
                          onClick={() => onPlanForStudio(r.studio)}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Plan
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function ProductieKalender({
  productions,
  meetings,
  onEventClick,
}: {
  productions: Production[]
  meetings: SalesAgendaItem[]
  onEventClick: (id: string) => void
}) {
  const events: EventInput[] = useMemo(() => {
    const out: EventInput[] = []
    for (const p of productions) {
      if (!p.final_date) continue
      out.push({
        id: p.id,
        title: p.title,
        start: p.final_date,
        allDay: true,
        backgroundColor: '#10b981',
        borderColor: '#059669',
        textColor: '#ffffff',
        extendedProps: { kind: 'final', productionId: p.id, location: p.location },
      })
    }
    // Meetings / sales agenda
    for (const m of meetings) {
      if (m.status === 'cancelled') continue
      const typeColor: Record<string, { bg: string; border: string; text: string }> = {
        meeting: { bg: '#ede9fe', border: '#7c3aed', text: '#5b21b6' },
        call: { bg: '#ffedd5', border: '#ea580c', text: '#9a3412' },
        follow_up: { bg: '#fef3c7', border: '#d97706', text: '#92400e' },
        demo: { bg: '#fce7f3', border: '#db2777', text: '#9f1239' },
        other: { bg: '#e5e7eb', border: '#6b7280', text: '#374151' },
      }
      const c = typeColor[m.type] ?? typeColor.other
      const start = m.start_time ? `${m.date}T${m.start_time}` : m.date
      const typeLabel: Record<string, string> = {
        meeting: 'Sales meeting',
        call: 'Belafspraak',
        follow_up: 'Follow-up',
        demo: 'Demo',
        other: 'Sales',
      }
      const prefix = typeLabel[m.type] ?? 'Sales'
      out.push({
        id: `meeting-${m.id}`,
        title: `${prefix}: ${m.title}`,
        start,
        allDay: !m.start_time,
        backgroundColor: c.bg,
        borderColor: c.border,
        textColor: c.text,
        extendedProps: { kind: 'meeting', location: m.location, meetingType: m.type },
      })
    }
    return out
  }, [productions, meetings])

  const handleEventClick = (arg: EventClickArg) => {
    const props = arg.event.extendedProps as { productionId?: string }
    const id = props.productionId ?? arg.event.id
    onEventClick(id)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 productie-kalender">
      <style jsx global>{`
        .productie-kalender .fc {
          font-family: inherit;
          --fc-border-color: #f3f4f6;
          --fc-page-bg-color: #ffffff;
          --fc-neutral-bg-color: #fafafa;
          --fc-today-bg-color: #fafafa;
          --fc-now-indicator-color: #111827;
        }
        .productie-kalender .fc-toolbar.fc-header-toolbar {
          margin-bottom: 1.25rem;
        }
        .productie-kalender .fc-toolbar-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #111827;
          letter-spacing: -0.01em;
        }
        .productie-kalender .fc-button {
          background: #ffffff !important;
          border: 1px solid #e5e7eb !important;
          color: #4b5563 !important;
          font-weight: 500 !important;
          text-transform: capitalize !important;
          box-shadow: none !important;
          padding: 0.4rem 0.85rem !important;
          font-size: 0.8125rem !important;
          border-radius: 0.625rem !important;
        }
        .productie-kalender .fc-button:hover {
          background: #f9fafb !important;
          border-color: #d1d5db !important;
          color: #111827 !important;
        }
        .productie-kalender .fc-button:focus {
          outline: none !important;
          box-shadow: 0 0 0 2px rgba(17, 24, 39, 0.08) !important;
        }
        .productie-kalender .fc-button-active,
        .productie-kalender .fc-button-primary:not(:disabled).fc-button-active {
          background: #111827 !important;
          color: #ffffff !important;
          border-color: #111827 !important;
        }
        .productie-kalender .fc-button-group {
          gap: 2px;
        }
        .productie-kalender .fc-daygrid-day.fc-day-today,
        .productie-kalender .fc-timegrid-col.fc-day-today {
          background: #fafafa !important;
        }
        .productie-kalender .fc-daygrid-day.fc-day-today .fc-daygrid-day-number {
          color: #ffffff;
          background: #111827;
          border-radius: 999px;
          width: 1.5rem;
          height: 1.5rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
        }
        .productie-kalender .fc-daygrid-day-number {
          padding: 0.5rem;
          color: #4b5563;
          font-size: 0.8125rem;
          font-weight: 500;
        }
        .productie-kalender .fc-event {
          border-radius: 6px;
          padding: 3px 8px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          margin: 1px 4px;
        }
        .productie-kalender .fc-event:hover {
          opacity: 0.9;
        }
        .productie-kalender .fc-col-header-cell {
          background: transparent;
          padding: 12px 0 8px;
          font-weight: 600;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #9ca3af;
          border-bottom: 1px solid #f3f4f6;
        }
        .productie-kalender .fc-col-header-cell-cushion {
          color: inherit !important;
          padding: 0 !important;
          text-decoration: none !important;
        }
        .productie-kalender .fc-scrollgrid {
          border: none !important;
        }
        .productie-kalender .fc-scrollgrid td,
        .productie-kalender .fc-scrollgrid th {
          border-color: #f3f4f6 !important;
        }
        .productie-kalender .fc-timegrid-slot {
          height: 2.5rem !important;
          border-color: #f3f4f6 !important;
        }
        .productie-kalender .fc-timegrid-slot-label {
          color: #9ca3af;
          font-size: 0.75rem;
          font-weight: 500;
          padding-right: 0.75rem !important;
        }
        .productie-kalender .fc-list-event:hover td {
          background: #f9fafb !important;
        }
        .productie-kalender .fc-more-link {
          color: #6b7280 !important;
          font-size: 0.75rem;
          font-weight: 500;
          padding: 2px 6px;
        }
      `}</style>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale={nlLocale}
        firstDay={1}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        buttonText={{ today: 'Vandaag', month: 'Maand', week: 'Week', day: 'Dag' }}
        events={events}
        eventClick={handleEventClick}
        height="auto"
        dayMaxEvents={3}
        moreLinkText={(n) => `+${n} meer`}
        slotMinTime="07:00:00"
        slotMaxTime="22:00:00"
        nowIndicator
        allDayText="Hele dag"
      />
      <div className="flex gap-4 mt-4 pt-4 border-t border-gray-100 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-[#10b981]" /> Finale productiedatum
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-[#ede9fe] border border-[#7c3aed]" /> Sales meeting
        </span>
      </div>
    </div>
  )
}
