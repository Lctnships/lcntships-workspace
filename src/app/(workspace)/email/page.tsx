'use client'

import { useState, useRef, useCallback } from 'react'
import Papa from 'papaparse'
import {
  Mail,
  Upload,
  FileSpreadsheet,
  X,
  Check,
  AlertCircle,
  Loader2,
  Send,
  Eye,
  Play,
  Pause,
  RotateCcw,
  Download,
  Sparkles,
  ChevronRight,
  Users,
  TestTube,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// Types
interface Lead {
  email: string
  naam: string
  studio: string
  stad: string
  [key: string]: string
}

interface SendResult {
  email: string
  status: 'pending' | 'sent' | 'failed'
  error?: string
  id?: string
  timestamp?: string
}

// Default template
const DEFAULT_TEMPLATE = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <p style="font-size: 16px; color: #1a1a1a;">Hey {naam},</p>

  <p style="font-size: 16px; color: #333; line-height: 1.6;">
    Snelle vraag: als je gratis een professionele video, foto's en een eigen boekingspagina voor <strong>{studio}</strong> kon krijgen — zou je dat willen?
  </p>

  <p style="font-size: 16px; color: #333; line-height: 1.6;">
    Wij doen dit voor creatieve studio's in Nederland. Geen kosten, geen verplichtingen.
  </p>

  <p style="font-size: 16px; margin-top: 24px;">
    <a href="https://wa.me/31612345678?text=Hey%20Rivaldo%2C%20vertel%20me%20meer%20over%20lcntships"
       style="display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
      Stuur me een berichtje →
    </a>
  </p>

  <p style="font-size: 14px; color: #666; margin-top: 32px; border-top: 1px solid #eee; padding-top: 16px;">
    Rivaldo<br/>
    <a href="https://lcntships.com" style="color: #4F46E5;">lcntships.com</a>
  </p>
</div>`

const DEFAULT_SUBJECT = 'Vraagje over {studio}'

// Steps
const STEPS = [
  { id: 1, label: 'Upload CSV', icon: Upload },
  { id: 2, label: 'Template', icon: Mail },
  { id: 3, label: 'Preview & Test', icon: Eye },
  { id: 4, label: 'Versturen', icon: Send },
]

function personalise(text: string, lead: Lead): string {
  let result = text
  for (const [key, value] of Object.entries(lead)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value || '')
  }
  return result
}

export default function EmailPage() {
  // Step management
  const [currentStep, setCurrentStep] = useState(1)

  // Step 1: CSV Upload
  const [leads, setLeads] = useState<Lead[]>([])
  const [csvError, setCsvError] = useState<string | null>(null)
  const [csvFileName, setCsvFileName] = useState<string>('')
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Step 2: Template
  const [subject, setSubject] = useState(DEFAULT_SUBJECT)
  const [htmlTemplate, setHtmlTemplate] = useState(DEFAULT_TEMPLATE)

  // Step 3: Test
  const [testEmail, setTestEmail] = useState('')
  const [testSending, setTestSending] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)

  // Step 4: Sending
  const [sending, setSending] = useState(false)
  const [paused, setPaused] = useState(false)
  const [results, setResults] = useState<SendResult[]>([])
  const [showConfirm, setShowConfirm] = useState(false)
  const pausedRef = useRef(false)
  const abortRef = useRef(false)

  // CSV parsing
  const handleCSVFile = useCallback((file: File) => {
    setCsvError(null)
    setCsvFileName(file.name)

    if (!file.name.endsWith('.csv')) {
      setCsvError('Alleen CSV bestanden zijn toegestaan')
      return
    }

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        if (result.errors.length > 0) {
          setCsvError(`CSV parsing error: ${result.errors[0].message}`)
          return
        }

        const headers = result.meta.fields || []

        // Map common column names
        const columnMap: Record<string, string> = {}
        for (const h of headers) {
          const lower = h.toLowerCase().trim()
          if (['email', 'e-mail', 'mail', 'emailaddress', 'email address'].includes(lower)) columnMap[h] = 'email'
          else if (['naam', 'name', 'contact', 'contact_name', 'contactpersoon', 'first name'].includes(lower)) columnMap[h] = 'naam'
          else if (['studio', 'company', 'company_name', 'bedrijf', 'bedrijfsnaam', 'company name'].includes(lower)) columnMap[h] = 'studio'
          else if (['stad', 'city', 'plaats', 'company city'].includes(lower)) columnMap[h] = 'stad'
          else columnMap[h] = lower.replace(/\s+/g, '_')
        }

        // Check for first name + last name combo
        const firstNameCol = headers.find(h => h.toLowerCase().trim() === 'first name')
        const lastNameCol = headers.find(h => h.toLowerCase().trim() === 'last name')

        const parsed: Lead[] = []
        const seen = new Set<string>()

        for (const row of result.data) {
          const mapped: Record<string, string> = {}
          for (const [original, target] of Object.entries(columnMap)) {
            if (row[original]) mapped[target] = row[original].trim()
          }

          // Combine first + last name
          if (firstNameCol && lastNameCol && !mapped.naam) {
            const first = row[firstNameCol]?.trim() || ''
            const last = row[lastNameCol]?.trim() || ''
            if (first || last) mapped.naam = `${first} ${last}`.trim()
          }

          if (!mapped.email) continue

          // Duplicate check
          const emailLower = mapped.email.toLowerCase()
          if (seen.has(emailLower)) continue
          seen.add(emailLower)

          parsed.push(mapped as Lead)
        }

        if (parsed.length === 0) {
          setCsvError('Geen geldige leads gevonden (email kolom vereist)')
          return
        }

        setLeads(parsed)
      },
      error: (err) => {
        setCsvError(`Kon het bestand niet lezen: ${err.message}`)
      },
    })
  }, [])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    if (e.dataTransfer.files[0]) handleCSVFile(e.dataTransfer.files[0])
  }

  // Test send
  const handleTestSend = async () => {
    if (!testEmail) return
    setTestSending(true)
    setTestResult(null)

    const sampleLead = leads[0] || { email: testEmail, naam: 'Test Gebruiker', studio: 'Test Studio', stad: 'Amsterdam' }

    try {
      const res = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testEmail,
          subject: personalise(subject, sampleLead),
          html: personalise(htmlTemplate, sampleLead),
        }),
      })

      if (res.ok) {
        setTestResult('success')
      } else {
        setTestResult('error')
      }
    } catch {
      setTestResult('error')
    } finally {
      setTestSending(false)
    }
  }

  // Bulk send
  const startBulkSend = async () => {
    setShowConfirm(false)
    setSending(true)
    setPaused(false)
    pausedRef.current = false
    abortRef.current = false

    // Initialize results
    const initialResults: SendResult[] = leads.map(l => ({
      email: l.email,
      status: 'pending',
    }))
    setResults(initialResults)

    const BATCH_SIZE = 10
    const DELAY_MS = 1100 // 1.1 seconds between batches

    for (let i = 0; i < leads.length; i += BATCH_SIZE) {
      // Check abort
      if (abortRef.current) break

      // Check pause
      while (pausedRef.current) {
        await new Promise(r => setTimeout(r, 500))
        if (abortRef.current) break
      }
      if (abortRef.current) break

      const batch = leads.slice(i, i + BATCH_SIZE)

      try {
        const res = await fetch('/api/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leads: batch,
            subject,
            htmlTemplate,
            batchIndex: Math.floor(i / BATCH_SIZE),
          }),
        })

        const data = await res.json()

        if (data.results) {
          setResults(prev => {
            const updated = [...prev]
            for (const r of data.results) {
              const idx = updated.findIndex(u => u.email === r.email)
              if (idx !== -1) {
                updated[idx] = {
                  ...updated[idx],
                  status: r.status,
                  error: r.error,
                  id: r.id,
                  timestamp: new Date().toISOString(),
                }
              }
            }
            return updated
          })
        }
      } catch {
        // Mark batch as failed
        setResults(prev => {
          const updated = [...prev]
          for (const lead of batch) {
            const idx = updated.findIndex(u => u.email === lead.email)
            if (idx !== -1) {
              updated[idx] = { ...updated[idx], status: 'failed', error: 'Network error' }
            }
          }
          return updated
        })
      }

      // Rate limit delay between batches
      if (i + BATCH_SIZE < leads.length && !abortRef.current) {
        await new Promise(r => setTimeout(r, DELAY_MS))
      }
    }

    setSending(false)
  }

  const togglePause = () => {
    pausedRef.current = !pausedRef.current
    setPaused(pausedRef.current)
  }

  const stopSending = () => {
    abortRef.current = true
    pausedRef.current = false
    setPaused(false)
  }

  // Retry failed
  const retryFailed = async () => {
    const failedLeads = results
      .filter(r => r.status === 'failed')
      .map(r => leads.find(l => l.email === r.email))
      .filter(Boolean) as Lead[]

    if (failedLeads.length === 0) return

    // Reset failed to pending
    setResults(prev => prev.map(r => r.status === 'failed' ? { ...r, status: 'pending' as const } : r))

    setSending(true)
    pausedRef.current = false
    abortRef.current = false

    const BATCH_SIZE = 10
    const DELAY_MS = 1100

    for (let i = 0; i < failedLeads.length; i += BATCH_SIZE) {
      if (abortRef.current) break

      const batch = failedLeads.slice(i, i + BATCH_SIZE)

      try {
        const res = await fetch('/api/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leads: batch, subject, htmlTemplate, batchIndex: i }),
        })

        const data = await res.json()

        if (data.results) {
          setResults(prev => {
            const updated = [...prev]
            for (const r of data.results) {
              const idx = updated.findIndex(u => u.email === r.email)
              if (idx !== -1) {
                updated[idx] = { ...updated[idx], status: r.status, error: r.error, id: r.id, timestamp: new Date().toISOString() }
              }
            }
            return updated
          })
        }
      } catch {
        // keep them as failed
      }

      if (i + BATCH_SIZE < failedLeads.length) {
        await new Promise(r => setTimeout(r, DELAY_MS))
      }
    }

    setSending(false)
  }

  // Export results as CSV
  const exportResults = () => {
    const csv = [
      'email,status,error,timestamp',
      ...results.map(r => `"${r.email}","${r.status}","${r.error || ''}","${r.timestamp || ''}"`)
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `email-resultaten-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Stats
  const sentCount = results.filter(r => r.status === 'sent').length
  const failedCount = results.filter(r => r.status === 'failed').length
  const pendingCount = results.filter(r => r.status === 'pending').length
  const progressPercent = results.length > 0 ? ((sentCount + failedCount) / results.length) * 100 : 0
  const isDone = results.length > 0 && pendingCount === 0 && !sending

  // Duplicate count from leads
  const duplicateInfo = leads.length > 0 ? `${leads.length} unieke emails` : ''

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Campagne</h1>
          <p className="text-gray-500 mt-1">Verstuur bulk emails naar je leads met Resend</p>
        </div>
        {leads.length > 0 && currentStep < 4 && (
          <Badge className="bg-indigo-100 text-indigo-700 text-sm">
            <Users className="h-3.5 w-3.5 mr-1.5" />
            {leads.length} leads geladen
          </Badge>
        )}
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((step, i) => {
          const Icon = step.icon
          const isActive = currentStep === step.id
          const isCompleted = currentStep > step.id
          return (
            <div key={step.id} className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (sending) return
                  if (step.id <= currentStep || (step.id === 2 && leads.length > 0)) {
                    setCurrentStep(step.id)
                  }
                }}
                disabled={sending}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                  isActive && 'bg-indigo-600 text-white shadow-md',
                  isCompleted && !isActive && 'bg-indigo-100 text-indigo-700 cursor-pointer',
                  !isActive && !isCompleted && 'bg-gray-100 text-gray-400',
                  sending && 'cursor-not-allowed opacity-60'
                )}
              >
                {isCompleted && !isActive ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">{step.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <ChevronRight className={cn('h-4 w-4', isCompleted ? 'text-indigo-400' : 'text-gray-300')} />
              )}
            </div>
          )
        })}
      </div>

      {/* Step 1: CSV Upload */}
      {currentStep === 1 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-200/50">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">CSV Upload</h2>
            <p className="text-sm text-gray-500 mt-1">
              Upload een CSV met kolommen: email, naam, studio, stad (en extra velden)
            </p>
          </div>

          <div className="p-6">
            {leads.length === 0 ? (
              <>
                <div
                  className={cn(
                    'border-2 border-dashed rounded-2xl p-12 text-center transition-colors',
                    dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                  )}
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2 text-lg">
                    Sleep je CSV bestand hierheen of{' '}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-indigo-600 font-semibold hover:underline"
                    >
                      blader
                    </button>
                  </p>
                  <p className="text-sm text-gray-400">
                    Ondersteunt Apollo exports, standaard CSV, en custom formaten
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleCSVFile(e.target.files[0])}
                  />
                </div>

                {csvError && (
                  <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl text-red-700 mt-4">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <p>{csvError}</p>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* File info */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-50">
                      <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <span className="font-medium text-gray-900">{csvFileName}</span>
                      <p className="text-sm text-gray-500">{duplicateInfo} (duplicaten verwijderd)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-100 text-emerald-700">
                      <Check className="h-3 w-3 mr-1" />
                      {leads.length} leads
                    </Badge>
                    <button
                      onClick={() => { setLeads([]); setCsvFileName(''); setCsvError(null) }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="h-4 w-4 text-gray-400" />
                    </button>
                  </div>
                </div>

                {/* Available fields */}
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-600 mb-2">Beschikbare velden voor personalisatie:</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(leads[0] || {}).map(key => (
                      <Badge key={key} className="bg-purple-100 text-purple-700 font-mono text-xs">
                        {`{${key}}`}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Preview table */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="max-h-80 overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left p-3 font-medium text-gray-600">#</th>
                          <th className="text-left p-3 font-medium text-gray-600">Email</th>
                          <th className="text-left p-3 font-medium text-gray-600">Naam</th>
                          <th className="text-left p-3 font-medium text-gray-600">Studio</th>
                          <th className="text-left p-3 font-medium text-gray-600">Stad</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {leads.slice(0, 20).map((lead, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="p-3 text-gray-400">{i + 1}</td>
                            <td className="p-3 text-gray-900">{lead.email}</td>
                            <td className="p-3 text-gray-600">{lead.naam || '-'}</td>
                            <td className="p-3 text-gray-600">{lead.studio || '-'}</td>
                            <td className="p-3 text-gray-600">{lead.stad || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {leads.length > 20 && (
                    <div className="p-3 bg-gray-50 text-center text-sm text-gray-500">
                      ... en {leads.length - 20} meer
                    </div>
                  )}
                </div>

                <div className="flex justify-end mt-6">
                  <Button onClick={() => setCurrentStep(2)} className="gap-2">
                    Volgende: Template
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Template Editor */}
      {currentStep === 2 && (
        <div className="grid grid-cols-2 gap-6">
          {/* Editor */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-200/50">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Email Template</h2>
              <p className="text-sm text-gray-500 mt-1">Schrijf je email met personalisatie variabelen</p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Onderwerp
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Bijv. Vraagje over {studio}"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  HTML Body
                </label>
                <textarea
                  value={htmlTemplate}
                  onChange={(e) => setHtmlTemplate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm resize-none"
                  rows={18}
                />
              </div>

              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Beschikbare variabelen:</p>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(leads[0] || { naam: '', studio: '', stad: '', email: '' }).map(key => (
                    <button
                      key={key}
                      onClick={() => {
                        const tag = `{${key}}`
                        setHtmlTemplate(prev => prev + tag)
                      }}
                      className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-mono hover:bg-purple-200 transition-colors"
                    >
                      {`{${key}}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-200/50">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Preview</h2>
                <Badge className="bg-purple-100 text-purple-700">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Lead #{1}
                </Badge>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Zo ziet de email eruit voor de eerste lead
              </p>
            </div>

            <div className="p-6">
              {/* Subject preview */}
              <div className="mb-4 p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">Onderwerp:</p>
                <p className="font-medium text-gray-900">
                  {personalise(subject, leads[0] || { email: 'test@example.com', naam: 'Jan Jansen', studio: 'Studio Amsterdam', stad: 'Amsterdam' })}
                </p>
              </div>

              {/* From */}
              <div className="mb-4 p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">Van:</p>
                <p className="font-medium text-gray-900">Rivaldo &lt;rivaldo@lcntships.com&gt;</p>
              </div>

              {/* HTML preview */}
              <div className="border border-gray-200 rounded-xl p-4 overflow-auto max-h-[400px]">
                <div
                  dangerouslySetInnerHTML={{
                    __html: personalise(
                      htmlTemplate,
                      leads[0] || { email: 'test@example.com', naam: 'Jan Jansen', studio: 'Studio Amsterdam', stad: 'Amsterdam' }
                    ),
                  }}
                />
              </div>
            </div>

            <div className="p-6 pt-0 flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                Terug
              </Button>
              <Button onClick={() => setCurrentStep(3)} className="gap-2">
                Volgende: Preview & Test
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Preview & Test */}
      {currentStep === 3 && (
        <div className="space-y-6">
          {/* Test send */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-200/50 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-amber-50">
                <TestTube className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Test Email Versturen</h2>
                <p className="text-sm text-gray-500">Stuur eerst een test naar je eigen email</p>
              </div>
            </div>

            <div className="flex gap-3">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => { setTestEmail(e.target.value); setTestResult(null) }}
                placeholder="jouw@email.com"
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <Button
                onClick={handleTestSend}
                disabled={testSending || !testEmail}
                variant="outline"
                className="gap-2"
              >
                {testSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Test Versturen
              </Button>
            </div>

            {testResult === 'success' && (
              <div className="flex items-center gap-2 mt-3 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm">Test email succesvol verstuurd!</span>
              </div>
            )}
            {testResult === 'error' && (
              <div className="flex items-center gap-2 mt-3 text-red-600">
                <XCircle className="h-4 w-4" />
                <span className="text-sm">Test email mislukt. Check je RESEND_API_KEY.</span>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-200/50 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Campagne Samenvatting</h2>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500">Ontvangers</p>
                <p className="text-2xl font-bold text-gray-900">{leads.length}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500">Onderwerp</p>
                <p className="text-sm font-medium text-gray-900 truncate">{subject}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500">Geschatte duur</p>
                <p className="text-2xl font-bold text-gray-900">
                  ~{Math.ceil(leads.length / 10 * 1.1)}s
                </p>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(2)}>
                Terug
              </Button>
              <Button
                onClick={() => setShowConfirm(true)}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                <Send className="h-4 w-4" />
                Start Campagne
              </Button>
            </div>
          </div>

          {/* Confirmation modal */}
          {showConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/50" onClick={() => setShowConfirm(false)} />
              <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md m-4 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-full bg-amber-100">
                    <AlertTriangle className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Bevestig Verzending</h3>
                    <p className="text-sm text-gray-500">Dit kan niet ongedaan worden gemaakt</p>
                  </div>
                </div>

                <div className="p-4 bg-amber-50 rounded-xl mb-6">
                  <p className="text-amber-800">
                    Je staat op het punt <strong>{leads.length} emails</strong> te versturen
                    vanuit <strong>rivaldo@lcntships.com</strong>.
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowConfirm(false)}
                    className="flex-1"
                  >
                    Annuleren
                  </Button>
                  <Button
                    onClick={() => { startBulkSend(); setCurrentStep(4) }}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 gap-2"
                  >
                    <Send className="h-4 w-4" />
                    Ja, Verstuur
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Sending & Results */}
      {currentStep === 4 && (
        <div className="space-y-6">
          {/* Progress */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-200/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {isDone ? 'Campagne Voltooid' : sending ? (paused ? 'Gepauzeerd' : 'Versturen...') : 'Klaar om te starten'}
              </h2>
              {sending && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={togglePause} className="gap-2">
                    {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                    {paused ? 'Hervatten' : 'Pauzeren'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={stopSending} className="gap-2 text-red-600 hover:bg-red-50">
                    <X className="h-4 w-4" />
                    Stop
                  </Button>
                </div>
              )}
            </div>

            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Verzonden: {sentCount + failedCount} / {results.length}</span>
                <span>{Math.round(progressPercent)}%</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-300',
                    isDone && failedCount === 0 ? 'bg-emerald-500' : 'bg-indigo-500'
                  )}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-emerald-50 rounded-xl text-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-emerald-700">{sentCount}</p>
                <p className="text-xs text-emerald-600">Verstuurd</p>
              </div>
              <div className="p-4 bg-red-50 rounded-xl text-center">
                <XCircle className="h-5 w-5 text-red-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-red-700">{failedCount}</p>
                <p className="text-xs text-red-600">Mislukt</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl text-center">
                <Loader2 className={cn('h-5 w-5 text-gray-400 mx-auto mb-1', sending && !paused && 'animate-spin')} />
                <p className="text-2xl font-bold text-gray-700">{pendingCount}</p>
                <p className="text-xs text-gray-500">Wachtend</p>
              </div>
            </div>

            {/* Actions when done */}
            {isDone && (
              <div className="flex gap-3 mt-6 pt-6 border-t border-gray-100">
                {failedCount > 0 && (
                  <Button variant="outline" onClick={retryFailed} className="gap-2">
                    <RotateCcw className="h-4 w-4" />
                    {failedCount} Opnieuw Proberen
                  </Button>
                )}
                <Button variant="outline" onClick={exportResults} className="gap-2">
                  <Download className="h-4 w-4" />
                  Export Resultaten (CSV)
                </Button>
                <Button
                  onClick={() => {
                    setCurrentStep(1)
                    setLeads([])
                    setResults([])
                    setCsvFileName('')
                    setSubject(DEFAULT_SUBJECT)
                    setHtmlTemplate(DEFAULT_TEMPLATE)
                  }}
                  className="gap-2 ml-auto"
                >
                  <Mail className="h-4 w-4" />
                  Nieuwe Campagne
                </Button>
              </div>
            )}
          </div>

          {/* Detailed results */}
          {results.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-200/50">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Verzend Log</h2>
              </div>
              <div className="max-h-96 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left p-3 font-medium text-gray-600">#</th>
                      <th className="text-left p-3 font-medium text-gray-600">Email</th>
                      <th className="text-left p-3 font-medium text-gray-600">Status</th>
                      <th className="text-left p-3 font-medium text-gray-600">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {results.map((result, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="p-3 text-gray-400">{i + 1}</td>
                        <td className="p-3 text-gray-900">{result.email}</td>
                        <td className="p-3">
                          {result.status === 'sent' && (
                            <Badge className="bg-emerald-100 text-emerald-700">
                              <Check className="h-3 w-3 mr-1" />
                              Verstuurd
                            </Badge>
                          )}
                          {result.status === 'failed' && (
                            <Badge className="bg-red-100 text-red-700">
                              <X className="h-3 w-3 mr-1" />
                              Mislukt
                            </Badge>
                          )}
                          {result.status === 'pending' && (
                            <Badge className="bg-gray-100 text-gray-600">
                              <Loader2 className={cn('h-3 w-3 mr-1', sending && !paused && 'animate-spin')} />
                              Wachtend
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 text-gray-500 text-xs">
                          {result.error || result.id || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
