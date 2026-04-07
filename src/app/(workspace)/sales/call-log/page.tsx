'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Phone,
  PhoneCall,
  PhoneMissed,
  Mail,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Building2,
  MapPin,
  Clock,
  Send,
  MessageSquare,
  Video,
  FileText,
  ArrowLeft,
  X,
  Check,
  AlertCircle,
  User,
  ExternalLink,
  FileDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface LeadActivity {
  id: string
  lead_id: string
  type: 'call' | 'voicemail' | 'email' | 'note' | 'status_change' | 'meeting'
  summary: string | null
  notes: string | null
  metadata: Record<string, unknown>
  created_by: string | null
  created_at: string
}

interface SalesLead {
  id: string
  company_name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  city: string | null
  address: string | null
  website: string | null
  status: string
  source: string | null
  notes: string | null
  studio_type: string | null
  created_at: string
  updated_at: string
}

interface CallLogEntry {
  lead: SalesLead
  activities: LeadActivity[]
  lastActivity: LeadActivity
}

const activityConfig: Record<string, { icon: typeof Phone; bg: string; color: string; label: string }> = {
  call: { icon: PhoneCall, bg: 'bg-green-100', color: 'text-green-600', label: 'Gebeld' },
  voicemail: { icon: PhoneMissed, bg: 'bg-violet-100', color: 'text-violet-600', label: 'Voicemail' },
  email: { icon: Mail, bg: 'bg-blue-100', color: 'text-blue-600', label: 'Email' },
  note: { icon: FileText, bg: 'bg-gray-100', color: 'text-gray-600', label: 'Notitie' },
  meeting: { icon: Video, bg: 'bg-pink-100', color: 'text-pink-600', label: 'Meeting' },
  status_change: { icon: MessageSquare, bg: 'bg-amber-100', color: 'text-amber-600', label: 'Status' },
}

