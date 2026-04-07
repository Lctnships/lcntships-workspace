'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  Mail,
  Save,
  History,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link,
  Image,
  Plus,
  Monitor,
  Smartphone,
  Tablet,
  Send,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Code,
  Variable,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { type SalesLead } from '@/lib/supabase'

interface CampaignWriteEmailProps {
  selectedLeads: SalesLead[]
  onNext: (emailData: { subject: string; body: string }) => void
  onBack: () => void
  onSaveDraft: (data: { subject: string; body: string }) => void
}

const availableVariables = [
  'contact_name',
  'email',
  'company_name',
  'city',
  'status',
]

const fallbackSampleData: Record<string, string> = {
  contact_name: 'Jan',
  email: 'jan@voorbeeld.nl',
  company_name: 'Studio Voorbeeld',
  city: 'Amsterdam',
  status: 'Warm',
}

export function CampaignWriteEmail({ selectedLeads, onNext, onBack, onSaveDraft }: CampaignWriteEmailProps) {
  // Use the first selected lead for preview data, fallback to sample
  const previewLead = selectedLeads[0]
  const sampleData: Record<string, string> = {
    contact_name: previewLead?.contact_name?.split(' ')[0] || fallbackSampleData.contact_name,
    email: previewLead?.email || fallbackSampleData.email,
    company_name: previewLead?.company_name || fallbackSampleData.company_name,
    city: previewLead?.city || fallbackSampleData.city,
    status: previewLead?.status || fallbackSampleData.status,
  }

  function replaceVariables(text: string): string {
    let result = text
    availableVariables.forEach(variable => {
      const regex = new RegExp(`\\{\\{${variable}\\}\\}`, 'g')
      result = result.replace(regex, sampleData[variable] || `[${variable}]`)
    })
    return result
  }
  const [subject, setSubject] = useState('Samenwerking met {{company_name}}')
  const [body, setBody] = useState(`<p>Beste {{contact_name}},</p>

<p>Leuk kennis te maken! Ik ben van LCTNSHIPS, een marketplace waar we studenten verbinden met bedrijven voor afstudeerstages.</p>

<p>Ik zag dat {{company_name}} gevestigd is in {{city}}. We zijn momenteel op zoek naar samenwerkingspartners in de creatieve sector voor onze ambitieuze studenten.</p>

<p>Zijn jullie open voor een kort gesprek over hoe we elkaar kunnen versterken?</p>`)

  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile' | 'tablet'>('desktop')
  const [showVariables, setShowVariables] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [previewHtml, setPreviewHtml] = useState<string>('')
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch rendered email template for preview
  const fetchPreview = useCallback(async (messageBody: string) => {
    setIsLoadingPreview(true)
    try {
      const previewBody = replaceVariables(messageBody)
      const response = await fetch('/api/email/preview-render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactName: sampleData.contact_name,
          companyName: sampleData.company_name,
          message: previewBody,
          senderName: 'Rivaldo',
          senderEmail: 'rivaldomacandrew@lctnships.com',
          primaryButtonText: 'Plan een gesprek',
          primaryButtonUrl: 'https://calendly.com/rivaldorose/30min',
          secondaryButtonText: 'Bekijk onze website',
          secondaryButtonUrl: 'https://lcntships.com',
          attachments: [],
        }),
      })
      if (response.ok) {
        const { html } = await response.json()
        setPreviewHtml(html)
      }
    } catch (err) {
      console.error('Preview render error:', err)
    } finally {
      setIsLoadingPreview(false)
    }
  }, [])

  // Debounced preview update
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchPreview(body)
    }, 800)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [body, fetchPreview])

  // Initial preview load
  useEffect(() => {
    fetchPreview(body)
  }, [])

  // Auto-save effect
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSaveDraft()
    }, 30000)
    return () => clearTimeout(timer)
  }, [subject, body])

  const handleSaveDraft = useCallback(async () => {
    setIsSaving(true)
    await new Promise(resolve => setTimeout(resolve, 500))
    setLastSaved(new Date())
    setIsSaving(false)
    onSaveDraft({ subject, body })
  }, [subject, body, onSaveDraft])

  const insertVariable = (variable: string) => {
    setBody(prev => prev + `{{${variable}}}`)
  }

  const applyFormatting = (tag: string) => {
    console.log(`Apply ${tag} formatting`)
  }

  const previewSubject = replaceVariables(subject)

  const getPreviewWidth = () => {
    switch (previewMode) {
      case 'mobile': return 'max-w-[375px]'
      case 'tablet': return 'max-w-[600px]'
      case 'desktop': return 'max-w-[600px]'
    }
  }

  return (
    <div className="flex flex-col h-full max-h-[900px] w-full max-w-[1400px] bg-white rounded-[32px] border border-gray-200 shadow-2xl overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between whitespace-nowrap border-b border-gray-200 bg-white px-6 lg:px-10 py-3 sticky top-0 z-50">
        <div className="flex items-center gap-4 text-gray-900">
          <div className="size-8 flex items-center justify-center bg-gray-900/10 rounded-lg">
            <Mail className="h-5 w-5" />
          </div>
          <h2 className="text-gray-900 text-lg font-bold leading-tight tracking-tight">Campagne Builder</h2>
        </div>
        <div className="flex flex-1 justify-end gap-4 items-center">
          <div className="hidden md:flex flex-col items-end mr-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {isSaving ? 'Concept opslaan...' : 'Concept opgeslagen'}
            </p>
            <p className="text-xs text-gray-400">
              {lastSaved ? `${Math.floor((Date.now() - lastSaved.getTime()) / 60000)} min geleden` : 'Net nu'}
            </p>
          </div>
          <Button
            onClick={() => onNext({ subject, body })}
            className="gap-2"
          >
            Volgende: Review & Versturen
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Sub-header / Stepper */}
      <div className="bg-white border-b border-gray-200 px-6 lg:px-10 py-4">
        <nav className="flex items-center gap-2 text-sm mb-2">
          <button onClick={onBack} className="text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1">
            <ChevronLeft className="h-4 w-4" />
            Ontvangers
          </button>
          <ChevronRight className="text-gray-300 text-sm" />
          <span className="text-gray-900 font-semibold">Schrijf Email</span>
          <ChevronRight className="text-gray-300 text-sm" />
          <span className="text-gray-400">Review & Versturen</span>
        </nav>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-gray-900 text-2xl font-bold leading-tight">Schrijf Campagne Email</h1>
            <p className="text-gray-500 text-sm font-normal">Stap 2 van 3: Schrijf je bericht en personaliseer met variabelen</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              Opslaan
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <History className="h-4 w-4" />
              Geschiedenis
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Split Screen */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Side: Editor */}
        <section className="flex-1 basis-1/2 flex flex-col border-r border-gray-200 bg-white overflow-y-auto">
          <div className="p-6 lg:p-10 max-w-3xl mx-auto w-full space-y-8">
            {/* Input Group: Subject */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Onderwerp</label>
              <div className="relative group">
                <Input
                  className="w-full rounded-xl border-gray-200 bg-gray-50 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 p-3 pr-12 text-gray-900"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-900 hover:bg-gray-100 p-1 rounded transition-colors"
                  title="Variabele toevoegen"
                  onClick={() => setShowVariables(!showVariables)}
                >
                  <Variable className="h-5 w-5" />
                </button>
              </div>
              <p className="text-xs text-gray-400">Personaliseer je onderwerp voor hogere open rates.</p>
            </div>

            {/* Rich Text Editor Container */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Email Bericht</label>
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                {/* Toolbar */}
                <div className="bg-gray-50 border-b border-gray-200 p-2 flex flex-wrap gap-1">
                  <button
                    onClick={() => applyFormatting('bold')}
                    className="p-2 hover:bg-gray-200 rounded transition-colors text-gray-600"
                  >
                    <Bold className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => applyFormatting('italic')}
                    className="p-2 hover:bg-gray-200 rounded transition-colors text-gray-600"
                  >
                    <Italic className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => applyFormatting('underline')}
                    className="p-2 hover:bg-gray-200 rounded transition-colors text-gray-600"
                  >
                    <Underline className="h-4 w-4" />
                  </button>
                  <div className="w-px h-6 bg-gray-300 my-auto mx-1" />
                  <button
                    onClick={() => applyFormatting('ul')}
                    className="p-2 hover:bg-gray-200 rounded transition-colors text-gray-600"
                  >
                    <List className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => applyFormatting('ol')}
                    className="p-2 hover:bg-gray-200 rounded transition-colors text-gray-600"
                  >
                    <ListOrdered className="h-4 w-4" />
                  </button>
                  <div className="w-px h-6 bg-gray-300 my-auto mx-1" />
                  <button
                    onClick={() => applyFormatting('link')}
                    className="p-2 hover:bg-gray-200 rounded transition-colors text-gray-600"
                  >
                    <Link className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => applyFormatting('image')}
                    className="p-2 hover:bg-gray-200 rounded transition-colors text-gray-600"
                  >
                    <Image className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setShowVariables(!showVariables)}
                    className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded bg-gray-900/10 text-gray-900 text-xs font-bold hover:bg-gray-900/20 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    Variabelen
                  </button>
                </div>
                {/* Content Area */}
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full p-6 min-h-[400px] bg-white focus:outline-none text-gray-800 leading-relaxed text-base resize-none"
                  placeholder="Schrijf je email bericht hier..."
                />
              </div>
            </div>

            {/* Personalization Tags */}
            {showVariables && (
              <div className="rounded-xl bg-gray-50 p-6 border border-gray-200">
                <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Code className="text-gray-900 h-4 w-4" />
                  Beschikbare Variabelen
                </h3>
                <div className="flex flex-wrap gap-2">
                  {availableVariables.map(variable => (
                    <button
                      key={variable}
                      onClick={() => insertVariable(variable)}
                      className="px-3 py-1 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-600 hover:border-gray-900 transition-colors"
                    >
                      {variable}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Right Side: Live Preview */}
        <section className="flex-1 basis-1/2 bg-[#f6f6f8] flex flex-col items-center">
          {/* Preview Controls */}
          <div className="w-full bg-white border-b border-gray-200 p-4 flex items-center justify-between">
            <span className="text-sm font-bold text-gray-700 flex items-center gap-2 uppercase tracking-wider">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gray-900 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-gray-900" />
              </span>
              Live Preview
              {isLoadingPreview && (
                <Loader2 className="h-3 w-3 animate-spin text-gray-400 ml-1" />
              )}
            </span>
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setPreviewMode('desktop')}
                className={cn(
                  "p-2 rounded-md transition-colors",
                  previewMode === 'desktop' ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-600"
                )}
              >
                <Monitor className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPreviewMode('mobile')}
                className={cn(
                  "p-2 rounded-md transition-colors",
                  previewMode === 'mobile' ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-600"
                )}
              >
                <Smartphone className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPreviewMode('tablet')}
                className={cn(
                  "p-2 rounded-md transition-colors",
                  previewMode === 'tablet' ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-600"
                )}
              >
                <Tablet className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Preview Canvas - Rendered Email Template */}
          <div className="flex-1 w-full overflow-y-auto p-6 flex justify-center">
            <div className={cn("w-full h-fit transition-all duration-300", getPreviewWidth())}>
              {/* Browser-like top bar */}
              <div className="bg-white rounded-t-lg border border-b-0 border-gray-200 px-4 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                    Onderwerp: <span className="text-gray-800 font-medium normal-case">{previewSubject}</span>
                  </p>
                </div>
              </div>
              {/* Rendered Email Template in iframe */}
              {previewHtml ? (
                <iframe
                  srcDoc={previewHtml}
                  className="w-full border border-gray-200 rounded-b-lg bg-white"
                  style={{ minHeight: '700px', height: '100%' }}
                  title="Email Preview"
                  sandbox="allow-same-origin"
                />
              ) : (
                <div className="w-full border border-gray-200 rounded-b-lg bg-white flex items-center justify-center" style={{ minHeight: '400px' }}>
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-900 mx-auto mb-3" />
                    <p className="text-sm text-gray-400">Template laden...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom actions */}
          <div className="w-full p-4 flex justify-center gap-4 bg-transparent">
            <Button variant="outline" size="sm" className="rounded-full gap-2">
              <Send className="h-4 w-4" />
              Test Email Versturen
            </Button>
            <Button variant="outline" size="sm" className="rounded-full gap-2">
              <CheckCircle className="h-4 w-4" />
              Spam Check
            </Button>
          </div>
        </section>
      </main>
    </div>
  )
}
