'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Plus,
  Play,
  Pause,
  Trash2,
  Edit3,
  Clock,
  Mail,
  ChevronRight,
  Send,
  Target,
  BarChart3,
  Users,
  MoreVertical,
  Check,
  X,
  AlertCircle,
  Loader2,
  Copy,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { emailSequencesApi, supabase } from '@/lib/supabase'

// Types
interface EmailSequence {
  id: string
  name: string
  description?: string
  status: 'active' | 'paused' | 'draft'
  emails: SequenceEmail[]
  stats: {
    totalEnrolled: number
    active: number
    completed: number
    bounced: number
  }
  createdAt: string
}

interface SequenceEmail {
  id: string
  subject: string
  body: string
  delayDays: number
  order: number
}

// Create/Edit Modal
interface SequenceModalProps {
  isOpen: boolean
  onClose: () => void
  sequence?: EmailSequence | null
  onSave: (sequence: Partial<EmailSequence>) => void
}

function SequenceModal({ isOpen, onClose, sequence, onSave }: SequenceModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [emails, setEmails] = useState<SequenceEmail[]>([])
  const [activeTab, setActiveTab] = useState<'settings' | 'emails'>('settings')

  useEffect(() => {
    if (sequence) {
      setName(sequence.name)
      setDescription(sequence.description || '')
      setEmails(sequence.emails)
    } else {
      setName('')
      setDescription('')
      setEmails([{ id: Date.now().toString(), subject: '', body: '', delayDays: 0, order: 1 }])
    }
  }, [sequence, isOpen])

  const addEmail = () => {
    const lastEmail = emails[emails.length - 1]
    setEmails([...emails, {
      id: Date.now().toString(),
      subject: '',
      body: '',
      delayDays: lastEmail ? lastEmail.delayDays + 3 : 0,
      order: emails.length + 1,
    }])
  }

  const removeEmail = (id: string) => {
    if (emails.length <= 1) return
    setEmails(emails.filter(e => e.id !== id).map((e, i) => ({ ...e, order: i + 1 })))
  }

  const updateEmail = (id: string, field: keyof SequenceEmail, value: string | number) => {
    setEmails(emails.map(e => e.id === id ? { ...e, [field]: value } : e))
  }

  const handleSave = () => {
    onSave({
      name,
      description,
      emails,
      status: 'draft',
    })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl m-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold">
            {sequence ? 'Sequence bewerken' : 'Nieuwe Sequence'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6">
          {[
            { id: 'settings', label: 'Instellingen' },
            { id: 'emails', label: `Emails (${emails.length})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sequence naam *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="bijv. Welkomstserie nieuwe leads"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Beschrijving
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Waar is deze sequence voor bedoeld?"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
            </div>
          )}

          {activeTab === 'emails' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Emails worden verstuurd in volgorde met de opgegeven vertraging
                </p>
                <Button size="sm" onClick={addEmail} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Email toevoegen
                </Button>
              </div>

              <div className="space-y-4">
                {emails.map((email, index) => (
                  <div
                    key={email.id}
                    className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                        {email.order}
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-gray-500">Vertraging</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={email.delayDays}
                            onChange={(e) => updateEmail(email.id, 'delayDays', parseInt(e.target.value) || 0)}
                            min={0}
                            className="w-20 px-3 py-1.5 rounded-lg border border-gray-200 text-sm"
                          />
                          <span className="text-sm text-gray-600">dagen na vorige</span>
                        </div>
                      </div>
                      {emails.length > 1 && (
                        <button
                          onClick={() => removeEmail(email.id)}
                          className="p-2 hover:bg-red-100 text-red-500 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={email.subject}
                        onChange={(e) => updateEmail(email.id, 'subject', e.target.value)}
                        placeholder="Onderwerp"
                        className="w-full px-4 py-2 rounded-lg border border-gray-200 text-sm"
                      />
                      <textarea
                        value={email.body}
                        onChange={(e) => updateEmail(email.id, 'body', e.target.value)}
                        placeholder="Email inhoud... Gebruik {company_name} en {contact_name} als variabelen"
                        rows={4}
                        className="w-full px-4 py-3 rounded-lg border border-gray-200 text-sm resize-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-100">
          <Button variant="outline" onClick={onClose}>
            Annuleren
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name || emails.some(e => !e.subject || !e.body)}
            className="gap-2"
          >
            <Check className="h-4 w-4" />
            {sequence ? 'Opslaan' : 'Aanmaken'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// Enroll Leads Modal
function EnrollModal({ isOpen, onClose, sequence }: { isOpen: boolean; onClose: () => void; sequence: EmailSequence }) {
  const [leads, setLeads] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)

  // Mock leads
  const availableLeads = [
    { id: '1', company: 'Studio Amsterdam', contact: 'Jan Jansen', email: 'jan@studio.nl' },
    { id: '2', company: 'Creative Space', contact: 'Lisa de Vries', email: 'lisa@creative.nl' },
    { id: '3', company: 'Music Hub', contact: 'Peter Bakker', email: 'peter@music.nl' },
  ]

  const toggleLead = (leadId: string) => {
    setLeads(prev =>
      prev.includes(leadId)
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    )
  }

  const handleEnroll = async () => {
    setLoading(true)
    // API call would go here
    await new Promise(resolve => setTimeout(resolve, 1000))
    setLoading(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl m-4 flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold">Leads toevoegen aan &quot;{sequence.name}&quot;</h2>
            <p className="text-sm text-gray-500 mt-1">
              {leads.length} leads geselecteerd
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Zoek leads..."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
          />

          <div className="space-y-2 max-h-80 overflow-auto">
            {availableLeads.map(lead => (
              <label
                key={lead.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={leads.includes(lead.id)}
                  onChange={() => toggleLead(lead.id)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{lead.company}</p>
                  <p className="text-sm text-gray-500">{lead.contact} • {lead.email}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between p-6 border-t border-gray-100">
          <Button variant="outline" onClick={onClose}>
            Annuleren
          </Button>
          <Button
            onClick={handleEnroll}
            disabled={leads.length === 0 || loading}
            className="gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Bezig...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                {leads.length} leads toevoegen
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function SequencesPage() {
  const [sequences, setSequences] = useState<EmailSequence[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEnrollOpen, setIsEnrollOpen] = useState(false)
  const [selectedSequence, setSelectedSequence] = useState<EmailSequence | null>(null)

  // Load sequences from database
  useEffect(() => {
    loadSequences()
  }, [])

  const loadSequences = async () => {
    try {
      setIsLoading(true)
      const data = await emailSequencesApi.getAll()
      // Transform data to match our interface
      const transformed = data.map((s: any) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        status: s.status,
        emails: s.emails?.map((e: any, i: number) => ({
          id: e.id,
          subject: e.subject,
          body: e.body,
          delayDays: e.delay_days,
          order: e.order_index || i,
        })) || [],
        stats: { totalEnrolled: 0, active: 0, completed: 0, bounced: 0 },
        createdAt: s.created_at,
      }))
      setSequences(transformed)
    } catch (error) {
      console.error('Error loading sequences:', error)
      alert('Kon sequences niet laden')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async (sequenceData: Partial<EmailSequence>) => {
    try {
      if (selectedSequence) {
        // Edit existing
        await emailSequencesApi.update(selectedSequence.id, {
          name: sequenceData.name,
          description: sequenceData.description,
        })
        
        // Update emails
        // First delete existing
        for (const email of selectedSequence.emails) {
          await emailSequencesApi.deleteSequenceEmail(email.id)
        }
        
        // Then add new ones
        for (const email of sequenceData.emails || []) {
          await emailSequencesApi.addSequenceEmail({
            sequence_id: selectedSequence.id,
            subject: email.subject,
            body: email.body,
            delay_days: email.delayDays,
            order_index: email.order,
          })
        }
      } else {
        // Create new
        const emails = (sequenceData.emails || []).map((e, i) => ({
          subject: e.subject,
          body: e.body,
          delay_days: e.delayDays,
          order_index: i,
        }))
        
        await emailSequencesApi.create({
          name: sequenceData.name!,
          description: sequenceData.description,
          status: 'draft',
        }, emails)
      }
      
      // Reload sequences
      await loadSequences()
    } catch (error) {
      console.error('Error saving sequence:', error)
      alert('Kon sequence niet opslaan')
    }
  }

  const toggleStatus = async (sequenceId: string) => {
    try {
      const sequence = sequences.find(s => s.id === sequenceId)
      if (!sequence) return
      
      const newStatus = sequence.status === 'active' ? 'paused' : 'active'
      await emailSequencesApi.update(sequenceId, { status: newStatus })
      
      // Update local state
      setSequences(sequences.map(s => 
        s.id === sequenceId ? { ...s, status: newStatus } : s
      ))
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Kon status niet wijzigen')
    }
  }

  const deleteSequence = async (sequenceId: string) => {
    if (!confirm('Weet je zeker dat je deze sequence wilt verwijderen?')) return
    
    try {
      await emailSequencesApi.delete(sequenceId)
      setSequences(sequences.filter(s => s.id !== sequenceId))
    } catch (error) {
      console.error('Error deleting sequence:', error)
      alert('Kon sequence niet verwijderen')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href="/sales"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Terug naar Sales
          </Link>
          <h1 className="text-3xl font-black text-gray-900">Email Sequences</h1>
          <p className="text-gray-500 mt-1">Automatische follow-up emails voor je leads</p>
        </div>
        <Button
          onClick={() => {
            setSelectedSequence(null)
            setIsModalOpen(true)
          }}
          className="gap-2 shadow-lg shadow-indigo-200"
        >
          <Plus className="h-4 w-4" />
          Nieuwe Sequence
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Actieve Sequences', value: sequences.filter(s => s.status === 'active').length, icon: Play, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Gepauzeerd', value: sequences.filter(s => s.status === 'paused').length, icon: Pause, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Total Enrolled', value: sequences.reduce((sum, s) => sum + s.stats.totalEnrolled, 0), icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Actief in Sequence', value: sequences.reduce((sum, s) => sum + s.stats.active, 0), icon: Send, color: 'text-blue-600', bg: 'bg-blue-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100">
            <div className="flex items-center gap-4">
              <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', stat.bg)}>
                <stat.icon className={cn('h-6 w-6', stat.color)} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Sequences List */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold">Alle Sequences</h2>
        </div>

        {sequences.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Mail className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nog geen sequences</h3>
            <p className="text-gray-500 mb-6">Maak je eerste automatische email serie</p>
            <Button
              onClick={() => {
                setSelectedSequence(null)
                setIsModalOpen(true)
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Sequence maken
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {sequences.map(sequence => (
              <div
                key={sequence.id}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{sequence.name}</h3>
                      <Badge
                        className={cn(
                          sequence.status === 'active' && 'bg-emerald-100 text-emerald-700',
                          sequence.status === 'paused' && 'bg-amber-100 text-amber-700',
                          sequence.status === 'draft' && 'bg-gray-100 text-gray-700',
                        )}
                      >
                        {sequence.status === 'active' && 'Actief'}
                        {sequence.status === 'paused' && 'Gepauzeerd'}
                        {sequence.status === 'draft' && 'Concept'}
                      </Badge>
                    </div>
                    {sequence.description && (
                      <p className="text-sm text-gray-500 mb-3">{sequence.description}</p>
                    )}
                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <Mail className="h-4 w-4" />
                        {sequence.emails.length} emails
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        {sequence.emails.reduce((sum, e) => sum + e.delayDays, 0)} dagen totaal
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="h-4 w-4" />
                        {sequence.stats.totalEnrolled} enrolled
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedSequence(sequence)
                        setIsEnrollOpen(true)
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Leads toevoegen
                    </Button>
                    <button
                      onClick={() => toggleStatus(sequence.id)}
                      className={cn(
                        'p-2 rounded-lg transition-colors',
                        sequence.status === 'active'
                          ? 'hover:bg-amber-50 text-amber-600'
                          : 'hover:bg-emerald-50 text-emerald-600'
                      )}
                      title={sequence.status === 'active' ? 'Pauzeren' : 'Activeren'}
                    >
                      {sequence.status === 'active' ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedSequence(sequence)
                        setIsModalOpen(true)
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteSequence(sequence.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Stats Bar */}
                <div className="mt-4 flex items-center gap-6 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-sm text-gray-600">
                      {sequence.stats.active} actief
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-sm text-gray-600">
                      {sequence.stats.completed} voltooid
                    </span>
                  </div>
                  {sequence.stats.bounced > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <span className="text-sm text-gray-600">
                        {sequence.stats.bounced} bounced
                      </span>
                    </div>
                  )}
                </div>

                {/* Email Timeline */}
                <div className="mt-4 flex items-center gap-2">
                  {sequence.emails.map((email, i) => (
                    <div key={email.id} className="flex items-center">
                      <div
                        className="px-3 py-1.5 bg-gray-100 rounded-lg text-xs text-gray-600 truncate max-w-[150px]"
                        title={email.subject}
                      >
                        Dag {email.delayDays}: {email.subject}
                      </div>
                      {i < sequence.emails.length - 1 && (
                        <ChevronRight className="h-4 w-4 text-gray-300 mx-1" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <SequenceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        sequence={selectedSequence}
        onSave={handleSave}
      />

      {selectedSequence && (
        <EnrollModal
          isOpen={isEnrollOpen}
          onClose={() => setIsEnrollOpen(false)}
          sequence={selectedSequence}
        />
      )}
    </div>
  )
}
