'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  X,
  MapPin,
  Phone,
  PhoneCall,
  PhoneOff,
  PhoneMissed,
  Mail,
  Globe,
  ExternalLink,
  Building2,
  Users,
  Calendar,
  Edit3,
  Check,
  Send,
  Loader2,
  ChevronLeft,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Clock,
  BarChart3,
  CheckCircle2,
  XCircle,
  Minus,
  Plus,
  Save,
  FileText,
  Video,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { salesLeadsApi, leadContactsApi, type SalesLead, type LeadContact } from '@/lib/supabase'
import { workspaceClient } from '@/lib/workspace-client'

// Extended type for fields that exist in DB but not yet in generated types
type SalesLeadExt = SalesLead & {
  address?: string | null
  website?: string | null
  last_contacted_at?: string | null
}

interface SentEmail {
  subject: string
  sent_at: string
  status: string
}

interface LeadActivity {
  id: string
  lead_id: string
  type: 'call' | 'voicemail' | 'email' | 'note' | 'status_change' | 'meeting'
  summary: string | null
  notes: string | null
  metadata: Record<string, unknown>
  created_by: string
  created_at: string
}

const activityConfig: Record<string, { icon: typeof Phone; bg: string; color: string; label: string }> = {
  call: { icon: PhoneCall, bg: 'bg-green-100', color: 'text-green-600', label: 'Gebeld' },
  voicemail: { icon: PhoneMissed, bg: 'bg-violet-100', color: 'text-violet-600', label: 'Voicemail' },
  email: { icon: Mail, bg: 'bg-blue-100', color: 'text-blue-600', label: 'Email' },
  note: { icon: FileText, bg: 'bg-gray-100', color: 'text-gray-600', label: 'Notitie' },
  status_change: { icon: Edit3, bg: 'bg-amber-100', color: 'text-amber-600', label: 'Status' },
  meeting: { icon: Video, bg: 'bg-pink-100', color: 'text-pink-600', label: 'Meeting' },
}

interface SessionStats {
  reviewed: number
  statusChanges: number
  approved: number
  rejected: number
  notesEdited: number
}

interface SalesModeProps {
  leads: SalesLead[]
  initialIndex?: number
  onExit: (stats: SessionStats) => void
  onLeadUpdate: (lead: SalesLead) => void
}