const statusColorMap: Record<string, { bg: string; text: string; dot: string }> = {
  cold: { bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-400' },
  warm: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-400' },
  hot: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
  voicemail: { bg: 'bg-violet-100', text: 'text-violet-700', dot: 'bg-violet-500' },
  negotiation: { bg: 'bg-gray-200', text: 'text-black', dot: 'bg-gray-900' },
  closed: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  lost: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
}

interface EmailTemplate {
  id: string
  label: string
  subject: (lead: SalesLead) => string
  greeting: (lead: SalesLead) => string
  message: (lead: SalesLead) => string
  ctaText: string
  ctaUrl: string
}

const followUpTemplates: EmailTemplate[] = [
  {
    id: 'after-call',
    label: 'Na telefoongesprek',
    subject: (lead) => `Fijn dat we even gesproken hebben — ${lead.company_name}`,
    greeting: (lead) => `Beste ${lead.contact_name || 'heer/mevrouw'}`,
    message: (lead) =>
      `Bedankt voor het prettige gesprek van zojuist. Zoals besproken stuur ik u graag wat meer informatie over hoe lcntships uw studio kan helpen met het verhuurproces.\n\nKort samengevat bieden wij:\n- Een professioneel platform waar huurders uw studio kunnen vinden en boeken\n- Volledige afhandeling van betalingen en administratie\n- Geen gedoe — wij regelen alles, u hoeft alleen de sleutel te overhandigen\n\nIk hoor graag of u nog vragen heeft. We kunnen ook een vrijblijvend vervolggesprek inplannen.`,
    ctaText: 'Bekijk ons platform',
    ctaUrl: 'https://lcntships.com',
  },
  {
    id: 'after-voicemail',
    label: 'Na voicemail',
    subject: (lead) => `Ik probeerde u te bereiken — ${lead.company_name}`,
    greeting: (lead) => `Beste ${lead.contact_name || 'heer/mevrouw'}`,
    message: (lead) =>
      `Ik heb zojuist geprobeerd u telefonisch te bereiken maar helaas trof ik u niet aan.\n\nIk neem contact met u op namens lcntships. Wij helpen studio-eigenaren zoals ${lead.company_name} om hun studio eenvoudig te verhuren via ons platform — zonder extra werk.\n\nZou u deze week een moment hebben voor een kort telefoongesprek van 5 minuten? Dan leg ik graag uit wat we voor u kunnen betekenen.`,
    ctaText: 'Meer over lcntships',
    ctaUrl: 'https://lcntships.com',
  },
  {
    id: 'interested-followup',
    label: 'Follow-up geinteresseerd',
    subject: (lead) => `Vervolg op ons gesprek — ${lead.company_name}`,
    greeting: (lead) => `Beste ${lead.contact_name || 'heer/mevrouw'}`,
    message: (lead) =>
      `Leuk dat u geinteresseerd bent in lcntships! Zoals beloofd stuur ik u hierbij meer informatie.\n\nWat u van ons kunt verwachten:\n- Professionele foto's en vermelding van uw studio op ons platform\n- Boekingen en betalingen worden volledig door ons afgehandeld\n- U bepaalt zelf uw beschikbaarheid en tarieven\n- Wij nemen een klein percentage per boeking — geen vaste kosten\n\nZullen we een moment inplannen om alles door te nemen? Ik ben flexibel qua agenda.`,
    ctaText: 'Bekijk onze studio\'s',
    ctaUrl: 'https://lcntships.com',
  },
  {
    id: 'meeting-confirm',
    label: 'Afspraak bevestigen',
    subject: (lead) => `Bevestiging afspraak — ${lead.company_name} & lcntships`,
    greeting: (lead) => `Beste ${lead.contact_name || 'heer/mevrouw'}`,
    message: (lead) =>
      `Hierbij bevestig ik onze afspraak. Ik kijk ernaar uit om langs te komen bij ${lead.company_name}${lead.city ? ` in ${lead.city}` : ''}.\n\nTijdens ons gesprek bespreek ik graag:\n- Hoe het platform werkt en wat het voor uw studio kan opleveren\n- Uw wensen en eventuele vragen\n- De volgende stappen als u besluit mee te doen\n\nMocht u de afspraak willen verzetten, laat het gerust weten.\n\nTot dan!`,
    ctaText: 'Bekijk lcntships',
    ctaUrl: 'https://lcntships.com',
  },
  {
    id: 'no-answer-retry',
    label: 'Nogmaals proberen',
    subject: (lead) => `Nog een poging — ${lead.company_name}`,
    greeting: (lead) => `Beste ${lead.contact_name || 'heer/mevrouw'}`,
    message: (lead) =>
      `Ik heb u de afgelopen dagen een paar keer proberen te bereiken. Ik begrijp dat het druk kan zijn!\n\nKort: lcntships is een platform dat studio's zoals ${lead.company_name} helpt om eenvoudig extra inkomsten te genereren via verhuur. Geen vaste kosten, geen gedoe.\n\nMocht u even 5 minuten tijd hebben, dan leg ik het graag telefonisch uit. Of beantwoord gerust deze mail met uw vragen.`,
    ctaText: 'Ontdek lcntships',
    ctaUrl: 'https://lcntships.com',
  },
]

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('nl-NL', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function CallLogPage() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [entries, setEntries] = useState<CallLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [activeDates, setActiveDates] = useState<string[]>([])
  const [filterType, setFilterType] = useState<string>('all')

  // Email modal state
  const [emailModal, setEmailModal] = useState<{ lead: SalesLead } | null>(null)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')

  const fetchCallLog = useCallback(async () => {
    setLoading(true)
    try {
      const dateStr = formatDate(selectedDate)
      const res = await fetch(`/api/call-log?date=${dateStr}`)
      const data = await res.json()

      if (data.error) {
        console.error('API error:', data.error)
        setEntries([])
        return
      }

      const { activities, leads, activeDates: dates } = data as {
        activities: LeadActivity[]
        leads: SalesLead[]
        activeDates: string[]
      }

      setActiveDates(dates || [])

      // Group activities by lead
      const leadMap = new Map<string, SalesLead>()
      for (const lead of leads) {
        leadMap.set(lead.id, lead)
      }

      const grouped = new Map<string, LeadActivity[]>()
      for (const activity of activities) {
        const existing = grouped.get(activity.lead_id) || []
        existing.push(activity)
        grouped.set(activity.lead_id, existing)
      }

      const logEntries: CallLogEntry[] = []
      for (const [leadId, acts] of grouped) {
        const lead = leadMap.get(leadId)
        if (lead) {
          logEntries.push({
            lead,
            activities: acts,
            lastActivity: acts[0],
          })
        }
      }

      setEntries(logEntries)
    } catch (err) {
      console.error('Fetch error:', err)
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  useEffect(() => {
    fetchCallLog()
  }, [fetchCallLog])

  const goToPreviousDay = () => {
    const prev = new Date(selectedDate)
    prev.setDate(prev.getDate() - 1)
    setSelectedDate(prev)
  }

  const goToNextDay = () => {
    const next = new Date(selectedDate)
    next.setDate(next.getDate() + 1)
    setSelectedDate(next)
  }

  const goToToday = () => {
    setSelectedDate(new Date())
  }

  const isToday = formatDate(selectedDate) === formatDate(new Date())

  const filteredEntries = filterType === 'all'
    ? entries
    : entries.filter(e => e.activities.some(a => a.type === filterType))

  // Stats
  const totalCalls = entries.reduce((sum, e) => sum + e.activities.filter(a => a.type === 'call').length, 0)
  const totalVoicemails = entries.reduce((sum, e) => sum + e.activities.filter(a => a.type === 'voicemail').length, 0)
  const totalEmails = entries.reduce((sum, e) => sum + e.activities.filter(a => a.type === 'email').length, 0)
  const totalMeetings = entries.reduce((sum, e) => sum + e.activities.filter(a => a.type === 'meeting').length, 0)
  const uniqueLeads = entries.length

  const openEmailModal = (lead: SalesLead) => {
    setEmailModal({ lead })
    setEmailSubject('')
    setEmailMessage('')
    setEmailSent(false)
    setEmailError(null)
    setSelectedTemplate('')
  }

  const applyTemplate = (templateId: string) => {
    if (!emailModal) return
    const template = followUpTemplates.find(t => t.id === templateId)
    if (!template) return
    setSelectedTemplate(templateId)
    setEmailSubject(template.subject(emailModal.lead))
    setEmailMessage(template.message(emailModal.lead))
  }

  const sendEmail = async () => {
    if (!emailModal || !emailModal.lead.email) return
    setSendingEmail(true)
    setEmailError(null)

    try {
      const senderSettings = typeof window !== 'undefined'
        ? JSON.parse(localStorage.getItem('emailSenderSettings') || '{}')
        : {}

      // Get template CTA if a template is selected
      const activeTemplate = selectedTemplate
        ? followUpTemplates.find(t => t.id === selectedTemplate)
        : null

      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: {
            email: emailModal.lead.email,
            name: emailModal.lead.contact_name || emailModal.lead.company_name,
            company: emailModal.lead.company_name,
          },
          subject: emailSubject,
          message: emailMessage,
          from: senderSettings.fromEmail || undefined,
          greeting: activeTemplate
            ? activeTemplate.greeting(emailModal.lead)
            : `Beste ${emailModal.lead.contact_name || 'heer/mevrouw'}`,
          ctaText: activeTemplate?.ctaText || 'Bekijk lcntships',
          ctaUrl: activeTemplate?.ctaUrl || 'https://lcntships.com',
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Email verzenden mislukt')
      }

      setEmailSent(true)

      // Log email activity
      await fetch(`/api/leads/${emailModal.lead.id}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'email',
          summary: `Email verstuurd: ${emailSubject}`,
          notes: emailMessage.substring(0, 200),
        }),
      })

      setTimeout(() => {
        setEmailModal(null)
        fetchCallLog()
      }, 1500)
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Onbekende fout')
    } finally {
      setSendingEmail(false)
    }
  }

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
            <h1 className="text-2xl font-bold text-gray-900">Bel Samenvatting</h1>
            <p className="text-sm text-gray-500">Dagelijks overzicht van alle activiteiten per lead</p>
          </div>
        </div>
      </div>

      {/* Date navigation */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={goToPreviousDay} className="rounded-xl">
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-gray-400" />
            <span className="text-lg font-semibold text-gray-900 capitalize">
              {formatDisplayDate(selectedDate)}
            </span>
            {!isToday && (
              <Button variant="outline" size="sm" onClick={goToToday} className="rounded-lg text-xs">
                Vandaag
              </Button>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={goToNextDay}
            className="rounded-xl"
            disabled={isToday}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Active dates indicator */}
        {activeDates.length > 0 && (
          <div className="mt-3 flex items-center gap-2 justify-center">
            <span className="text-xs text-gray-400">Recente dagen met activiteit:</span>
            <div className="flex gap-1">
              {activeDates.slice(0, 7).map(d => {
                const isSelected = d === formatDate(selectedDate)
                const dateObj = new Date(d + 'T12:00:00')
                return (
                  <button
                    key={d}
                    onClick={() => setSelectedDate(dateObj)}
                    className={cn(
                      'px-2 py-1 rounded-lg text-xs font-medium transition-colors',
                      isSelected
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    {dateObj.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Leads', value: uniqueLeads, icon: User, color: 'text-gray-600', bg: 'bg-gray-50' },
          { label: 'Gebeld', value: totalCalls, icon: PhoneCall, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Voicemail', value: totalVoicemails, icon: PhoneMissed, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Emails', value: totalEmails, icon: Mail, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Meetings', value: totalMeetings, icon: Video, color: 'text-pink-600', bg: 'bg-pink-50' },
        ].map(stat => (
          <div key={stat.label} className={cn('rounded-2xl border border-gray-100 p-4', stat.bg)}>
            <div className="flex items-center gap-2">
              <stat.icon className={cn('h-4 w-4', stat.color)} />
              <span className="text-xs font-medium text-gray-500">{stat.label}</span>
            </div>
            <p className={cn('text-2xl font-bold mt-1', stat.color)}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { key: 'all', label: 'Alles' },
          { key: 'call', label: 'Gebeld' },
          { key: 'voicemail', label: 'Voicemail' },
          { key: 'email', label: 'Email' },
          { key: 'meeting', label: 'Meeting' },
          { key: 'note', label: 'Notities' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilterType(tab.key)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors',
              filterType === tab.key
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Call log entries */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">Laden...</span>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Phone className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-700">Geen activiteiten op deze dag</h3>
          <p className="text-sm text-gray-500 mt-1">
            Gebruik de Sales Pipeline om leads te bellen en activiteiten te loggen.
          </p>
          <Link href="/sales">
            <Button className="mt-4 rounded-xl">Naar Sales Pipeline</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map(entry => (
            <div
              key={entry.lead.id}
              className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow"
            >
              {/* Lead header */}
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-5 w-5 text-gray-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/sales`}
                        className="text-base font-semibold text-gray-900 hover:underline"
                      >
                        {entry.lead.company_name}
                      </Link>
                      {(() => {
                        const statusStyle = statusColorMap[entry.lead.status] || statusColorMap.cold
                        return (
                          <Badge className={cn('text-xs font-medium', statusStyle.bg, statusStyle.text)}>
                            <span className={cn('w-1.5 h-1.5 rounded-full mr-1.5', statusStyle.dot)} />
                            {entry.lead.status}
                          </Badge>
                        )
                      })()}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                      {entry.lead.contact_name && (
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          {entry.lead.contact_name}
                        </span>
                      )}
                      {entry.lead.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {entry.lead.city}
                        </span>
                      )}
                      {entry.lead.phone && (
                        <a href={`tel:${entry.lead.phone}`} className="flex items-center gap-1 hover:text-gray-700">
                          <Phone className="h-3.5 w-3.5" />
                          {entry.lead.phone}
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="flex items-center gap-2">
                  {entry.lead.phone && (
                    <a href={`tel:${entry.lead.phone}`}>
                      <Button variant="outline" size="sm" className="rounded-lg gap-1.5">
                        <Phone className="h-3.5 w-3.5" />
                        Bellen
                      </Button>
                    </a>
                  )}
                  {entry.lead.email && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg gap-1.5"
                      onClick={() => openEmailModal(entry.lead)}
                    >
                      <Mail className="h-3.5 w-3.5" />
                      Mailen
                    </Button>
                  )}
                  <Link href="/sales">
                    <Button variant="ghost" size="sm" className="rounded-lg gap-1.5 text-gray-500">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Pipeline
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Activities timeline */}
              <div className="mt-4 ml-[52px] space-y-2">
                {entry.activities.map(activity => {
                  const config = activityConfig[activity.type] || activityConfig.note
                  const Icon = config.icon
                  return (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', config.bg)}>
                        <Icon className={cn('h-3.5 w-3.5', config.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn('text-xs font-medium', config.color)}>{config.label}</span>
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(activity.created_at)}
                          </span>
                        </div>
                        {activity.summary && (
                          <p className="text-sm text-gray-700 mt-0.5">{activity.summary}</p>
                        )}
                        {activity.notes && (
                          <p className="text-xs text-gray-500 mt-0.5 italic">{activity.notes}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Email Modal */}
      {emailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-900">Email versturen</h3>
                <p className="text-sm text-gray-500">
                  Naar {emailModal.lead.contact_name || emailModal.lead.company_name} ({emailModal.lead.email})
                </p>
              </div>
              <button onClick={() => setEmailModal(null)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-5 space-y-4">
              {emailSent ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                    <Check className="h-6 w-6 text-emerald-600" />
                  </div>
                  <p className="font-semibold text-gray-900">Email verstuurd!</p>
                  <p className="text-sm text-gray-500 mt-1">De activiteit is automatisch gelogd.</p>
                </div>
              ) : (
                <>
                  {emailError && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-sm">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      {emailError}
                    </div>
                  )}

                  {/* Template selector */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <FileDown className="h-3.5 w-3.5 inline mr-1" />
                      Follow-up template
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {followUpTemplates.map(t => (
                        <button
                          key={t.id}
                          onClick={() => applyTemplate(t.id)}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
                            selectedTemplate === t.id
                              ? 'bg-gray-900 text-white border-gray-900'
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                          )}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Onderwerp</label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={e => setEmailSubject(e.target.value)}
                      placeholder="Onderwerp van de email..."
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bericht</label>
                    <textarea
                      value={emailMessage}
                      onChange={e => setEmailMessage(e.target.value)}
                      placeholder="Schrijf je bericht..."
                      rows={6}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 resize-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setEmailModal(null)} className="rounded-xl">
                      Annuleren
                    </Button>
                    <Button
                      onClick={sendEmail}
                      disabled={sendingEmail || !emailSubject || !emailMessage}
                      className="rounded-xl gap-2"
                    >
                      {sendingEmail ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Versturen
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
