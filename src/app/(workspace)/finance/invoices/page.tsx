'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Plus,
  Search,
  Download,
  Send,
  Check,
  Clock,
  AlertCircle,
  X,
  FileText,
  MoreVertical,
  Filter,
  Calendar,
  Building2,
  Mail,
  Phone,
  Loader2,
  Copy,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'
import { invoicesApi } from '@/lib/supabase'

// Types
interface Invoice {
  id: string
  invoiceNumber: string
  customer: {
    name: string
    email: string
    company?: string
    address?: string
  }
  items: InvoiceItem[]
  subtotal: number
  tax: number
  total: number
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  issueDate: string
  dueDate: string
  paidDate?: string
  notes?: string
}

interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  total: number
}

// Generate next invoice number
const generateInvoiceNumber = () => {
  const year = new Date().getFullYear()
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `INV-${year}-${random}`
}

// Create/Edit Invoice Modal
interface InvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  invoice?: Invoice | null
  onSave: (invoice: Partial<Invoice>) => void
}

function InvoiceModal({ isOpen, onClose, invoice, onSave }: InvoiceModalProps) {
  const [customer, setCustomer] = useState<{ name: string; email: string; company?: string; address?: string }>({ name: '', email: '', company: '', address: '' })
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [notes, setNotes] = useState('')
  const [issueDate, setIssueDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [dueDate, setDueDate] = useState(format(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'))

  useEffect(() => {
    if (invoice) {
      setCustomer(invoice.customer)
      setItems(invoice.items)
      setNotes(invoice.notes || '')
          setIssueDate(format(new Date(invoice.issueDate), 'yyyy-MM-dd'))
          setDueDate(format(new Date(invoice.dueDate), 'yyyy-MM-dd'))
    } else {
      setCustomer({ name: '', email: '', company: '', address: '' })
          setItems([{ id: Date.now().toString(), description: '', quantity: 1, unitPrice: 0, total: 0 }])
      setNotes('')
          setIssueDate(format(new Date(), 'yyyy-MM-dd'))
          setDueDate(format(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'))
    }
  }, [invoice, isOpen])

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), description: '', quantity: 1, unitPrice: 0, total: 0 }])
  }

  const removeItem = (id: string) => {
    if (items.length <= 1) return
    setItems(items.filter(i => i.id !== id))
  }

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id !== id) return item
      const updated = { ...item, [field]: value }
      if (field === 'quantity' || field === 'unitPrice') {
        updated.total = updated.quantity * updated.unitPrice
      }
      return updated
    }))
  }

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0)
    const tax = subtotal * 0.21 // 21% BTW
    return { subtotal, tax, total: subtotal + tax }
  }

  const handleSave = () => {
    const totals = calculateTotals()
    onSave({
      customer,
      items,
      notes,
      issueDate: new Date(issueDate).toISOString(),
      dueDate: new Date(dueDate).toISOString(),
      ...totals,
      status: 'draft',
    })
    onClose()
  }

  const { subtotal, tax, total } = calculateTotals()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl m-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold">
            {invoice ? 'Factuur bewerken' : 'Nieuwe Factuur'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Customer Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Klant naam *</label>
              <input
                type="text"
                value={customer.name}
                onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
              <input
                type="email"
                value={customer.email}
                onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bedrijf</label>
              <input
                type="text"
                value={customer.company}
                onChange={(e) => setCustomer({ ...customer, company: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Adres</label>
              <input
                type="text"
                value={customer.address}
                onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Factuurdatum</label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Vervaldatum</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-700">Factuurregels</label>
              <Button size="sm" onClick={addItem} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Regel toevoegen
              </Button>
            </div>
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={item.id} className="flex gap-3 items-start">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      placeholder="Omschrijving"
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 text-sm"
                    />
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                      placeholder="Aantal"
                      min={1}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-center"
                    />
                  </div>
                  <div className="w-32">
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                      placeholder="Prijs"
                      min={0}
                      step={0.01}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                    />
                  </div>
                  <div className="w-32 px-3 py-2 bg-gray-50 rounded-lg text-sm text-right font-medium">
                    € {item.total.toFixed(2)}
                  </div>
                  {items.length > 1 && (
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotaal</span>
              <span className="font-medium">€ {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">BTW (21%)</span>
              <span className="font-medium">€ {tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
              <span>Totaal</span>
              <span>€ {total.toFixed(2)}</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Opmerkingen</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Betalingstermijn, bankgegevens, etc."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-100">
          <Button variant="outline" onClick={onClose}>
            Annuleren
          </Button>
          <Button
            onClick={handleSave}
            disabled={!customer.name || !customer.email || items.some(i => !i.description)}
            className="gap-2"
          >
            <Check className="h-4 w-4" />
            {invoice ? 'Opslaan' : 'Aanmaken'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// Invoice Detail View
function InvoiceDetail({ invoice, onClose, onMarkPaid, onSend }: { invoice: Invoice; onClose: () => void; onMarkPaid: () => void; onSend?: () => void }) {
  const [sending, setSending] = useState(false)
  
  const handleDownloadPDF = async () => {
    try {
      const response = await fetch(`/api/invoices/pdf?id=${invoice.id}`)
      if (!response.ok) throw new Error('PDF generation failed')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${invoice.invoiceNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('PDF download error:', error)
      alert('Kon PDF niet downloaden')
    }
  }
  
  const handleSend = async () => {
    if (!onSend) return
    setSending(true)
    try {
      await onSend()
      alert('Factuur verstuurd!')
    } catch (error) {
      console.error('Send error:', error)
      alert('Kon factuur niet versturen')
    } finally {
      setSending(false)
    }
  }
  
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
              <h2 className="text-xl font-bold">{invoice.invoiceNumber}</h2>
              <p className="text-sm text-gray-500">
                {format(new Date(invoice.issueDate), 'd MMMM yyyy', { locale: nl })}
              </p>
            </div>
          </div>
          <Badge
            className={cn(
              invoice.status === 'paid' && 'bg-emerald-100 text-emerald-700',
              invoice.status === 'sent' && 'bg-blue-100 text-blue-700',
              invoice.status === 'draft' && 'bg-gray-100 text-gray-700',
              invoice.status === 'overdue' && 'bg-red-100 text-red-700',
              invoice.status === 'cancelled' && 'bg-gray-100 text-gray-500',
            )}
          >
            {invoice.status === 'paid' && 'Betaald'}
            {invoice.status === 'sent' && 'Verzonden'}
            {invoice.status === 'draft' && 'Concept'}
            {invoice.status === 'overdue' && 'Achterstallig'}
            {invoice.status === 'cancelled' && 'Geannuleerd'}
          </Badge>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Customer */}
          <div className="mb-8">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Factuur aan</h3>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="font-semibold text-gray-900">{invoice.customer.name}</p>
              {invoice.customer.company && (
                <p className="text-gray-600">{invoice.customer.company}</p>
              )}
              <p className="text-gray-500 text-sm mt-1">{invoice.customer.email}</p>
              {invoice.customer.address && (
                <p className="text-gray-500 text-sm">{invoice.customer.address}</p>
              )}
            </div>
          </div>

          {/* Items */}
          <table className="w-full mb-8">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 text-sm font-medium text-gray-500">Omschrijving</th>
                <th className="text-center py-3 text-sm font-medium text-gray-500">Aantal</th>
                <th className="text-right py-3 text-sm font-medium text-gray-500">Prijs</th>
                <th className="text-right py-3 text-sm font-medium text-gray-500">Totaal</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map(item => (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="py-3">{item.description}</td>
                  <td className="py-3 text-center">{item.quantity}</td>
                  <td className="py-3 text-right">€ {item.unitPrice.toFixed(2)}</td>
                  <td className="py-3 text-right font-medium">€ {item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotaal</span>
                <span>€ {invoice.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">BTW (21%)</span>
                <span>€ {invoice.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                <span>Totaal</span>
                <span>€ {invoice.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-amber-50 rounded-xl p-4">
            <h4 className="font-medium text-amber-900 mb-2">Betalingsgegevens</h4>
            <p className="text-sm text-amber-700">
              Te betalen voor {format(new Date(invoice.dueDate), 'd MMMM yyyy', { locale: nl })}
            </p>
            {invoice.status === 'paid' && invoice.paidDate && (
              <p className="text-sm text-emerald-700 mt-1">
                Betaald op {format(new Date(invoice.paidDate), 'd MMMM yyyy', { locale: nl })}
              </p>
            )}
          </div>

          {invoice.notes && (
            <div className="mt-6">
              <h4 className="font-medium text-gray-900 mb-2">Opmerkingen</h4>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between p-6 border-t border-gray-100">
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={handleDownloadPDF}>
              <Download className="h-4 w-4" />
              PDF
            </Button>
            {invoice.status !== 'paid' && onSend && (
              <Button 
                variant="outline" 
                className="gap-2" 
                onClick={handleSend}
                disabled={sending}
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Versturen...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Versturen
                  </>
                )}
              </Button>
            )}
          </div>
          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
            <Button onClick={onMarkPaid} className="gap-2">
              <Check className="h-4 w-4" />
              Markeer als betaald
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null)

  // Load invoices from database
  useEffect(() => {
    loadInvoices()
  }, [])

  const loadInvoices = async () => {
    try {
      setIsLoading(true)
      const data = await invoicesApi.getAll()
      // Transform data to match our interface
      const transformed = data.map((i: any) => ({
        id: i.id,
        invoiceNumber: i.invoice_number,
        customer: {
          name: i.customer_name,
          email: i.customer_email,
          company: i.customer_company,
          address: i.customer_address,
        },
        items: i.items?.map((item: any) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          total: item.total,
        })) || [],
        subtotal: i.subtotal,
        tax: i.tax_amount,
        total: i.total,
        status: i.status,
        issueDate: i.issue_date,
        dueDate: i.due_date,
        paidDate: i.paid_at,
        notes: i.notes,
      }))
      setInvoices(transformed)
    } catch (error) {
      console.error('Error loading invoices:', error)
      alert('Kon facturen niet laden')
    } finally {
      setIsLoading(false)
    }
  }

  // Filter invoices
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch =
      searchQuery === '' ||
      invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.customer.company?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Sort by date (newest first)
  const sortedInvoices = [...filteredInvoices].sort(
    (a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()
  )

  // Stats
  const stats = {
    total: invoices.length,
    paid: invoices.filter(i => i.status === 'paid').length,
    outstanding: invoices.filter(i => i.status === 'sent' || i.status === 'overdue').length,
    overdue: invoices.filter(i => i.status === 'overdue').length,
    revenue: invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total, 0),
    outstandingAmount: invoices.filter(i => i.status === 'sent' || i.status === 'overdue').reduce((sum, i) => sum + i.total, 0),
  }

  const handleSave = async (invoiceData: Partial<Invoice>) => {
    try {
      const items = (invoiceData.items || []).map(item => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total: item.total,
      }))

      if (selectedInvoice) {
        // Edit existing
        await invoicesApi.update(
          selectedInvoice.id,
          {
            customer_name: invoiceData.customer?.name,
            customer_email: invoiceData.customer?.email,
            customer_company: invoiceData.customer?.company,
            customer_address: invoiceData.customer?.address,
            subtotal: invoiceData.subtotal,
            tax_amount: invoiceData.tax,
            total: invoiceData.total,
            issue_date: invoiceData.issueDate,
            due_date: invoiceData.dueDate,
            notes: invoiceData.notes,
          },
          items
        )
      } else {
        // Create new
        await invoicesApi.create(
          {
            invoice_number: generateInvoiceNumber(),
            customer_name: invoiceData.customer!.name,
            customer_email: invoiceData.customer!.email,
            customer_company: invoiceData.customer?.company,
            customer_address: invoiceData.customer?.address,
            subtotal: invoiceData.subtotal!,
            tax_amount: invoiceData.tax!,
            total: invoiceData.total!,
            issue_date: invoiceData.issueDate!,
            due_date: invoiceData.dueDate!,
            notes: invoiceData.notes,
            status: 'draft',
          },
          items
        )
      }
      
      // Reload invoices
      await loadInvoices()
    } catch (error) {
      console.error('Error saving invoice:', error)
      alert('Kon factuur niet opslaan')
    }
  }

  const markAsPaid = async (invoiceId: string) => {
    try {
      await invoicesApi.markAsPaid(invoiceId)
      await loadInvoices()
      setViewingInvoice(null)
    } catch (error) {
      console.error('Error marking as paid:', error)
      alert('Kon factuur niet markeren als betaald')
    }
  }

  const handleDelete = async (invoiceId: string) => {
    if (!confirm('Weet je zeker dat je deze factuur wilt verwijderen?')) return
    
    try {
      await invoicesApi.delete(invoiceId)
      setInvoices(invoices.filter(i => i.id !== invoiceId))
    } catch (error) {
      console.error('Error deleting invoice:', error)
      alert('Kon factuur niet verwijderen')
    }
  }

  const sendInvoice = async (invoiceId: string) => {
    try {
      const invoice = invoices.find(i => i.id === invoiceId)
      if (!invoice) return
      
      // Generate PDF first
      const pdfResponse = await fetch('/api/invoices/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId })
      })
      
      if (!pdfResponse.ok) throw new Error('PDF generation failed')
      const { pdfUrl } = await pdfResponse.json()
      
      // Send email
      const emailResponse = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: { name: invoice.customer.name, email: invoice.customer.email },
          subject: `Factuur ${invoice.invoiceNumber}`,
          message: `Beste ${invoice.customer.name},\n\nHierbij ontvangt u factuur ${invoice.invoiceNumber}.\n\nTotaalbedrag: € ${invoice.total.toFixed(2)}\nVervaldatum: ${format(new Date(invoice.dueDate), 'd MMMM yyyy', { locale: nl })}\n\nMet vriendelijke groet,\nlcntships`,
          from: 'Rivaldo van lcntships <rivaldomacandrew@lctnships.com>',
        })
      })
      
      if (!emailResponse.ok) throw new Error('Email send failed')
      
      // Update status to sent
      await invoicesApi.update(invoiceId, { status: 'sent' })
      await loadInvoices()
    } catch (error) {
      console.error('Error sending invoice:', error)
      throw error
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-900" />
      </div>
    )
  }

  const getStatusIcon = (status: Invoice['status']) => {
    switch (status) {
      case 'paid': return <Check className="h-4 w-4 text-emerald-600" />
      case 'sent': return <Send className="h-4 w-4 text-blue-600" />
      case 'draft': return <FileText className="h-4 w-4 text-gray-500" />
      case 'overdue': return <AlertCircle className="h-4 w-4 text-red-600" />
      case 'cancelled': return <X className="h-4 w-4 text-gray-400" />
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href="/finance"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Terug naar Finance
          </Link>
          <h1 className="text-3xl font-black text-gray-900">Facturen</h1>
          <p className="text-gray-500 mt-1">Beheer alle facturen en betalingen</p>
        </div>
        <Button
          onClick={() => {
            setSelectedInvoice(null)
            setIsModalOpen(true)
          }}
          className="gap-2 shadow-lg shadow-gray-300"
        >
          <Plus className="h-4 w-4" />
          Nieuwe Factuur
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Totaal Facturen', value: stats.total, icon: FileText, color: 'text-gray-600', bg: 'bg-gray-100' },
          { label: 'Betaald', value: `€ ${stats.revenue.toFixed(2)}`, icon: Check, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Openstaand', value: `€ ${stats.outstandingAmount.toFixed(2)}`, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Achterstallig', value: stats.overdue, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Zoek facturen..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
        >
          <option value="all">Alle statussen</option>
          <option value="draft">Concept</option>
          <option value="sent">Verzonden</option>
          <option value="paid">Betaald</option>
          <option value="overdue">Achterstallig</option>
          <option value="cancelled">Geannuleerd</option>
        </select>
      </div>

      {/* Invoices List */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {sortedInvoices.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nog geen facturen</h3>
            <p className="text-gray-500 mb-6">Maak je eerste factuur</p>
            <Button
              onClick={() => {
                setSelectedInvoice(null)
                setIsModalOpen(true)
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Factuur maken
            </Button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left p-4 font-semibold text-gray-600">Factuur</th>
                <th className="text-left p-4 font-semibold text-gray-600">Klant</th>
                <th className="text-left p-4 font-semibold text-gray-600">Datum</th>
                <th className="text-left p-4 font-semibold text-gray-600">Vervaldatum</th>
                <th className="text-right p-4 font-semibold text-gray-600">Bedrag</th>
                <th className="text-center p-4 font-semibold text-gray-600">Status</th>
                <th className="text-center p-4 font-semibold text-gray-600">Acties</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedInvoices.map(invoice => (
                <tr
                  key={invoice.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setViewingInvoice(invoice)}
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(invoice.status)}
                      <span className="font-medium text-gray-900">{invoice.invoiceNumber}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div>
                      <p className="font-medium text-gray-900">{invoice.customer.name}</p>
                      {invoice.customer.company && (
                        <p className="text-sm text-gray-500">{invoice.customer.company}</p>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-gray-600">
                    {format(new Date(invoice.issueDate), 'd MMM yyyy', { locale: nl })}
                  </td>
                  <td className="p-4 text-gray-600">
                    {format(new Date(invoice.dueDate), 'd MMM yyyy', { locale: nl })}
                  </td>
                  <td className="p-4 text-right font-medium text-gray-900">
                    € {invoice.total.toFixed(2)}
                  </td>
                  <td className="p-4 text-center">
                    <Badge
                      className={cn(
                        invoice.status === 'paid' && 'bg-emerald-100 text-emerald-700',
                        invoice.status === 'sent' && 'bg-blue-100 text-blue-700',
                        invoice.status === 'draft' && 'bg-gray-100 text-gray-700',
                        invoice.status === 'overdue' && 'bg-red-100 text-red-700',
                        invoice.status === 'cancelled' && 'bg-gray-100 text-gray-500',
                      )}
                    >
                      {invoice.status === 'paid' && 'Betaald'}
                      {invoice.status === 'sent' && 'Verzonden'}
                      {invoice.status === 'draft' && 'Concept'}
                      {invoice.status === 'overdue' && 'Achterstallig'}
                      {invoice.status === 'cancelled' && 'Geannuleerd'}
                    </Badge>
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedInvoice(invoice)
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
      <InvoiceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        invoice={selectedInvoice}
        onSave={handleSave}
      />

      {viewingInvoice && (
        <InvoiceDetail
          invoice={viewingInvoice}
          onClose={() => setViewingInvoice(null)}
          onMarkPaid={() => markAsPaid(viewingInvoice.id)}
          onSend={() => sendInvoice(viewingInvoice.id)}
        />
      )}
    </div>
  )
}
