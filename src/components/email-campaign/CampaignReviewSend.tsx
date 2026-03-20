'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Users,
  Mail,
  CheckCircle,
  X,
  ChevronRight,
  FileText,
  Image,
  File,
  Sparkles,
  Star,
  Heart,
  Send,
  Loader2,
  ArrowLeft,
  Eye,
  AlertCircle,
  Upload,
  Trash2,
  Globe,
  Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { supabase, type SalesLead } from '@/lib/supabase'

interface CampaignReviewSendProps {
  selectedLeads: SalesLead[]
  emailData: { subject: string; body: string }
  onBack: () => void
  onSend: () => void
  onSaveDraft: () => void
}

interface UploadedAttachment {
  id: string
  name: string
  size: number
  type: string
  content: string // base64 data URL
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return Image
  if (type === 'application/pdf') return FileText
  return File
}

export function CampaignReviewSend({
  selectedLeads,
  emailData,
  onBack,
  onSend,
  onSaveDraft
}: CampaignReviewSendProps) {
  const [confirmed, setConfirmed] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [showContent, setShowContent] = useState(false)
  const [sendProgress, setSendProgress] = useState({ current: 0, total: 0 })
  const [sendResults, setSendResults] = useState<{ success: number; failed: number } | null>(null)
  const [failedLeads, setFailedLeads] = useState<typeof selectedLeads>([])
  const [error, setError] = useState<string | null>(null)
  const [senderEmail, setSenderEmail] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('campaign_sender_email') || ''
    return ''
  })
  const [senderName, setSenderName] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('campaign_sender_name') || ''
    return ''
  })
  const [userId, setUserId] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<UploadedAttachment[]>([])
  const [websiteUrl, setWebsiteUrl] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('campaign_website_url') || 'https://lcntships.com'
    return 'https://lcntships.com'
  })
  const [calendlyUrl, setCalendlyUrl] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('campaign_calendly_url') || 'https://calendly.com/rivaldorose/30min'
    return 'https://calendly.com/rivaldorose/30min'
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Save settings to localStorage when they change
  useEffect(() => {
    if (senderEmail) localStorage.setItem('campaign_sender_email', senderEmail)
  }, [senderEmail])
  useEffect(() => {
    if (senderName) localStorage.setItem('campaign_sender_name', senderName)
  }, [senderName])
  useEffect(() => {
    if (websiteUrl) localStorage.setItem('campaign_website_url', websiteUrl)
  }, [websiteUrl])
  useEffect(() => {
    if (calendlyUrl) localStorage.setItem('campaign_calendly_url', calendlyUrl)
  }, [calendlyUrl])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null)
    })
  }, [])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach(file => {
      if (file.size > 10 * 1024 * 1024) {
        setError(`${file.name} is te groot (max 10MB)`)
        return
      }

      const reader = new FileReader()
      reader.onload = () => {
        setAttachments(prev => [...prev, {
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          type: file.type,
          content: reader.result as string,
        }])
      }
      reader.readAsDataURL(file)
    })

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id))
  }

  const handleSend = async () => {
    if (!confirmed) return
    if (!senderEmail) {
      setError('Vul je afzender email in')
      return
    }
    await sendToLeads(selectedLeads)
  }

  const sendToLeads = async (leadsToSend: typeof selectedLeads) => {
    setIsSending(true)
    setError(null)
    setSendResults(null)
    setFailedLeads([])
    setSendProgress({ current: 0, total: leadsToSend.length })

    let success = 0
    let failed = 0
    const newFailedLeads: typeof selectedLeads = []

    const DELAY_MS = 600 // Resend rate limit: max 2 req/sec

    const apiAttachments = attachments.map(att => ({
      name: att.name,
      url: att.content,
      type: att.type,
    }))

    for (let i = 0; i < leadsToSend.length; i++) {
      const lead = leadsToSend[i]

      try {
        const renderResponse = await fetch('/api/email/preview-render', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contactName: lead.contact_name || '',
            companyName: lead.company_name,
            message: emailData.body,
            senderName,
            senderEmail,
            primaryButtonText: 'Plan een gesprek',
            primaryButtonUrl: calendlyUrl,
            secondaryButtonText: 'Bekijk onze website',
            secondaryButtonUrl: websiteUrl,
            attachments: attachments.map(a => ({ name: a.name, size: a.size })),
          }),
        })

        if (!renderResponse.ok) {
          throw new Error('Failed to render email')
        }

        const { html } = await renderResponse.json()

        const response = await fetch('/api/email/bulk-send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: lead.email,
            subject: emailData.subject,
            html,
            text: emailData.body.replace(/<[^>]*>/g, ''),
            from: `${senderName || 'LCTNSHIPS'} <${senderEmail}>`,
            leadId: lead.id,
            userId,
            attachments: apiAttachments,
          }),
        })

        if (response.ok) {
          success++
        } else {
          failed++
          newFailedLeads.push(lead)
        }
      } catch (err) {
        console.error('Error sending to', lead.email, err)
        failed++
        newFailedLeads.push(lead)
      }

      setSendProgress({ current: i + 1, total: leadsToSend.length })

      if (i < leadsToSend.length - 1) {
        await new Promise(r => setTimeout(r, DELAY_MS))
      }
    }

    setSendResults({ success, failed })
    setFailedLeads(newFailedLeads)
    setIsSending(false)

    if (failed === 0) {
      setTimeout(() => {
        onSend()
      }, 1500)
    }
  }

  const retryFailed = () => {
    if (failedLeads.length > 0) {
      sendToLeads(failedLeads)
    }
  }

  const stripHtml = (html: string) => {
    const tmp = document.createElement('div')
    tmp.innerHTML = html
    return tmp.textContent || tmp.innerText || ''
  }

  const previewText = stripHtml(emailData.body).slice(0, 150) + '...'

  return (
    <div className="flex flex-col h-full max-h-[900px] w-full max-w-[1100px] bg-white rounded-[32px] border border-gray-200 shadow-2xl overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col w-full">
          {/* Top Navigation Bar */}
          <header className="flex items-center justify-between whitespace-nowrap border-b border-gray-200 px-6 py-4 sticky top-0 bg-white z-10">
            <div className="flex items-center gap-4">
              <div className="size-8 text-gray-900">
                <Mail className="h-8 w-8" />
              </div>
              <h2 className="text-gray-900 text-lg font-bold leading-tight tracking-tight">Email Campagne</h2>
            </div>
            <div className="flex flex-1 justify-end gap-6 items-center">
              <div className="hidden md:flex items-center gap-6">
                <button
                  onClick={onSaveDraft}
                  className="text-gray-600 text-sm font-medium hover:text-gray-900 transition-colors"
                >
                  Concepten
                </button>
                <button className="text-gray-600 text-sm font-medium hover:text-gray-900 transition-colors">
                  Instellingen
                </button>
              </div>
              <button
                onClick={onSaveDraft}
                className="flex cursor-pointer items-center justify-center rounded-full h-10 w-10 bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </header>

          <main className="flex flex-col bg-white p-6 md:p-10">
            {/* Stepper Breadcrumbs */}
            <div className="flex flex-wrap items-center gap-2 mb-8 text-sm md:text-base">
              <button onClick={onBack} className="text-gray-900 font-medium hover:underline">
                Ontvangers
              </button>
              <ChevronRight className="text-gray-400 text-sm" />
              <button onClick={onBack} className="text-gray-900 font-medium hover:underline">
                Schrijf Email
              </button>
              <ChevronRight className="text-gray-400 text-sm" />
              <span className="text-gray-900 font-bold">Stap 3: Finale Review</span>
            </div>

            {/* Header Section */}
            <div className="flex flex-col gap-2 mb-8 relative">
              <div className="absolute -top-4 -right-4 opacity-20 pointer-events-none">
                <Sparkles className="text-gray-900 h-10 w-10 transform rotate-12" />
              </div>
              <div className="absolute top-10 -left-6 opacity-20 pointer-events-none">
                <Star className="text-gray-900 h-6 w-6 transform -rotate-12" />
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-gray-900/10 p-2 rounded-lg">
                  <CheckCircle className="text-gray-900 h-6 w-6" />
                </div>
                <h1 className="text-gray-900 text-3xl font-bold tracking-tight">Finale Review & Versturen</h1>
              </div>
              <p className="text-gray-500 max-w-lg">
                Laatste check! Zorg ervoor dat alles er perfect uitziet voordat we je campagne versturen.
              </p>
            </div>

            {/* Sender Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="flex flex-col gap-3 rounded-xl p-6 border border-gray-200 bg-white">
                <div className="flex items-center gap-2 text-gray-500">
                  <Mail className="h-5 w-5" />
                  <p className="text-sm font-semibold uppercase tracking-wider">Afzender email</p>
                </div>
                <input
                  type="email"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:ring-2 focus:ring-gray-900 focus:outline-none"
                  placeholder="jouw@email.com"
                />
                <p className="text-xs text-gray-400">Moet geverifieerd zijn in Resend</p>
              </div>

              <div className="flex flex-col gap-3 rounded-xl p-6 border border-gray-200 bg-white">
                <div className="flex items-center gap-2 text-gray-500">
                  <Users className="h-5 w-5" />
                  <p className="text-sm font-semibold uppercase tracking-wider">Afzender naam</p>
                </div>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:ring-2 focus:ring-gray-900 focus:outline-none"
                  placeholder="Je naam"
                />
              </div>
            </div>

            {/* Link Buttons Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="flex flex-col gap-3 rounded-xl p-6 border border-gray-200 bg-white">
                <div className="flex items-center gap-2 text-gray-500">
                  <Globe className="h-5 w-5" />
                  <p className="text-sm font-semibold uppercase tracking-wider">Website knop</p>
                </div>
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:ring-2 focus:ring-gray-900 focus:outline-none"
                  placeholder="https://lcntships.com"
                />
                <p className="text-xs text-gray-400">Link voor &quot;Bekijk onze website&quot; knop</p>
              </div>

              <div className="flex flex-col gap-3 rounded-xl p-6 border border-gray-200 bg-white">
                <div className="flex items-center gap-2 text-gray-500">
                  <Calendar className="h-5 w-5" />
                  <p className="text-sm font-semibold uppercase tracking-wider">Calendly knop</p>
                </div>
                <input
                  type="url"
                  value={calendlyUrl}
                  onChange={(e) => setCalendlyUrl(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:ring-2 focus:ring-gray-900 focus:outline-none"
                  placeholder="https://calendly.com/rivaldorose/30min"
                />
                <p className="text-xs text-gray-400">Link voor &quot;Plan een gesprek&quot; knop</p>
              </div>
            </div>

            {/* Summary Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {/* Recipients Card */}
              <div className="flex flex-col gap-3 rounded-xl p-6 border border-gray-900/20 bg-gray-100/50">
                <div className="flex items-center gap-2 text-gray-900">
                  <Users className="h-5 w-5" />
                  <p className="text-sm font-semibold uppercase tracking-wider">Ontvangers</p>
                </div>
                <p className="text-gray-900 text-2xl font-bold">{selectedLeads.length} Leads Geselecteerd</p>
                <p className="text-gray-500 text-sm">Campagne via {senderEmail || 'nog geen email ingesteld'}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {selectedLeads.slice(0, 5).map(lead => (
                    <div
                      key={lead.id}
                      className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-900"
                      title={`${lead.contact_name} @ ${lead.company_name}`}
                    >
                      {lead.contact_name?.charAt(0).toUpperCase() || lead.company_name?.charAt(0).toUpperCase()}
                    </div>
                  ))}
                  {selectedLeads.length > 5 && (
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-500">
                      +{selectedLeads.length - 5}
                    </div>
                  )}
                </div>
              </div>

              {/* Subject Line Card */}
              <div className="flex flex-col gap-3 rounded-xl p-6 border border-gray-200 bg-white">
                <div className="flex items-center gap-2 text-gray-500">
                  <Mail className="h-5 w-5" />
                  <p className="text-sm font-semibold uppercase tracking-wider">Onderwerp</p>
                </div>
                <p className="text-gray-900 text-lg font-medium">{emailData.subject}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="text-xs">
                    ~{emailData.body.length} karakters
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    HTML opmaak
                  </Badge>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {/* Send Results */}
            {sendResults && (
              <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
                sendResults.failed === 0
                  ? 'bg-emerald-50 border border-emerald-200'
                  : 'bg-yellow-50 border border-yellow-200'
              }`}>
                <CheckCircle className={`h-5 w-5 flex-shrink-0 ${sendResults.failed === 0 ? 'text-emerald-500' : 'text-yellow-500'}`} />
                <div className="flex-1">
                  <p className={`font-medium ${sendResults.failed === 0 ? 'text-emerald-700' : 'text-yellow-700'}`}>
                    {sendResults.failed === 0
                      ? `Alle ${sendResults.success} emails succesvol verzonden!`
                      : `${sendResults.success} verzonden, ${sendResults.failed} mislukt`}
                  </p>
                </div>
                {failedLeads.length > 0 && !isSending && (
                  <button
                    onClick={retryFailed}
                    className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors flex-shrink-0"
                  >
                    Opnieuw versturen ({failedLeads.length})
                  </button>
                )}
              </div>
            )}

            {/* Progress Bar */}
            {isSending && (
              <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Verzenden...</span>
                  <span>{sendProgress.current} / {sendProgress.total}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gray-900 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${sendProgress.total > 0 ? (sendProgress.current / sendProgress.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}

            {/* Content Review */}
            <div className="flex flex-col gap-6 mb-8">
              {/* Collapsed Preview */}
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Eye className="text-gray-400 h-5 w-5" />
                    <span className="font-medium text-gray-900">Email Content Preview</span>
                  </div>
                  <button
                    onClick={() => setShowContent(!showContent)}
                    className="text-gray-900 text-sm font-semibold flex items-center gap-1 hover:underline"
                  >
                    {showContent ? 'Verbergen' : 'Bekijken'}
                    <ChevronRight className={cn("h-4 w-4 transition-transform", showContent && "rotate-90")} />
                  </button>
                </div>
                <div className="p-6 bg-white">
                  {showContent ? (
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: emailData.body }}
                    />
                  ) : (
                    <div className="space-y-3 opacity-60">
                      <div className="h-4 bg-gray-100 rounded w-3/4" />
                      <div className="h-4 bg-gray-100 rounded w-full" />
                      <div className="h-4 bg-gray-100 rounded w-5/6" />
                      <div className="h-24 bg-gray-50 rounded-lg flex items-center justify-center italic text-gray-400 text-sm">
                        {previewText}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Attachments - Real Upload */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                    Bijlagen ({attachments.length})
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.csv,.xlsx"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-2"
                    disabled={isSending}
                  >
                    <Upload className="h-4 w-4" />
                    Bijlage toevoegen
                  </Button>
                </div>
                {attachments.length > 0 ? (
                  <div className="flex flex-wrap gap-3">
                    {attachments.map(attachment => {
                      const Icon = getFileIcon(attachment.type)
                      return (
                        <div
                          key={attachment.id}
                          className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <Icon className="text-gray-900 h-5 w-5 shrink-0" />
                          <span className="text-sm font-medium text-gray-900">{attachment.name}</span>
                          <span className="text-xs text-gray-400">{formatFileSize(attachment.size)}</span>
                          <button
                            onClick={() => removeAttachment(attachment.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors ml-1"
                            disabled={isSending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-gray-900/50 transition-colors"
                  >
                    <Upload className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Klik om bestanden toe te voegen (PDF, afbeeldingen, documenten)</p>
                    <p className="text-xs text-gray-300 mt-1">Max 10MB per bestand</p>
                  </div>
                )}
              </div>

              {/* Send Schedule Info */}
              <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
                <div className="flex items-center gap-2 text-gray-600">
                  <Send className="h-4 w-4" />
                  <span className="text-sm font-medium">Direct versturen via Resend</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  De campagne wordt onmiddellijk verstuurd naar alle {selectedLeads.length} geselecteerde leads.
                </p>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <div className="flex flex-col items-center gap-6">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <Checkbox
                    checked={confirmed}
                    onCheckedChange={(checked) => setConfirmed(checked as boolean)}
                    disabled={isSending}
                    className="w-5 h-5 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                  />
                  <span className="text-gray-700 font-medium group-hover:text-gray-900 transition-colors">
                    Ik heb de inhoud en ontvangers gecontroleerd.
                  </span>
                </label>

                <div className="relative group">
                  <Button
                    onClick={handleSend}
                    disabled={!confirmed || isSending || !senderEmail}
                    size="lg"
                    className="gap-3 text-lg px-12 py-6 h-auto shadow-lg shadow-gray-900/30 hover:shadow-gray-900/50 transition-all hover:scale-[1.02] active:scale-95 disabled:hover:scale-100"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Campagne Versturen...
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5" />
                        Campagne Versturen
                      </>
                    )}
                  </Button>
                  {!isSending && confirmed && senderEmail && (
                    <>
                      <div className="absolute -top-6 -left-8 animate-bounce opacity-40">
                        <Star className="text-gray-900 h-5 w-5" />
                      </div>
                      <div className="absolute -bottom-6 -right-8 animate-bounce opacity-40" style={{ animationDelay: '0.5s' }}>
                        <Heart className="text-gray-900 h-5 w-5" />
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    onClick={onBack}
                    disabled={isSending}
                    className="gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Terug naar editor
                  </Button>
                  <button
                    onClick={onSaveDraft}
                    disabled={isSending}
                    className="text-gray-400 hover:text-gray-600 text-sm font-medium transition-colors"
                  >
                    Opslaan als concept
                  </button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
