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

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 9, fontWeight: 700, letterSpacing: '0.18em',
    textTransform: 'uppercase', color: 'var(--ink-ghost)', marginBottom: 5,
  }
  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    border: '1px solid var(--edge)', borderRadius: 3,
    padding: '8px 10px', fontSize: 12, color: 'var(--ink)',
    background: '#fff', outline: 'none', fontFamily: 'inherit',
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', border: '1px solid var(--edge)', borderRadius: 6, width: '100%', maxWidth: 640, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
      >
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--edge)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
          <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
            {editLead ? 'Lead bewerken' : 'Nieuwe lead'}
          </span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--ink-ghost)', cursor: 'pointer', padding: 2 }}
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px 24px' }}>
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Bedrijfsnaam *</label>
            <input
              type="text"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              style={inputStyle}
              placeholder="Bijv. Studio Amsterdam"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
            <div>
              <label style={labelStyle}>Stad</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                style={inputStyle}
                placeholder="Amsterdam"
              />
            </div>
            <div>
              <label style={labelStyle}>Adres</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                style={inputStyle}
                placeholder="Keizersgracht 123"
              />
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Website</label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              style={inputStyle}
              placeholder="https://www.studio.nl"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
            <div>
              <label style={labelStyle}>Bron</label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                style={inputStyle}
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
              <label style={labelStyle}>Status</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(['cold', 'warm', 'hot', 'voicemail', 'negotiation', 'closed', 'lost'] as const).map(s => {
                  const sc = getStatusColor(s)
                  const active = formData.status === s
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setFormData({ ...formData, status: s })}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold lowercase border transition-all',
                        active ? cn(sc.bg, sc.text, 'border-transparent') : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'
                      )}
                    >
                      <span className={cn('w-1.5 h-1.5 rounded-full', sc.dot)} />
                      {s === 'negotiation' ? 'onderhandeling' : s}
                      {active && <Check style={{ width: 10, height: 10 }} />}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Contactpersonen */}
          <div style={{ borderTop: '1px solid var(--edge-soft)', paddingTop: 18, marginTop: 4, marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <label style={{ ...labelStyle, margin: 0 }}>Contactpersonen</label>
              <button
                type="button"
                onClick={addContact}
                style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <UserPlus style={{ width: 12, height: 12 }} />
                Contact toevoegen
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {contacts.map((contact, index) => (
                <div key={index} style={{ position: 'relative', background: 'var(--surface)', borderRadius: 3, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <button
                      type="button"
                      onClick={() => updateContact(index, 'is_primary', true)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: 9, fontWeight: 700, padding: '2px 8px',
                        letterSpacing: '0.04em', textTransform: 'uppercase',
                        borderRadius: 2, border: 'none', cursor: 'pointer',
                        background: contact.is_primary ? 'var(--accent-tint)' : 'var(--edge)',
                        color: contact.is_primary ? 'var(--accent)' : 'var(--ink-muted)',
                      }}
                    >
                      {contact.is_primary && <Check style={{ width: 10, height: 10 }} />}
                      {contact.is_primary ? 'Primair' : 'Maak primair'}
                    </button>
                    {contacts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeContact(index)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-ghost)', padding: 2 }}
                      >
                        <X style={{ width: 14, height: 14 }} />
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <input
                      type="text"
                      value={contact.name}
                      onChange={(e) => updateContact(index, 'name', e.target.value)}
                      style={inputStyle}
                      placeholder="Naam *"
                    />
                    <input
                      type="text"
                      value={contact.role}
                      onChange={(e) => updateContact(index, 'role', e.target.value)}
                      style={inputStyle}
                      placeholder="Functie (bijv. Manager)"
                    />
                    <input
                      type="email"
                      value={contact.email}
                      onChange={(e) => updateContact(index, 'email', e.target.value)}
                      style={inputStyle}
                      placeholder="E-mail"
                    />
                    <input
                      type="tel"
                      value={contact.phone}
                      onChange={(e) => updateContact(index, 'phone', e.target.value)}
                      style={inputStyle}
                      placeholder="Telefoon"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Studio-ruimtes (optioneel) */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ ...labelStyle, margin: 0 }}>
                Studio-ruimtes <span style={{ fontSize: 9, fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--ink-ghost)' }}>(optioneel)</span>
              </label>
              <button
                type="button"
                onClick={() => setStudioSpaces([...studioSpaces, { name: '', notes: '' }])}
                style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                + Ruimte toevoegen
              </button>
            </div>
            {studioSpaces.length === 0 ? (
              <p style={{ fontSize: 11, color: 'var(--ink-ghost)' }}>
                Vul in als dit bedrijf meerdere studio-ruimtes heeft (bv. Studio 1 — cyclorama).
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {studioSpaces.map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <input
                        type="text"
                        value={s.name}
                        onChange={(e) => {
                          const next = [...studioSpaces]
                          next[i] = { ...next[i], name: e.target.value }
                          setStudioSpaces(next)
                        }}
                        placeholder="Ruimte naam *"
                        style={inputStyle}
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
                        style={inputStyle}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setStudioSpaces(studioSpaces.filter((_, idx) => idx !== i))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-ghost)', padding: '8px 4px' }}
                    >
                      <X style={{ width: 14, height: 14 }} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginBottom: 0 }}>
            <label style={labelStyle}>Notities</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              style={{ ...inputStyle, resize: 'vertical', minHeight: 70 }}
              rows={3}
              placeholder="Extra informatie over deze lead..."
            />
          </div>
        </form>

        <div style={{ padding: '12px 24px', borderTop: '1px solid var(--edge)', display: 'flex', justifyContent: 'flex-end', gap: 8, position: 'sticky', bottom: 0, background: '#fff' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              fontSize: 12, fontWeight: 600, padding: '8px 16px',
              borderRadius: 3, border: '1px solid var(--edge)',
              background: '#fff', color: 'var(--ink)', cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            Annuleren
          </button>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); handleSubmit({ preventDefault: () => {} } as React.FormEvent) }}
            disabled={loading || !formData.company_name.trim()}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 700, padding: '8px 20px',
              borderRadius: 3, border: 'none',
              background: 'var(--accent)', color: '#fff',
              cursor: (loading || !formData.company_name.trim()) ? 'not-allowed' : 'pointer',
              opacity: (loading || !formData.company_name.trim()) ? 0.5 : 1,
            }}
          >
            {loading ? (
              <>
                <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" />
                Opslaan...
              </>
            ) : (
              <>
                {editLead ? <Check style={{ width: 13, height: 13 }} /> : <Plus style={{ width: 13, height: 13 }} />}
                {editLead ? 'Opslaan' : 'Lead toevoegen'}
              </>
            )}
          </button>
        </div>
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
  // Plan call modal
  const [showCallModal, setShowCallModal] = useState(false)
  const today = new Date().toISOString().slice(0, 10)
  const [callDate, setCallDate] = useState(today)
  const [callStart, setCallStart] = useState('10:00')
  const [callEnd, setCallEnd] = useState('10:30')
  const [callNotes, setCallNotes] = useState('')
  const [callSaving, setCallSaving] = useState(false)
  const [callError, setCallError] = useState<string | null>(null)

  const openCallModal = () => {
    setCallDate(new Date().toISOString().slice(0, 10))
    setCallStart('10:00')
    setCallEnd('10:30')
    setCallNotes('')
    setCallError(null)
    setShowCallModal(true)
  }

  const saveCall = async () => {
    setCallSaving(true); setCallError(null)
    try {
      const { error: dbErr } = await workspaceClient
        .from('sales_agenda')
        .insert([{
          lead_id: lead.id,
          title: `Belafspraak ${lead.company_name}`,
          description: callNotes.trim() || null,
          type: 'call',
          date: callDate,
          start_time: callStart,
          end_time: callEnd,
          location: 'Telefonisch',
          status: 'scheduled',
        }])
      if (dbErr) throw new Error(dbErr.message || 'Opslaan mislukt.')
      setShowCallModal(false)
    } catch (e) {
      setCallError(e instanceof Error ? e.message : 'Opslaan mislukt.')
    } finally {
      setCallSaving(false)
    }
  }

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

  const statusLabel = (lead.status || 'cold').charAt(0).toUpperCase() + (lead.status || 'cold').slice(1)
  const statusToneVar: Record<string, string> = {
    cold: 'oklch(0.55 0.012 240)',
    warm: 'oklch(0.68 0.16 72)',
    hot: 'oklch(0.60 0.22 30)',
    voicemail: 'oklch(0.60 0.20 280)',
    negotiation: 'oklch(0.22 0 0)',
    closed: 'oklch(0.58 0.18 145)',
    lost: 'oklch(0.57 0.24 27)',
  }
  const statusColor = statusToneVar[lead.status || 'cold']
  const initials = (lead.company_name || '?').split(' ').slice(0, 2).map(s => s[0]).join('').toUpperCase()
  const primaryContact = contacts.find(c => c.is_primary) || contacts[0]

  // Done-steps uit notes-tag `[STEPS:0,1,2]`
  const stepsMatch = (lead.notes || '').match(/\[STEPS:([\d,]+)\]/)
  const manualDoneSteps = stepsMatch ? stepsMatch[1].split(',').map(n => parseInt(n, 10)).filter(n => !isNaN(n)) : null

  // Sales funnel basisstappen
  const baseFunnelSteps = [
    { name: 'Eerste contact', meta: `Toegevoegd via ${lead.source || 'onbekende bron'}`, date: lead.created_at ? new Date(lead.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }) : undefined },
    { name: 'Kennismaking', meta: 'Eerste contact gelegd' },
    { name: 'Bezoek / demo', meta: 'Studio-bezoek of platform-demo' },
    { name: 'Onderhandeling', meta: 'Voorwaarden besproken' },
    { name: 'Listing-onboarding', meta: 'Info, foto\'s en agenda invoeren' },
    { name: 'Live op platform', meta: 'Boekbaar voor huurders' },
  ]

  // Als geen handmatige steps zijn opgeslagen, leid af uit status
  const autoDoneSteps = (() => {
    const done: number[] = [0] // Eerste contact altijd done
    if (lead.status && !['cold'].includes(lead.status)) done.push(1)
    if (lead.status && ['hot', 'negotiation', 'closed'].includes(lead.status)) done.push(2)
    if (lead.status === 'closed') { done.push(3); done.push(4); done.push(5) }
    return done
  })()

  const doneSteps = manualDoneSteps !== null ? manualDoneSteps : autoDoneSteps
  const activeStep = doneSteps.length < baseFunnelSteps.length ? Math.max(...doneSteps, -1) + 1 : -1

  const funnelSteps = baseFunnelSteps.map((step, i) => ({
    ...step,
    state: doneSteps.includes(i) ? 'done' as const : i === activeStep ? 'active' as const : 'pending' as const,
  }))

  const toggleStep = async (idx: number) => {
    const isDone = doneSteps.includes(idx)
    const newDone = isDone ? doneSteps.filter(d => d !== idx) : [...doneSteps, idx].sort((a, b) => a - b)
    // Strip oude [STEPS:...] tag en voeg nieuwe toe
    const cleanNotes = (lead.notes || '').replace(/\[STEPS:[\d,]*\]\s*/g, '').trim()
    const newNotes = newDone.length > 0
      ? `[STEPS:${newDone.join(',')}] ${cleanNotes}`.trim()
      : cleanNotes
    try {
      await onNotesChange(newNotes)
    } catch (err) {
      console.error('Toggle step failed:', err)
    }
  }

  // Strip approval + steps tags uit notes voor weergave
  const stripTags = (s: string) => s.replace(/\[APPROVAL:(approved|rejected|pending)\]\s*/g, '').replace(/\[STEPS:[\d,]*\]\s*/g, '').trim()
  const displayNotes = stripTags(lead.notes || '')
  const editableDisplayNotes = stripTags(notesValue)

  return (
    <div style={{ margin: '-16px -16px 0', minHeight: 'calc(100vh - 64px)', background: 'var(--bg, #F9FAFE)' }}>
      <style jsx>{`
        .ld-card { background: #fff; border: 1px solid var(--edge); border-radius: 4px; padding: 18px 20px; }
        .ld-card-h { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid var(--edge-soft); }
        .ld-card-h-title { font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-muted); }
        .ld-card-h-action { font-size: 11px; color: var(--accent); font-weight: 600; cursor: pointer; background: none; border: none; padding: 0; }
        .ld-card-h-action:hover { text-decoration: underline; }
        .ld-tab { display: inline-flex; align-items: center; gap: 6px; padding: 0 14px; font-size: 12px; font-weight: 600; color: var(--ink-ghost); cursor: pointer; border: none; background: none; border-bottom: 2px solid transparent; transition: color 0.12s, border-color 0.12s; height: 46px; }
        .ld-tab:hover { color: var(--ink-muted); }
        .ld-tab.active { color: var(--accent); border-bottom-color: var(--accent); }
        .ld-tab-badge { font-size: 10px; padding: 1px 6px; background: var(--surface); color: var(--ink-muted); border-radius: 8px; font-weight: 700; }
        .ld-tab.active .ld-tab-badge { background: var(--accent-tint); color: var(--accent); }
        .ld-btn-sm { display: inline-flex; align-items: center; gap: 5px; padding: 7px 12px; font-size: 12px; font-weight: 600; border: 1px solid var(--edge); cursor: pointer; white-space: nowrap; border-radius: 3px; transition: background 0.12s; background: #fff; color: var(--ink); }
        .ld-btn-sm:hover { background: var(--surface); }
        .ld-btn-sm.primary { background: var(--accent); color: #fff; border-color: var(--accent); }
        .ld-btn-sm.primary:hover { background: #0a3e57; }
        .ld-btn-sm.danger { color: var(--danger); }
        .ld-btn-sm.danger:hover { background: oklch(0.97 0.03 27); }
      `}</style>

      {/* Topbar */}
      <div style={{ height: 52, background: '#fff', borderBottom: '1px solid var(--edge)', display: 'flex', alignItems: 'center', padding: '0 18px', gap: 12, position: 'sticky', top: 64, zIndex: 30 }}>
        <button
          onClick={onBack}
          style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: 'var(--ink-ghost)', cursor: 'pointer', borderRadius: 4 }}
          title="Terug naar pipeline"
        >
          <ArrowLeft style={{ width: 16, height: 16 }} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-muted)', minWidth: 0, flex: 1 }}>
          <span>Sales</span>
          <span style={{ color: 'var(--ink-ghost)' }}>/</span>
          <span>Pipeline</span>
          <span style={{ color: 'var(--ink-ghost)' }}>/</span>
          <span style={{ fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.company_name}</span>
          <span
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '3px 9px', fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
              textTransform: 'uppercase', borderRadius: 2, marginLeft: 8,
              background: '#fff', color: statusColor, border: `1px solid ${statusColor}`,
            }}
          >
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
            {statusLabel}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {lead.email && (
            <a className="ld-btn-sm" href={`mailto:${lead.email}`}>
              <Mail style={{ width: 13, height: 13 }} />
              Bericht
            </a>
          )}
          <button className="ld-btn-sm" onClick={openCallModal}>
            <Phone style={{ width: 13, height: 13 }} />
            Plan call
          </button>
          <button className="ld-btn-sm" onClick={onEdit}>
            <Edit3 style={{ width: 13, height: 13 }} />
            Bewerken
          </button>
          <button className="ld-btn-sm primary" onClick={() => onStatusChange('closed')}>
            <Check style={{ width: 13, height: 13 }} />
            Markeer afgerond
          </button>
          <button className="ld-btn-sm danger" onClick={onDelete} title="Verwijderen">
            <Trash2 style={{ width: 13, height: 13 }} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '22px', maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
          {/* Main column */}
          <div>
            {/* Studio header card */}
            <div className="ld-card">
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ width: 96, height: 96, borderRadius: 4, flexShrink: 0, background: 'linear-gradient(135deg, #0E4F6D 0%, #08B9EE 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 28, fontWeight: 900, letterSpacing: '-0.04em', position: 'relative' }}>
                  {initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--ink)', marginBottom: 4, lineHeight: 1.2 }}>
                    {lead.company_name}
                  </div>
                  {(lead as SalesLead & { tagline?: string }).tagline && (
                    <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginBottom: 10, fontWeight: 500 }}>
                      {(lead as SalesLead & { tagline?: string }).tagline}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 8 }}>
                    {lead.city && (
                      <MetaItem label="Locatie" val={lead.city} />
                    )}
                    {lead.source && (
                      <MetaItem label="Bron" val={lead.source} />
                    )}
                    {lead.assigned_to && (
                      <MetaItem label="Owner" val={lead.assigned_to} muted />
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--edge-soft)' }}>
                {primaryContact && (
                  <ContactRow icon={<Users style={{ width: 12, height: 12 }} />} label="Contact" val={primaryContact.name} />
                )}
                {lead.email && (
                  <ContactRow icon={<Mail style={{ width: 12, height: 12 }} />} label="E-mail" val={lead.email} href={`mailto:${lead.email}`} />
                )}
                {lead.phone && (
                  <ContactRow icon={<Phone style={{ width: 12, height: 12 }} />} label="Telefoon" val={lead.phone} href={`tel:${lead.phone}`} />
                )}
                {lead.website && (
                  <ContactRow icon={<Globe style={{ width: 12, height: 12 }} />} label="Website" val={lead.website.replace(/^https?:\/\//, '')} href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} />
                )}
                {(lead as SalesLead & { address?: string }).address && (
                  <ContactRow icon={<MapPin style={{ width: 12, height: 12 }} />} label="Adres" val={(lead as SalesLead & { address?: string }).address as string} />
                )}
              </div>
            </div>

            {/* Sales-progressie funnel */}
            <div className="ld-card" style={{ marginTop: 16 }}>
              <div className="ld-card-h">
                <span className="ld-card-h-title">Sales-progressie</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {funnelSteps.map((step, i) => {
                  const tone = step.state === 'done'
                    ? { bg: 'oklch(0.96 0.04 145)', border: 'oklch(0.65 0.16 145)', markerBg: 'oklch(0.65 0.16 145)', markerColor: '#fff' }
                    : step.state === 'active'
                      ? { bg: 'oklch(0.96 0.04 70)', border: 'oklch(0.7 0.16 70)', markerBg: 'oklch(0.7 0.16 70)', markerColor: '#fff' }
                      : { bg: '#fff', border: 'var(--edge)', markerBg: 'var(--surface)', markerColor: 'var(--ink-ghost)' }
                  return (
                    <button
                      key={i}
                      onClick={() => toggleStep(i)}
                      title={step.state === 'done' ? 'Klik om weer als open te markeren' : 'Klik om af te vinken'}
                      style={{
                        display: 'flex', gap: 10, alignItems: 'flex-start',
                        padding: '10px 12px', borderRadius: 3,
                        background: tone.bg, border: `1px solid ${tone.border}`,
                        opacity: step.state === 'pending' ? 0.7 : 1,
                        cursor: 'pointer', textAlign: 'left', width: '100%',
                        transition: 'all 0.12s',
                      }}
                    >
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 800, flexShrink: 0,
                        background: tone.markerBg, color: tone.markerColor,
                        border: step.state === 'pending' ? '1px dashed var(--edge)' : 'none',
                      }}>
                        {step.state === 'done' ? <Check style={{ width: 12, height: 12 }} /> : i + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: step.state === 'pending' ? 'var(--ink-ghost)' : 'var(--ink)', marginBottom: 2 }}>
                          {step.name}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{step.meta}</div>
                      </div>
                      {step.date && (
                        <span style={{ fontSize: 10, color: 'var(--ink-ghost)', flexShrink: 0, paddingTop: 4 }}>
                          {step.state === 'active' ? 'Nu' : step.date}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Notities */}
            <div className="ld-card" style={{ marginTop: 16 }}>
              <div className="ld-card-h">
                <span className="ld-card-h-title">Notities</span>
                {!editingNotes && (
                  <button className="ld-card-h-action" onClick={() => setEditingNotes(true)}>
                    {displayNotes ? 'Bewerken' : 'Toevoegen'}
                  </button>
                )}
              </div>
              {editingNotes ? (
                <div>
                  <textarea
                    value={editableDisplayNotes}
                    onChange={(e) => {
                      // Bewaar approval tag, vervang alleen tekst-deel
                      const approvalMatch = notesValue.match(/\[APPROVAL:(approved|rejected|pending)\]/)
                      const tag = approvalMatch ? `${approvalMatch[0]} ` : ''
                      setNotesValue(tag + e.target.value)
                    }}
                    rows={6}
                    style={{
                      width: '100%', boxSizing: 'border-box', border: '1px solid var(--edge)',
                      borderRadius: 3, padding: '10px 12px', fontSize: 12, color: 'var(--ink)',
                      background: 'var(--surface)', outline: 'none', resize: 'vertical', fontFamily: 'inherit',
                    }}
                    placeholder="Notitie toevoegen..."
                    autoFocus
                  />
                  {notesError && (
                    <div style={{ marginTop: 8, padding: '6px 10px', background: 'oklch(0.97 0.03 27)', color: 'var(--danger)', fontSize: 12, borderRadius: 3 }}>
                      {notesError}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 8 }}>
                    <button
                      className="ld-btn-sm"
                      onClick={() => { setEditingNotes(false); setNotesValue(lead.notes || '') }}
                      disabled={savingNotes}
                    >
                      Annuleren
                    </button>
                    <button
                      className="ld-btn-sm primary"
                      onClick={handleSaveNotes}
                      disabled={savingNotes}
                    >
                      {savingNotes ? 'Opslaan...' : 'Opslaan'}
                    </button>
                  </div>
                </div>
              ) : displayNotes ? (
                <div style={{ padding: '12px 14px', border: '1px solid var(--edge)', background: 'var(--surface)', borderRadius: 3 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        N
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink)' }}>Notitie</span>
                    </div>
                    {lead.updated_at && (
                      <span style={{ fontSize: 10, color: 'var(--ink-ghost)' }}>
                        {new Date(lead.updated_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-muted)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{displayNotes}</div>
                </div>
              ) : (
                <div
                  onClick={() => setEditingNotes(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', border: '1px dashed var(--edge)', borderRadius: 3, cursor: 'pointer', color: 'var(--ink-ghost)' }}
                >
                  <Plus style={{ width: 13, height: 13 }} />
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Notitie toevoegen</span>
                </div>
              )}
            </div>

            {/* Contactpersonen */}
            {contacts.length > 0 && (
              <div className="ld-card" style={{ marginTop: 16 }}>
                <div className="ld-card-h">
                  <span className="ld-card-h-title">Contactpersonen ({contacts.length})</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {contacts.map((c) => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 12, background: 'var(--surface)', borderRadius: 3 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {c.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{c.name}</span>
                          {c.is_primary && (
                            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', padding: '1px 6px', background: 'var(--accent-tint)', color: 'var(--accent)', borderRadius: 2 }}>
                              Primair
                            </span>
                          )}
                          {c.role && <span style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{c.role}</span>}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 12, color: 'var(--ink-muted)' }}>
                          {c.email && (
                            <a href={`mailto:${c.email}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--accent)' }}>
                              <Mail style={{ width: 12, height: 12 }} />
                              {c.email}
                            </a>
                          )}
                          {c.phone && (
                            <a href={`tel:${c.phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--ink)' }}>
                              <Phone style={{ width: 12, height: 12 }} />
                              {c.phone}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Email versturen */}
            {(lead.email || contacts.some(c => c.email)) && (
              <div className="ld-card" style={{ marginTop: 16 }}>
                <div className="ld-card-h">
                  <span className="ld-card-h-title">Email</span>
                </div>
                <Link
                  href={`/email?lead=${lead.id}`}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    width: '100%', padding: '12px 16px', background: 'var(--accent)', color: '#fff',
                    borderRadius: 3, fontSize: 13, fontWeight: 700,
                    textDecoration: 'none', transition: 'background 0.12s',
                  }}
                >
                  <Send style={{ width: 14, height: 14 }} />
                  Email versturen
                </Link>
              </div>
            )}

            {/* Status wijzigen */}
            <div className="ld-card" style={{ marginTop: 16 }}>
              <div className="ld-card-h">
                <span className="ld-card-h-title">Status wijzigen</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(['cold', 'warm', 'hot', 'voicemail', 'negotiation', 'closed', 'lost'] as const).map(s => {
                  const sc = getStatusColor(s)
                  const active = lead.status === s
                  return (
                    <button
                      key={s}
                      onClick={() => onStatusChange(s)}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold lowercase border transition-all',
                        active ? cn(sc.bg, sc.text, 'border-transparent') : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'
                      )}
                    >
                      <span className={cn('w-1.5 h-1.5 rounded-full', sc.dot)} />
                      {s === 'negotiation' ? 'onderhandeling' : s}
                      {active && <Check style={{ width: 10, height: 10 }} />}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div>
            {/* Next action */}
            <div style={{ background: 'var(--accent)', color: '#fff', padding: '16px 18px', borderRadius: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)' }}>Volgende actie</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3, marginBottom: 4 }}>
                {lead.status === 'cold' && 'Eerste contact leggen'}
                {lead.status === 'warm' && 'Studio-bezoek of demo plannen'}
                {lead.status === 'hot' && 'Voorstel doen'}
                {lead.status === 'voicemail' && 'Terugbellen'}
                {lead.status === 'negotiation' && 'Voorwaarden afronden'}
                {lead.status === 'closed' && 'Listing-onboarding starten'}
                {lead.status === 'lost' && 'Lead afgesloten — geen actie nodig'}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginBottom: 12 }}>
                {primaryContact ? `Contact: ${primaryContact.name}` : 'Geen contactpersoon toegevoegd'}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {lead.email && (
                  <a
                    href={`mailto:${lead.email}`}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, height: 32, padding: '0 10px', fontSize: 12, fontWeight: 600, background: '#fff', color: 'var(--accent)', borderRadius: 3, textDecoration: 'none' }}
                  >
                    <Mail style={{ width: 13, height: 13 }} />
                    Mail
                  </a>
                )}
                {lead.phone && (
                  <a
                    href={`tel:${lead.phone}`}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, height: 32, padding: '0 10px', fontSize: 12, fontWeight: 600, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: 3, textDecoration: 'none' }}
                  >
                    <Phone style={{ width: 13, height: 13 }} />
                    Bel
                  </a>
                )}
              </div>
            </div>

            {/* Sales-data */}
            <div className="ld-card" style={{ marginTop: 14, padding: '16px 18px' }}>
              <div className="ld-card-h" style={{ marginBottom: 12 }}>
                <span className="ld-card-h-title">Sales-data</span>
              </div>
              <DataRow k="Status" v={statusLabel} color={statusColor} />
              <DataRow k="Bron" v={lead.source || '—'} muted />
              <DataRow k="Owner" v={lead.assigned_to || '—'} muted />
              <DataRow k="Eerste contact" v={lead.created_at ? new Date(lead.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} muted />
              <DataRow k="Laatste activiteit" v={lead.updated_at ? new Date(lead.updated_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} muted />
            </div>

            {/* Marketing-context */}
            <div className="ld-card" style={{ marginTop: 14, padding: '16px 18px' }}>
              <div className="ld-card-h" style={{ marginBottom: 12 }}>
                <span className="ld-card-h-title">Marketing-context</span>
              </div>
              <CtxRow icon={<Building2 style={{ width: 12, height: 12 }} />} label="Bron" val={lead.source || 'Onbekend'} />
              {lead.city && <CtxRow icon={<MapPin style={{ width: 12, height: 12 }} />} label="Locatie" val={lead.city} />}
              {(lead as SalesLead & { enriched?: boolean }).enriched && (
                <CtxRow icon={<Sparkles style={{ width: 12, height: 12 }} />} label="Verrijkt" val="Apollo data toegevoegd" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Plan call modal */}
      {showCallModal && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setShowCallModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#fff', border: '1px solid var(--edge)', borderRadius: 6, width: '100%', maxWidth: 480, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--edge)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.01em' }}>Belafspraak plannen</span>
              <button onClick={() => setShowCallModal(false)} style={{ background: 'none', border: 'none', color: 'var(--ink-ghost)', cursor: 'pointer', padding: 2 }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-ghost)', marginBottom: 5 }}>Studio</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{lead.company_name}</div>
              </div>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-ghost)', marginBottom: 5 }}>Datum</div>
                <input
                  type="date"
                  value={callDate}
                  onChange={(e) => setCallDate(e.target.value)}
                  style={{ width: '100%', border: '1px solid var(--edge)', borderRadius: 3, padding: '8px 10px', fontSize: 12, color: 'var(--ink)', background: '#fff', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-ghost)', marginBottom: 5 }}>Begintijd</div>
                  <input
                    type="time"
                    value={callStart}
                    onChange={(e) => setCallStart(e.target.value)}
                    style={{ width: '100%', border: '1px solid var(--edge)', borderRadius: 3, padding: '8px 10px', fontSize: 12, color: 'var(--ink)', background: '#fff', outline: 'none' }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-ghost)', marginBottom: 5 }}>Eindtijd</div>
                  <input
                    type="time"
                    value={callEnd}
                    onChange={(e) => setCallEnd(e.target.value)}
                    style={{ width: '100%', border: '1px solid var(--edge)', borderRadius: 3, padding: '8px 10px', fontSize: 12, color: 'var(--ink)', background: '#fff', outline: 'none' }}
                  />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-ghost)', marginBottom: 5 }}>Notities</div>
                <textarea
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  rows={3}
                  placeholder="Onderwerpen, aandachtspunten…"
                  style={{ width: '100%', border: '1px solid var(--edge)', borderRadius: 3, padding: '8px 10px', fontSize: 12, color: 'var(--ink)', background: '#fff', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
              {callError && (
                <div style={{ padding: '6px 10px', background: 'oklch(0.97 0.03 27)', color: 'var(--danger)', fontSize: 12, borderRadius: 3 }}>
                  {callError}
                </div>
              )}
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--edge)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="ld-btn-sm" onClick={() => setShowCallModal(false)} disabled={callSaving}>
                Annuleren
              </button>
              <button className="ld-btn-sm primary" onClick={saveCall} disabled={callSaving}>
                {callSaving ? 'Opslaan...' : 'Plan call'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper sub-components voor LeadDetail
function MetaItem({ label, val, muted }: { label: string; val: string; muted?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-ghost)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: muted ? 600 : 700, color: muted ? 'var(--ink-muted)' : 'var(--ink)' }}>{val}</span>
    </div>
  )
}

function ContactRow({ icon, label, val, href }: { icon: React.ReactNode; label: string; val: string; href?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
      <div style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', color: 'var(--ink-muted)', borderRadius: 3, flexShrink: 0 }}>
        {icon}
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-ghost)', letterSpacing: '0.04em', textTransform: 'uppercase', minWidth: 60 }}>{label}</span>
      {href ? (
        <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {val}
        </a>
      ) : (
        <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{val}</span>
      )}
    </div>
  )
}

function DataRow({ k, v, muted, color }: { k: string; v: string; muted?: boolean; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--edge-soft)', gap: 8 }}>
      <span style={{ fontSize: 11, color: 'var(--ink-ghost)', fontWeight: 600 }}>{k}</span>
      <span style={{ fontSize: 12, color: color || (muted ? 'var(--ink-muted)' : 'var(--ink)'), fontWeight: muted ? 500 : 700, textAlign: 'right' }}>{v}</span>
    </div>
  )
}

function CtxRow({ icon, label, val }: { icon: React.ReactNode; label: string; val: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 0', borderBottom: '1px solid var(--edge-soft)' }}>
      <div style={{ width: 22, height: 22, flexShrink: 0, borderRadius: 3, background: 'var(--accent-tint)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-ghost)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 1 }}>{label}</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.4 }}>{val}</div>
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
  const cityBtnRef = useRef<HTMLButtonElement>(null)
  const [cityDropdownPos, setCityDropdownPos] = useState<{ top: number; left: number } | null>(null)

  const openCityDropdown = () => {
    if (!showCityDropdown && cityBtnRef.current) {
      const rect = cityBtnRef.current.getBoundingClientRect()
      setCityDropdownPos({ top: rect.bottom + 6, left: rect.left })
    }
    setShowCityDropdown(!showCityDropdown)
  }

  // Close on outside click + reposition on scroll/resize
  useEffect(() => {
    if (!showCityDropdown) return
    const close = (e: MouseEvent) => {
      const target = e.target as Node
      if (cityBtnRef.current && !cityBtnRef.current.contains(target)) {
        const dd = document.getElementById('city-dropdown-portal')
        if (!dd || !dd.contains(target)) setShowCityDropdown(false)
      }
    }
    const reposition = () => {
      if (cityBtnRef.current) {
        const rect = cityBtnRef.current.getBoundingClientRect()
        setCityDropdownPos({ top: rect.bottom + 6, left: rect.left })
      }
    }
    document.addEventListener('mousedown', close)
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      document.removeEventListener('mousedown', close)
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [showCityDropdown])
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


      {/* ── Header ── */}
      <div style={{ height: 58, background: 'var(--bg, #F9FAFE)', borderBottom: '1px solid var(--edge)', display: 'flex', alignItems: 'center', padding: '0 24px', position: 'sticky', top: 64, zIndex: 20 }}>
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
        <div style={{ width: 1, height: 16, background: 'var(--edge)', flexShrink: 0 }} />
        {/* Stad-filter dropdown */}
        <button
          ref={cityBtnRef}
          className={`sp-filter-pill${cityFilter ? ' active' : ''}`}
          onClick={openCityDropdown}
        >
          <MapPin style={{ width: 11, height: 11 }} />
          {cityFilter || 'Alle steden'}
          <ChevronDown style={{ width: 11, height: 11 }} />
        </button>
        <div style={{ flex: 1 }} />
      </div>

      {/* Stad-dropdown (fixed, buiten filter-bar overflow context) */}
      {showCityDropdown && cityDropdownPos && (
        <div
          id="city-dropdown-portal"
          style={{
            position: 'fixed',
            top: cityDropdownPos.top,
            left: cityDropdownPos.left,
            background: 'var(--bg, #F9FAFE)',
            border: '1px solid var(--edge)',
            borderRadius: 6,
            padding: '6px 0',
            minWidth: 200,
            maxHeight: 320,
            overflowY: 'auto',
            boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
            zIndex: 1000,
          }}
        >
          <button
            onClick={() => { setCityFilter(null); setShowCityDropdown(false) }}
            style={{
              width: '100%', textAlign: 'left', padding: '6px 14px', fontSize: 11.5,
              background: !cityFilter ? 'var(--surface)' : 'transparent',
              fontWeight: !cityFilter ? 600 : 500,
              color: 'var(--ink)', border: 'none', cursor: 'pointer',
            }}
          >
            Alle steden
          </button>
          {uniqueCities.map(city => (
            <button
              key={city}
              onClick={() => { setCityFilter(city); setShowCityDropdown(false) }}
              style={{
                width: '100%', textAlign: 'left', padding: '6px 14px', fontSize: 11.5,
                background: cityFilter === city ? 'var(--surface)' : 'transparent',
                fontWeight: cityFilter === city ? 600 : 500,
                color: 'var(--ink)', border: 'none', cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}
            >
              <span>{city}</span>
              <span style={{ fontSize: 10, color: 'var(--ink-ghost)', fontFamily: 'ui-monospace, monospace' }}>
                {cityCountMap.get(city) || 0}
              </span>
            </button>
          ))}
          <div style={{ borderTop: '1px solid var(--edge)', marginTop: 4, paddingTop: 4 }}>
            <button
              onClick={(e) => { e.stopPropagation(); handleNormalizeCities() }}
              disabled={normalizingCities}
              style={{
                width: '100%', textAlign: 'left', padding: '6px 14px', fontSize: 11,
                background: 'transparent', color: 'oklch(0.50 0.18 295)',
                border: 'none', cursor: normalizingCities ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                opacity: normalizingCities ? 0.5 : 1,
              }}
            >
              {normalizingCities ? (
                <><Loader2 style={{ width: 11, height: 11 }} className="animate-spin" /> AI normaliseert steden...</>
              ) : (
                <><Sparkles style={{ width: 11, height: 11 }} /> Steden opschonen (AI)</>
              )}
            </button>
          </div>
        </div>
      )}

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
