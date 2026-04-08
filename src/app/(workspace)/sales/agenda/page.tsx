'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Phone,
  PhoneCall,
  Mail,
  Video,
  MapPin,
  Clock,
  Building2,
  User,
  X,
  Check,
  ArrowLeft,
  Edit3,
  Trash2,
  AlertCircle,
  RotateCcw,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface LeadInfo {
  id: string
  company_name: string
  contact_name: string | null
  phone: string | null
  email: string | null
  city: string | null
  status: string
}

interface AgendaItem {
  id: string
  lead_id: string | null
  title: string
  description: string | null
  type: 'meeting' | 'call' | 'follow_up' | 'demo' | 'other'
  date: string
  start_time: string
  end_time: string | null
  location: string | null
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  assigned_to: string | null
  created_at: string
  lead: LeadInfo | null
}

interface SalesLead {
  id: string
  company_name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  city: string | null
  status: string
}

const typeConfig: Record<string, { icon: typeof Phone; bg: string; color: string; label: string }> = {
  meeting: { icon: Video, bg: 'bg-blue-100', color: 'text-blue-600', label: 'Meeting' },
  call: { icon: PhoneCall, bg: 'bg-green-100', color: 'text-green-600', label: 'Belafspraak' },
  follow_up: { icon: RotateCcw, bg: 'bg-amber-100', color: 'text-amber-600', label: 'Follow-up' },
  demo: { icon: ExternalLink, bg: 'bg-purple-100', color: 'text-purple-600', label: 'Demo' },
  other: { icon: Calendar, bg: 'bg-gray-100', color: 'text-gray-600', label: 'Overig' },
}

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  scheduled: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Gepland' },
  completed: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Voltooid' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Geannuleerd' },
  no_show: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'No-show' },
}

function getWeekDates(date: Date): Date[] {
  const start = new Date(date)
  const day = start.getDay()
  const diff = start.getDate() - day + (day === 0 ? -6 : 1)
  start.setDate(diff)
  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    days.push(d)
  }
  return days
}

function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0]
}

function formatTime(time: string): string {
  return time.substring(0, 5)
}

function isToday(date: Date): boolean {
  const today = new Date()
  return date.toDateString() === today.toDateString()
}

function getMonthDates(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  let startDay = firstDay.getDay()
  if (startDay === 0) startDay = 7
  startDay -= 1 // Monday = 0

  const weeks: (Date | null)[][] = []
  let currentWeek: (Date | null)[] = []

  // Fill leading nulls
  for (let i = 0; i < startDay; i++) {
    currentWeek.push(null)
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    currentWeek.push(new Date(year, month, d))
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }

  // Fill trailing nulls
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null)
    }
    weeks.push(currentWeek)
  }

  return weeks
}

