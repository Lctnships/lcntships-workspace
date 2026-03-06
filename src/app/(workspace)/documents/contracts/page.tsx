'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Plus,
  FileText,
  Send,
  Check,
  Clock,
  X,
  Download,
  MoreVertical,
  Search,
  Filter,
  Calendar,
  Building2,
  Mail,
  FileUp,
  PenTool,
  Trash2,
  Eye,
  Copy,
  ExternalLink,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'
import { contractsApi } from '@/lib/supabase'

// Types
interface Contract {
  id: string
  title: string
  description?: string
  customer: {
    name: string
    email: string
    company?: string
  }
  status: 'draft' | 'sent' | 'viewed' | 'signed' | 'expired' | 'cancelled'
  fileUrl?: string
  fileName?: string
  createdAt: string
  sentAt?: string
  signedAt?: string
  expiresAt?: string
  signatureUrl?: string
}

// Create/Edit Contract Modal
interface ContractModalProps {
  isOpen: boolean
  onClose: () => void
  contract?: Contract | null
  onSave: (contract: Partial<Contract>) => void
}

function ContractModal({ isOpen, onClose, contract, onSave }: ContractModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [customer, setCustomer] = useState<{ name: string; email: string; company?: string }>({ name: '', email: '', company: '' })
  const [file, setFile] = useState<File | null>(null)
  const [expiresAt, setExpiresAt] = useState('')

  useEffect(() => {
    if (contract) {
      setTitle(contract.title)
      setDescription(contract.description || '')
      setCustomer(contract.customer)
      setExpiresAt(contract.expiresAt ? format(new Date(contract.expiresAt), 'yyyy-MM-dd') : '')
    } else {
      setTitle('')
      setDescription('')
      setCustomer({ name: '', email: '', company: '' })
      setFile(null)
      setExpiresAt('')
    }
  }, [contract, isOpen])

  const handleSave = () => {
    onSave({
      title,
      description,
      customer,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      fileName: file?.name || contract?.fileName,
    })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl m-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold">
            {contract ? 'Contract bewerken' : 'Nieuw Contract'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contract titel *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="bijv. Partner Overeenkomst 2024"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Beschrijving
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Waar gaat dit contract over?"
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Customer */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Klantgegevens</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-2">Naam *</label>
                <input
                  type="text"
                  value={customer.name}
                  onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">Email *</label>
                <input
                  type="email"
                  value={customer.email}
                  onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-2">Bedrijf</label>
              <input
                type="text"
                value={customer.company}
                onChange={(e) => setCustomer({ ...customer, company: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Expiry */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Verloopdatum (optioneel)
            </label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* File Upload */}
          {!contract && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contract document
              </label>
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <FileUp className="h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">
                    {file ? file.name : 'Klik om PDF te uploaden'}
                  </p>
                </div>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
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
            disabled={!title || !customer.name || !customer.email || (!contract && !file)}
            className="gap-2"
          >
            <Check className="h-4 w-4" />
            {contract ? 'Opslaan' : 'Aanmaken'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// Contract Detail View
function ContractDetail({ contract, onClose, onSend, onCancel }: { 
  contract: Contract
  onClose: () => void
  onSend: () => void
  onCancel: () => void 
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl m-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="h-5 w-5 text-gray-500" />
            </button>
            <div>
              <h2 className="text-xl font-bold">{contract.title}</h2>
              {contract.description && (
                <p className="text-sm text-gray-500">{contract.description}</p>
              )}
            </div>
          </div>
          <Badge
            className={cn(
              contract.status === 'signed' && 'bg-emerald-100 text-emerald-700',
              contract.status === 'sent' && 'bg-blue-100 text-blue-700',
              contract.status === 'viewed' && 'bg-purple-100 text-purple-700',
              contract.status === 'draft' && 'bg-gray-100 text-gray-700',
              contract.status === 'expired' && 'bg-red-100 text-red-700',
              contract.status === 'cancelled' && 'bg-gray-100 text-gray-500',
            )}
          >
            {contract.status === 'signed' && 'Ondertekend'}
            {contract.status === 'sent' && 'Verzonden'}
            {contract.status === 'viewed' && 'Bekeken'}
            {contract.status === 'draft' && 'Concept'}
            {contract.status === 'expired' && 'Verlopen'}
            {contract.status === 'cancelled' && 'Geannuleerd'}
          </Badge>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Customer */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Klant</h3>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="font-semibold text-gray-900">{contract.customer.name}</p>
              {contract.customer.company && (
                <p className="text-gray-600">{contract.customer.company}</p>
              )}
              <p className="text-gray-500 text-sm mt-1">{contract.customer.email}</p>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-4">Timeline</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-gray-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Contract aangemaakt</p>
                  <p className="text-sm text-gray-500">
                    {format(new Date(contract.createdAt), 'd MMMM yyyy HH:mm', { locale: nl })}
                  </p>
                </div>
              </div>
              
              {contract.sentAt && (
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Send className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Verzonden naar klant</p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(contract.sentAt), 'd MMMM yyyy HH:mm', { locale: nl })}
                    </p>
                  </div>
                </div>
              )}
              
              {contract.signedAt && (
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                    <PenTool className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Ondertekend door klant</p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(contract.signedAt), 'd MMMM yyyy HH:mm', { locale: nl })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Expiry */}
          {contract.expiresAt && (
            <div className={cn(
              'rounded-xl p-4',
              new Date(contract.expiresAt) < new Date() 
                ? 'bg-red-50 border border-red-200' 
                : 'bg-amber-50 border border-amber-200'
            )}>
              <div className="flex items-center gap-2">
                <Calendar className={cn(
                  'h-5 w-5',
                  new Date(contract.expiresAt) < new Date() ? 'text-red-600' : 'text-amber-600'
                )} />
                <span className={cn(
                  'font-medium',
                  new Date(contract.expiresAt) < new Date() ? 'text-red-900' : 'text-amber-900'
                )}>
                  {new Date(contract.expiresAt) < new Date() 
                    ? 'Verlopen op ' 
                    : 'Verloopt op '}
                  {format(new Date(contract.expiresAt), 'd MMMM yyyy', { locale: nl })}
                </span>
              </div>
            </div>
          )}

          {/* Document */}
          {contract.fileName && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Document</h3>
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <FileText className="h-8 w-8 text-red-500" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{contract.fileName}</p>
                  <p className="text-sm text-gray-500">PDF Document</p>
                </div>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between p-6 border-t border-gray-100">
          <Button variant="outline" onClick={onClose}>
            Sluiten
          </Button>
          <div className="flex gap-2">
            {contract.status === 'draft' && (
              <Button onClick={onSend} className="gap-2">
                <Send className="h-4 w-4" />
                Versturen voor ondertekening
              </Button>
            )}
            {contract.status !== 'signed' && contract.status !== 'cancelled' && (
              <Button variant="outline" onClick={onCancel} className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50">
                <X className="h-4 w-4" />
                Annuleren
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
  const [viewingContract, setViewingContract] = useState<Contract | null>(null)

  // Load contracts from database
  useEffect(() => {
    loadContracts()
  }, [])

  const loadContracts = async () => {
    try {
      setIsLoading(true)
      const data = await contractsApi.getAll()
      // Transform data to match our interface
      const transformed = data.map((c: any) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        customer: {
          name: c.customer_name,
          email: c.customer_email,
          company: c.customer_company,
        },
        status: c.status,
        fileUrl: c.file_url,
        fileName: c.file_name,
        createdAt: c.created_at,
        sentAt: c.sent_at,
        signedAt: c.signed_at,
        expiresAt: c.expires_at,
        signatureUrl: c.signature_url,
      }))
      setContracts(transformed)
    } catch (error) {
      console.error('Error loading contracts:', error)
      alert('Kon contracten niet laden')
    } finally {
      setIsLoading(false)
    }
  }

  // Filter contracts
  const filteredContracts = contracts.filter(contract => {
    const matchesSearch =
      searchQuery === '' ||
      contract.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.customer.company?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || contract.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Sort by date (newest first)
  const sortedContracts = [...filteredContracts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  // Stats
  const stats = {
    total: contracts.length,
    signed: contracts.filter(c => c.status === 'signed').length,
    pending: contracts.filter(c => c.status === 'sent' || c.status === 'viewed').length,
    draft: contracts.filter(c => c.status === 'draft').length,
    expired: contracts.filter(c => c.status === 'expired').length,
  }

  const handleSave = async (contractData: Partial<Contract>) => {
    try {
      if (selectedContract) {
        // Edit existing
        await contractsApi.update(selectedContract.id, {
          title: contractData.title,
          description: contractData.description,
          customer_name: contractData.customer?.name,
          customer_email: contractData.customer?.email,
          customer_company: contractData.customer?.company,
          expires_at: contractData.expiresAt,
        })
      } else {
        // Create new
        await contractsApi.create({
          title: contractData.title!,
          description: contractData.description,
          customer_name: contractData.customer!.name,
          customer_email: contractData.customer!.email,
          customer_company: contractData.customer?.company,
          file_name: contractData.fileName,
          expires_at: contractData.expiresAt,
        })
      }
      
      // Reload contracts
      await loadContracts()
    } catch (error) {
      console.error('Error saving contract:', error)
      alert('Kon contract niet opslaan')
    }
  }

  const handleSend = async (contractId: string) => {
    try {
      await contractsApi.send(contractId)
      await loadContracts()
    } catch (error) {
      console.error('Error sending contract:', error)
      alert('Kon contract niet versturen')
    }
  }

  const handleCancel = async (contractId: string) => {
    if (!confirm('Weet je zeker dat je dit contract wilt annuleren?')) return
    
    try {
      await contractsApi.cancel(contractId)
      await loadContracts()
    } catch (error) {
      console.error('Error cancelling contract:', error)
      alert('Kon contract niet annuleren')
    }
  }

  const handleDelete = async (contractId: string) => {
    if (!confirm('Weet je zeker dat je dit contract wilt verwijderen?')) return
    
    try {
      await contractsApi.delete(contractId)
      setContracts(contracts.filter(c => c.id !== contractId))
    } catch (error) {
      console.error('Error deleting contract:', error)
      alert('Kon contract niet verwijderen')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  const sendContract = (contractId: string) => {
    setContracts(contracts.map(c =>
      c.id === contractId
        ? { ...c, status: 'sent' as const, sentAt: new Date().toISOString() }
        : c
    ))
    setViewingContract(null)
  }

  const cancelContract = (contractId: string) => {
    if (!confirm('Weet je zeker dat je dit contract wilt annuleren?')) return
    setContracts(contracts.map(c =>
      c.id === contractId
        ? { ...c, status: 'cancelled' as const }
        : c
    ))
    setViewingContract(null)
  }

  const getStatusIcon = (status: Contract['status']) => {
    switch (status) {
      case 'signed': return <Check className="h-4 w-4 text-emerald-600" />
      case 'sent': return <Send className="h-4 w-4 text-blue-600" />
      case 'viewed': return <Eye className="h-4 w-4 text-purple-600" />
      case 'draft': return <FileText className="h-4 w-4 text-gray-500" />
      case 'expired': return <Clock className="h-4 w-4 text-red-600" />
      case 'cancelled': return <X className="h-4 w-4 text-gray-400" />
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href="/documents"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Terug naar Documenten
          </Link>
          <h1 className="text-3xl font-black text-gray-900">Contracten</h1>
          <p className="text-gray-500 mt-1">Beheer en volg contracten en overeenkomsten</p>
        </div>
        <Button
          onClick={() => {
            setSelectedContract(null)
            setIsModalOpen(true)
          }}
          className="gap-2 shadow-lg shadow-indigo-200"
        >
          <Plus className="h-4 w-4" />
          Nieuw Contract
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Totaal', value: stats.total, icon: FileText, color: 'text-gray-600', bg: 'bg-gray-100' },
          { label: 'Ondertekend', value: stats.signed, icon: Check, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'In afwachting', value: stats.pending, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Concept', value: stats.draft, icon: FileText, color: 'text-gray-500', bg: 'bg-gray-50' },
          { label: 'Verlopen', value: stats.expired, icon: X, color: 'text-red-600', bg: 'bg-red-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', stat.bg)}>
                <stat.icon className={cn('h-5 w-5', stat.color)} />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Zoek contracten..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">Alle statussen</option>
          <option value="draft">Concept</option>
          <option value="sent">Verzonden</option>
          <option value="viewed">Bekeken</option>
          <option value="signed">Ondertekend</option>
          <option value="expired">Verlopen</option>
          <option value="cancelled">Geannuleerd</option>
        </select>
      </div>

      {/* Contracts List */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {sortedContracts.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nog geen contracten</h3>
            <p className="text-gray-500 mb-6">Maak je eerste contract</p>
            <Button
              onClick={() => {
                setSelectedContract(null)
                setIsModalOpen(true)
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Contract maken
            </Button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left p-4 font-semibold text-gray-600">Contract</th>
                <th className="text-left p-4 font-semibold text-gray-600">Klant</th>
                <th className="text-left p-4 font-semibold text-gray-600">Aangemaakt</th>
                <th className="text-left p-4 font-semibold text-gray-600">Verloopt</th>
                <th className="text-center p-4 font-semibold text-gray-600">Status</th>
                <th className="text-center p-4 font-semibold text-gray-600">Acties</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedContracts.map(contract => (
                <tr
                  key={contract.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setViewingContract(contract)}
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(contract.status)}
                      <div>
                        <span className="font-medium text-gray-900 block">{contract.title}</span>
                        {contract.description && (
                          <span className="text-sm text-gray-500">{contract.description}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div>
                      <p className="font-medium text-gray-900">{contract.customer.name}</p>
                      {contract.customer.company && (
                        <p className="text-sm text-gray-500">{contract.customer.company}</p>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-gray-600">
                    {format(new Date(contract.createdAt), 'd MMM yyyy', { locale: nl })}
                  </td>
                  <td className="p-4 text-gray-600">
                    {contract.expiresAt
                      ? format(new Date(contract.expiresAt), 'd MMM yyyy', { locale: nl })
                      : '-'
                    }
                  </td>
                  <td className="p-4 text-center">
                    <Badge
                      className={cn(
                        contract.status === 'signed' && 'bg-emerald-100 text-emerald-700',
                        contract.status === 'sent' && 'bg-blue-100 text-blue-700',
                        contract.status === 'viewed' && 'bg-purple-100 text-purple-700',
                        contract.status === 'draft' && 'bg-gray-100 text-gray-700',
                        contract.status === 'expired' && 'bg-red-100 text-red-700',
                        contract.status === 'cancelled' && 'bg-gray-100 text-gray-500',
                      )}
                    >
                      {contract.status === 'signed' && 'Ondertekend'}
                      {contract.status === 'sent' && 'Verzonden'}
                      {contract.status === 'viewed' && 'Bekeken'}
                      {contract.status === 'draft' && 'Concept'}
                      {contract.status === 'expired' && 'Verlopen'}
                      {contract.status === 'cancelled' && 'Geannuleerd'}
                    </Badge>
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedContract(contract)
                        setIsModalOpen(true)
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      <ContractModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        contract={selectedContract}
        onSave={handleSave}
      />

      {viewingContract && (
        <ContractDetail
          contract={viewingContract}
          onClose={() => setViewingContract(null)}
          onSend={() => sendContract(viewingContract.id)}
          onCancel={() => cancelContract(viewingContract.id)}
        />
      )}
    </div>
  )
}
