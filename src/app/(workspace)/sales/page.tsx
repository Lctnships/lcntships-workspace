'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Plus,
  MapPin,
  Phone,
  Mail,
  Building2,
  Target,
  Trophy,
  TrendingUp,
  Zap,
  BarChart3,
  ChevronRight,
  Loader2,
  Inbox,
  X,
  Upload,
  FileSpreadsheet,
  Check,
  AlertCircle,
  Globe,
  Calendar,
  ArrowLeft,
  Edit3,
  Trash2,
  ExternalLink,
  Search,
  Filter,
  ChevronDown,
  Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { salesLeadsApi, leadContactsApi, type SalesLead, type LeadContact } from '@/lib/supabase'
import { UserPlus, Users } from 'lucide-react'

const sourceColorMap: Record<string, string> = {
  'Apollo': 'bg-purple-100 text-purple-700',
  'Referral': 'bg-blue-100 text-blue-700',
  'Cold Email': 'bg-gray-100 text-gray-700',
  'LinkedIn': 'bg-blue-100 text-blue-700',
  'Website': 'bg-emerald-100 text-emerald-700',
  'CSV Import': 'bg-orange-100 text-orange-700',
  'Manual': 'bg-slate-100 text-slate-700',
}

const statusColorMap: Record<string, { bg: string; text: string; dot: string }> = {
  'cold': { bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-400' },
  'warm': { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-400' },
  'hot': { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
  'negotiation': { bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  'closed': { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  'lost': { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
}

const getSourceColor = (source?: string) => {
  if (!source) return 'bg-gray-100 text-gray-700'
  return sourceColorMap[source] || 'bg-gray-100 text-gray-700'
}

const getStatusColor = (status?: string) => {
  if (!status) return statusColorMap['cold']
  return statusColorMap[status] || statusColorMap['cold']
}

const milestones = [
  { value: 0, label: 'Start' },
  { value: 250, label: '250' },
  { value: 500, label: '500' },
  { value: 750, label: '750' },
  { value: 1000, label: '1000' },
]

const formatDate = (dateString?: string) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

// Contact form row
interface ContactFormData {
  name: string
  role: string
  email: string
  phone: string
  is_primary: boolean
}

const emptyContact: ContactFormData = { name: '', role: '', email: '', phone: '', is_primary: false }

// Add Lead Modal Component
interface AddLeadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  editLead?: SalesLead | null
  existingContacts?: LeadContact[]
}

function AddLeadModal({ isOpen, onClose, onSuccess, editLead, existingContacts }: AddLeadModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<{
    company_name: string
    contact_name: string
    email: string
    phone: string
    city: string
    address: string
    website: string
    source: string
    status: 'cold' | 'warm' | 'hot' | 'negotiation' | 'closed' | 'lost'
    notes: string
  }>({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    city: '',
    address: '',
    website: '',
    source: 'Manual',
    status: 'cold',
    notes: '',
  })

  const [contacts, setContacts] = useState<ContactFormData[]>([{ ...emptyContact, is_primary: true }])

  useEffect(() => {
    if (editLead) {
      setFormData({
        company_name: editLead.company_name || '',
        contact_name: editLead.contact_name || '',
        email: editLead.email || '',
        phone: editLead.phone || '',
        city: editLead.city || '',
        address: editLead.address || '',
        website: editLead.website || '',
        source: editLead.source || 'Manual',
        status: editLead.status || 'cold',
        notes: editLead.notes || '',
      })
      // Load existing contacts
      if (existingContacts && existingContacts.length > 0) {
        setContacts(existingContacts.map(c => ({
          name: c.name || '',
          role: c.role || '',
          email: c.email || '',
          phone: c.phone || '',
          is_primary: c.is_primary || false,
        })))
      } else {
        setContacts([{
          name: editLead.contact_name || '',
          role: '',
          email: editLead.email || '',
          phone: editLead.phone || '',
          is_primary: true,
        }])
      }
    } else {
      setFormData({
        company_name: '',
        contact_name: '',
        email: '',
        phone: '',
        city: '',
        address: '',
        website: '',
        source: 'Manual',
        status: 'cold',
        notes: '',
      })
      setContacts([{ ...emptyContact, is_primary: true }])
    }
  }, [editLead, existingContacts, isOpen])

  const addContact = () => {
    setContacts([...contacts, { ...emptyContact }])
  }

  const removeContact = (index: number) => {
    if (contacts.length <= 1) return
    const updated = contacts.filter((_, i) => i !== index)
    // Ensure at least one is primary
    if (!updated.some(c => c.is_primary) && updated.length > 0) {
      updated[0].is_primary = true
    }
    setContacts(updated)
  }

  const updateContact = (index: number, field: keyof ContactFormData, value: string | boolean) => {
    const updated = [...contacts]
    if (field === 'is_primary' && value === true) {
      // Only one primary at a time
      updated.forEach(c => c.is_primary = false)
    }
    updated[index] = { ...updated[index], [field]: value }
    setContacts(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.company_name.trim()) return

    setLoading(true)
    try {
      // Set the primary contact as the main contact_name/email/phone on the lead
      const primaryContact = contacts.find(c => c.is_primary) || contacts[0]
      const leadData = {
        ...formData,
        contact_name: primaryContact?.name || formData.contact_name,
        email: primaryContact?.email || formData.email,
        phone: primaryContact?.phone || formData.phone,
      }

      let leadId: string

      if (editLead) {
        await salesLeadsApi.update(editLead.id, leadData)
        leadId = editLead.id
        // Delete existing contacts and re-create
        if (existingContacts) {
          for (const c of existingContacts) {
            await leadContactsApi.delete(c.id)
          }
        }
      } else {
        const newLead = await salesLeadsApi.create(leadData)
        leadId = newLead.id
      }

      // Save contacts
      const validContacts = contacts.filter(c => c.name.trim())
      if (validContacts.length > 0) {
        await leadContactsApi.createMany(
          validContacts.map(c => ({
            lead_id: leadId,
            name: c.name,
            role: c.role || undefined,
            email: c.email || undefined,
            phone: c.phone || undefined,
            is_primary: c.is_primary,
          }))
        )
      }

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error saving lead:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto m-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">
            {editLead ? 'Lead Bewerken' : 'Nieuwe Lead Toevoegen'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Company Info */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bedrijfsnaam *
            </label>
            <input
              type="text"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Bijv. Studio Amsterdam"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stad
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Amsterdam"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Website
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="https://www.studio.nl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bron
              </label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="Manual">Handmatig</option>
                <option value="Apollo">Apollo</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Referral">Referral</option>
                <option value="Cold Email">Cold Email</option>
                <option value="Website">Website</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'cold' | 'warm' | 'hot' | 'negotiation' | 'closed' | 'lost' })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="cold">Cold</option>
                <option value="warm">Warm</option>
                <option value="hot">Hot</option>
                <option value="negotiation">Negotiation</option>
                <option value="closed">Closed</option>
                <option value="lost">Lost</option>
              </select>
            </div>
          </div>

          {/* Contacts Section */}
          <div className="border-t border-gray-100 pt-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <label className="text-sm font-semibold text-gray-900">
                  Contactpersonen
                </label>
              </div>
              <button
                type="button"
                onClick={addContact}
                className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
              >
                <UserPlus className="h-4 w-4" />
                Contact toevoegen
              </button>
            </div>

            <div className="space-y-3">
              {contacts.map((contact, index) => (
                <div key={index} className="relative bg-gray-50 rounded-xl p-4 space-y-3">
                  {/* Primary badge & remove button */}
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => updateContact(index, 'is_primary', true)}
                      className={cn(
                        'flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors',
                        contact.is_primary
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                      )}
                    >
                      {contact.is_primary && <Check className="h-3 w-3" />}
                      {contact.is_primary ? 'Primair' : 'Maak primair'}
                    </button>
                    {contacts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeContact(index)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={contact.name}
                      onChange={(e) => updateContact(index, 'name', e.target.value)}
                      className="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                      placeholder="Naam *"
                    />
                    <input
                      type="text"
                      value={contact.role}
                      onChange={(e) => updateContact(index, 'role', e.target.value)}
                      className="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                      placeholder="Functie (bijv. Manager)"
                    />
                    <input
                      type="email"
                      value={contact.email}
                      onChange={(e) => updateContact(index, 'email', e.target.value)}
                      className="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                      placeholder="Email"
                    />
                    <input
                      type="tel"
                      value={contact.phone}
                      onChange={(e) => updateContact(index, 'phone', e.target.value)}
                      className="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                      placeholder="Telefoon"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notities
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              rows={3}
              placeholder="Extra informatie over deze lead..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Annuleren
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.company_name.trim()}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Opslaan...
                </>
              ) : (
                <>
                  {editLead ? <Check className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  {editLead ? 'Opslaan' : 'Lead Toevoegen'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// CSV Upload Modal Component
interface CSVUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

function CSVUploadModal({ isOpen, onClose, onSuccess }: CSVUploadModalProps) {
  const [loading, setLoading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<Partial<SalesLead>[]>([])
  const [error, setError] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null)
  const [aiAnalyzing, setAiAnalyzing] = useState(false)
  const [aiUsed, setAiUsed] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [rawCsvContent, setRawCsvContent] = useState<string>('')

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    result.push(current.trim())

    return result
  }

  const parseCSV = (text: string): Partial<SalesLead>[] => {
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length < 2) return []

    const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase().replace(/['"]/g, ''))
    const leads: Partial<SalesLead>[] = []

    const headerMap: Record<string, keyof SalesLead> = {
      'company_name': 'company_name',
      'company': 'company_name',
      'bedrijf': 'company_name',
      'bedrijfsnaam': 'company_name',
      'company name': 'company_name',
      'company name for emails': 'company_name',
      'contact_name': 'contact_name',
      'contact': 'contact_name',
      'contactpersoon': 'contact_name',
      'email': 'email',
      'e-mail': 'email',
      'mail': 'email',
      'phone': 'phone',
      'telefoon': 'phone',
      'tel': 'phone',
      'work direct phone': 'phone',
      'mobile phone': 'phone',
      'corporate phone': 'phone',
      'city': 'city',
      'stad': 'city',
      'plaats': 'city',
      'company city': 'city',
      'address': 'address',
      'adres': 'address',
      'company address': 'address',
      'website': 'website',
      'url': 'website',
      'site': 'website',
      'notes': 'notes',
      'notities': 'notes',
      'opmerkingen': 'notes',
      'industry': 'notes',
    }

    const firstNameIndex = headers.indexOf('first name')
    const lastNameIndex = headers.indexOf('last name')

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])
      if (values.length < 2) continue

      const lead: Partial<SalesLead> = {
        source: 'Apollo',
        status: 'cold',
      }

      if (firstNameIndex !== -1 && lastNameIndex !== -1) {
        const firstName = values[firstNameIndex]?.trim() || ''
        const lastName = values[lastNameIndex]?.trim() || ''
        if (firstName || lastName) {
          lead.contact_name = `${firstName} ${lastName}`.trim()
        }
      }

      headers.forEach((header, index) => {
        const mappedKey = headerMap[header]
        if (mappedKey && values[index]) {
          const value = values[index].trim()
          if (mappedKey === 'contact_name' && lead.contact_name) return
          if (mappedKey === 'phone' && lead.phone) return
          if (value) {
            (lead as Record<string, string>)[mappedKey] = value
          }
        }
      })

      if (lead.company_name) {
        leads.push(lead)
      }
    }

    return leads
  }

  const handleFile = (selectedFile: File) => {
    setError(null)
    setImportResult(null)

    if (!selectedFile.name.endsWith('.csv')) {
      setError('Alleen CSV bestanden zijn toegestaan')
      return
    }

    setFile(selectedFile)

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      setRawCsvContent(text)
      const parsed = parseCSV(text)
      if (parsed.length === 0) {
        setError('Geen geldige leads gevonden in het bestand.')
      } else {
        setPreview(parsed)
        setAiUsed(false)
      }
    }
    reader.readAsText(selectedFile)
  }

  const analyzeWithAI = async () => {
    if (!rawCsvContent) return

    setAiAnalyzing(true)
    setError(null)

    try {
      const response = await fetch('/api/csv/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvContent: rawCsvContent }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'AI analyse mislukt')
        return
      }

      if (data.leads && data.leads.length > 0) {
        setPreview(data.leads)
        setAiUsed(true)
      } else {
        setError('AI kon geen leads extraheren uit het bestand.')
      }
    } catch {
      setError('Kon geen verbinding maken met de AI service.')
    } finally {
      setAiAnalyzing(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleImport = async () => {
    if (preview.length === 0) return

    setLoading(true)
    setError(null)

    try {
      const results = await salesLeadsApi.createMany(preview)
      setImportResult({ success: results.length, failed: preview.length - results.length })
      onSuccess()

      setTimeout(() => {
        onClose()
        setFile(null)
        setPreview([])
        setImportResult(null)
      }, 2000)
    } catch (error) {
      console.error('Error importing leads:', error)
      setError('Er ging iets mis bij het importeren. Probeer het opnieuw.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setPreview([])
    setError(null)
    setImportResult(null)
    setAiUsed(false)
    setRawCsvContent('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto m-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-50">
              <FileSpreadsheet className="h-5 w-5 text-orange-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">CSV Importeren</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {importResult ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Import Voltooid!</h3>
              <p className="text-gray-500">
                {importResult.success} leads succesvol geïmporteerd
                {importResult.failed > 0 && `, ${importResult.failed} mislukt`}
              </p>
            </div>
          ) : !file ? (
            <>
              <div
                className={cn(
                  'border-2 border-dashed rounded-2xl p-8 text-center transition-colors',
                  dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                )}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
              >
                <Upload className="h-10 w-10 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">
                  Sleep je CSV bestand hierheen of{' '}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-indigo-600 font-medium hover:underline"
                  >
                    blader
                  </button>
                </p>
                <p className="text-sm text-gray-400">
                  Ondersteunt Apollo exports en standaard CSV
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </div>
            </>
          ) : (
            <>
              {error ? (
                <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl text-red-700 mb-4">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="h-5 w-5 text-gray-400" />
                      <span className="font-medium text-gray-900">{file.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {aiUsed && (
                        <Badge className="bg-purple-100 text-purple-700">
                          <Sparkles className="h-3 w-3 mr-1" />
                          AI
                        </Badge>
                      )}
                      <Badge className="bg-emerald-100 text-emerald-700">
                        {preview.length} leads gevonden
                      </Badge>
                    </div>
                  </div>

                  {!aiUsed && (
                    <button
                      onClick={analyzeWithAI}
                      disabled={aiAnalyzing}
                      className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-purple-200 bg-purple-50/50 text-purple-700 hover:bg-purple-100 hover:border-purple-300 transition-colors disabled:opacity-50"
                    >
                      {aiAnalyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          AI analyseert je CSV...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Analyseer met AI (Claude Haiku)
                        </>
                      )}
                    </button>
                  )}

                  <div className="border border-gray-200 rounded-xl overflow-hidden mb-4">
                    <div className="max-h-64 overflow-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="text-left p-3 font-medium text-gray-600">Bedrijf</th>
                            <th className="text-left p-3 font-medium text-gray-600">Contact</th>
                            <th className="text-left p-3 font-medium text-gray-600">Email</th>
                            <th className="text-left p-3 font-medium text-gray-600">Stad</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {preview.slice(0, 10).map((lead, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="p-3 font-medium text-gray-900">{lead.company_name}</td>
                              <td className="p-3 text-gray-600">{lead.contact_name || '-'}</td>
                              <td className="p-3 text-gray-600">{lead.email || '-'}</td>
                              <td className="p-3 text-gray-600">{lead.city || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {preview.length > 10 && (
                      <div className="p-3 bg-gray-50 text-center text-sm text-gray-500">
                        ... en {preview.length - 10} meer
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => { setFile(null); setPreview([]); setError(null) }}
                  className="flex-1"
                >
                  Ander bestand
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={loading || preview.length === 0}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importeren...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      {preview.length} Leads Importeren
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Lead Detail View Component
interface LeadDetailProps {
  lead: SalesLead
  contacts: LeadContact[]
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
  onStatusChange: (status: SalesLead['status']) => void
}

function LeadDetail({ lead, contacts, onBack, onEdit, onDelete, onStatusChange }: LeadDetailProps) {
  const statusColors = getStatusColor(lead.status)

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="font-medium">Terug naar overzicht</span>
        </button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit3 className="h-4 w-4 mr-2" />
            Bewerken
          </Button>
          <Button variant="outline" size="sm" onClick={onDelete} className="text-red-600 hover:text-red-700 hover:bg-red-50">
            <Trash2 className="h-4 w-4 mr-2" />
            Verwijderen
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="col-span-2 space-y-6">
          {/* Company Card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{lead.company_name}</h1>
                {lead.city && (
                  <div className="flex items-center gap-2 text-gray-500">
                    <MapPin className="h-4 w-4" />
                    <span>{lead.city}</span>
                  </div>
                )}
              </div>
              <Badge className={cn('text-sm', getSourceColor(lead.source))}>
                {lead.source || 'Unknown'}
              </Badge>
            </div>

            {lead.website && (
              <a
                href={lead.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                <Globe className="h-4 w-4" />
                <span>{lead.website}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          {/* Contacts */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-gray-400" />
              <h2 className="font-semibold text-gray-900">
                Contactpersonen ({contacts.length > 0 ? contacts.length : (lead.contact_name ? 1 : 0)})
              </h2>
            </div>

            {contacts.length > 0 ? (
              <div className="space-y-3">
                {contacts.map((contact) => (
                  <div key={contact.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-indigo-600 font-semibold text-sm">
                        {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">{contact.name}</span>
                        {contact.is_primary && (
                          <Badge className="bg-indigo-100 text-indigo-700 text-xs">Primair</Badge>
                        )}
                        {contact.role && (
                          <span className="text-sm text-gray-500">{contact.role}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm">
                        {contact.email && (
                          <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 text-gray-600 hover:text-indigo-600 transition-colors">
                            <Mail className="h-3.5 w-3.5" />
                            {contact.email}
                          </a>
                        )}
                        {contact.phone && (
                          <a href={`tel:${contact.phone}`} className="flex items-center gap-1.5 text-gray-600 hover:text-indigo-600 transition-colors">
                            <Phone className="h-3.5 w-3.5" />
                            {contact.phone}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Fallback to legacy single contact */
              <div className="grid grid-cols-2 gap-4">
                {lead.contact_name && (
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                      <span className="text-indigo-600 font-semibold">
                        {lead.contact_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Contactpersoon</div>
                      <div className="font-medium text-gray-900">{lead.contact_name}</div>
                    </div>
                  </div>
                )}

                {lead.email && (
                  <a
                    href={`mailto:${lead.email}`}
                    className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Mail className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Email</div>
                      <div className="font-medium text-gray-900">{lead.email}</div>
                    </div>
                  </a>
                )}

                {lead.phone && (
                  <a
                    href={`tel:${lead.phone}`}
                    className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Phone className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Telefoon</div>
                      <div className="font-medium text-gray-900">{lead.phone}</div>
                    </div>
                  </a>
                )}
              </div>
            )}

            {lead.address && (
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl mt-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Adres</div>
                  <div className="font-medium text-gray-900">{lead.address}</div>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          {lead.notes && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Notities</h2>
              <p className="text-gray-600 whitespace-pre-wrap">{lead.notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Status</h2>
            <div className="space-y-2">
              {(['cold', 'warm', 'hot', 'negotiation', 'closed', 'lost'] as const).map((status) => {
                const colors = getStatusColor(status)
                const isActive = lead.status === status
                return (
                  <button
                    key={status}
                    onClick={() => onStatusChange(status)}
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
                  <div className="font-medium text-gray-900">{formatDate(lead.created_at)}</div>
                </div>
              </div>
              {lead.updated_at && lead.updated_at !== lead.created_at && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <Edit3 className="h-4 w-4 text-gray-500" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Laatst bewerkt</div>
                    <div className="font-medium text-gray-900">{formatDate(lead.updated_at)}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SalesPage() {
  const [leads, setLeads] = useState<SalesLead[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showCSVModal, setShowCSVModal] = useState(false)
  const [selectedLead, setSelectedLead] = useState<SalesLead | null>(null)
  const [editLead, setEditLead] = useState<SalesLead | null>(null)
  const [leadContacts, setLeadContacts] = useState<LeadContact[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)

  const loadLeads = async () => {
    try {
      const data = await salesLeadsApi.getAll()
      setLeads(data || [])
    } catch (error) {
      console.error('Error loading leads:', error)
      setLeads([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLeads()
  }, [])

  const loadContacts = async (leadId: string) => {
    try {
      const data = await leadContactsApi.getByLeadId(leadId)
      setLeadContacts(data || [])
    } catch (error) {
      console.error('Error loading contacts:', error)
      setLeadContacts([])
    }
  }

  const selectLead = async (lead: SalesLead) => {
    setSelectedLead(lead)
    loadContacts(lead.id)
  }

  const handleStatusChange = async (leadId: string, newStatus: SalesLead['status']) => {
    try {
      await salesLeadsApi.update(leadId, { status: newStatus })
      setLeads(leads.map(l => l.id === leadId ? { ...l, status: newStatus } : l))
      if (selectedLead?.id === leadId) {
        setSelectedLead({ ...selectedLead, status: newStatus })
      }
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm('Weet je zeker dat je deze lead wilt verwijderen?')) return

    try {
      await salesLeadsApi.delete(leadId)
      setLeads(leads.filter(l => l.id !== leadId))
      setSelectedLead(null)
    } catch (error) {
      console.error('Error deleting lead:', error)
    }
  }

  // Filter leads
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = !searchQuery ||
      lead.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.city?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = !statusFilter || lead.status === statusFilter

    return matchesSearch && matchesStatus
  })

  // Calculate stats
  const closedLeads = leads.filter(l => l.status === 'closed')
  const totalLeads = leads.length
  const conversionRate = totalLeads > 0 ? Math.round((closedLeads.length / totalLeads) * 100) : 0
  const currentStudios = closedLeads.length
  const goalStudios = 1000
  const progressPercent = (currentStudios / goalStudios) * 100

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  // Show detail view if lead is selected
  if (selectedLead) {
    return (
      <>
        <LeadDetail
          lead={selectedLead}
          contacts={leadContacts}
          onBack={() => { setSelectedLead(null); setLeadContacts([]) }}
          onEdit={() => {
            setEditLead(selectedLead)
            setShowAddModal(true)
          }}
          onDelete={() => handleDeleteLead(selectedLead.id)}
          onStatusChange={(status) => handleStatusChange(selectedLead.id, status)}
        />
        <AddLeadModal
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false)
            setEditLead(null)
          }}
          onSuccess={() => {
            loadLeads()
            if (editLead) {
              // Refresh selected lead and contacts
              salesLeadsApi.getById(editLead.id).then(setSelectedLead)
              loadContacts(editLead.id)
            }
          }}
          editLead={editLead}
          existingContacts={leadContacts}
        />
      </>
    )
  }

  if (leads.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center h-96 text-center">
          <div className="p-4 rounded-full bg-gray-100 mb-4">
            <Inbox className="h-10 w-10 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Nog geen leads</h2>
          <p className="text-gray-500 mb-6">Voeg je eerste sales lead toe of importeer een CSV bestand</p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowCSVModal(true)}>
              <Upload className="h-4 w-4 mr-2" />
              CSV Importeren
            </Button>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Lead Toevoegen
            </Button>
          </div>
        </div>

        <AddLeadModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={loadLeads}
        />
        <CSVUploadModal
          isOpen={showCSVModal}
          onClose={() => setShowCSVModal(false)}
          onSuccess={loadLeads}
        />
      </>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Section - Road to 1000 */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 rounded-3xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-5 w-5 text-indigo-200" />
                <span className="text-indigo-200 text-sm font-medium">Company Goal</span>
              </div>
              <h1 className="text-3xl font-bold">Road to 1,000 Studios</h1>
            </div>
            <div className="text-right">
              <div className="text-5xl font-bold">{currentStudios}</div>
              <div className="text-indigo-200">of {goalStudios.toLocaleString()} studios</div>
            </div>
          </div>

          <div className="relative">
            <div className="h-4 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-300 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex justify-between mt-2">
              {milestones.map((milestone) => (
                <div key={milestone.value} className="flex flex-col items-center">
                  <div className={cn(
                    'w-3 h-3 rounded-full border-2 -mt-5 mb-1',
                    currentStudios >= milestone.value
                      ? 'bg-emerald-400 border-emerald-300'
                      : 'bg-white/20 border-white/40'
                  )} />
                  <span className="text-xs text-indigo-200">{milestone.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/20">
            <div className="text-center">
              <div className="text-2xl font-bold">{leads.filter(l => l.status !== 'closed' && l.status !== 'lost').length}</div>
              <div className="text-indigo-200 text-sm">Active Leads</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{closedLeads.length}</div>
              <div className="text-indigo-200 text-sm">Closed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{conversionRate}%</div>
              <div className="text-indigo-200 text-sm">Conversion Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{totalLeads}</div>
              <div className="text-indigo-200 text-sm">Total Leads</div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Zoeken..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-64"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <button
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <Filter className="h-4 w-4 text-gray-400" />
              <span className="text-gray-700">
                {statusFilter ? statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1) : 'Alle statussen'}
              </span>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>

            {showStatusDropdown && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-10">
                <button
                  onClick={() => { setStatusFilter(null); setShowStatusDropdown(false) }}
                  className={cn(
                    'w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors',
                    !statusFilter && 'bg-gray-50 font-medium'
                  )}
                >
                  Alle statussen
                </button>
                {(['cold', 'warm', 'hot', 'negotiation', 'closed', 'lost'] as const).map((status) => {
                  const colors = getStatusColor(status)
                  return (
                    <button
                      key={status}
                      onClick={() => { setStatusFilter(status); setShowStatusDropdown(false) }}
                      className={cn(
                        'w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors flex items-center gap-2',
                        statusFilter === status && 'bg-gray-50 font-medium'
                      )}
                    >
                      <span className={cn('w-2 h-2 rounded-full', colors.dot)} />
                      <span className="capitalize">{status}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowCSVModal(true)}>
            <Upload className="h-4 w-4 mr-2" />
            CSV Import
          </Button>

          <Button onClick={() => { setEditLead(null); setShowAddModal(true) }}>
            <Plus className="h-4 w-4 mr-2" />
            Nieuwe Lead
          </Button>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left p-4 font-semibold text-gray-600">Bedrijf</th>
              <th className="text-left p-4 font-semibold text-gray-600">Contact</th>
              <th className="text-left p-4 font-semibold text-gray-600">Locatie</th>
              <th className="text-left p-4 font-semibold text-gray-600">Status</th>
              <th className="text-left p-4 font-semibold text-gray-600">Bron</th>
              <th className="text-left p-4 font-semibold text-gray-600">Toegevoegd</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredLeads.map((lead) => {
              const statusColors = getStatusColor(lead.status)
              return (
                <tr
                  key={lead.id}
                  onClick={() => selectLead(lead)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="p-4">
                    <div className="font-semibold text-gray-900">{lead.company_name}</div>
                    {lead.website && (
                      <div className="text-sm text-gray-500 truncate max-w-[200px]">{lead.website}</div>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="text-gray-900">{lead.contact_name || '-'}</div>
                    {lead.email && (
                      <div className="text-sm text-gray-500">{lead.email}</div>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      {lead.city && (
                        <>
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span>{lead.city}</span>
                        </>
                      )}
                      {!lead.city && '-'}
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge className={cn(statusColors.bg, statusColors.text, 'capitalize')}>
                      <span className={cn('w-1.5 h-1.5 rounded-full mr-1.5', statusColors.dot)} />
                      {lead.status}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <Badge className={getSourceColor(lead.source)}>
                      {lead.source || 'Unknown'}
                    </Badge>
                  </td>
                  <td className="p-4 text-gray-500">
                    {formatDate(lead.created_at)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filteredLeads.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-gray-500">Geen leads gevonden</p>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddLeadModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false)
          setEditLead(null)
        }}
        onSuccess={loadLeads}
        editLead={editLead}
      />
      <CSVUploadModal
        isOpen={showCSVModal}
        onClose={() => setShowCSVModal(false)}
        onSuccess={loadLeads}
      />
    </div>
  )
}