export default function AgendaPage() {
  const [view, setView] = useState<'week' | 'month'>('week')
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const now = new Date()
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1)
    const start = new Date(now)
    start.setDate(diff)
    return start
  })
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [items, setItems] = useState<AgendaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<AgendaItem | null>(null)

  // New event modal
  const [showNewEvent, setShowNewEvent] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newType, setNewType] = useState<string>('meeting')
  const [newStartTime, setNewStartTime] = useState('10:00')
  const [newEndTime, setNewEndTime] = useState('11:00')
  const [newLocation, setNewLocation] = useState('')
  const [newAssignedTo, setNewAssignedTo] = useState('Rivaldo')
  const [newLeadId, setNewLeadId] = useState<string>('')
  const [saving, setSaving] = useState(false)

  // Lead search for new event
  const [leadSearch, setLeadSearch] = useState('')
  const [allLeads, setAllLeads] = useState<SalesLead[]>([])
  const [leadResults, setLeadResults] = useState<SalesLead[]>([])
  const [selectedLead, setSelectedLead] = useState<SalesLead | null>(null)

  const weekDays = getWeekDates(currentWeekStart)
  const monthWeeks = getMonthDates(currentYear, currentMonth)

  const fetchAgenda = useCallback(async () => {
    setLoading(true)
    try {
      let from: string, to: string
      if (view === 'week') {
        from = formatDateISO(weekDays[0])
        to = formatDateISO(weekDays[6])
      } else {
        from = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`
        const lastDay = new Date(currentYear, currentMonth + 1, 0)
        to = formatDateISO(lastDay)
      }
      const res = await fetch(`/api/agenda?from=${from}&to=${to}`)
      const data = await res.json()
      if (Array.isArray(data)) {
        setItems(data)
      }
    } catch (err) {
      console.error('Error fetching agenda:', err)
    } finally {
      setLoading(false)
    }
  }, [currentWeekStart, currentMonth, currentYear, view])

  useEffect(() => {
    fetchAgenda()
  }, [fetchAgenda])

  // Lead search
  useEffect(() => {
    if (!leadSearch.trim()) {
      setLeadResults([])
      return
    }
    const q = leadSearch.toLowerCase()
    setLeadResults(
      allLeads
        .filter(l =>
          l.company_name.toLowerCase().includes(q) ||
          (l.contact_name && l.contact_name.toLowerCase().includes(q))
        )
        .slice(0, 6)
    )
  }, [leadSearch, allLeads])

  const goToPreviousWeek = () => {
    const prev = new Date(currentWeekStart)
    prev.setDate(prev.getDate() - 7)
    setCurrentWeekStart(prev)
  }

  const goToNextWeek = () => {
    const next = new Date(currentWeekStart)
    next.setDate(next.getDate() + 7)
    setCurrentWeekStart(next)
  }

  const goToCurrentWeek = () => {
    const now = new Date()
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1)
    const start = new Date(now)
    start.setDate(diff)
    setCurrentWeekStart(start)
  }

  const goToPreviousMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) }
    else setCurrentMonth(m => m - 1)
  }

  const goToNextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) }
    else setCurrentMonth(m => m + 1)
  }

  const goToCurrentMonth = () => {
    setCurrentMonth(new Date().getMonth())
    setCurrentYear(new Date().getFullYear())
  }

  const isCurrentMonth = currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear()

  const openNewEvent = (date?: Date) => {
    setShowNewEvent(true)
    setNewDate(date ? formatDateISO(date) : formatDateISO(new Date()))
    setNewTitle('')
    setNewDescription('')
    setNewType('meeting')
    setNewStartTime('10:00')
    setNewEndTime('11:00')
    setNewLocation('')
    setNewAssignedTo('Rivaldo')
    setNewLeadId('')
    setSelectedLead(null)
    setLeadSearch('')

    if (allLeads.length === 0) {
      fetch('/api/leads').then(r => r.json()).then(d => setAllLeads(d)).catch(() => {})
    }
  }

  const saveEvent = async () => {
    if (!newTitle || !newDate || !newStartTime) return
    setSaving(true)
    try {
      const res = await fetch('/api/agenda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: newLeadId || null,
          title: newTitle,
          description: newDescription || null,
          type: newType,
          date: newDate,
          start_time: newStartTime,
          end_time: newEndTime || null,
          location: newLocation || null,
          assigned_to: newAssignedTo || null,
        }),
      })
      if (res.ok) {
        setShowNewEvent(false)
        fetchAgenda()
      }
    } catch (err) {
      console.error('Error saving event:', err)
    } finally {
      setSaving(false)
    }
  }

  const updateStatus = async (id: string, status: string) => {
    try {
      await fetch('/api/agenda', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      fetchAgenda()
      if (selectedItem?.id === id) {
        setSelectedItem(prev => prev ? { ...prev, status: status as AgendaItem['status'] } : null)
      }
    } catch (err) {
      console.error('Error updating status:', err)
    }
  }

  const deleteEvent = async (id: string) => {
    try {
      await fetch(`/api/agenda?id=${id}`, { method: 'DELETE' })
      setSelectedItem(null)
      fetchAgenda()
    } catch (err) {
      console.error('Error deleting event:', err)
    }
  }

  // Group items by date
  const itemsByDate = new Map<string, AgendaItem[]>()
  for (const item of items) {
    const existing = itemsByDate.get(item.date) || []
    existing.push(item)
    itemsByDate.set(item.date, existing)
  }

  const isCurrentWeek = formatDateISO(currentWeekStart) === (() => {
    const now = new Date()
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1)
    const start = new Date(now)
    start.setDate(diff)
    return formatDateISO(start)
  })()

  const weekLabel = `${weekDays[0].toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })} — ${weekDays[6].toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/sales">
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
            <p className="text-sm text-gray-500">Afspraken en follow-ups met leads</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setView('week')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                view === 'week' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              Week
            </button>
            <button
              onClick={() => setView('month')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                view === 'month' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              Maand
            </button>
          </div>
          <Button onClick={() => openNewEvent()} className="rounded-xl gap-2">
            <Plus className="h-4 w-4" />
            Afspraak plannen
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={view === 'week' ? goToPreviousWeek : goToPreviousMonth} className="rounded-xl">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-gray-400" />
            <span className="text-lg font-semibold text-gray-900 capitalize">
              {view === 'week'
                ? weekLabel
                : new Date(currentYear, currentMonth).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })
              }
            </span>
            {view === 'week' && !isCurrentWeek && (
              <Button variant="outline" size="sm" onClick={goToCurrentWeek} className="rounded-lg text-xs">
                Deze week
              </Button>
            )}
            {view === 'month' && !isCurrentMonth && (
              <Button variant="outline" size="sm" onClick={goToCurrentMonth} className="rounded-lg text-xs">
                Deze maand
              </Button>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={view === 'week' ? goToNextWeek : goToNextMonth} className="rounded-xl">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">Laden...</span>
        </div>
      ) : view === 'week' ? (
        <div className="grid grid-cols-7 gap-3">
          {weekDays.map(day => {
            const dateStr = formatDateISO(day)
            const dayItems = itemsByDate.get(dateStr) || []
            const today = isToday(day)
            const isPast = day < new Date(new Date().setHours(0, 0, 0, 0))

            return (
              <div
                key={dateStr}
                className={cn(
                  'bg-white rounded-2xl border min-h-[180px] overflow-hidden',
                  today ? 'border-gray-900 ring-1 ring-gray-900' : 'border-gray-100',
                  isPast && !today && 'opacity-60'
                )}
              >
                <div
                  className={cn(
                    'px-3 py-2 border-b flex items-center justify-between',
                    today ? 'bg-gray-900 border-gray-900' : 'bg-gray-50 border-gray-100'
                  )}
                >
                  <div>
                    <span className={cn('text-xs font-medium', today ? 'text-gray-300' : 'text-gray-400')}>
                      {day.toLocaleDateString('nl-NL', { weekday: 'short' })}
                    </span>
                    <span className={cn('ml-1.5 text-sm font-bold', today ? 'text-white' : 'text-gray-900')}>
                      {day.getDate()}
                    </span>
                  </div>
                  <button
                    onClick={() => openNewEvent(day)}
                    className={cn(
                      'w-5 h-5 rounded flex items-center justify-center transition-colors',
                      today ? 'hover:bg-white/20 text-white' : 'hover:bg-gray-200 text-gray-400'
                    )}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="p-2 space-y-1.5">
                  {dayItems.map(item => {
                    const config = typeConfig[item.type] || typeConfig.other
                    const Icon = config.icon
                    return (
                      <button
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className={cn(
                          'w-full text-left p-2 rounded-xl transition-colors text-xs',
                          item.status === 'cancelled' && 'opacity-50 line-through',
                          item.status === 'completed' ? 'bg-emerald-50 hover:bg-emerald-100' : 'bg-gray-50 hover:bg-gray-100',
                          selectedItem?.id === item.id && 'ring-2 ring-gray-900'
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          <Icon className={cn('h-3 w-3 flex-shrink-0', config.color)} />
                          <span className="font-semibold text-gray-900 truncate">{item.title}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5 text-gray-500">
                          <Clock className="h-2.5 w-2.5" />
                          <span>{formatTime(item.start_time)}</span>
                          {item.assigned_to && (
                            <>
                              <span>·</span>
                              <span>{item.assigned_to}</span>
                            </>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Month view */
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'].map(d => (
              <div key={d} className="px-3 py-2 text-center text-xs font-semibold text-gray-400 uppercase">
                {d}
              </div>
            ))}
          </div>
          {/* Weeks */}
          {monthWeeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 border-b border-gray-50 last:border-b-0">
              {week.map((day, di) => {
                if (!day) {
                  return <div key={`empty-${di}`} className="min-h-[100px] bg-gray-50/50" />
                }
                const dateStr = formatDateISO(day)
                const dayItems = itemsByDate.get(dateStr) || []
                const today = isToday(day)
                const isPast = day < new Date(new Date().setHours(0, 0, 0, 0))

                return (
                  <div
                    key={dateStr}
                    className={cn(
                      'min-h-[100px] border-r border-gray-50 last:border-r-0 p-1.5',
                      today && 'bg-blue-50/50',
                      isPast && !today && 'opacity-50'
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn(
                        'w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold',
                        today ? 'bg-gray-900 text-white' : 'text-gray-700'
                      )}>
                        {day.getDate()}
                      </span>
                      {dayItems.length > 0 && (
                        <span className="text-[10px] text-gray-400 font-medium">{dayItems.length}</span>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      {dayItems.slice(0, 3).map(item => {
                        const config = typeConfig[item.type] || typeConfig.other
                        return (
                          <button
                            key={item.id}
                            onClick={() => setSelectedItem(item)}
                            className={cn(
                              'w-full text-left px-1.5 py-0.5 rounded-md text-[10px] font-medium truncate transition-colors',
                              item.status === 'cancelled' && 'opacity-50 line-through',
                              item.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : `${config.bg} ${config.color}`,
                            )}
                          >
                            {formatTime(item.start_time)} {item.title}
                          </button>
                        )
                      })}
                      {dayItems.length > 3 && (
                        <span className="text-[10px] text-gray-400 px-1.5">+{dayItems.length - 3} meer</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {/* Detail panel */}
      {selectedItem && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelectedItem(null)} />
          <div className="relative w-full max-w-md bg-white shadow-2xl overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-100 p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {(() => {
                      const config = typeConfig[selectedItem.type] || typeConfig.other
                      return (
                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', config.bg)}>
                          <config.icon className={cn('h-4 w-4', config.color)} />
                        </div>
                      )
                    })()}
                    <h2 className="text-lg font-bold text-gray-900">{selectedItem.title}</h2>
                  </div>
                  {(() => {
                    const s = statusConfig[selectedItem.status]
                    return <Badge className={cn('text-xs', s.bg, s.text)}>{s.label}</Badge>
                  })()}
                </div>
                <button onClick={() => setSelectedItem(null)} className="p-1.5 rounded-lg hover:bg-gray-100">
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Details */}
            <div className="p-5 space-y-5">
              {/* Date & time */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Wanneer</h3>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-700 font-medium">
                    {new Date(selectedItem.date + 'T12:00:00').toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-700">
                    {formatTime(selectedItem.start_time)}
                    {selectedItem.end_time && ` — ${formatTime(selectedItem.end_time)}`}
                  </span>
                </div>
                {selectedItem.location && (
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-700">{selectedItem.location}</span>
                  </div>
                )}
                {selectedItem.assigned_to && (
                  <div className="flex items-center gap-3 text-sm">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-700">{selectedItem.assigned_to}</span>
                  </div>
                )}
              </div>

              {/* Description */}
              {selectedItem.description && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Beschrijving</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-xl p-3">{selectedItem.description}</p>
                </div>
              )}

              {/* Lead info */}
              {selectedItem.lead && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Lead</h3>
                  <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-semibold text-gray-900">{selectedItem.lead.company_name}</span>
                    </div>
                    {selectedItem.lead.contact_name && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="h-3.5 w-3.5 text-gray-400" />
                        {selectedItem.lead.contact_name}
                      </div>
                    )}
                    {selectedItem.lead.phone && (
                      <a href={`tel:${selectedItem.lead.phone}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                        <Phone className="h-3.5 w-3.5 text-gray-400" />
                        {selectedItem.lead.phone}
                      </a>
                    )}
                    {selectedItem.lead.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="h-3.5 w-3.5 text-gray-400" />
                        {selectedItem.lead.email}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Status actions */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Status bijwerken</h3>
                <div className="grid grid-cols-2 gap-2">
                  {selectedItem.status !== 'completed' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                      onClick={() => updateStatus(selectedItem.id, 'completed')}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Voltooid
                    </Button>
                  )}
                  {selectedItem.status !== 'cancelled' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => updateStatus(selectedItem.id, 'cancelled')}
                    >
                      <X className="h-3.5 w-3.5" />
                      Annuleren
                    </Button>
                  )}
                  {selectedItem.status !== 'no_show' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl gap-1.5 text-gray-600"
                      onClick={() => updateStatus(selectedItem.id, 'no_show')}
                    >
                      <AlertCircle className="h-3.5 w-3.5" />
                      No-show
                    </Button>
                  )}
                  {selectedItem.status !== 'scheduled' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
                      onClick={() => updateStatus(selectedItem.id, 'scheduled')}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Herplannen
                    </Button>
                  )}
                </div>
              </div>

              {/* Delete */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full rounded-xl gap-1.5 text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={() => deleteEvent(selectedItem.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Verwijderen
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* New event modal */}
      {showNewEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Afspraak plannen</h3>
              <button onClick={() => setShowNewEvent(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titel</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Bijv. Kennismaking Studio XL"
                  autoFocus
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(typeConfig).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => setNewType(key)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                        newType === key
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      )}
                    >
                      <config.icon className={cn('h-3.5 w-3.5', newType === key ? 'text-white' : config.color)} />
                      {config.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date & time */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={e => setNewDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
                  <input
                    type="time"
                    value={newStartTime}
                    onChange={e => setNewStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Einde</label>
                  <input
                    type="time"
                    value={newEndTime}
                    onChange={e => setNewEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Locatie (optioneel)</label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={e => setNewLocation(e.target.value)}
                  placeholder="Adres of 'Online'"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                />
              </div>

              {/* Assigned to */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Toegewezen aan</label>
                <div className="flex gap-2">
                  {['Rivaldo', 'Uriel'].map(name => (
                    <button
                      key={name}
                      onClick={() => setNewAssignedTo(name)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border flex-1 transition-colors',
                        newAssignedTo === name
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      )}
                    >
                      <div className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                        newAssignedTo === name ? 'bg-white text-gray-900' : 'bg-gray-100'
                      )}>
                        {name[0]}
                      </div>
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lead link */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Koppel aan lead (optioneel)</label>
                {selectedLead ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-gray-100">
                    <Building2 className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-900 flex-1">{selectedLead.company_name}</span>
                    <button onClick={() => { setSelectedLead(null); setNewLeadId(''); setLeadSearch('') }} className="p-0.5 rounded hover:bg-gray-200">
                      <X className="h-3.5 w-3.5 text-gray-400" />
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={leadSearch}
                      onChange={e => setLeadSearch(e.target.value)}
                      placeholder="Zoek bedrijfsnaam..."
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                    />
                    {leadResults.length > 0 && (
                      <div className="mt-1 border border-gray-100 rounded-xl overflow-hidden">
                        {leadResults.map(l => (
                          <button
                            key={l.id}
                            onClick={() => { setSelectedLead(l); setNewLeadId(l.id); setLeadSearch(''); setLeadResults([]) }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Building2 className="h-3.5 w-3.5 text-gray-400" />
                            <span className="font-medium">{l.company_name}</span>
                            {l.city && <span className="text-gray-400 text-xs">· {l.city}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notities (optioneel)</label>
                <textarea
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder="Extra context over de afspraak..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowNewEvent(false)} className="rounded-xl">
                  Annuleren
                </Button>
                <Button
                  onClick={saveEvent}
                  disabled={saving || !newTitle || !newDate || !newStartTime}
                  className="rounded-xl gap-2"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Inplannen
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
