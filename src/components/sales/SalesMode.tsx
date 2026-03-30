'use client'

import { useState, useEffect, useCallback } from 'react'
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
  Save,
  FileText,
  Video,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { salesLeadsApi, leadContactsApi, type SalesLead, type LeadContact } from '@/lib/supabase'

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
  const [editingNotes, setEditingNotes] = useState(false)
  const [savingNotes, setSavingNotes] = useState(false)
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

  // Email modal state
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)

  const currentLead = leads[currentIndex]

  const loadLeadData = useCallback(async (lead: SalesLead) => {
    setLoadingContacts(true)
    setLoadingEmails(true)
    setLoadingActivities(true)
    setNotes(lead.notes || '')
    setEditingNotes(false)
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

  const goNext = () => {
    if (currentIndex < leads.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleExit = () => {
    onExit(sessionStats)
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!currentLead || currentLead.status === newStatus) return
    const oldStatus = currentLead.status
    try {
      const updated = await salesLeadsApi.update(currentLead.id, { status: newStatus as SalesLead['status'] })
      onLeadUpdate(updated)
      setSessionStats(s => ({ ...s, statusChanges: s.statusChanges + 1 }))
      // Log status change activity
      logActivity('status_change', `Status: ${oldStatus} → ${newStatus}`)
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const handleApproval = async (approval: 'approved' | 'rejected' | 'pending') => {
    if (!currentLead) return
    // Store approval in notes with a tag pattern, or we could use a separate field
    // For now, we use a metadata prefix in notes
    const currentApproval = getApproval(currentLead)
    if (currentApproval === approval) return

    try {
      // Store approval tag in the lead's notes metadata
      const cleanNotes = (currentLead.notes || '').replace(/\[APPROVAL:(approved|rejected|pending)\]\s*/g, '')
      const newNotes = `[APPROVAL:${approval}] ${cleanNotes}`.trim()
      const updated = await salesLeadsApi.update(currentLead.id, { notes: newNotes })
      onLeadUpdate(updated)
      setNotes(newNotes)
      setSessionStats(s => ({
        ...s,
        approved: s.approved + (approval === 'approved' ? 1 : 0),
        rejected: s.rejected + (approval === 'rejected' ? 1 : 0),
      }))
    } catch (error) {
      console.error('Error updating approval:', error)
    }
  }

  const handleSaveNotes = async () => {
    if (!currentLead) return
    setSavingNotes(true)
    try {
      // Preserve the approval tag
      const approval = getApproval(currentLead)
      const cleanInput = notes.replace(/\[APPROVAL:(approved|rejected|pending)\]\s*/g, '').trim()
      const finalNotes = approval !== 'pending'
        ? `[APPROVAL:${approval}] ${cleanInput}`.trim()
        : cleanInput
      const updated = await salesLeadsApi.update(currentLead.id, { notes: finalNotes })
      onLeadUpdate(updated)
      setNotes(finalNotes)
      setEditingNotes(false)
      setSessionStats(s => ({ ...s, notesEdited: s.notesEdited + 1 }))
    } catch (error) {
      console.error('Error saving notes:', error)
    } finally {
      setSavingNotes(false)
    }
  }

  const handleSendEmail = async () => {
    if (!currentLead?.email || !emailSubject || !emailMessage) return
    setSendingEmail(true)
    setEmailError(null)
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: {
            email: currentLead.email,
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
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-4">
          <button
            onClick={handleExit}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="font-medium">Sales Mode verlaten</span>
          </button>
          <div className="h-6 w-px bg-gray-200" />
          <div className="flex items-center gap-2">
            <Badge className={cn(approvalInfo.bg, approvalInfo.text, 'capitalize')}>
              {approval}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Navigation */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-4 py-2">
            <button
              onClick={goPrev}
              disabled={currentIndex === 0}
              className="p-1 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span className="font-semibold text-gray-900 min-w-[80px] text-center">
              {currentIndex + 1} / {leads.length}
            </span>
            <button
              onClick={goNext}
              disabled={currentIndex === leads.length - 1}
              className="p-1 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gray-900 rounded-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / leads.length) * 100}%` }}
              />
            </div>
            <span>{Math.round(((currentIndex + 1) / leads.length) * 100)}%</span>
          </div>

          <button
            onClick={handleExit}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-6">
          <div className="grid grid-cols-3 gap-6">
            {/* Left Column - Main Info */}
            <div className="col-span-2 space-y-6">
              {/* Company Header */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">{currentLead.company_name}</h1>
                    <div className="flex items-center gap-3 text-gray-500">
                      {currentLead.city && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-4 w-4" />
                          {currentLead.city}
                        </span>
                      )}
                      {(currentLead as SalesLeadExt).address && (
                        <span className="flex items-center gap-1.5">
                          <Building2 className="h-4 w-4" />
                          {(currentLead as SalesLeadExt).address as string}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={cn(statusColors.bg, statusColors.text, 'capitalize text-sm')}>
                      <span className={cn('w-2 h-2 rounded-full mr-1.5', statusColors.dot)} />
                      {currentLead.status}
                    </Badge>
                    {currentLead.source && (
                      <Badge variant="outline" className="text-sm">
                        {currentLead.source}
                      </Badge>
                    )}
                  </div>
                </div>

                {(currentLead as SalesLeadExt).website && (
                  <a
                    href={(currentLead as SalesLeadExt).website as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors text-sm"
                  >
                    <Globe className="h-4 w-4" />
                    {(currentLead as SalesLeadExt).website as string}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}

                {/* Quick contact info */}
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
                  {currentLead.email && (
                    <a
                      href={`mailto:${currentLead.email}`}
                      className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      <Mail className="h-4 w-4" />
                      {currentLead.email}
                    </a>
                  )}
                  {currentLead.phone && (
                    <a
                      href={`tel:${currentLead.phone}`}
                      className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      <Phone className="h-4 w-4" />
                      {currentLead.phone}
                    </a>
                  )}
                </div>
              </div>

              {/* Contacts */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-5 w-5 text-gray-400" />
                  <h2 className="font-semibold text-gray-900">Contactpersonen</h2>
                </div>

                {loadingContacts ? (
                  <div className="flex items-center gap-2 text-gray-400 py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Laden...
                  </div>
                ) : contacts.length > 0 ? (
                  <div className="space-y-3">
                    {contacts.map((contact) => (
                      <div key={contact.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                          <span className="text-gray-900 font-semibold text-sm">
                            {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900">{contact.name}</span>
                            {contact.is_primary && (
                              <Badge className="bg-gray-200 text-black text-xs">Primair</Badge>
                            )}
                            {contact.role && (
                              <span className="text-sm text-gray-500">{contact.role}</span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm">
                            {contact.email && (
                              <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900">
                                <Mail className="h-3.5 w-3.5" />
                                {contact.email}
                              </a>
                            )}
                            {contact.phone && (
                              <a href={`tel:${contact.phone}`} className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900">
                                <Phone className="h-3.5 w-3.5" />
                                {contact.phone}
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : currentLead.contact_name ? (
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-900 font-semibold text-sm">
                          {currentLead.contact_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{currentLead.contact_name}</div>
                        <div className="flex gap-3 text-sm text-gray-500">
                          {currentLead.email && <span>{currentLead.email}</span>}
                          {currentLead.phone && <span>{currentLead.phone}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 py-2">Geen contactpersonen</p>
                )}
              </div>

              {/* Notes */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-gray-400" />
                    <h2 className="font-semibold text-gray-900">Notities</h2>
                  </div>
                  {!editingNotes ? (
                    <Button variant="outline" size="sm" onClick={() => { setEditingNotes(true); setNotes(currentLead.notes || '') }}>
                      <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                      Bewerken
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setEditingNotes(false); setNotes(currentLead.notes || '') }}>
                        Annuleren
                      </Button>
                      <Button size="sm" onClick={handleSaveNotes} disabled={savingNotes}>
                        {savingNotes ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                        Opslaan
                      </Button>
                    </div>
                  )}
                </div>

                {editingNotes ? (
                  <textarea
                    value={editableNotes}
                    onChange={(e) => {
                      // Preserve approval tag when editing
                      const approvalVal = getApproval(currentLead)
                      const prefix = approvalVal !== 'pending' ? `[APPROVAL:${approvalVal}] ` : ''
                      setNotes(prefix + e.target.value)
                    }}
                    className="w-full p-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none min-h-[120px] text-gray-700"
                    placeholder="Voeg notities toe over deze lead..."
                    autoFocus
                  />
                ) : (
                  <div className="text-gray-600 whitespace-pre-wrap min-h-[60px]">
                    {displayNotes || <span className="text-gray-400 italic">Geen notities</span>}
                  </div>
                )}
              </div>

              {/* Email History */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <h2 className="font-semibold text-gray-900">Email Geschiedenis</h2>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => {
                    if (!currentLead.email) return
                    const name = currentLead.contact_name || currentLead.company_name
                    setEmailSubject(`Samenwerking met ${currentLead.company_name}`)
                    setEmailMessage(`Beste ${name},\n\nLeuk dat we kort hebben gesproken. Zoals besproken stuur ik je graag meer informatie over onze diensten.\n\nWe helpen creatieve studio's zoals ${currentLead.company_name} met het verhogen van hun bezettingsgraad door middel van ons platform. Hierdoor bereiken jullie een breder publiek zonder extra marketingkosten.\n\nZou je openstaan voor een kort gesprek om de mogelijkheden te bespreken?\n\nMet vriendelijke groet,\nlcntships Team`)
                    setEmailSent(false)
                    setEmailError(null)
                    setShowEmailModal(true)
                  }} disabled={!currentLead.email}>
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    Email sturen
                  </Button>
                </div>

                {loadingEmails ? (
                  <div className="flex items-center gap-2 text-gray-400 py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Laden...
                  </div>
                ) : emails.length > 0 ? (
                  <div className="space-y-3">
                    {emails.map((email, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                        <div className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                          email.status === 'delivered' ? 'bg-emerald-100' :
                          email.status === 'bounced' ? 'bg-red-100' :
                          email.status === 'failed' ? 'bg-red-100' : 'bg-blue-100'
                        )}>
                          {email.status === 'delivered' ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          ) : email.status === 'bounced' || email.status === 'failed' ? (
                            <XCircle className="h-4 w-4 text-red-600" />
                          ) : (
                            <Send className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 text-sm truncate">{email.subject}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">{formatDateTime(email.sent_at)}</span>
                            <Badge className={cn(
                              'text-xs',
                              email.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                              email.status === 'bounced' ? 'bg-red-100 text-red-700' :
                              email.status === 'failed' ? 'bg-red-100 text-red-700' :
                              'bg-blue-100 text-blue-700'
                            )}>
                              {email.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 py-2 italic">Nog geen emails verstuurd</p>
                )}
              </div>
            </div>

            {/* Right Column - Actions */}
            <div className="space-y-6">
              {/* Approval */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Beoordeling</h2>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleApproval('approved')}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-xl transition-all border-2',
                      approval === 'approved'
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/50'
                    )}
                  >
                    <ThumbsUp className={cn('h-6 w-6', approval === 'approved' ? 'text-emerald-600' : 'text-gray-400')} />
                    <span className={cn('text-xs font-medium', approval === 'approved' ? 'text-emerald-700' : 'text-gray-500')}>
                      Goed
                    </span>
                  </button>
                  <button
                    onClick={() => handleApproval('pending')}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-xl transition-all border-2',
                      approval === 'pending'
                        ? 'border-gray-400 bg-gray-50'
                        : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50/50'
                    )}
                  >
                    <Minus className={cn('h-6 w-6', approval === 'pending' ? 'text-gray-600' : 'text-gray-400')} />
                    <span className={cn('text-xs font-medium', approval === 'pending' ? 'text-gray-700' : 'text-gray-500')}>
                      Later
                    </span>
                  </button>
                  <button
                    onClick={() => handleApproval('rejected')}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-xl transition-all border-2',
                      approval === 'rejected'
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-100 hover:border-red-200 hover:bg-red-50/50'
                    )}
                  >
                    <ThumbsDown className={cn('h-6 w-6', approval === 'rejected' ? 'text-red-600' : 'text-gray-400')} />
                    <span className={cn('text-xs font-medium', approval === 'rejected' ? 'text-red-700' : 'text-gray-500')}>
                      Afwijzen
                    </span>
                  </button>
                </div>
              </div>

              {/* Status */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Status</h2>
                <div className="space-y-2">
                  {(['cold', 'warm', 'hot', 'voicemail', 'negotiation', 'closed', 'lost'] as const).map((status) => {
                    const colors = statusColorMap[status]
                    const isActive = currentLead.status === status
                    return (
                      <button
                        key={status}
                        onClick={() => handleStatusChange(status)}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-xl transition-all',
                          isActive ? colors.bg : 'hover:bg-gray-50'
                        )}
                      >
                        <span className={cn('w-3 h-3 rounded-full', colors.dot)} />
                        <span className={cn('font-medium capitalize', isActive ? colors.text : 'text-gray-600')}>
                          {status}
                        </span>
                        {isActive && <Check className={cn('h-4 w-4 ml-auto', colors.text)} />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Quick Log Actions */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Log Interactie</h2>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleQuickLog('call')}
                    disabled={loggingActivity === 'call'}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-green-100 hover:border-green-300 hover:bg-green-50 transition-all"
                  >
                    {loggingActivity === 'call' ? (
                      <Loader2 className="h-5 w-5 text-green-500 animate-spin" />
                    ) : (
                      <PhoneCall className="h-5 w-5 text-green-600" />
                    )}
                    <span className="text-xs font-medium text-green-700">Gebeld</span>
                  </button>
                  <button
                    onClick={() => handleQuickLog('voicemail')}
                    disabled={loggingActivity === 'voicemail'}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-violet-100 hover:border-violet-300 hover:bg-violet-50 transition-all"
                  >
                    {loggingActivity === 'voicemail' ? (
                      <Loader2 className="h-5 w-5 text-violet-500 animate-spin" />
                    ) : (
                      <PhoneMissed className="h-5 w-5 text-violet-600" />
                    )}
                    <span className="text-xs font-medium text-violet-700">Voicemail</span>
                  </button>
                  <button
                    onClick={() => handleQuickLog('meeting')}
                    disabled={loggingActivity === 'meeting'}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-pink-100 hover:border-pink-300 hover:bg-pink-50 transition-all"
                  >
                    {loggingActivity === 'meeting' ? (
                      <Loader2 className="h-5 w-5 text-pink-500 animate-spin" />
                    ) : (
                      <Video className="h-5 w-5 text-pink-600" />
                    )}
                    <span className="text-xs font-medium text-pink-700">Meeting</span>
                  </button>
                  <button
                    onClick={() => handleQuickLog('note')}
                    disabled={loggingActivity === 'note'}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-all"
                  >
                    {loggingActivity === 'note' ? (
                      <Loader2 className="h-5 w-5 text-gray-500 animate-spin" />
                    ) : (
                      <FileText className="h-5 w-5 text-gray-600" />
                    )}
                    <span className="text-xs font-medium text-gray-700">Notitie</span>
                  </button>
                </div>

                {/* Quick Note Input */}
                {showQuickNote && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', activityConfig[quickNoteType]?.bg, activityConfig[quickNoteType]?.color)}>
                        {activityConfig[quickNoteType]?.label}
                      </span>
                    </div>
                    <textarea
                      value={quickNoteText}
                      onChange={(e) => setQuickNoteText(e.target.value)}
                      placeholder="Optioneel: voeg een notitie toe..."
                      className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={submitQuickLog} disabled={!!loggingActivity} className="flex-1">
                        {loggingActivity ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
                        Opslaan
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setShowQuickNote(false)}>
                        Annuleer
                      </Button>
                    </div>
                  </div>
                )}

                {/* Direct action links */}
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-1">
                  {currentLead.phone && (
                    <a
                      href={`tel:${currentLead.phone}`}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors text-gray-700"
                    >
                      <Phone className="h-4 w-4" />
                      <span className="text-sm font-medium">Bellen: {currentLead.phone}</span>
                    </a>
                  )}
                  {(currentLead as SalesLeadExt).website && (
                    <a
                      href={(currentLead as SalesLeadExt).website as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors text-gray-700"
                    >
                      <Globe className="h-4 w-4" />
                      <span className="text-sm font-medium">Website bekijken</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Activity Timeline */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Activiteiten</h2>

                {loadingActivities ? (
                  <div className="flex items-center gap-2 text-gray-400 py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Laden...
                  </div>
                ) : activities.length > 0 ? (
                  <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                    {activities.map((activity) => {
                      const config = activityConfig[activity.type] || activityConfig.note
                      const Icon = config.icon
                      return (
                        <div key={activity.id} className="flex items-start gap-3">
                          <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', config.bg)}>
                            <Icon className={cn('h-4 w-4', config.color)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900">{activity.summary}</div>
                            {activity.notes && (
                              <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{activity.notes}</div>
                            )}
                            <div className="text-xs text-gray-400 mt-1">{formatDateTime(activity.created_at)}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Clock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Nog geen activiteiten</p>
                    <p className="text-xs text-gray-400 mt-1">Log je eerste interactie hierboven</p>
                  </div>
                )}

                {/* Lead dates footer */}
                <div className="mt-4 pt-3 border-t border-gray-100 space-y-1 text-xs text-gray-400">
                  <div className="flex justify-between">
                    <span>Toegevoegd</span>
                    <span>{formatDate(currentLead.created_at)}</span>
                  </div>
                  {(currentLead as SalesLeadExt).last_contacted_at && (
                    <div className="flex justify-between">
                      <span>Laatst gecontacteerd</span>
                      <span>{formatDate((currentLead as SalesLeadExt).last_contacted_at ?? undefined)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Keyboard shortcuts */}
              <div className="bg-gray-50 rounded-2xl p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Sneltoetsen</h3>
                <div className="space-y-2 text-xs text-gray-500">
                  <div className="flex items-center justify-between">
                    <span>Volgende lead</span>
                    <div className="flex gap-1">
                      <kbd className="px-1.5 py-0.5 bg-white rounded border text-gray-700">→</kbd>
                      <kbd className="px-1.5 py-0.5 bg-white rounded border text-gray-700">J</kbd>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Vorige lead</span>
                    <div className="flex gap-1">
                      <kbd className="px-1.5 py-0.5 bg-white rounded border text-gray-700">←</kbd>
                      <kbd className="px-1.5 py-0.5 bg-white rounded border text-gray-700">K</kbd>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Sluiten</span>
                    <kbd className="px-1.5 py-0.5 bg-white rounded border text-gray-700">Esc</kbd>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-white">
        <Button variant="outline" onClick={goPrev} disabled={currentIndex === 0}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Vorige
        </Button>

        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>{sessionStats.reviewed} bekeken</span>
          <span className="h-4 w-px bg-gray-200" />
          <span>{sessionStats.statusChanges} status wijzigingen</span>
          <span className="h-4 w-px bg-gray-200" />
          <span className="flex items-center gap-1">
            <ThumbsUp className="h-3.5 w-3.5 text-emerald-500" /> {sessionStats.approved}
          </span>
          <span className="flex items-center gap-1">
            <ThumbsDown className="h-3.5 w-3.5 text-red-500" /> {sessionStats.rejected}
          </span>
        </div>

        {currentIndex === leads.length - 1 ? (
          <Button onClick={handleExit}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Resultaten bekijken
          </Button>
        ) : (
          <Button onClick={goNext}>
            Volgende
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl m-4 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Email versturen</h3>
              <button onClick={() => setShowEmailModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Templates */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Template kiezen</label>
                <div className="flex flex-wrap gap-2">
                  {EMAIL_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.name}
                      onClick={() => { setEmailSubject(tpl.subject); setEmailMessage(tpl.message) }}
                      className="text-xs px-3 py-1.5 rounded-full border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors text-gray-700"
                    >
                      {tpl.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* To */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Aan</label>
                <div className="px-3 py-2 rounded-xl bg-gray-50 text-sm text-gray-700">
                  {currentLead.email || 'Geen email beschikbaar'}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Onderwerp</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="Onderwerp..."
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Bericht</label>
                <textarea
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  rows={10}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
                  placeholder="Typ je bericht..."
                />
              </div>

              {emailError && (
                <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm">{emailError}</div>
              )}

              {emailSent && (
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Email succesvol verstuurd!
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 p-6 border-t border-gray-100">
              <Button variant="outline" onClick={() => setShowEmailModal(false)}>
                Annuleren
              </Button>
              <Button
                onClick={handleSendEmail}
                disabled={sendingEmail || !emailSubject || !emailMessage || !currentLead.email || emailSent}
              >
                {sendingEmail ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Versturen...</>
                ) : emailSent ? (
                  <><CheckCircle2 className="h-4 w-4 mr-2" />Verstuurd</>
                ) : (
                  <><Send className="h-4 w-4 mr-2" />Versturen</>
                )}
              </Button>
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