const statusColorMap: Record<string, { bg: string; text: string; dot: string }> = {
  'cold': { bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-400' },
  'warm': { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-400' },
  'hot': { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
  'voicemail': { bg: 'bg-violet-100', text: 'text-violet-700', dot: 'bg-violet-500' },
  'negotiation': { bg: 'bg-gray-200', text: 'text-black', dot: 'bg-gray-900' },
  'closed': { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  'lost': { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
}

const approvalColorMap: Record<string, { bg: string; text: string; icon: typeof Check }> = {
  'approved': { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: ThumbsUp },
  'rejected': { bg: 'bg-red-100', text: 'text-red-700', icon: ThumbsDown },
  'pending': { bg: 'bg-gray-100', text: 'text-gray-500', icon: Minus },
}

const formatDate = (dateString?: string) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const formatDateTime = (dateString?: string) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function SalesMode({ leads, initialIndex = 0, onExit, onLeadUpdate }: SalesModeProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [contacts, setContacts] = useState<LeadContact[]>([])
  const [emails, setEmails] = useState<SentEmail[]>([])
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [loadingEmails, setLoadingEmails] = useState(false)
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesStatus, setNotesStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  // Refs so flushNotes() always sees the latest values, independent of stale closures.
  const notesRef = useRef('')
  const lastSavedNotesRef = useRef('')
  const currentLeadIdRef = useRef<string | null>(null)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    reviewed: 0,
    statusChanges: 0,
    approved: 0,
    rejected: 0,
    notesEdited: 0,
  })
  const [reviewedIndices, setReviewedIndices] = useState<Set<number>>(new Set())

  // Activities state
  const [activities, setActivities] = useState<LeadActivity[]>([])
  const [loadingActivities, setLoadingActivities] = useState(false)
  const [loggingActivity, setLoggingActivity] = useState<string | null>(null)
  const [showQuickNote, setShowQuickNote] = useState(false)
  const [quickNoteText, setQuickNoteText] = useState('')
  const [quickNoteType, setQuickNoteType] = useState<'call' | 'voicemail' | 'note' | 'meeting'>('call')
  // Afspraak modal state
  const [showAppointment, setShowAppointment] = useState(false)
  const [aptTitle, setAptTitle] = useState('')
  const todayStr = new Date().toISOString().slice(0, 10)
  const [aptDate, setAptDate] = useState(todayStr)
  const [aptStart, setAptStart] = useState('10:00')
  const [aptEnd, setAptEnd] = useState('11:00')
  const [aptLocation, setAptLocation] = useState('')
  const [aptNotes, setAptNotes] = useState('')
  const [aptType, setAptType] = useState<'meeting' | 'call' | 'follow_up' | 'demo' | 'other'>('meeting')
  const [aptSaving, setAptSaving] = useState(false)
  const [aptError, setAptError] = useState<string | null>(null)

  // Email modal state
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailTo, setEmailTo] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  const [emailSender, setEmailSender] = useState<'rivaldo' | 'uriel'>('rivaldo')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)

  const senderProfiles = {
    rivaldo: { name: 'Rivaldo van lcntships', email: 'rivaldomacandrew@lctnships.com' },
    uriel: { name: 'Uriel van lcntships', email: 'uriel@lctnships.com' },
  }

  const currentLead = leads[currentIndex]

  const loadLeadData = useCallback(async (lead: SalesLead) => {
    setLoadingContacts(true)
    setLoadingEmails(true)
    setLoadingActivities(true)
    setNotes(lead.notes || '')
    notesRef.current = lead.notes || ''
    lastSavedNotesRef.current = lead.notes || ''
    currentLeadIdRef.current = lead.id
    setNotesStatus('idle')
    setShowQuickNote(false)
    setQuickNoteText('')

    try {
      const contactData = await leadContactsApi.getByLeadId(lead.id)
      setContacts(contactData || [])
    } catch {
      setContacts([])
    } finally {
      setLoadingContacts(false)
    }

    try {
      const res = await fetch(`/api/leads/${lead.id}/emails`)
      if (res.ok) {
        const emailData = await res.json()
        setEmails(emailData || [])
      } else {
        setEmails([])
      }
    } catch {
      setEmails([])
    } finally {
      setLoadingEmails(false)
    }

    try {
      const res = await fetch(`/api/leads/${lead.id}/activities`)
      if (res.ok) {
        const activityData = await res.json()
        setActivities(activityData || [])
      } else {
        setActivities([])
      }
    } catch {
      setActivities([])
    } finally {
      setLoadingActivities(false)
    }
  }, [])

  // Save the current notes value to the DB if it differs from the last saved
  // version. Safe to call any number of times and from any action (auto-save,
  // navigation, approval, exit). Uses refs so it always reads the freshest
  // value, independent of stale closures.
  const flushNotes = useCallback(async (): Promise<string | null> => {
    const leadId = currentLeadIdRef.current
    if (!leadId) return null
    const pending = notesRef.current
    if (pending === lastSavedNotesRef.current) return pending
    // Cancel any pending debounced save — we're saving right now.
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
      autoSaveTimerRef.current = null
    }
    setSavingNotes(true)
    setNotesStatus('saving')
    try {
      const updated = await salesLeadsApi.update(leadId, { notes: pending })
      // Only propagate if the user hasn't moved to a different lead in the
      // meantime (prevents overwriting another lead's state).
      if (currentLeadIdRef.current === leadId) {
        lastSavedNotesRef.current = pending
        onLeadUpdate(updated)
        setNotesStatus('saved')
        setSessionStats(s => ({ ...s, notesEdited: s.notesEdited + 1 }))
      }
      return pending
    } catch (error) {
      console.error('Error saving notes:', error)
      setNotesStatus('error')
      return null
    } finally {
      setSavingNotes(false)
    }
  }, [onLeadUpdate])

  useEffect(() => {
    if (currentLead) {
      loadLeadData(currentLead)
      // Track as reviewed
      setReviewedIndices(prev => {
        const next = new Set(prev)
        if (!next.has(currentIndex)) {
          next.add(currentIndex)
          setSessionStats(s => ({ ...s, reviewed: s.reviewed + 1 }))
        }
        return next
      })
    }
  }, [currentIndex, currentLead, loadLeadData])

  // Debounced auto-save: 800ms after the user stops typing, persist the
  // pending note. Safe against navigation because flushNotes() is idempotent
  // and checks the current lead id.
  useEffect(() => {
    if (notes === lastSavedNotesRef.current) return
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setTimeout(() => {
      void flushNotes()
    }, 800)
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
        autoSaveTimerRef.current = null
      }
    }
  }, [notes, flushNotes])

  // Best-effort flush when the component unmounts (e.g. user exits sales mode).
  useEffect(() => {
    return () => {
      void flushNotes()
    }
  }, [flushNotes])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip shortcuts when typing in any input/textarea
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if (e.key === 'ArrowRight' || e.key === 'j') {
        e.preventDefault()
        goNext()
      } else if (e.key === 'ArrowLeft' || e.key === 'k') {
        e.preventDefault()
        goPrev()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        handleExit()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  const goNext = async () => {
    if (currentIndex < leads.length - 1) {
      await flushNotes()
      setCurrentIndex(currentIndex + 1)
    }
  }

  const goPrev = async () => {
    if (currentIndex > 0) {
      await flushNotes()
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleExit = async () => {
    await flushNotes()
    onExit(sessionStats)
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!currentLead || currentLead.status === newStatus) return
    const oldStatus = currentLead.status

    // Optimistic: UI direct updaten
    onLeadUpdate({ ...currentLead, status: newStatus as SalesLead['status'] })
    setSessionStats(s => ({ ...s, statusChanges: s.statusChanges + 1 }))

    // Pending note nog wel veilig flushen op achtergrond
    flushNotes().catch(() => {})

    try {
      const updated = await salesLeadsApi.update(currentLead.id, { status: newStatus as SalesLead['status'] })
      onLeadUpdate(updated)
      logActivity('status_change', `Status: ${oldStatus} → ${newStatus}`)
    } catch (error) {
      console.error('Error updating status:', error)
      // Rollback bij fail
      onLeadUpdate({ ...currentLead, status: oldStatus })
    }
  }

  const handleApproval = async (approval: 'approved' | 'rejected' | 'pending') => {
    if (!currentLead) return
    const currentApproval = getApproval(currentLead)
    if (currentApproval === approval) return

    const pending = notesRef.current
    const cleanNotes = pending.replace(/\[APPROVAL:(approved|rejected|pending)\]\s*/g, '')
    const newNotes = approval !== 'pending'
      ? `[APPROVAL:${approval}] ${cleanNotes}`.trim()
      : cleanNotes.trim()

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
      autoSaveTimerRef.current = null
    }

    // Optimistic: UI direct updaten, DB op achtergrond
    setNotes(newNotes)
    notesRef.current = newNotes
    lastSavedNotesRef.current = newNotes
    setNotesStatus('saved')
    onLeadUpdate({ ...currentLead, notes: newNotes })
    setSessionStats(s => ({
      ...s,
      approved: s.approved + (approval === 'approved' ? 1 : 0),
      rejected: s.rejected + (approval === 'rejected' ? 1 : 0),
    }))

    try {
      const updated = await salesLeadsApi.update(currentLead.id, { notes: newNotes })
      onLeadUpdate(updated)
    } catch (error) {
      console.error('Error updating approval:', error)
      setNotesStatus('error')
    }
  }

  const handleSaveNotes = flushNotes

  const handleSendEmail = async () => {
    if (!emailTo.trim() || !emailSubject || !emailMessage) return
    setSendingEmail(true)
    setEmailError(null)
    try {
      const sender = senderProfiles[emailSender]
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `${sender.name} <${sender.email}>`,
          to: {
            email: emailTo.trim(),
            name: currentLead.contact_name || currentLead.company_name,
            company: currentLead.company_name,
          },
          subject: emailSubject,
          message: emailMessage,
          trackId: currentLead.id,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Verzenden mislukt')
      }
      setEmailSent(true)
      // Update last_contacted_at
      await salesLeadsApi.update(currentLead.id, { updated_at: new Date().toISOString() } as Partial<SalesLead>)
      // Refresh email list
      const emailRes = await fetch(`/api/leads/${currentLead.id}/emails`)
      if (emailRes.ok) {
        const emailData = await emailRes.json()
        setEmails(emailData || [])
      }
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Onbekende fout')
    } finally {
      setSendingEmail(false)
    }
  }

  const logActivity = async (type: LeadActivity['type'], summary: string, activityNotes?: string) => {
    if (!currentLead) return
    setLoggingActivity(type)
    try {
      const res = await fetch(`/api/leads/${currentLead.id}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, summary, notes: activityNotes || null }),
      })
      if (res.ok) {
        const newActivity = await res.json()
        setActivities(prev => [newActivity, ...prev])
      }
    } catch (error) {
      console.error('Error logging activity:', error)
    } finally {
      setLoggingActivity(null)
      setShowQuickNote(false)
      setQuickNoteText('')
    }
  }

  const handleQuickLog = (type: 'call' | 'voicemail' | 'note' | 'meeting') => {
    setQuickNoteType(type)
    setQuickNoteText('')
    setShowQuickNote(true)
  }

  const submitQuickLog = () => {
    const labels: Record<string, string> = {
      call: 'Gebeld',
      voicemail: 'Voicemail ingesproken',
      note: 'Notitie toegevoegd',
      meeting: 'Meeting gehad',
    }
    const summary = labels[quickNoteType] || quickNoteType
    logActivity(quickNoteType, summary, quickNoteText || undefined)
  }

  const openAppointmentModal = () => {
    setAptTitle(`Afspraak ${currentLead?.company_name ?? ''}`.trim())
    setAptType('meeting')
    setAptDate(new Date().toISOString().slice(0, 10))
    setAptStart('10:00')
    setAptEnd('11:00')
    setAptLocation(currentLead?.city ?? '')
    setAptNotes('')
    setAptError(null)
    setShowAppointment(true)
  }

  const saveAppointment = async () => {
    if (!currentLead) return
    if (!aptTitle.trim()) { setAptError('Titel is verplicht.'); return }
    setAptSaving(true); setAptError(null)
    try {
      const { error: dbErr } = await workspaceClient
        .from('sales_agenda')
        .insert([{
          lead_id: currentLead.id,
          title: aptTitle.trim(),
          description: aptNotes.trim() || null,
          type: aptType,
          date: aptDate,
          start_time: aptStart,
          end_time: aptEnd,
          location: aptLocation.trim() || null,
          status: 'scheduled',
        }])
      if (dbErr) throw new Error(dbErr.message || 'Opslaan mislukt.')
      // Activity log
      logActivity('meeting', `Afspraak gepland: ${aptTitle.trim()}`, `${aptDate} ${aptStart}-${aptEnd}${aptLocation ? ` · ${aptLocation}` : ''}`)
      setShowAppointment(false)
    } catch (e) {
      setAptError(e instanceof Error ? e.message : 'Opslaan mislukt.')
    } finally {
      setAptSaving(false)
    }
  }

  const EMAIL_TEMPLATES = [
    {
      name: 'Na telefoongesprek',
      subject: `Samenwerking met ${currentLead?.company_name || ''}`,
      message: `Beste ${currentLead?.contact_name || currentLead?.company_name || ''},\n\nLeuk dat we kort hebben gesproken. Zoals besproken stuur ik je graag meer informatie over onze diensten.\n\nWe helpen creatieve studio's zoals ${currentLead?.company_name || ''} met het verhogen van hun bezettingsgraad door middel van ons platform. Hierdoor bereiken jullie een breder publiek zonder extra marketingkosten.\n\nZou je openstaan voor een kort gesprek om de mogelijkheden te bespreken?\n\nMet vriendelijke groet,\nlcntships Team`,
    },
    {
      name: 'Follow-up voicemail',
      subject: `Terugkoppeling — ${currentLead?.company_name || ''}`,
      message: `Beste ${currentLead?.contact_name || currentLead?.company_name || ''},\n\nIk heb zojuist geprobeerd je te bereiken maar helaas de voicemail gekregen. Ik neem contact op namens lcntships.\n\nWij zijn een platform dat creatieve studio's helpt met het vullen van lege uren. Geen kosten vooraf — wij werken op commissiebasis.\n\nIk zou graag even 5 minuten met je willen bellen om uit te leggen hoe het werkt. Wanneer schikt het?\n\nMet vriendelijke groet,\nlcntships Team`,
    },
    {
      name: 'Eerste contact (koud)',
      subject: `Meer boekingen voor ${currentLead?.company_name || ''}?`,
      message: `Beste ${currentLead?.contact_name || currentLead?.company_name || ''},\n\nIk kwam ${currentLead?.company_name || 'jullie studio'} tegen en was onder de indruk van jullie aanbod.\n\nBij lcntships helpen we creatieve studio's met het verhogen van hun bezettingsgraad via ons platform. We brengen creators, fotografen en bedrijven in contact met studio's — zonder kosten vooraf.\n\nZou je interesse hebben in een vrijblijvend gesprek?\n\nMet vriendelijke groet,\nlcntships Team`,
    },
  ]

  if (!currentLead) return null

  const statusColors = statusColorMap[currentLead.status] || statusColorMap['cold']
  const approval = getApproval(currentLead)
  const approvalInfo = approvalColorMap[approval]
  const displayNotes = getDisplayNotes(currentLead.notes || '')
  const editableNotes = getDisplayNotes(notes)

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Top Bar — mockup styling */}
      <div className="flex items-center justify-between px-10 py-3.5 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-3.5">
          <button
            onClick={handleExit}
            className="flex items-center gap-1.5 px-3 py-1 border border-gray-200 rounded-full text-xs font-semibold text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Terug
          </button>
          <span className="text-[10.5px] font-bold text-gray-500 tracking-wider">
            {currentIndex + 1} van {leads.length}
          </span>
          <div className="w-32 h-[3px] bg-gray-200 rounded overflow-hidden">
            <div
              className="h-full bg-[#0E4F6D] rounded transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / leads.length) * 100}%` }}
            />
          </div>
          {currentLead.city && (
            <span className="inline-flex items-center px-2.5 py-0.5 border border-gray-200 rounded-full text-[9.5px] font-bold tracking-wider uppercase text-gray-500 bg-gray-50">
              {currentLead.city}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-600">
            <ThumbsUp className="h-3.5 w-3.5" /> {sessionStats.approved}
          </span>
          <span className="flex items-center gap-1 text-[11px] font-mono text-red-500">
            <ThumbsDown className="h-3.5 w-3.5" /> {sessionStats.rejected}
          </span>
          <span className="flex items-center gap-1 text-[11px] font-mono text-gray-500">
            <BarChart3 className="h-3.5 w-3.5" /> {sessionStats.reviewed} bekeken
          </span>
          <span className="flex items-center gap-1 text-[11px] font-mono text-gray-500">
            <Edit3 className="h-3.5 w-3.5" /> {sessionStats.statusChanges} status
          </span>
        </div>
      </div>

      {/* Main Content — mockup focus card + lead list rechts */}
      <div className="flex-1 flex overflow-hidden bg-gray-50">
        {/* Mockup Focus Card */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-3xl mx-auto p-6">
            <div className="bg-white border border-gray-200 rounded-md">
              {/* Card head */}
              <div className="px-8 py-7 border-b border-gray-200">
                <div className="flex items-start justify-between gap-5 mb-2.5">
                  <div className="min-w-0">
                    <h1 className="text-[26px] font-black text-gray-900 leading-tight tracking-tight truncate">
                      {currentLead.company_name}
                    </h1>
                    <div className="text-[12.5px] text-gray-500 mt-1.5 flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{currentLead.city || '—'}</span>
                      {(currentLead as SalesLeadExt).address && (
                        <span className="truncate">&middot; {(currentLead as SalesLeadExt).address as string}</span>
                      )}
                    </div>
                  </div>
                  {(currentLead as SalesLeadExt).website && (
                    <a
                      href={(currentLead as SalesLeadExt).website as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-[#0E4F6D] flex items-center gap-1 hover:underline flex-shrink-0"
                    >
                      <Globe className="h-2.5 w-2.5" />
                      {((currentLead as SalesLeadExt).website as string).replace(/^https?:\/\//, '').replace(/\/$/, '')}
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9.5px] font-semibold lowercase', statusColors.bg, statusColors.text)}>
                    <span className={cn('w-1 h-1 rounded-full', statusColors.dot)} />
                    {currentLead.status}
                  </span>
                  {currentLead.source && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9.5px] font-semibold bg-gray-50 text-gray-500 border border-gray-200">
                      {currentLead.source}
                    </span>
                  )}
                  <span className="ml-auto text-[10px] text-gray-400 font-mono">
                    {currentLead.created_at && `toegevoegd ${new Date(currentLead.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                  </span>
                </div>
              </div>

              {/* Card body — fields grid */}
              <div className="px-8 py-5 grid grid-cols-2 gap-[18px]">
                <div>
                  <div className="text-[8px] font-bold tracking-[0.20em] uppercase text-gray-400 mb-1">Primair contact</div>
                  <div className="text-[12.5px] text-gray-600 font-medium leading-snug">
                    {currentLead.contact_name || '—'}
                    {currentLead.phone && <><br /><a href={`tel:${currentLead.phone}`} className="hover:text-[#0E4F6D]">{currentLead.phone}</a></>}
                  </div>
                </div>
                <div>
                  <div className="text-[8px] font-bold tracking-[0.20em] uppercase text-gray-400 mb-1">Email</div>
                  <div className="text-[12.5px] text-gray-600 font-medium leading-snug">
                    {currentLead.email
                      ? <a href={`mailto:${currentLead.email}`} className="hover:text-[#0E4F6D]">{currentLead.email}</a>
                      : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[8px] font-bold tracking-[0.20em] uppercase text-gray-400 mb-1">Laatste activiteit</div>
                  <div className="text-[12.5px] text-gray-600 font-medium leading-snug flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {(currentLead as SalesLeadExt).last_contacted_at
                      ? `Contact ${new Date((currentLead as SalesLeadExt).last_contacted_at as string).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}`
                      : 'Nog geen activiteit'}
                  </div>
                </div>
              </div>

              {/* Status pills — alle 7 statussen */}
              <div className="px-8 pb-3">
                <div className="text-[8px] font-bold tracking-[0.20em] uppercase text-gray-400 mb-2">Status wijzigen</div>
                <div className="flex gap-1.5 flex-wrap">
                  {(['cold', 'warm', 'hot', 'voicemail', 'negotiation', 'closed', 'lost'] as const).map((s) => {
                    const sc = statusColorMap[s]
                    const active = currentLead.status === s
                    return (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(s)}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold lowercase border transition-all',
                          active ? cn(sc.bg, sc.text, 'border-transparent') : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'
                        )}
                      >
                        <span className={cn('w-1.5 h-1.5 rounded-full', sc.dot)} />
                        {s === 'negotiation' ? 'onderhandeling' : s}
                        {active && <Check className="h-2.5 w-2.5" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Notities */}
              <div className="px-8 pb-5">
                <div className="text-[8px] font-bold tracking-[0.20em] uppercase text-gray-400 mb-2">Notities</div>
                <textarea
                  value={editableNotes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={flushNotes}
                  placeholder="Notities toevoegen…"
                  rows={3}
                  className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2.5 text-[12px] text-gray-600 leading-relaxed font-sans outline-none resize-none focus:border-[#0E4F6D] transition-colors placeholder:text-gray-400"
                />
              </div>

              {/* Card actions */}
              <div className="px-8 pb-6 pt-4 border-t border-gray-200">
                <div className="flex gap-1.5 mb-2.5">
                  <button
                    onClick={() => handleQuickLog('call')}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded border border-gray-200 bg-white text-gray-600 text-[11px] font-bold tracking-wider hover:bg-gray-50 hover:border-gray-400 hover:text-gray-900 transition-all"
                  >
                    <Phone className="h-3 w-3" />
                    GEBELD
                  </button>
                  <button
                    onClick={() => handleQuickLog('voicemail')}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded border border-gray-200 bg-white text-gray-600 text-[11px] font-bold tracking-wider hover:bg-gray-50 hover:border-gray-400 hover:text-gray-900 transition-all"
                  >
                    <PhoneMissed className="h-3 w-3" />
                    VOICEMAIL
                  </button>
                  <button
                    onClick={() => setShowEmailModal(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded border border-gray-200 bg-white text-gray-600 text-[11px] font-bold tracking-wider hover:bg-gray-50 hover:border-gray-400 hover:text-gray-900 transition-all"
                  >
                    <Mail className="h-3 w-3" />
                    EMAIL
                  </button>
                  <button
                    onClick={openAppointmentModal}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded border border-gray-200 bg-white text-gray-600 text-[11px] font-bold tracking-wider hover:bg-gray-50 hover:border-gray-400 hover:text-gray-900 transition-all"
                  >
                    <Calendar className="h-3 w-3" />
                    AFSPRAAK
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApproval('approved')}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 px-3 py-3 rounded text-[12px] font-extrabold tracking-wider transition-all',
                      approval === 'approved'
                        ? 'bg-emerald-600 text-white border border-emerald-600'
                        : 'bg-[#0E4F6D] text-white border border-[#0E4F6D] hover:opacity-85'
                    )}
                  >
                    <ThumbsUp className="h-4 w-4" />
                    GOEDKEUREN
                  </button>
                  <button
                    onClick={() => handleApproval('rejected')}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 px-3 py-3 rounded text-[12px] font-extrabold tracking-wider transition-all',
                      approval === 'rejected'
                        ? 'bg-red-50 border border-red-300 text-red-600'
                        : 'border border-gray-200 bg-white text-gray-500 hover:border-gray-400 hover:text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    <ThumbsDown className="h-4 w-4" />
                    AFWIJZEN
                  </button>
                </div>
              </div>
            </div>

            {/* Email geschiedenis */}
            {emails.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-md mt-4 px-8 py-5">
                <div className="text-[8px] font-bold tracking-[0.20em] uppercase text-gray-400 mb-3 flex items-center gap-1.5">
                  <Mail className="h-3 w-3" />
                  Email geschiedenis
                </div>
                <div className="space-y-2">
                  {emails.slice(0, 5).map((e: SentEmail, i: number) => (
                    <div key={i} className="flex items-center gap-3 text-[12px]">
                      <Send className="h-3 w-3 text-gray-400 flex-shrink-0" />
                      <span className="flex-1 truncate text-gray-700">{e.subject}</span>
                      <span className="text-[10px] text-gray-400 font-mono">{new Date(e.sent_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[8.5px] font-semibold uppercase bg-emerald-50 text-emerald-700">{e.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Activity timeline */}
            {activities.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-md mt-4 px-8 py-5">
                <div className="text-[8px] font-bold tracking-[0.20em] uppercase text-gray-400 mb-3 flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  Activiteiten
                </div>
                <div className="space-y-2">
                  {activities.slice(0, 8).map((a) => {
                    const cfg = activityConfig[a.type] || activityConfig.note
                    const Icon = cfg.icon
                    return (
                      <div key={a.id} className="flex items-start gap-2.5 text-[11.5px]">
                        <div className={cn('w-6 h-6 rounded flex items-center justify-center flex-shrink-0', cfg.bg)}>
                          <Icon className={cn('h-3 w-3', cfg.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-gray-700">{a.summary || cfg.label}</div>
                          {a.notes && <div className="text-[10.5px] text-gray-500 mt-0.5">{a.notes}</div>}
                          <div className="text-[9.5px] text-gray-400 font-mono mt-0.5">
                            {new Date(a.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Lead List Sidebar (rechts) */}
        <div className="w-64 min-w-[256px] border-l border-gray-100 bg-gray-50 flex flex-col">
          <div className="p-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Leads ({leads.length})</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {leads.map((lead, idx) => {
              const isActive = idx === currentIndex
              const isReviewed = reviewedIndices.has(idx)
              const leadApproval = getApproval(lead)
              const sColor = statusColorMap[lead.status] || statusColorMap.cold
              return (
                <button
                  key={lead.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={cn(
                    'w-full text-left px-3 py-2.5 border-b border-gray-100 transition-colors',
                    isActive ? 'bg-white border-l-2 border-l-gray-900' : 'hover:bg-gray-100',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'text-xs font-semibold truncate flex-1',
                      isActive ? 'text-gray-900' : 'text-gray-600'
                    )}>
                      {lead.company_name}
                    </span>
                    {isReviewed && (
                      <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={cn('w-1.5 h-1.5 rounded-full', sColor.dot)} />
                    <span className="text-[10px] text-gray-400">{lead.status}</span>
                    {lead.city && <span className="text-[10px] text-gray-400">· {lead.city}</span>}
                    {leadApproval === 'approved' && <ThumbsUp className="h-2.5 w-2.5 text-emerald-500 ml-auto" />}
                    {leadApproval === 'rejected' && <ThumbsDown className="h-2.5 w-2.5 text-red-500 ml-auto" />}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Bottom Navigation Bar — alleen Vorige/Volgende */}
      <div className="flex items-center justify-between px-10 py-3.5 border-t border-gray-100 bg-white">
        <button
          onClick={goPrev}
          disabled={currentIndex === 0}
          className={cn(
            'flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-semibold border border-gray-200 bg-white text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-all',
            currentIndex === 0 && 'opacity-40 cursor-not-allowed'
          )}
        >
          <ArrowLeft className="h-3 w-3" />
          Vorige
        </button>

        {currentIndex === leads.length - 1 ? (
          <button
            onClick={handleExit}
            className="flex items-center gap-1.5 px-5 py-1.5 rounded-full text-[11px] font-extrabold tracking-wider text-white bg-[#0E4F6D] hover:opacity-85 transition-opacity"
          >
            <BarChart3 className="h-3 w-3" />
            RESULTATEN BEKIJKEN
          </button>
        ) : (
          <button
            onClick={goNext}
            className="flex items-center gap-1.5 px-5 py-1.5 rounded-full text-[11px] font-extrabold tracking-wider text-white bg-[#0E4F6D] hover:opacity-85 transition-opacity"
          >
            Volgende
            <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Email Modal — mockup styling */}
      {showEmailModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={() => setShowEmailModal(false)}>
          <div className="bg-white border border-gray-200 rounded-md shadow-2xl w-full max-w-xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <span className="text-[14px] font-extrabold tracking-tight">Email versturen</span>
              <button onClick={() => setShowEmailModal(false)} className="text-gray-400 hover:text-gray-700 p-0.5">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-[18px]">
              <div>
                <div className="text-[8px] font-bold tracking-[0.20em] uppercase text-gray-400 mb-2">Template</div>
                <div className="flex flex-wrap gap-1.5">
                  {EMAIL_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.name}
                      onClick={() => { setEmailSubject(tpl.subject); setEmailMessage(tpl.message) }}
                      className="text-[10.5px] font-semibold px-3 py-1 rounded-full border border-gray-200 bg-white text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-all"
                    >
                      {tpl.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[8px] font-bold tracking-[0.20em] uppercase text-gray-400 mb-2">Van</div>
                <div className="flex gap-1.5 flex-wrap">
                  {(Object.entries(senderProfiles) as [keyof typeof senderProfiles, typeof senderProfiles[keyof typeof senderProfiles]][]).map(([key, profile]) => (
                    <button
                      key={key}
                      onClick={() => setEmailSender(key)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-semibold border transition-all',
                        emailSender === key
                          ? 'bg-gray-900 border-gray-900 text-white'
                          : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'
                      )}
                    >
                      <div className={cn(
                        'w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold',
                        emailSender === key ? 'bg-white text-gray-900' : 'bg-gray-100 text-gray-600'
                      )}>
                        {profile.name[0]}
                      </div>
                      {profile.name.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[8px] font-bold tracking-[0.20em] uppercase text-gray-400 mb-1.5">Aan</div>
                <input
                  type="email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-[12px] text-gray-700 outline-none focus:border-[#0E4F6D] transition-colors"
                  placeholder="emailadres@voorbeeld.nl"
                />
              </div>

              <div>
                <div className="text-[8px] font-bold tracking-[0.20em] uppercase text-gray-400 mb-1.5">Onderwerp</div>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-[12px] text-gray-700 outline-none focus:border-[#0E4F6D] transition-colors"
                  placeholder="Onderwerp..."
                />
              </div>

              <div>
                <div className="text-[8px] font-bold tracking-[0.20em] uppercase text-gray-400 mb-1.5">Bericht</div>
                <textarea
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  rows={9}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-[12px] text-gray-700 outline-none focus:border-[#0E4F6D] transition-colors resize-none font-sans"
                  placeholder="Typ je bericht..."
                />
              </div>

              {emailError && (
                <div className="px-3 py-2 rounded bg-red-50 border border-red-200 text-[11.5px] text-red-700">{emailError}</div>
              )}

              {emailSent && (
                <div className="px-3 py-2 rounded bg-emerald-50 border border-emerald-200 text-[11.5px] text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3" />
                  Email succesvol verstuurd!
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 px-6 py-3.5 border-t border-gray-200">
              <button
                onClick={() => setShowEmailModal(false)}
                className="px-4 py-1.5 rounded-full text-[11px] font-semibold border border-gray-200 bg-white text-gray-500 hover:border-gray-400 hover:text-gray-900 transition-all"
              >
                Annuleren
              </button>
              <button
                onClick={handleSendEmail}
                disabled={sendingEmail || !emailTo.trim() || !emailSubject || !emailMessage || emailSent}
                className={cn(
                  'flex items-center gap-1.5 px-5 py-1.5 rounded-full text-[11px] font-extrabold tracking-wider text-white bg-[#0E4F6D] hover:opacity-85 transition-opacity',
                  (sendingEmail || !emailTo.trim() || !emailSubject || !emailMessage || emailSent) && 'opacity-50 cursor-not-allowed'
                )}
              >
                {sendingEmail ? (
                  <><Loader2 className="h-3 w-3 animate-spin" />VERSTUREN...</>
                ) : emailSent ? (
                  <><CheckCircle2 className="h-3 w-3" />VERSTUURD</>
                ) : (
                  <><Send className="h-3 w-3" />VERSTUREN</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Log Modal — voor GEBELD / VOICEMAIL / NOTITIE */}
      {showQuickNote && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={() => setShowQuickNote(false)}>
          <div className="bg-white border border-gray-200 rounded-md shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <span className="text-[14px] font-extrabold tracking-tight">
                {quickNoteType === 'call' && 'Gesprek loggen'}
                {quickNoteType === 'voicemail' && 'Voicemail loggen'}
                {quickNoteType === 'note' && 'Notitie toevoegen'}
                {quickNoteType === 'meeting' && 'Meeting loggen'}
              </span>
              <button onClick={() => setShowQuickNote(false)} className="text-gray-400 hover:text-gray-700 p-0.5">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-5">
              <div className="text-[8px] font-bold tracking-[0.20em] uppercase text-gray-400 mb-1.5">Korte samenvatting</div>
              <textarea
                value={quickNoteText}
                onChange={(e) => setQuickNoteText(e.target.value)}
                rows={4}
                autoFocus
                placeholder={
                  quickNoteType === 'call' ? 'Wat is er besproken? Volgende stap?' :
                  quickNoteType === 'voicemail' ? 'Bericht ingesproken. Wanneer terugbellen?' :
                  quickNoteType === 'meeting' ? 'Wat is er besproken? Volgende afspraken?' :
                  'Notitie...'
                }
                className="w-full border border-gray-200 rounded px-3 py-2 text-[12px] text-gray-700 outline-none focus:border-[#0E4F6D] transition-colors resize-none font-sans"
              />
            </div>

            <div className="flex justify-end gap-2 px-6 py-3.5 border-t border-gray-200">
              <button
                onClick={() => setShowQuickNote(false)}
                className="px-4 py-1.5 rounded-full text-[11px] font-semibold border border-gray-200 bg-white text-gray-500 hover:border-gray-400 hover:text-gray-900 transition-all"
              >
                Annuleren
              </button>
              <button
                onClick={submitQuickLog}
                disabled={loggingActivity !== null}
                className={cn(
                  'flex items-center gap-1.5 px-5 py-1.5 rounded-full text-[11px] font-extrabold tracking-wider text-white bg-[#0E4F6D] hover:opacity-85 transition-opacity',
                  loggingActivity !== null && 'opacity-50 cursor-not-allowed'
                )}
              >
                {loggingActivity !== null ? <><Loader2 className="h-3 w-3 animate-spin" />OPSLAAN...</> : 'OPSLAAN'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Afspraak Modal — schrijft naar sales_agenda + activity log */}
      {showAppointment && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={() => setShowAppointment(false)}>
          <div className="bg-white border border-gray-200 rounded-md shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <span className="text-[14px] font-extrabold tracking-tight">Afspraak plannen</span>
              <button onClick={() => setShowAppointment(false)} className="text-gray-400 hover:text-gray-700 p-0.5">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-[16px]">
              <div>
                <div className="text-[8px] font-bold tracking-[0.20em] uppercase text-gray-400 mb-1.5">Titel</div>
                <input
                  type="text"
                  value={aptTitle}
                  onChange={(e) => setAptTitle(e.target.value)}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-[12px] text-gray-700 outline-none focus:border-[#0E4F6D] transition-colors"
                  placeholder="Bijv. Kennismaking studio..."
                />
              </div>

              <div>
                <div className="text-[8px] font-bold tracking-[0.20em] uppercase text-gray-400 mb-2">Type</div>
                <div className="flex gap-1.5 flex-wrap">
                  {(['meeting', 'call', 'follow_up', 'demo', 'other'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setAptType(t)}
                      className={cn(
                        'px-3 py-1 rounded-full text-[10.5px] font-semibold border transition-all',
                        aptType === t
                          ? 'bg-gray-900 border-gray-900 text-white'
                          : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'
                      )}
                    >
                      {t === 'meeting' && 'Meeting'}
                      {t === 'call' && 'Belafspraak'}
                      {t === 'follow_up' && 'Follow-up'}
                      {t === 'demo' && 'Demo'}
                      {t === 'other' && 'Overig'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[8px] font-bold tracking-[0.20em] uppercase text-gray-400 mb-1.5">Datum</div>
                  <input
                    type="date"
                    value={aptDate}
                    onChange={(e) => setAptDate(e.target.value)}
                    className="w-full border border-gray-200 rounded px-3 py-2 text-[12px] text-gray-700 outline-none focus:border-[#0E4F6D] transition-colors"
                  />
                </div>
                <div>
                  <div className="text-[8px] font-bold tracking-[0.20em] uppercase text-gray-400 mb-1.5">Locatie</div>
                  <input
                    type="text"
                    value={aptLocation}
                    onChange={(e) => setAptLocation(e.target.value)}
                    className="w-full border border-gray-200 rounded px-3 py-2 text-[12px] text-gray-700 outline-none focus:border-[#0E4F6D] transition-colors"
                    placeholder="Amsterdam / Online"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[8px] font-bold tracking-[0.20em] uppercase text-gray-400 mb-1.5">Begintijd</div>
                  <input
                    type="time"
                    value={aptStart}
                    onChange={(e) => setAptStart(e.target.value)}
                    className="w-full border border-gray-200 rounded px-3 py-2 text-[12px] text-gray-700 outline-none focus:border-[#0E4F6D] transition-colors"
                  />
                </div>
                <div>
                  <div className="text-[8px] font-bold tracking-[0.20em] uppercase text-gray-400 mb-1.5">Eindtijd</div>
                  <input
                    type="time"
                    value={aptEnd}
                    onChange={(e) => setAptEnd(e.target.value)}
                    className="w-full border border-gray-200 rounded px-3 py-2 text-[12px] text-gray-700 outline-none focus:border-[#0E4F6D] transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="text-[8px] font-bold tracking-[0.20em] uppercase text-gray-400 mb-1.5">Notities</div>
                <textarea
                  value={aptNotes}
                  onChange={(e) => setAptNotes(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-[12px] text-gray-700 outline-none focus:border-[#0E4F6D] transition-colors resize-none font-sans"
                  placeholder="Agendapunten, aandachtspunten..."
                />
              </div>

              {aptError && (
                <div className="px-3 py-2 rounded bg-red-50 border border-red-200 text-[11.5px] text-red-700">{aptError}</div>
              )}
            </div>

            <div className="flex justify-end gap-2 px-6 py-3.5 border-t border-gray-200">
              <button
                onClick={() => setShowAppointment(false)}
                className="px-4 py-1.5 rounded-full text-[11px] font-semibold border border-gray-200 bg-white text-gray-500 hover:border-gray-400 hover:text-gray-900 transition-all"
              >
                Annuleren
              </button>
              <button
                onClick={saveAppointment}
                disabled={aptSaving}
                className={cn(
                  'flex items-center gap-1.5 px-5 py-1.5 rounded-full text-[11px] font-extrabold tracking-wider text-white bg-[#0E4F6D] hover:opacity-85 transition-opacity',
                  aptSaving && 'opacity-50 cursor-not-allowed'
                )}
              >
                {aptSaving ? <><Loader2 className="h-3 w-3 animate-spin" />OPSLAAN...</> : 'AFSPRAAK OPSLAAN'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper: extract approval status from notes
function getApproval(lead: SalesLead): 'approved' | 'rejected' | 'pending' {
  const match = (lead.notes || '').match(/\[APPROVAL:(approved|rejected|pending)\]/)
  return (match?.[1] as 'approved' | 'rejected' | 'pending') || 'pending'
}

// Helper: get display notes without approval tag
function getDisplayNotes(notes: string): string {
  return notes.replace(/\[APPROVAL:(approved|rejected|pending)\]\s*/g, '').trim()
}

// Export helpers for use in sales page
export { getApproval, getDisplayNotes }
