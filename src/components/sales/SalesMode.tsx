'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  X,
  MapPin,
  Phone,
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
  Search as SearchIcon,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Clock,
  BarChart3,
  CheckCircle2,
  XCircle,
  Minus,
  Save,
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

  const currentLead = leads[currentIndex]

  const loadLeadData = useCallback(async (lead: SalesLead) => {
    setLoadingContacts(true)
    setLoadingEmails(true)
    setNotes(lead.notes || '')
    setEditingNotes(false)

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
      if (editingNotes) return
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
    try {
      const updated = await salesLeadsApi.update(currentLead.id, { status: newStatus as SalesLead['status'] })
      onLeadUpdate(updated)
      setSessionStats(s => ({ ...s, statusChanges: s.statusChanges + 1 }))
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
                  <Link href="/email">
                    <Button variant="outline" size="sm">
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                      Email sturen
                    </Button>
                  </Link>
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
                  {(['cold', 'warm', 'hot', 'negotiation', 'closed', 'lost'] as const).map((status) => {
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

              {/* Timeline */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Tijdlijn</h2>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-gray-500" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Toegevoegd</div>
                      <div className="font-medium text-gray-900 text-sm">{formatDate(currentLead.created_at)}</div>
                    </div>
                  </div>
                  {(currentLead as SalesLeadExt).last_contacted_at && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <Send className="h-4 w-4 text-blue-500" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Laatst gecontacteerd</div>
                        <div className="font-medium text-gray-900 text-sm">{formatDate((currentLead as SalesLeadExt).last_contacted_at ?? undefined)}</div>
                      </div>
                    </div>
                  )}
                  {currentLead.updated_at && currentLead.updated_at !== currentLead.created_at && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                        <Edit3 className="h-4 w-4 text-gray-500" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Laatst bewerkt</div>
                        <div className="font-medium text-gray-900 text-sm">{formatDate(currentLead.updated_at)}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Snelle acties</h2>
                <div className="space-y-2">
                  {currentLead.email && (
                    <a
                      href={`mailto:${currentLead.email}`}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-gray-700"
                    >
                      <Mail className="h-4 w-4" />
                      <span className="text-sm font-medium">Email sturen</span>
                    </a>
                  )}
                  {currentLead.phone && (
                    <a
                      href={`tel:${currentLead.phone}`}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-gray-700"
                    >
                      <Phone className="h-4 w-4" />
                      <span className="text-sm font-medium">Bellen</span>
                    </a>
                  )}
                  {(currentLead as SalesLeadExt).website && (
                    <a
                      href={(currentLead as SalesLeadExt).website as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-gray-700"
                    >
                      <Globe className="h-4 w-4" />
                      <span className="text-sm font-medium">Website bekijken</span>
                    </a>
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
