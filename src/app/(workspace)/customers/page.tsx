'use client'

import { useState, useEffect } from 'react'
import {
  Search,
  Plus,
  Download,
  MoreHorizontal,
  Mail,
  Phone,
  MessageCircle,
  Calendar,
  TrendingUp,
  Users,
  UserPlus,
  Repeat,
  X,
  ChevronLeft,
  ChevronRight,
  Send,
  Lock,
  Sparkles,
  Coffee,
  Camera,
  Sun,
  ExternalLink,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { customersApi, type Customer } from '@/lib/supabase'

// Display interface for customers
interface CustomerDisplay {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  totalBookings: number
  totalSpent: number
  lastBooking: string
  type: string
  avatar: string | null
  isOnline: boolean
  customerSince: string
  avgBooking: number
  favStudio: string
}

// Helper to format date
function formatCustomerSince(dateString?: string): string {
  if (!dateString) return 'Unknown'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

// Helper to determine customer type based on data
function determineCustomerType(customer: Customer): string {
  const createdAt = customer.created_at ? new Date(customer.created_at) : new Date()
  const now = new Date()
  const daysSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))

  if (daysSinceCreation <= 30) return 'new'
  if (customer.total_bookings > 10) return 'vip'
  return 'regular'
}

const typeConfig = {
  vip: {
    label: 'VIP',
    emoji: '🌟',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-900',
    borderColor: 'border-gray-300',
  },
  new: {
    label: 'New',
    emoji: '🆕',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-600',
    borderColor: 'border-emerald-200',
  },
  regular: {
    label: 'Regular',
    emoji: '',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-600',
    borderColor: 'border-gray-200',
  },
  inactive: {
    label: 'Inactive',
    emoji: '',
    bgColor: 'bg-rose-50',
    textColor: 'text-rose-600',
    borderColor: 'border-rose-200',
  },
}

// Add Customer Modal Component
interface AddCustomerModalProps {
  isOpen: boolean
  onClose: () => void
}

