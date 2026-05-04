'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import { nl } from 'date-fns/locale'
import {
  ArrowLeft,
  Loader2,
  Copy,
  Check,
  Star,
  Lock,
  Unlock,
  Trash2,
  Plus,
  X,
  Users,
  Camera,
  Package,
  StickyNote,
  History,
  ExternalLink,
  Clapperboard,
} from 'lucide-react'
import { workspaceClient } from '@/lib/workspace-client'

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

type Vote = {
  id: string
  voter_name: string
  available_dates: string[]
  note: string | null
  created_at: string
}

type Note = {
  id: string
  author_email: string | null
  author_name: string | null
  body: string
  created_at: string
}

type CrewMember = {
  id: string
  team_member_id: string | null
  email: string | null
  name: string
  role: string | null
  confirmed: boolean
}

type GearItem = {
  id: string
  name: string
  category: 'equipment' | 'prop' | 'other'
  quantity: number
  notes: string | null
  checked: boolean
  sort_order: number
}

type ShotlistItem = {
  id: string
  shot_number: number | null
  description: string
  location: string | null
  notes: string | null
  done: boolean
  sort_order: number
}

type ProductionActivity = {
  id: string
  actor_email: string | null
  actor_name: string | null
  action_type: string
  payload: Record<string, unknown> | null
  created_at: string
}

type LinkedStudio = {
  id: string
  company_name: string
  contact_name: string | null
  city: string | null
  email: string | null
  phone: string | null
}

type ContentBrief = {
  id: string
  title: string | null
  status: string | null
  shoot_date: string | null
}

