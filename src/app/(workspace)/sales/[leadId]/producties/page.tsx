'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format, parseISO } from 'date-fns'
import { nl } from 'date-fns/locale'
import { ArrowLeft, Loader2, Plus, Calendar, Mail, Phone, MapPin, Home, X } from 'lucide-react'
import { workspaceClient } from '@/lib/workspace-client'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type Studio = {
  id: string
  company_name: string
  contact_name: string | null
  city: string | null
  email: string | null
  phone: string | null
  status: string
  notes: string | null
}

type Production = {
  id: string
  title: string
  proposed_dates: string[]
  status: 'open' | 'closed'
  final_date: string | null
  deadline: string | null
  created_at: string
  updated_at: string
}

type StudioSpace = {
  id: string
  lead_id: string
  name: string
  notes: string | null
  sort_order: number
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  try { return format(parseISO(d), 'd MMM yyyy', { locale: nl }) } catch { return d }
}

export default function StudioProductionsPage() {
  const params = useParams<{ leadId: string }>()
  const leadId = params.leadId

  const [studio, setStudio] = useState<Studio | null>(null)
  const [productions, setProductions] = useState<Production[]>([])
  const [spaces, setSpaces] = useState<StudioSpace[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [studioRes, prodsRes, spacesRes] = await Promise.all([
      workspaceClient
        .from<Studio[]>('sales_leads')
        .select('id, company_name, contact_name, city, email, phone, status, notes')
        .eq('id', leadId)
        .single(),
      workspaceClient
        .from<Production[]>('productions')
        .select('id, title, proposed_dates, status, final_date, deadline, created_at, updated_at')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false }),
      workspaceClient
        .from<StudioSpace[]>('studio_spaces')
        .select('id, lead_id, name, notes, sort_order')
        .eq('lead_id', leadId)
        .order('sort_order', { ascending: true }),
    ])
    if (studioRes.data) setStudio(studioRes.data as unknown as Studio)
    if (prodsRes.data) setProductions(prodsRes.data as Production[])
    if (spacesRes.data) setSpaces(spacesRes.data as StudioSpace[])
    setLoading(false)
  }, [leadId])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    )
  }
  if (!studio) {
    return (
      <div className="p-8">
        <p className="text-gray-500">Studio niet gevonden.</p>
        <Link href="/marketing/agenda" className="text-indigo-600 text-sm mt-2 inline-block">← Terug naar productie agenda</Link>
      </div>
    )
  }

  const planned = productions.filter((p) => p.final_date)
  const open = productions.filter((p) => !p.final_date)

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <Link
        href="/marketing/agenda"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-3"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Terug naar productie agenda
      </Link>

      {/* Studio header */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{studio.company_name}</h1>
              <Badge variant={studio.status === 'closed' ? 'default' : 'secondary'}>{studio.status}</Badge>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm text-gray-600">
              {studio.contact_name && <span>{studio.contact_name}</span>}
              {studio.city && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-gray-400" />{studio.city}
                </span>
              )}
              {studio.email && (
                <a href={`mailto:${studio.email}`} className="inline-flex items-center gap-1 hover:text-indigo-600">
                  <Mail className="h-3.5 w-3.5 text-gray-400" />{studio.email}
                </a>
              )}
              {studio.phone && (
                <a href={`tel:${studio.phone}`} className="inline-flex items-center gap-1 hover:text-indigo-600">
                  <Phone className="h-3.5 w-3.5 text-gray-400" />{studio.phone}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Studio-ruimtes */}
      <StudioSpacesCard leadId={leadId} spaces={spaces} onChange={load} />

      {/* Geplande producties */}
      <Section
        title="Geplande producties"
        count={planned.length}
        icon={<Calendar className="h-4 w-4 text-green-600" />}
      >
        {planned.length === 0 ? (
          <p className="text-sm text-gray-500">Nog geen geplande productie.</p>
        ) : (
          <div className="space-y-2">
            {planned.map((p) => (
              <ProductionRow key={p.id} p={p} accent="green" />
            ))}
          </div>
        )}
      </Section>

      {/* Open / wachtend */}
      <Section
        title="Open / wacht op finale datum"
        count={open.length}
        icon={<Calendar className="h-4 w-4 text-amber-600" />}
      >
        {open.length === 0 ? (
          <p className="text-sm text-gray-500">Geen openstaande producties.</p>
        ) : (
          <div className="space-y-2">
            {open.map((p) => (
              <ProductionRow key={p.id} p={p} accent="amber" />
            ))}
          </div>
        )}
      </Section>

      {productions.length === 0 && (
        <div className="border border-dashed border-gray-200 rounded-xl py-12 text-center">
          <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500 mb-4">Nog geen productie aangemaakt voor deze studio.</p>
          <Link href="/marketing/agenda">
            <Button size="sm">
              <Plus className="h-3.5 w-3.5 mr-1.5" />Plan productie
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}

function Section({
  title,
  count,
  icon,
  children,
}: {
  title: string
  count: number
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        <span className="text-xs text-gray-400">{count}</span>
      </div>
      {children}
    </div>
  )
}

function ProductionRow({ p, accent }: { p: Production; accent: 'green' | 'amber' }) {
  return (
    <Link
      href={`/marketing/agenda/${p.id}`}
      className={cn(
        'block border rounded-lg p-4 hover:shadow-sm transition bg-white',
        accent === 'green' ? 'border-green-200' : 'border-amber-200',
      )}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900">{p.title}</h3>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
            {p.final_date ? (
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {fmtDate(p.final_date)}
              </span>
            ) : (
              <span>{p.proposed_dates.length} voorgestelde datum{p.proposed_dates.length === 1 ? '' : 's'}</span>
            )}
            <span>Aangemaakt {fmtDate(p.created_at)}</span>
          </div>
        </div>
        <Badge variant={p.status === 'open' ? 'default' : 'secondary'} className="text-xs">
          {p.final_date ? 'Gepland' : p.status === 'open' ? 'Stemronde open' : 'Wacht op finale'}
        </Badge>
      </div>
    </Link>
  )
}

function StudioSpacesCard({
  leadId,
  spaces,
  onChange,
}: {
  leadId: string
  spaces: StudioSpace[]
  onChange: () => void
}) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!name.trim()) return
    setSaving(true)
    const nextOrder = spaces.length > 0 ? Math.max(...spaces.map((s) => s.sort_order)) + 1 : 0
    await workspaceClient.from('studio_spaces').insert({
      lead_id: leadId,
      name: name.trim(),
      notes: notes.trim() || null,
      sort_order: nextOrder,
    })
    setName(''); setNotes('')
    setAdding(false)
    setSaving(false)
    onChange()
  }
  const remove = async (id: string) => {
    await workspaceClient.from('studio_spaces').delete().eq('id', id)
    onChange()
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white mb-6">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Home className="h-4 w-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">Studio-ruimtes</h2>
          {spaces.length > 0 && (
            <span className="text-xs text-gray-400">{spaces.length}</span>
          )}
        </div>
        <Button size="sm" variant="outline" className="h-7" onClick={() => setAdding(!adding)}>
          <Plus className="h-3.5 w-3.5 mr-1" />Ruimte
        </Button>
      </div>
      <div className="p-5">
        {spaces.length === 0 && !adding ? (
          <p className="text-sm text-gray-500">
            Geen studio-ruimtes ingevuld. Voeg ze toe als dit bedrijf meerdere ruimtes heeft (helpt met productie planning).
          </p>
        ) : (
          <div className="space-y-1.5">
            {spaces.map((s) => (
              <div key={s.id} className="flex items-start gap-2 border border-gray-100 rounded-lg p-2.5 group">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">{s.name}</p>
                  {s.notes && <p className="text-xs text-gray-500 mt-0.5">{s.notes}</p>}
                </div>
                <button
                  onClick={() => remove(s.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        {adding && (
          <div className="space-y-2 mt-3 pt-3 border-t border-gray-100">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Bv. Studio 1 — cyclorama"
              className="h-8 text-sm"
              autoFocus
            />
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notities (m², capaciteit, etc — optioneel)"
              className="h-8 text-sm"
            />
            <div className="flex justify-end gap-1.5">
              <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Annuleer</Button>
              <Button size="sm" onClick={submit} disabled={saving || !name.trim()}>
                {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                Toevoegen
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