function AddCustomerModal({ isOpen, onClose }: AddCustomerModalProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    notes: '',
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-[640px] mx-4 shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between px-8 pt-8 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Add New Customer</h2>
            <p className="text-gray-500 text-sm mt-1">Manually add a customer who cannot sign up themselves.</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Content */}
        <div className="px-8 pb-8">
          <form className="flex flex-col gap-5">
            {/* Name Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">First Name</label>
                <Input
                  placeholder="e.g. Jane"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="h-12 rounded-xl bg-gray-50 border-gray-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Last Name</label>
                <Input
                  placeholder="e.g. Doe"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="h-12 rounded-xl bg-gray-50 border-gray-200"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="email"
                  placeholder="jane@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="h-12 rounded-xl bg-gray-50 border-gray-200 pl-12"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="tel"
                  placeholder="(555) 000-0000"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="h-12 rounded-xl bg-gray-50 border-gray-200 pl-12"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Notes</label>
              <textarea
                placeholder="Add any specific requirements or notes about the customer..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full rounded-xl bg-gray-50 border border-gray-200 p-4 min-h-[100px] text-sm resize-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-8 py-5 bg-gray-50 rounded-b-2xl border-t border-gray-100">
          <Button variant="outline" onClick={onClose} className="h-11 px-5 rounded-xl">
            Cancel
          </Button>
          <Button onClick={onClose} className="h-11 px-6 rounded-xl shadow-lg shadow-gray-300">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </div>
    </div>
  )
}

// Customer Detail Sidebar Component
interface CustomerDetailSidebarProps {
  customer: CustomerDisplay | null
  isOpen: boolean
  onClose: () => void
}

function CustomerDetailSidebar({ customer, isOpen, onClose }: CustomerDetailSidebarProps) {
  const [note, setNote] = useState('')

  if (!isOpen || !customer) return null

  const typeInfo = typeConfig[customer.type as keyof typeof typeConfig]

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={onClose} />

      {/* Sidebar */}
      <div className="fixed inset-y-0 right-0 z-50 flex flex-col w-full max-w-[500px] bg-white shadow-2xl rounded-l-2xl border-l border-gray-100 animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-white rounded-tl-2xl">
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Customer Detail</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {/* Profile Section */}
          <div className="bg-white p-6 pb-8 rounded-b-xl shadow-sm mb-4">
            <div className="flex flex-col items-center">
              <div className="relative mb-4">
                {customer.avatar ? (
                  <img
                    src={customer.avatar}
                    alt={`${customer.firstName} ${customer.lastName}`}
                    className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-200 border-4 border-white shadow-lg flex items-center justify-center text-gray-900 font-bold text-2xl">
                    {customer.firstName[0]}{customer.lastName[0]}
                  </div>
                )}
                {customer.isOnline && (
                  <div className="absolute bottom-0 right-0 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white" />
                )}
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                {customer.firstName} {customer.lastName}
              </h1>

              <div className="flex items-center gap-2 mb-3">
                <span className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border',
                  typeInfo.bgColor,
                  typeInfo.textColor,
                  typeInfo.borderColor
                )}>
                  {typeInfo.emoji && <span>{typeInfo.emoji}</span>}
                  {typeInfo.label} Customer
                </span>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                <a href={`mailto:${customer.email}`} className="flex items-center gap-1.5 hover:text-gray-900 transition-colors">
                  <Mail className="h-4 w-4" />
                  {customer.email}
                </a>
              </div>
              <a href={`tel:${customer.phone}`} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-2">
                <Phone className="h-4 w-4" />
                {customer.phone}
              </a>
              <p className="text-xs text-gray-400 font-medium">Customer since {customer.customerSince}</p>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-2 flex flex-col gap-6 pb-24">
            {/* Quick Stats */}
            <section>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-gray-900" />
                Quick Stats
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-28">
                  <div className="text-gray-500 text-sm font-medium">Total Bookings</div>
                  <div className="flex items-end justify-between">
                    <span className="text-3xl font-bold text-gray-900">{customer.totalBookings}</span>
                    <Calendar className="h-8 w-8 text-gray-300" />
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-28">
                  <div className="text-gray-500 text-sm font-medium">Total Spent</div>
                  <div className="flex items-end justify-between">
                    <span className="text-3xl font-bold text-gray-900">€{(customer.totalSpent / 1000).toFixed(1)}k</span>
                    <span className="text-3xl text-gray-300">€</span>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-28">
                  <div className="text-gray-500 text-sm font-medium">Avg. Booking</div>
                  <div className="flex items-end justify-between">
                    <span className="text-3xl font-bold text-gray-900">€{customer.avgBooking}</span>
                    <TrendingUp className="h-8 w-8 text-gray-300" />
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-28">
                  <div className="text-gray-500 text-sm font-medium">Fav. Studio</div>
                  <div className="flex items-end justify-between">
                    <span className="text-xl font-bold text-gray-900 truncate">{customer.favStudio}</span>
                    <Sparkles className="h-8 w-8 text-gray-300" />
                  </div>
                </div>
              </div>
            </section>

            {/* Booking History */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-900" />
                  Recent History
                </h3>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center">
                <p className="text-gray-400 text-sm">Nog geen boekingsgeschiedenis</p>
              </div>
            </section>

            {/* Preferences */}
            <section>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-gray-900" />
                Preferences & Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                <button className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-dashed border-gray-300 hover:border-gray-700 hover:text-gray-900 transition-colors text-gray-400">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </section>

            {/* Internal Notes */}
            <section>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Lock className="h-4 w-4 text-gray-900" />
                Internal Notes
              </h3>
              <div className="flex flex-col gap-3">
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                  <p className="text-sm text-gray-800 leading-relaxed">
                    {customer.firstName} usually arrives 15 minutes early for setup. Prefers seamless paper backgrounds ready before arrival.
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                    <div className="w-5 h-5 rounded-full bg-gray-300" />
                    <span>Added by Sarah M. • 2 days ago</span>
                  </div>
                </div>
                <div className="relative">
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add a private note for the team..."
                    className="w-full text-sm rounded-lg border-gray-200 bg-white focus:border-gray-900 focus:ring-gray-900 resize-none pr-10"
                    rows={2}
                  />
                  <button className="absolute bottom-2 right-2 p-1 text-gray-900 hover:bg-gray-100 rounded transition-colors">
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-white border-t border-gray-100 p-4 rounded-bl-2xl">
          <div className="flex gap-3 mb-3">
            <Button variant="outline" className="flex-1 h-11 rounded-xl">
              <MessageCircle className="h-4 w-4 mr-2" />
              Message
            </Button>
            <Button className="flex-[2] h-11 rounded-xl shadow-lg shadow-gray-300">
              <Plus className="h-4 w-4 mr-2" />
              Create Booking
            </Button>
          </div>
          <div className="text-center">
            <button className="text-xs text-gray-400 hover:text-gray-900 transition-colors flex items-center justify-center gap-1 mx-auto">
              View full customer profile
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [lastActiveFilter, setLastActiveFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDisplay | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Fetch customers from Supabase
  useEffect(() => {
    async function fetchCustomers() {
      try {
        const data = await customersApi.getAll()
        // Handle case where customers table doesn't exist
        if (!data || data.length === 0) {
          console.info('No customers found or customers table not available')
          setCustomers([])
          return
        }
        setCustomers(data.map((c: Customer) => {
          const nameParts = (c.full_name || 'Unknown User').split(' ')
          const totalSpent = c.total_spent || 0
          const totalBookings = c.total_bookings || 0
          return {
            id: c.id,
            firstName: nameParts[0] || 'Unknown',
            lastName: nameParts.slice(1).join(' ') || '',
            email: c.email,
            phone: c.phone || '',
            totalBookings,
            totalSpent,
            lastBooking: 'N/A',
            type: determineCustomerType(c),
            avatar: null,
            isOnline: false,
            customerSince: formatCustomerSince(c.created_at),
            avgBooking: totalBookings > 0 ? Math.round(totalSpent / totalBookings) : 0,
            favStudio: 'N/A',
          }
        }))
      } catch (error) {
        console.warn('Customers fetch error (table may not exist):', error)
        setCustomers([])
      } finally {
        setLoading(false)
      }
    }
    fetchCustomers()
  }, [])

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      customer.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery)
    const matchesType = !typeFilter || customer.type === typeFilter

    return matchesSearch && matchesType
  })

  const totalCustomers = customers.length
  const activeThisMonth = customers.filter(c => c.totalBookings > 0).length
  const newThisWeek = customers.filter(c => c.type === 'new').length
  const repeatCustomers = totalCustomers > 0 ? Math.round((customers.filter(c => c.totalBookings > 1).length / totalCustomers) * 100) : 0

  const handleViewCustomer = (customer: CustomerDisplay) => {
    setSelectedCustomer(customer)
    setIsSidebarOpen(true)
  }

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-900" />
      </div>
    )
  }

  // Show empty state if no customers
  const showEmptyState = customers.length === 0

  if (showEmptyState) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <div className="flex flex-wrap justify-between items-end gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              All Customers
            </h1>
            <p className="text-gray-500 mt-1">Manage your studio renters and booking history.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" disabled className="h-11 px-5 rounded-xl opacity-50">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button className="h-11 px-5 rounded-xl shadow-lg shadow-gray-300" onClick={() => setIsAddModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          </div>
        </div>

        {/* Empty State Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          {/* Ghost Table Header */}
          <div className="border-b border-gray-100 bg-gray-50/50">
            <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              <div className="col-span-3">Customer Name</div>
              <div className="col-span-3">Email Address</div>
              <div className="col-span-2">Phone Number</div>
              <div className="col-span-2">Total Bookings</div>
              <div className="col-span-2 text-right">Status</div>
            </div>
          </div>

          {/* Empty State Content */}
          <div className="flex flex-1 flex-col items-center justify-center p-12 text-center">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-gradient-to-tr from-gray-300 to-orange-100 rounded-full blur-2xl transform scale-110 opacity-60" />
              <div className="relative bg-white p-6 rounded-full shadow-lg ring-1 ring-gray-100">
                <div className="bg-gradient-to-b from-gray-50 to-white w-24 h-24 rounded-full flex items-center justify-center border border-gray-100">
                  <div className="relative">
                    <Users className="h-16 w-16 text-gray-300" />
                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm">
                      <span className="text-orange-400 text-2xl">⚠️</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="max-w-md space-y-3">
              <h3 className="text-xl font-bold text-gray-900">No customers yet</h3>
              <p className="text-gray-500 leading-relaxed">
                Customers will appear here when they make their first booking. You can currently add customers manually to get started.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3">
              <Button
                className="h-12 px-6 rounded-xl shadow-lg shadow-gray-300"
                onClick={() => setIsAddModalOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Customer Manually
              </Button>
              <button className="text-sm font-medium text-gray-900 hover:underline">
                Learn how to import customers
              </button>
            </div>
          </div>
        </div>

        <AddCustomerModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            Customers <span className="text-2xl">👤</span>
          </h1>
          <p className="text-gray-500 mt-1">People who rent studios</p>
        </div>
        <Button
          variant="outline"
          className="h-11 px-5 rounded-xl border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white"
          onClick={() => setIsAddModalOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="flex flex-col justify-between gap-4 p-5 rounded-[20px] bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <p className="text-gray-500 text-sm font-medium">Total Customers</p>
            <div className="p-1.5 rounded-lg bg-gray-100">
              <Users className="h-5 w-5 text-gray-900" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900 tracking-tight">{totalCustomers.toLocaleString()}</p>
            <p className="text-gray-500 text-sm font-medium mt-1">
              Totaal
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-4 p-5 rounded-[20px] bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <p className="text-gray-500 text-sm font-medium">Active This Month</p>
            <div className="p-1.5 rounded-lg bg-orange-50">
              <Users className="h-5 w-5 text-orange-600" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900 tracking-tight">{activeThisMonth}</p>
            <p className="text-gray-500 text-sm font-medium mt-1">
              Met boekingen
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-4 p-5 rounded-[20px] bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <p className="text-gray-500 text-sm font-medium">New This Week</p>
            <div className="p-1.5 rounded-lg bg-emerald-50">
              <UserPlus className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900 tracking-tight">{newThisWeek}</p>
            <p className="text-gray-500 text-sm font-medium mt-1">
              Nieuw
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-4 p-5 rounded-[20px] bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <p className="text-gray-500 text-sm font-medium">Repeat Customers</p>
            <div className="p-1.5 rounded-lg bg-purple-50">
              <Repeat className="h-5 w-5 text-purple-600" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900 tracking-tight">{repeatCustomers}%</p>
            <p className="text-gray-500 text-sm font-medium mt-1">
              Terugkerend
            </p>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 rounded-xl bg-white border-gray-200 shadow-sm"
          />
        </div>

        {/* Filter Dropdowns */}
        <select
          value={typeFilter || ''}
          onChange={(e) => setTypeFilter(e.target.value || null)}
          className="h-12 px-4 pr-10 bg-white rounded-xl border border-gray-200 text-sm font-medium text-gray-900 shadow-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900 cursor-pointer appearance-none"
        >
          <option value="">Customer Type</option>
          <option value="vip">VIP</option>
          <option value="regular">Regular</option>
          <option value="new">New</option>
        </select>

        <select
          value={lastActiveFilter}
          onChange={(e) => setLastActiveFilter(e.target.value)}
          className="h-12 px-4 pr-10 bg-white rounded-xl border border-gray-200 text-sm font-medium text-gray-900 shadow-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900 cursor-pointer appearance-none"
        >
          <option value="all">Last Active</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="3months">Last 3 Months</option>
        </select>

        <div className="hidden sm:block w-px h-8 bg-gray-300" />

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="h-12 px-4 pr-10 bg-transparent rounded-xl text-sm font-medium text-gray-900 focus:ring-0 border-none cursor-pointer appearance-none hover:bg-white"
        >
          <option value="newest">Sort by: Newest</option>
          <option value="oldest">Oldest</option>
          <option value="spending">Spending</option>
        </select>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 overflow-hidden">
        {/* Quick Filter Tabs */}
        <div className="flex items-center gap-6 px-6 border-b border-gray-100 overflow-x-auto">
          <button
            onClick={() => setTypeFilter(null)}
            className={cn(
              'py-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors',
              !typeFilter ? 'border-gray-900 text-gray-900 font-semibold' : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            All Customers
          </button>
          <button
            onClick={() => setTypeFilter('vip')}
            className={cn(
              'py-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors',
              typeFilter === 'vip' ? 'border-gray-900 text-gray-900 font-semibold' : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            VIP
          </button>
          <button
            onClick={() => setTypeFilter('regular')}
            className={cn(
              'py-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors',
              typeFilter === 'regular' ? 'border-gray-900 text-gray-900 font-semibold' : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            Regular
          </button>
          <button
            onClick={() => setTypeFilter('new')}
            className={cn(
              'py-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors',
              typeFilter === 'new' ? 'border-gray-900 text-gray-900 font-semibold' : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            New This Month
          </button>
          <button
            onClick={() => setTypeFilter('inactive')}
            className={cn(
              'py-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors',
              typeFilter === 'inactive' ? 'border-gray-900 text-gray-900 font-semibold' : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            Inactive
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Email</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Bookings</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Spent</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Last Booking</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCustomers.map((customer) => {
                const typeInfo = typeConfig[customer.type as keyof typeof typeConfig]
                return (
                  <tr
                    key={customer.id}
                    className="group hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleViewCustomer(customer)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          {customer.avatar ? (
                            <img
                              src={customer.avatar}
                              alt={`${customer.firstName} ${customer.lastName}`}
                              className="w-10 h-10 rounded-full object-cover border border-gray-200"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-900 font-bold text-sm border border-gray-300">
                              {customer.firstName[0]}{customer.lastName[0]}
                            </div>
                          )}
                          {customer.isOnline && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-900">{customer.firstName} {customer.lastName}</span>
                          <span className="text-xs text-gray-500 md:hidden">{customer.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                      <span className="text-sm text-gray-500">{customer.email}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">{customer.totalBookings}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-900">${customer.totalSpent.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                      <span className="text-sm text-gray-500">{customer.lastBooking}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(
                        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border',
                        typeInfo.bgColor,
                        typeInfo.textColor,
                        typeInfo.borderColor
                      )}>
                        {typeInfo.emoji && <span>{typeInfo.emoji}</span>}
                        {typeInfo.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="relative h-8 flex items-center justify-end">
                        <button
                          className="group-hover:hidden text-gray-400 hover:text-gray-900 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-5 w-5" />
                        </button>
                        <div className="hidden group-hover:flex items-center gap-2">
                          <button
                            className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Message"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MessageCircle className="h-5 w-5" />
                          </button>
                          <Button
                            size="sm"
                            className="px-3 py-1 h-auto text-xs font-semibold rounded-lg"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewCustomer(customer)
                            }}
                          >
                            View
                          </Button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-white">
          <p className="text-sm text-gray-500">
            Showing <span className="font-medium text-gray-900">1</span> to <span className="font-medium text-gray-900">{filteredCustomers.length}</span> of <span className="font-medium text-gray-900">{totalCustomers}</span> results
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="rounded-lg" disabled>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button variant="outline" size="sm" className="rounded-lg">
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* No results state */}
      {filteredCustomers.length === 0 && customers.length > 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-2xl">
          <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
          <p className="text-gray-500">Try adjusting your filters or search query</p>
        </div>
      )}

      {/* Add Customer Modal */}
      <AddCustomerModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />

      {/* Customer Detail Sidebar */}
      <CustomerDetailSidebar
        customer={selectedCustomer}
        isOpen={isSidebarOpen}
        onClose={() => {
          setIsSidebarOpen(false)
          setSelectedCustomer(null)
        }}
      />
    </div>
  )
}