type TeamMember = {
  id: string
  full_name: string | null
  email: string | null
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  try { return format(parseISO(d), 'EEE d MMM yyyy', { locale: nl }) } catch { return d }
}
function fmtDateTime(d: string | null) {
  if (!d) return '—'
  try { return format(parseISO(d), 'd MMM yyyy HH:mm', { locale: nl }) } catch { return d }
}

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
  const [briefs, setBriefs] = useState<ContentBrief[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/productions/${id}`)
    if (!res.ok) {
      setLoading(false)
      return
    }
    const data = await res.json()
    setProduction(data.production)
    setVotes(data.votes ?? [])
    setNotes(data.notes ?? [])
    setCrew(data.crew ?? [])
    setGear(data.gear ?? [])
    setShotlist(data.shotlist ?? [])
    setActivities(data.activities ?? [])

    // Studio + briefs + team members in parallel
    const [studioRes, briefsRes, tmRes] = await Promise.all([
      data.production.lead_id
        ? workspaceClient
            .from<LinkedStudio[]>('sales_leads')
            .select('id, company_name, contact_name, city, email, phone')
            .eq('id', data.production.lead_id)
            .single()
        : Promise.resolve({ data: null }),
      workspaceClient
        .from<ContentBrief[]>('content_briefs')
        .select('id, title, status, shoot_date')
        .eq('production_id', id),
      workspaceClient
        .from<TeamMember[]>('team_members')
        .select('id, full_name, email'),
    ])
    if (studioRes.data) setStudio(studioRes.data as unknown as LinkedStudio)
    if (briefsRes.data) setBriefs(briefsRes.data as ContentBrief[])
    if (tmRes.data) setTeamMembers(tmRes.data as TeamMember[])
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  const copyLink = async () => {
    if (!production) return
    const base =
      process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost')
        ? process.env.NEXT_PUBLIC_APP_URL
        : typeof window !== 'undefined' && !window.location.origin.includes('localhost')
          ? window.location.origin
          : 'https://workspace.lctnships.com'
    const url = `${base.replace(/\/$/, '')}/p/${production.share_token}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const toggleStatus = async () => {
    if (!production) return
    const next = production.status === 'open' ? 'closed' : 'open'
    await fetch(`/api/productions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    await load()
  }
  const setFinal = async (date: string | null) => {
    await fetch(`/api/productions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ final_date: date }),
    })
    await load()
  }
  const deleteProd = async () => {
    if (!confirm('Productie verwijderen? Dit kan niet ongedaan worden.')) return
    await fetch(`/api/productions/${id}`, { method: 'DELETE' })
    router.push('/marketing/agenda')
  }

  const tally = useMemo(() => {
    if (!production) return new Map<string, string[]>()
    const m = new Map<string, string[]>()
    production.proposed_dates.forEach((d) => m.set(d, []))
    votes.forEach((v) => v.available_dates.forEach((d) => { if (m.has(d)) m.get(d)!.push(v.voter_name) }))
    return m
  }, [production, votes])
  const bestCount = Math.max(0, ...Array.from(tally.values()).map((a) => a.length))

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    )
  }
  if (!production) {
    return (
      <div className="p-8">
        <p className="text-gray-500">Productie niet gevonden.</p>
        <Link href="/marketing/agenda" className="text-indigo-600 text-sm mt-2 inline-block">← Terug naar agenda</Link>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/marketing/agenda"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Terug naar agenda
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{production.title}</h1>
              <Badge variant={production.status === 'open' ? 'default' : 'secondary'}>
                {production.status === 'open' ? 'Stemronde open' : production.final_date ? 'Gepland' : 'Wacht op finale'}
              </Badge>
            </div>
            {production.location && <p className="text-sm text-gray-500 mt-1">{production.location}</p>}
            {studio && (
              <Link
                href={`/sales/${studio.id}/producties`}
                className="inline-flex items-center gap-1.5 mt-2 text-xs text-indigo-600 hover:text-indigo-700 hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Studio: {studio.company_name}{studio.city ? ` — ${studio.city}` : ''}
              </Link>
            )}
            {production.description && (
              <p className="text-sm text-gray-600 mt-3 whitespace-pre-wrap max-w-2xl">{production.description}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={copyLink}>
              {copied ? <><Check className="h-3.5 w-3.5 mr-1.5" />Gekopieerd</> : <><Copy className="h-3.5 w-3.5 mr-1.5" />Deel-link</>}
            </Button>
            <Button variant="outline" size="sm" onClick={toggleStatus}>
              {production.status === 'open' ? <><Lock className="h-3.5 w-3.5 mr-1.5" />Sluiten</> : <><Unlock className="h-3.5 w-3.5 mr-1.5" />Heropenen</>}
            </Button>
            <Button variant="outline" size="sm" onClick={deleteProd}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />Verwijderen
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Datums + stemmen */}
          <Card title="Voorgestelde datums" icon={<Camera className="h-4 w-4" />}>
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
                      isFinal ? 'border-green-300 bg-green-50' : isBest ? 'border-gray-900' : 'border-gray-100',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{fmtDate(d)}</span>
                        {isFinal && <Badge className="bg-green-600 hover:bg-green-600">Finale datum</Badge>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-700">{names.length} / {votes.length}</span>
                        <Button
                          variant={isFinal ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setFinal(isFinal ? null : d)}
                          className="h-7 px-2"
                        >
                          <Star className={cn('h-3.5 w-3.5', isFinal && 'fill-current')} />
                        </Button>
                      </div>
                    </div>
                    {names.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {names.map((n) => (
                          <span key={n} className="text-xs bg-white border border-gray-200 rounded px-2 py-0.5">{n}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
              {production.proposed_dates.length === 0 && (
                <p className="text-sm text-gray-500">Geen datums voorgesteld.</p>
              )}
            </div>
            {production.deadline && (
              <p className="text-xs text-gray-500 mt-3">
                Stemronde sluit {fmtDateTime(production.deadline)}
              </p>
            )}
          </Card>

          {/* Shotlist */}
          <ShotlistCard productionId={id} items={shotlist} onChange={load} />

          {/* Gear */}
          <GearCard productionId={id} items={gear} onChange={load} />

          {/* Notities */}
          <NotesCard productionId={id} notes={notes} onChange={load} />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Crew */}
          <CrewCard productionId={id} crew={crew} teamMembers={teamMembers} onChange={load} />

          {/* Content briefs */}
          <Card title="Content briefs" icon={<Clapperboard className="h-4 w-4" />}>
            {briefs.length === 0 ? (
              <p className="text-sm text-gray-500 mb-3">Nog geen content brief gekoppeld.</p>
            ) : (
              <div className="space-y-1.5 mb-3">
                {briefs.map((b) => (
                  <Link
                    key={b.id}
                    href={`/content?brief=${b.id}`}
                    className="block border border-gray-100 rounded-lg p-2.5 hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-gray-900 truncate">{b.title ?? 'Brief'}</span>
                      {b.status && <Badge variant="outline" className="text-xs">{b.status}</Badge>}
                    </div>
                    {b.shoot_date && (
                      <p className="text-xs text-gray-500 mt-0.5">{fmtDate(b.shoot_date)}</p>
                    )}
                  </Link>
                ))}
              </div>
            )}
            <CreateBriefButton production={production} onCreated={load} />
          </Card>

          {/* Activity */}
          <ActivityCard activities={activities} />
        </div>
      </div>
    </div>
  )
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
        <span className="text-gray-400">{icon}</span>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function NotesCard({ productionId, notes, onChange }: { productionId: string; notes: Note[]; onChange: () => void }) {
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const submit = async () => {
    if (!body.trim()) return
    setSaving(true)
    await fetch(`/api/productions/${productionId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: body.trim() }),
    })
    setBody('')
    setSaving(false)
    onChange()
  }
  const remove = async (noteId: string) => {
    await fetch(`/api/productions/${productionId}/notes?noteId=${noteId}`, { method: 'DELETE' })
    onChange()
  }
  return (
    <Card title="Notities" icon={<StickyNote className="h-4 w-4" />}>
      <div className="space-y-2 mb-3">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Aantekening voor het team..."
          rows={2}
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={submit} disabled={!body.trim() || saving}>
            {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Plaatsen
          </Button>
        </div>
      </div>
      {notes.length === 0 ? (
        <p className="text-sm text-gray-500">Nog geen notities.</p>
      ) : (
        <div className="space-y-2">
          {notes.map((n) => (
            <div key={n.id} className="border border-gray-100 rounded-lg p-3 group">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-medium text-gray-700">
                  {n.author_name ?? n.author_email ?? 'Onbekend'}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{fmtDateTime(n.created_at)}</span>
                  <button
                    onClick={() => remove(n.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{n.body}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function CrewCard({
  productionId,
  crew,
  teamMembers,
  onChange,
}: {
  productionId: string
  crew: CrewMember[]
  teamMembers: TeamMember[]
  onChange: () => void
}) {
  const [adding, setAdding] = useState(false)
  const [pickedTm, setPickedTm] = useState<string>('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    setSaving(true)
    let payload: Record<string, unknown> = {}
    if (pickedTm) {
      const tm = teamMembers.find((t) => t.id === pickedTm)
      if (!tm) { setSaving(false); return }
      payload = {
        team_member_id: tm.id,
        name: tm.full_name ?? tm.email ?? 'Onbekend',
        email: tm.email,
        role: role.trim() || null,
      }
    } else {
      if (!name.trim()) { setSaving(false); return }
      payload = {
        name: name.trim(),
        email: email.trim() || null,
        role: role.trim() || null,
      }
    }
    await fetch(`/api/productions/${productionId}/crew`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setPickedTm(''); setName(''); setEmail(''); setRole('')
    setAdding(false)
    setSaving(false)
    onChange()
  }
  const remove = async (crewId: string) => {
    await fetch(`/api/productions/${productionId}/crew?crewId=${crewId}`, { method: 'DELETE' })
    onChange()
  }
  const toggleConfirmed = async (c: CrewMember) => {
    await fetch(`/api/productions/${productionId}/crew?crewId=${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmed: !c.confirmed }),
    })
    onChange()
  }

  return (
    <Card title="Crew" icon={<Users className="h-4 w-4" />}>
      {crew.length === 0 ? (
        <p className="text-sm text-gray-500 mb-3">Nog niemand toegewezen.</p>
      ) : (
        <div className="space-y-2 mb-3">
          {crew.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2 border border-gray-100 rounded-lg p-2.5 group">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-gray-900 truncate">{c.name}</span>
                  {c.confirmed && <Badge className="bg-green-600 hover:bg-green-600 text-xs">✓</Badge>}
                </div>
                {c.role && <p className="text-xs text-gray-500">{c.role}</p>}
                {c.email && <p className="text-xs text-gray-400 truncate">{c.email}</p>}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleConfirmed(c)}
                  className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-50"
                  title={c.confirmed ? 'Markeer als niet bevestigd' : 'Markeer als bevestigd'}
                >
                  {c.confirmed ? 'Bevestigd' : 'Bevestig'}
                </button>
                <button onClick={() => remove(c.id)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {adding ? (
        <div className="space-y-2 border-t border-gray-100 pt-3">
          <select
            value={pickedTm}
            onChange={(e) => { setPickedTm(e.target.value); if (e.target.value) { setName(''); setEmail('') } }}
            className="w-full h-8 text-sm border border-gray-200 rounded-md px-2 bg-white"
          >
            <option value="">— Externe / handmatig —</option>
            {teamMembers.map((t) => (
              <option key={t.id} value={t.id}>{t.full_name ?? t.email ?? t.id}</option>
            ))}
          </select>
          {!pickedTm && (
            <>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Naam" className="h-8 text-sm" />
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optioneel)" type="email" className="h-8 text-sm" />
            </>
          )}
          <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Rol (bv. fotograaf)" className="h-8 text-sm" />
          <div className="flex justify-end gap-1.5">
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Annuleer</Button>
            <Button size="sm" onClick={submit} disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Toevoegen
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />Crew toevoegen
        </Button>
      )}
    </Card>
  )
}

function GearCard({ productionId, items, onChange }: { productionId: string; items: GearItem[]; onChange: () => void }) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [category, setCategory] = useState<'equipment' | 'prop' | 'other'>('equipment')
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<'all' | 'equipment' | 'prop' | 'other'>('all')

  const submit = async () => {
    if (!name.trim()) return
    setSaving(true)
    await fetch(`/api/productions/${productionId}/gear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        category,
        quantity: Math.max(1, quantity),
        notes: notes.trim() || null,
      }),
    })
    setName(''); setCategory('equipment'); setQuantity(1); setNotes('')
    setAdding(false)
    setSaving(false)
    onChange()
  }
  const toggleChecked = async (g: GearItem) => {
    await fetch(`/api/productions/${productionId}/gear?gearId=${g.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checked: !g.checked }),
    })
    onChange()
  }
  const remove = async (gearId: string) => {
    await fetch(`/api/productions/${productionId}/gear?gearId=${gearId}`, { method: 'DELETE' })
    onChange()
  }

  const filtered = items.filter((g) => filter === 'all' || g.category === filter)
  const counts = {
    equipment: items.filter((i) => i.category === 'equipment').length,
    prop: items.filter((i) => i.category === 'prop').length,
    other: items.filter((i) => i.category === 'other').length,
  }
  const checked = items.filter((g) => g.checked).length

  return (
    <Card title="Gear & inventaris" icon={<Package className="h-4 w-4" />}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex bg-gray-100 rounded-lg p-0.5 text-xs">
          {(['all', 'equipment', 'prop', 'other'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-2.5 py-1 rounded-md font-medium transition',
                filter === f ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900',
              )}
            >
              {f === 'all' ? `Alles (${items.length})` :
               f === 'equipment' ? `Apparatuur (${counts.equipment})` :
               f === 'prop' ? `Props (${counts.prop})` :
               `Overig (${counts.other})`}
            </button>
          ))}
        </div>
        {items.length > 0 && (
          <span className="text-xs text-gray-500">{checked}/{items.length} ingepakt</span>
        )}
      </div>
      {filtered.length === 0 ? (
        <p className="text-sm text-gray-500 mb-3">
          {items.length === 0 ? 'Nog geen items.' : 'Geen items in deze categorie.'}
        </p>
      ) : (
        <div className="space-y-1.5 mb-3">
          {filtered.map((g) => (
            <div key={g.id} className="flex items-center gap-2 border border-gray-100 rounded-lg p-2.5 group">
              <input
                type="checkbox"
                checked={g.checked}
                onChange={() => toggleChecked(g)}
                className="rounded border-gray-300"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn('font-medium text-sm', g.checked ? 'text-gray-400 line-through' : 'text-gray-900')}>
                    {g.name}
                  </span>
                  {g.quantity > 1 && <span className="text-xs text-gray-500">× {g.quantity}</span>}
                  <Badge variant="outline" className="text-xs capitalize">
                    {g.category === 'equipment' ? 'Apparatuur' : g.category === 'prop' ? 'Prop' : 'Overig'}
                  </Badge>
                </div>
                {g.notes && <p className="text-xs text-gray-500 mt-0.5">{g.notes}</p>}
              </div>
              <button onClick={() => remove(g.id)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      {adding ? (
        <div className="space-y-2 border-t border-gray-100 pt-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Bv. Sony A7IV body" className="h-8 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as typeof category)}
              className="h-8 text-sm border border-gray-200 rounded-md px-2 bg-white"
            >
              <option value="equipment">Apparatuur</option>
              <option value="prop">Prop</option>
              <option value="other">Overig</option>
            </select>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              placeholder="Aantal"
              className="h-8 text-sm"
            />
          </div>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notities (optioneel)" className="h-8 text-sm" />
          <div className="flex justify-end gap-1.5">
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Annuleer</Button>
            <Button size="sm" onClick={submit} disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Toevoegen
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />Item toevoegen
        </Button>
      )}
    </Card>
  )
}

function ShotlistCard({ productionId, items, onChange }: { productionId: string; items: ShotlistItem[]; onChange: () => void }) {
  const [adding, setAdding] = useState(false)
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!description.trim()) return
    setSaving(true)
    await fetch(`/api/productions/${productionId}/shotlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: description.trim(),
        location: location.trim() || null,
        notes: notes.trim() || null,
      }),
    })
    setDescription(''); setLocation(''); setNotes('')
    setAdding(false)
    setSaving(false)
    onChange()
  }
  const toggleDone = async (s: ShotlistItem) => {
    await fetch(`/api/productions/${productionId}/shotlist?shotId=${s.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: !s.done }),
    })
    onChange()
  }
  const remove = async (shotId: string) => {
    await fetch(`/api/productions/${productionId}/shotlist?shotId=${shotId}`, { method: 'DELETE' })
    onChange()
  }
  const done = items.filter((s) => s.done).length

  return (
    <Card title="Shotlist" icon={<Camera className="h-4 w-4" />}>
      {items.length > 0 && (
        <p className="text-xs text-gray-500 mb-3">{done}/{items.length} afgevinkt</p>
      )}
      {items.length === 0 ? (
        <p className="text-sm text-gray-500 mb-3">Nog geen shots.</p>
      ) : (
        <div className="space-y-1.5 mb-3">
          {items.map((s, i) => (
            <div key={s.id} className="flex items-start gap-2 border border-gray-100 rounded-lg p-2.5 group">
              <input
                type="checkbox"
                checked={s.done}
                onChange={() => toggleDone(s)}
                className="rounded border-gray-300 mt-0.5"
              />
              <div className="min-w-0 flex-1">
                <p className={cn('text-sm', s.done ? 'text-gray-400 line-through' : 'text-gray-900')}>
                  <span className="text-xs text-gray-400 mr-2">#{i + 1}</span>
                  {s.description}
                </p>
                {(s.location || s.notes) && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {[s.location, s.notes].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
              <button onClick={() => remove(s.id)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 mt-0.5">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      {adding ? (
        <div className="space-y-2 border-t border-gray-100 pt-3">
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Wat schiet je?" className="h-8 text-sm" />
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Locatie (optioneel)" className="h-8 text-sm" />
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notities (optioneel)" className="h-8 text-sm" />
          <div className="flex justify-end gap-1.5">
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Annuleer</Button>
            <Button size="sm" onClick={submit} disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Toevoegen
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />Shot toevoegen
        </Button>
      )}
    </Card>
  )
}

function ActivityCard({ activities }: { activities: ProductionActivity[] }) {
  const labelFor = (a: ProductionActivity): string => {
    switch (a.action_type) {
      case 'created': return 'Productie aangemaakt'
      case 'status_changed': {
        const p = a.payload as { from?: string; to?: string } | null
        return `Status: ${p?.from ?? '?'} → ${p?.to ?? '?'}`
      }
      case 'final_date_set': {
        const p = a.payload as { to?: string } | null
        return `Finale datum gezet${p?.to ? `: ${fmtDate(p.to)}` : ''}`
      }
      case 'final_date_cleared': return 'Finale datum opgeheven'
      case 'deadline_changed': return 'Deadline gewijzigd'
      case 'note_added': return 'Notitie geplaatst'
      case 'crew_assigned': {
        const p = a.payload as { name?: string; role?: string } | null
        return `Crew toegevoegd: ${p?.name ?? ''}${p?.role ? ` (${p.role})` : ''}`
      }
      case 'gear_added': {
        const p = a.payload as { name?: string } | null
        return `Gear toegevoegd: ${p?.name ?? ''}`
      }
      default: return a.action_type
    }
  }
  return (
    <Card title="Activiteit" icon={<History className="h-4 w-4" />}>
      {activities.length === 0 ? (
        <p className="text-sm text-gray-500">Nog geen activiteit.</p>
      ) : (
        <div className="space-y-2">
          {activities.slice(0, 20).map((a) => (
            <div key={a.id} className="flex items-start gap-2.5 text-sm">
              <div className="mt-1 w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-gray-900 text-xs">{labelFor(a)}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {a.actor_email ?? 'Systeem'} · {fmtDateTime(a.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function CreateBriefButton({ production, onCreated }: { production: Production; onCreated: () => void }) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const create = async () => {
    setCreating(true)
    const { data, error } = await workspaceClient
      .from<Array<{ id: string }>>('content_briefs')
      .insert({
        production_id: production.id,
        studio_name: production.location ?? production.title,
        title: production.title,
        description: production.description,
        shoot_date: production.final_date ?? (production.proposed_dates[0] ?? null),
        status: 'draft',
        shotlist: [],
        equipment: [],
        share_link: crypto.randomUUID(),
      })
      .select()
    setCreating(false)
    if (error) {
      alert(`Kon brief niet aanmaken: ${error.message}`)
      return
    }
    const row = Array.isArray(data) ? data[0] : null
    onCreated()
    if (row) router.push(`/content?brief=${row.id}`)
  }
  return (
    <Button size="sm" variant="outline" onClick={create} disabled={creating}>
      {creating ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1.5" />}
      Nieuwe brief
    </Button>
  )
}
