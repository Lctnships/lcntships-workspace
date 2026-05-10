'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import Papa from 'papaparse'
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
  Sparkles,
  Send,
  Play,
  Pause,
  RotateCcw,
  Download,
  TestTube,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  Save,
  Voicemail,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { salesLeadsApi, leadContactsApi, type SalesLead, type LeadContact } from '@/lib/supabase'
import { workspaceClient } from '@/lib/workspace-client'
import { UserPlus, Users, ArrowUpDown, Crosshair, ThumbsUp, ThumbsDown, Search as SearchIcon2 } from 'lucide-react'
import { SalesMode, getApproval } from '@/components/sales/SalesMode'
import { SalesModeResults } from '@/components/sales/SalesModeResults'
import { CityOverview } from '@/components/sales/CityOverview'

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
  'voicemail': { bg: 'bg-violet-100', text: 'text-violet-700', dot: 'bg-violet-500' },
  'negotiation': { bg: 'bg-gray-200', text: 'text-black', dot: 'bg-gray-900' },
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
    status: 'cold' | 'warm' | 'hot' | 'voicemail' | 'negotiation' | 'closed' | 'lost'
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
  const [studioSpaces, setStudioSpaces] = useState<Array<{ id?: string; name: string; notes: string }>>([])

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
      // Load studio spaces
      workspaceClient
        .from<Array<{ id: string; name: string; notes: string | null }>>('studio_spaces')
        .select('id, name, notes')
        .eq('lead_id', editLead.id)
        .order('sort_order', { ascending: true })
        .then(({ data }) => {
          setStudioSpaces(
            (data ?? []).map((s) => ({ id: s.id, name: s.name, notes: s.notes ?? '' })),
          )
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
      setStudioSpaces([])
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
      const leadData: Partial<SalesLead> = {
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

      // Save studio spaces — wis bestaande, herinsert
      if (editLead) {
        await workspaceClient.from('studio_spaces').delete().eq('lead_id', leadId)
      }
      const validSpaces = studioSpaces.filter((s) => s.name.trim())
      if (validSpaces.length > 0) {
        await workspaceClient.from('studio_spaces').insert(
          validSpaces.map((s, i) => ({
            lead_id: leadId,
            name: s.name.trim(),
            notes: s.notes.trim() || null,
            sort_order: i,
          })),
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
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto m-2 sm:m-4">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">
            {editLead ? 'Lead Bewerken' : 'Nieuwe Lead Toevoegen'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {/* Company Info */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bedrijfsnaam *
            </label>
            <input
              type="text"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder="Bijv. Studio Amsterdam"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stad
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="Amsterdam"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adres
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="Keizersgracht 123"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Website
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="https://www.studio.nl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bron
              </label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
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
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'cold' | 'warm' | 'hot' | 'voicemail' | 'negotiation' | 'closed' | 'lost' })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
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
                className="flex items-center gap-1.5 text-sm text-gray-900 hover:text-black font-medium transition-colors"
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
                          ? 'bg-gray-200 text-black'
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
                      className="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                      placeholder="Naam *"
                    />
                    <input
                      type="text"
                      value={contact.role}
                      onChange={(e) => updateContact(index, 'role', e.target.value)}
                      className="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                      placeholder="Functie (bijv. Manager)"
                    />
                    <input
                      type="email"
                      value={contact.email}
                      onChange={(e) => updateContact(index, 'email', e.target.value)}
                      className="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                      placeholder="Email"
                    />
                    <input
                      type="tel"
                      value={contact.phone}
                      onChange={(e) => updateContact(index, 'phone', e.target.value)}
                      className="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                      placeholder="Telefoon"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Studio-ruimtes (optioneel) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Studio-ruimtes <span className="text-xs font-normal text-gray-400">(optioneel)</span>
              </label>
              <button
                type="button"
                onClick={() => setStudioSpaces([...studioSpaces, { name: '', notes: '' }])}
                className="text-xs text-indigo-600 hover:underline"
              >
                + Ruimte toevoegen
              </button>
            </div>
            {studioSpaces.length === 0 ? (
              <p className="text-xs text-gray-500">
                Vul in als dit bedrijf meerdere studio-ruimtes heeft (bv. Studio 1 — cyclorama).
              </p>
            ) : (
              <div className="space-y-2">
                {studioSpaces.map((s, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={s.name}
                        onChange={(e) => {
                          const next = [...studioSpaces]
                          next[i] = { ...next[i], name: e.target.value }
                          setStudioSpaces(next)
                        }}
                        placeholder="Ruimte naam *"
                        className="px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900"
                      />
                      <input
                        type="text"
                        value={s.notes}
                        onChange={(e) => {
                          const next = [...studioSpaces]
                          next[i] = { ...next[i], notes: e.target.value }
                          setStudioSpaces(next)
                        }}
                        placeholder="Notities (m², etc)"
                        className="px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setStudioSpaces(studioSpaces.filter((_, idx) => idx !== i))}
                      className="px-2 py-2 text-gray-400 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notities
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
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
                  dragActive ? 'border-gray-900 bg-gray-100' : 'border-gray-200 hover:border-gray-300'
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
                    className="text-gray-900 font-medium hover:underline"
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

interface LeadDetailProps {
  lead: SalesLead
  contacts: LeadContact[]
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
  onStatusChange: (status: SalesLead['status']) => void
  onNotesChange: (notes: string) => Promise<void>
}

function LeadDetail({ lead, contacts, onBack, onEdit, onDelete, onStatusChange, onNotesChange }: LeadDetailProps) {
  const statusColors = getStatusColor(lead.status)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesValue, setNotesValue] = useState(lead.notes || '')
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesError, setNotesError] = useState<string | null>(null)

  // Sync local notes state when the selected lead changes or when the
  // parent refreshes the lead after an edit elsewhere. Without this, the
  // textarea would show a stale value from a previously viewed lead.
  useEffect(() => {
    setNotesValue(lead.notes || '')
    setEditingNotes(false)
    setNotesError(null)
  }, [lead.id, lead.notes])

  const handleSaveNotes = async () => {
    setSavingNotes(true)
    setNotesError(null)
    try {
      await onNotesChange(notesValue)
      setEditingNotes(false)
    } catch (err) {
      console.error('Error updating notes:', err)
      setNotesError(
        err instanceof Error ? err.message : 'Notities opslaan mislukt. Probeer het opnieuw.'
      )
    } finally {
      setSavingNotes(false)
    }
  }

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-4 lg:space-y-6">
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
                className="inline-flex items-center gap-2 text-gray-900 hover:text-black transition-colors"
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
                          <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 transition-colors">
                            <Mail className="h-3.5 w-3.5" />
                            {contact.email}
                          </a>
                        )}
                        {contact.phone && (
                          <a href={`tel:${contact.phone}`} className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 transition-colors">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {lead.contact_name && (
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-900 font-semibold">
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
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-gray-400" />
                <h2 className="font-semibold text-gray-900">Notities</h2>
              </div>
              {editingNotes ? (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={savingNotes}
                    onClick={() => {
                      setNotesValue(lead.notes || '')
                      setEditingNotes(false)
                      setNotesError(null)
                    }}
                  >
                    Annuleren
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={savingNotes}
                    onClick={handleSaveNotes}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {savingNotes ? 'Opslaan...' : 'Opslaan'}
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNotesValue(lead.notes || '')
                    setEditingNotes(true)
                    setNotesError(null)
                  }}
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Bewerken
                </Button>
              )}
            </div>
            {editingNotes ? (
              <>
                <textarea
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                      e.preventDefault()
                      handleSaveNotes()
                    }
                  }}
                  disabled={savingNotes}
                  className="w-full min-h-[120px] p-3 rounded-xl border border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-y disabled:opacity-60"
                  placeholder="Voeg notities toe... (⌘+Enter om op te slaan)"
                />
                {notesError && (
                  <p className="mt-2 text-sm text-red-600">{notesError}</p>
                )}
              </>
            ) : (
              <p className="text-gray-600 whitespace-pre-wrap">
                {lead.notes || 'Geen notities. Klik op Bewerken om notities toe te voegen.'}
              </p>
            )}
          </div>

          {/* Email Action */}
          {(lead.email || contacts.some(c => c.email)) && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Mail className="h-5 w-5 text-gray-400" />
                <h2 className="font-semibold text-gray-900">Email</h2>
              </div>
              <Link
                href={`/email?lead=${lead.id}`}
                className="flex items-center justify-center gap-2 w-full p-3 bg-gray-900 text-white rounded-xl hover:bg-black transition-colors"
              >
                <Send className="h-4 w-4" />
                <span className="font-medium">Email versturen</span>
              </Link>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Status</h2>
            <div className="space-y-2">
              {(['cold', 'warm', 'hot', 'voicemail', 'negotiation', 'closed', 'lost'] as const).map((status) => {
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


function GoalStat({ val, label, color }: { val: string; label: string; color?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <span style={{ fontSize: 13, fontWeight: 800, color: color || 'var(--ink-muted)', fontFamily: 'ui-monospace, monospace' }}>{val}</span>
      <span style={{ fontSize: 8.5, color: 'var(--ink-ghost)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>{label}</span>
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
  const [cityFilter, setCityFilter] = useState<string | null>(null)
  const [showCityDropdown, setShowCityDropdown] = useState(false)
  const [normalizingCities, setNormalizingCities] = useState(false)
  const [salesView, setSalesView] = useState<'pipeline' | 'cities'>('pipeline')

  // Sales Mode
  const [salesModeActive, setSalesModeActive] = useState(false)
  const [salesModeResults, setSalesModeResults] = useState<{
    reviewed: number
    statusChanges: number
    approved: number
    rejected: number
    notesEdited: number
  } | null>(null)
  const [salesModeResumeIndex, setSalesModeResumeIndex] = useState(0)

  // Sorting
  const [sortBy, setSortBy] = useState<'name' | 'city' | 'company' | 'date'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [showSortDropdown, setShowSortDropdown] = useState(false)

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
    // Optimistic: bewaar oude status, update UI direct, sync DB op achtergrond.
    let prevStatus: SalesLead['status'] | undefined
    setLeads(prev => prev.map(l => {
      if (l.id === leadId) { prevStatus = l.status; return { ...l, status: newStatus } }
      return l
    }))
    setSelectedLead(prev => (prev && prev.id === leadId ? { ...prev, status: newStatus } : prev))
    try {
      await salesLeadsApi.update(leadId, { status: newStatus })
    } catch (error: unknown) {
      // Rollback bij fail
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: prevStatus ?? l.status } : l))
      setSelectedLead(prev => (prev && prev.id === leadId ? { ...prev, status: prevStatus ?? prev.status } : prev))
      const err = error as { message?: string; code?: string; details?: string }
      console.error('Error updating status:', err?.message, err?.code, err?.details)
    }
  }

  const handleNotesChange = async (leadId: string, notes: string) => {
    // Let errors bubble up so the caller can show feedback and keep the
    // editor open if the save fails. Use functional setters to avoid stale
    // closures when multiple saves happen in quick succession.
    await salesLeadsApi.update(leadId, { notes })
    setLeads(prev => prev.map(l => (l.id === leadId ? { ...l, notes } : l)))
    setSelectedLead(prev => (prev && prev.id === leadId ? { ...prev, notes } : prev))
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

  const handleNormalizeCities = async () => {
    setNormalizingCities(true)
    try {
      const res = await fetch('/api/leads/normalize-cities', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        alert(`Fout: ${data.error || 'Onbekende fout'}`)
        return
      }
      if (data.updated > 0) {
        await loadLeads()
        setCityFilter(null)
        alert(`${data.updated} leads bijgewerkt!`)
      } else {
        alert('Alle steden zijn al correct.')
      }
    } catch (error) {
      console.error('Error normalizing cities:', error)
      alert('Kon geen verbinding maken met de server.')
    } finally {
      setNormalizingCities(false)
    }
  }

  // Get unique cities for filter (data should be clean after normalize-cities API)
  const cityCountMap = new Map<string, number>()
  leads.forEach(l => {
    if (l.city) {
      cityCountMap.set(l.city, (cityCountMap.get(l.city) || 0) + 1)
    }
  })
  const uniqueCities = [...cityCountMap.keys()].sort((a, b) => a.localeCompare(b))

  // Filter leads
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = !searchQuery ||
      lead.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.city?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = !statusFilter || lead.status === statusFilter
    const matchesCity = !cityFilter || lead.city === cityFilter

    return matchesSearch && matchesStatus && matchesCity
  }).sort((a, b) => {
    let valA: string | Date, valB: string | Date
    
    switch (sortBy) {
      case 'city':
        valA = (a.city || '').toLowerCase()
        valB = (b.city || '').toLowerCase()
        break
      case 'company':
        valA = (a.company_name || '').toLowerCase()
        valB = (b.company_name || '').toLowerCase()
        break
      case 'name':
        valA = (a.contact_name || '').toLowerCase()
        valB = (b.contact_name || '').toLowerCase()
        break
      case 'date':
      default:
        valA = new Date(a.created_at || 0)
        valB = new Date(b.created_at || 0)
    }
    
    if (valA < valB) return sortOrder === 'asc' ? -1 : 1
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1
    return 0
  })

  // Calculate stats
  const closedLeads = leads.filter(l => l.status === 'closed')
  const totalLeads = leads.length
  const conversionRate = totalLeads > 0 ? Math.round((closedLeads.length / totalLeads) * 100) : 0
  const currentStudios = closedLeads.length
  const goalStudios = 1000
  const progressPercent = (currentStudios / goalStudios) * 100

  const handleLeadUpdateFromSalesMode = (updatedLead: SalesLead) => {
    setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l))
    if (selectedLead?.id === updatedLead.id) {
      setSelectedLead(updatedLead)
    }
  }

  const handleSalesModeExit = (stats: typeof salesModeResults & object) => {
    setSalesModeActive(false)
    setSalesModeResults(stats)
  }

  const getFilterLabel = () => {
    const parts: string[] = []
    if (cityFilter) parts.push(cityFilter)
    if (statusFilter) parts.push(statusFilter)
    if (searchQuery) parts.push(`"${searchQuery}"`)
    return parts.length > 0 ? parts.join(' · ') : 'Alle leads'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-900" />
      </div>
    )
  }

  // Sales Mode
  if (salesModeActive && filteredLeads.length > 0) {
    return (
      <SalesMode
        leads={filteredLeads}
        initialIndex={salesModeResumeIndex}
        onExit={handleSalesModeExit}
        onLeadUpdate={handleLeadUpdateFromSalesMode}
      />
    )
  }

  // Sales Mode Results
  if (salesModeResults) {
    return (
      <SalesModeResults
        stats={salesModeResults}
        totalLeads={filteredLeads.length}
        filterLabel={getFilterLabel()}
        onRestart={() => {
          setSalesModeResults(null)
          setSalesModeResumeIndex(salesModeResults.reviewed < filteredLeads.length ? salesModeResults.reviewed : 0)
          setSalesModeActive(true)
        }}
        onClose={() => setSalesModeResults(null)}
      />
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
          onNotesChange={(notes) => handleNotesChange(selectedLead.id, notes)}
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

  const activeCount = leads.filter(l => l.status !== 'closed' && l.status !== 'lost').length
  const statusCounts = {
    cold: leads.filter(l => l.status === 'cold').length,
    warm: leads.filter(l => l.status === 'warm').length,
    hot: leads.filter(l => l.status === 'hot').length,
    voicemail: leads.filter(l => l.status === 'voicemail').length,
    negotiation: leads.filter(l => l.status === 'negotiation').length,
  }

  return (
    <div style={{ margin: '-16px -16px 0', minHeight: 'calc(100vh - 64px)', background: 'var(--bg, #F9FAFE)' }}>
      <style jsx global>{`
        :root {
          --cold-bg: oklch(0.96 0.005 240); --cold-fg: oklch(0.40 0.012 240); --cold-dot: oklch(0.55 0.012 240);
          --warm-bg: oklch(0.97 0.06 72);   --warm-fg: oklch(0.48 0.14 65);   --warm-dot: oklch(0.68 0.16 72);
          --hot-bg: oklch(0.97 0.06 40);    --hot-fg: oklch(0.45 0.18 35);    --hot-dot: oklch(0.60 0.22 30);
          --vm-bg: oklch(0.97 0.04 280);    --vm-fg: oklch(0.46 0.18 280);    --vm-dot: oklch(0.60 0.20 280);
          --neg-bg: oklch(0.94 0 0);        --neg-fg: oklch(0.20 0 0);        --neg-dot: oklch(0.22 0 0);
          --closed-bg: oklch(0.96 0.06 145); --closed-fg: oklch(0.42 0.16 145); --closed-dot: oklch(0.58 0.18 145);
          --lost-bg: oklch(0.97 0.03 27);   --lost-fg: oklch(0.48 0.20 27);   --lost-dot: oklch(0.57 0.24 27);
        }
        .sp-tab {
          padding: 5px 14px; border-radius: 9999px; font-size: 10.5px; font-weight: 600;
          border: 1px solid transparent; color: var(--ink-ghost); background: transparent;
          transition: all 120ms; cursor: pointer;
        }
        .sp-tab.active { background: var(--surface); border-color: var(--edge); color: var(--ink); }
        .sp-tab:hover:not(.active) { color: var(--ink-muted); }
        .sp-btn-pill {
          background: var(--ink); color: #fff; border: none; padding: 7px 16px;
          border-radius: 9999px; font-size: 11px; font-weight: 700; letter-spacing: 0.04em;
          display: inline-flex; align-items: center; gap: 6px; cursor: pointer; transition: opacity 130ms;
        }
        .sp-btn-pill:hover { opacity: 0.82; }
        .sp-btn-outline {
          background: transparent; color: var(--ink); border: 1px solid var(--edge);
          padding: 6px 14px; border-radius: 9999px; font-size: 11px; font-weight: 600;
          display: inline-flex; align-items: center; gap: 5px; cursor: pointer; transition: all 130ms;
        }
        .sp-btn-outline:hover { border-color: var(--ink-ghost); background: var(--surface); }
        .sp-filter-pill {
          display: inline-flex; align-items: center; gap: 5px; padding: 4px 13px;
          border-radius: 9999px; font-size: 10.5px; font-weight: 600; border: 1px solid var(--edge);
          background: var(--bg, #F9FAFE); color: var(--ink-ghost); transition: all 120ms;
          white-space: nowrap; cursor: pointer;
        }
        .sp-filter-pill:hover { border-color: var(--ink-ghost); color: var(--ink-muted); }
        .sp-filter-pill.active { background: var(--ink); border-color: var(--ink); color: #fff; }
        .sp-chip {
          display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px;
          border-radius: 9999px; font-size: 9.5px; font-weight: 600; letter-spacing: 0.02em;
          white-space: nowrap; text-transform: lowercase;
        }
        .sp-chip-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
        .sp-chip.cold { background: var(--cold-bg); color: var(--cold-fg); }
        .sp-chip.cold .sp-chip-dot { background: var(--cold-dot); }
        .sp-chip.warm { background: var(--warm-bg); color: var(--warm-fg); }
        .sp-chip.warm .sp-chip-dot { background: var(--warm-dot); }
        .sp-chip.hot { background: var(--hot-bg); color: var(--hot-fg); }
        .sp-chip.hot .sp-chip-dot { background: var(--hot-dot); }
        .sp-chip.voicemail { background: var(--vm-bg); color: var(--vm-fg); }
        .sp-chip.voicemail .sp-chip-dot { background: var(--vm-dot); }
        .sp-chip.negotiation { background: var(--neg-bg); color: var(--neg-fg); }
        .sp-chip.negotiation .sp-chip-dot { background: var(--neg-dot); }
        .sp-chip.closed { background: var(--closed-bg); color: var(--closed-fg); }
        .sp-chip.closed .sp-chip-dot { background: var(--closed-dot); }
        .sp-chip.lost { background: var(--lost-bg); color: var(--lost-fg); }
        .sp-chip.lost .sp-chip-dot { background: var(--lost-dot); }
        .sp-src-chip {
          display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 9999px;
          font-size: 9px; font-weight: 700; letter-spacing: 0.04em; background: var(--surface);
          color: var(--ink-ghost); border: 1px solid var(--edge); text-transform: uppercase;
        }
        .sp-table { width: 100%; border-collapse: collapse; }
        .sp-table th { padding: 9px 16px; border-bottom: 1px solid var(--edge); background: var(--surface); font-size: 8.5px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink-ghost); text-align: left; white-space: nowrap; }
        .sp-table th:first-child { padding-left: 32px; }
        .sp-table th:last-child { padding-right: 32px; }
        .sp-table td { padding: 11px 16px; border-bottom: 1px solid var(--edge-soft); vertical-align: middle; }
        .sp-table td:first-child { padding-left: 32px; }
        .sp-table td:last-child { padding-right: 32px; }
        .sp-table tr:hover td { background: oklch(0.988 0 0); cursor: pointer; }
        .sp-co-name { font-size: 12.5px; font-weight: 700; color: var(--ink); }
        .sp-co-url { font-size: 10.5px; color: var(--ink-ghost); }
        .sp-avatar-sm { width: 22px; height: 22px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 900; color: #fff; flex-shrink: 0; }
        .sp-date-cell { font-size: 11px; color: var(--ink-ghost); font-family: ui-monospace, monospace; }
        .sp-activity-cell { font-size: 11px; color: var(--ink-faint); }
      `}</style>

      {/* ── Frame switcher (zwarte balk) ── */}
      <div style={{ height: 40, background: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 4, padding: '0 24px', position: 'sticky', top: 64, zIndex: 30 }}>
        <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.20em', color: 'rgba(255,255,255,0.28)', marginRight: 10, whiteSpace: 'nowrap' }}>
          Sales pipeline
        </span>
        <button
          onClick={() => setSalesModeActive(false)}
          style={{
            padding: '4px 14px', borderRadius: 9999, fontSize: 10.5, fontWeight: 600, letterSpacing: '0.04em',
            border: '1px solid ' + (!salesModeActive ? 'rgba(255,255,255,0.14)' : 'transparent'),
            background: !salesModeActive ? 'rgba(255,255,255,0.09)' : 'transparent',
            color: !salesModeActive ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.38)',
            transition: 'all 120ms', cursor: 'pointer',
          }}
        >
          Pipeline overzicht
        </button>
        <button
          onClick={() => filteredLeads.length > 0 && setSalesModeActive(true)}
          disabled={filteredLeads.length === 0}
          style={{
            padding: '4px 14px', borderRadius: 9999, fontSize: 10.5, fontWeight: 600, letterSpacing: '0.04em',
            border: '1px solid transparent',
            background: 'transparent',
            color: 'rgba(255,255,255,0.38)',
            transition: 'all 120ms', cursor: filteredLeads.length === 0 ? 'not-allowed' : 'pointer',
            opacity: filteredLeads.length === 0 ? 0.4 : 1,
          }}
        >
          Sales Mode — actief scherm
        </button>
      </div>

      {/* ── Header ── */}
      <div style={{ height: 58, background: 'var(--bg, #F9FAFE)', borderBottom: '1px solid var(--edge)', display: 'flex', alignItems: 'center', padding: '0 24px', position: 'sticky', top: 104, zIndex: 20 }}>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.20em', textTransform: 'uppercase', color: 'var(--ink-ghost)', marginRight: 24, whiteSpace: 'nowrap' }}>
          Sales Pipeline
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <button className={`sp-tab${salesView === 'pipeline' ? ' active' : ''}`} onClick={() => setSalesView('pipeline')}>
            Pipeline
          </button>
          <button className={`sp-tab${salesView === 'cities' ? ' active' : ''}`} onClick={() => setSalesView('cities')}>
            Per stad
          </button>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            className="sp-btn-pill"
            onClick={() => filteredLeads.length > 0 && setSalesModeActive(true)}
            disabled={filteredLeads.length === 0}
            style={{ opacity: filteredLeads.length === 0 ? 0.5 : 1 }}
          >
            <Crosshair className="h-3 w-3" />
            Sales Mode
            <span style={{ background: 'rgba(255,255,255,0.18)', padding: '1px 7px', borderRadius: 9999, fontSize: 10, fontWeight: 700 }}>
              {filteredLeads.length}
            </span>
          </button>
          <button className="sp-btn-outline" onClick={() => setShowCSVModal(true)}>
            <Upload className="h-3 w-3" />
            CSV
          </button>
          <button className="sp-btn-outline" onClick={() => setShowAddModal(true)}>
            <Plus className="h-3 w-3" />
            Nieuw
          </button>
        </div>
      </div>

      {/* ── Goal strip ── */}
      <div style={{ borderBottom: '1px solid var(--edge)', padding: '13px 24px', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.20em', textTransform: 'uppercase', color: 'var(--ink-ghost)', whiteSpace: 'nowrap' }}>
          Road to 1000
        </span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.025em', color: 'var(--accent)' }}>{currentStudios}</span>
          <span style={{ fontSize: 12, color: 'var(--ink-ghost)', fontFamily: 'ui-monospace, monospace' }}>/ {goalStudios.toLocaleString()}</span>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ height: 5, background: 'var(--edge)', borderRadius: 3, position: 'relative' }}>
            <div style={{ height: '100%', background: 'var(--accent)', borderRadius: 3, width: `${progressPercent}%`, transition: 'width 0.5s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
            {milestones.map(ms => (
              <span key={ms.value} style={{ fontSize: 9, fontFamily: 'ui-monospace, monospace', color: 'var(--ink-ghost)' }}>{ms.label}</span>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexShrink: 0 }}>
          <GoalStat val={String(activeCount)} label="Actief" />
          <GoalStat val={String(closedLeads.length)} label="Gesloten" />
          <GoalStat val={`${conversionRate}%`} label="Conversie" color="oklch(0.57 0.24 27)" />
          <GoalStat val={String(totalLeads)} label="Totaal" />
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 24px', borderBottom: '1px solid var(--edge)', background: 'var(--surface)', overflowX: 'auto' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-ghost)', width: 14, height: 14 }} />
          <input
            type="text"
            placeholder="Zoeken op naam, stad, contact…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              border: '1px solid var(--edge)', borderRadius: 9999, background: 'var(--bg, #F9FAFE)',
              padding: '5px 12px 5px 32px', fontSize: 11.5, color: 'var(--ink)',
              outline: 'none', width: 240, transition: 'border-color 130ms',
            }}
          />
        </div>
        <div style={{ width: 1, height: 16, background: 'var(--edge)', flexShrink: 0 }} />
        <button className={`sp-filter-pill${!statusFilter ? ' active' : ''}`} onClick={() => setStatusFilter(null)}>
          Alle statussen
        </button>
        {(['cold', 'warm', 'hot', 'voicemail', 'negotiation'] as const).map(s => {
          const count = statusCounts[s]
          if (count === 0) return null
          const colors = getStatusColor(s)
          return (
            <button
              key={s}
              className={`sp-filter-pill${statusFilter === s ? ' active' : ''}`}
              onClick={() => setStatusFilter(statusFilter === s ? null : s)}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: colors.dot.replace('bg-', '').includes('-') ? undefined : colors.dot }} className={cn('inline-block', colors.dot)} />
              <span style={{ textTransform: 'capitalize' }}>{s === 'negotiation' ? 'Onderhandeling' : s}</span>
              <span style={{ fontFamily: 'ui-monospace, monospace' }}>{count}</span>
            </button>
          )
        })}
        <div style={{ flex: 1 }} />
      </div>

      {/* ── Content ── */}
      {salesView === 'cities' ? (
        <CityOverview
          leads={leads}
          onCityClick={(c) => {
            setCityFilter(c)
            setSalesView('pipeline')
          }}
        />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="sp-table">
            <thead>
              <tr>
                <th>Studio / Bedrijf</th>
                <th>Contactpersoon</th>
                <th>Stad</th>
                <th>Status</th>
                <th style={{ width: 28 }}></th>
                <th>Bron</th>
                <th>Laatste activiteit</th>
                <th>Toegevoegd</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => {
                const colors = getStatusColor(lead.status)
                const approval = getApproval(lead)
                const initials = (lead.contact_name || lead.company_name || '?').split(' ').slice(0, 2).map(s => s[0]).join('').toUpperCase()
                return (
                  <tr key={lead.id} onClick={() => selectLead(lead)}>
                    <td>
                      <div className="sp-co-name">{lead.company_name}</div>
                      {lead.website && <div className="sp-co-url">{lead.website.replace(/^https?:\/\//, '')}</div>}
                    </td>
                    <td>
                      {lead.contact_name ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <div className="sp-avatar-sm" style={{ background: 'var(--accent)' }}>{initials}</div>
                          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-muted)' }}>{lead.contact_name}</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--ink-ghost)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: 'var(--ink-muted)', fontWeight: 500 }}>{lead.city || '—'}</span>
                    </td>
                    <td>
                      <span className={`sp-chip ${lead.status || 'cold'}`}>
                        <span className="sp-chip-dot" />
                        {lead.status || 'cold'}
                      </span>
                    </td>
                    <td>
                      {approval === 'approved' && <ThumbsUp className="h-4 w-4" style={{ color: 'oklch(0.52 0.18 145)' }} />}
                      {approval === 'rejected' && <ThumbsDown className="h-4 w-4" style={{ color: 'oklch(0.57 0.24 27)' }} />}
                    </td>
                    <td>
                      <span className="sp-src-chip">{lead.source || 'Unknown'}</span>
                    </td>
                    <td>
                      <span className="sp-activity-cell">{lead.updated_at && lead.updated_at !== lead.created_at ? `Bijgewerkt ${formatDate(lead.updated_at)}` : 'Toegevoegd'}</span>
                    </td>
                    <td>
                      <span className="sp-date-cell">{formatDate(lead.created_at)}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filteredLeads.length === 0 && (
            <div style={{ padding: 60, textAlign: 'center', fontSize: 13, color: 'var(--ink-ghost)' }}>
              Geen leads gevonden voor dit filter.
            </div>
          )}
        </div>
      )}

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
