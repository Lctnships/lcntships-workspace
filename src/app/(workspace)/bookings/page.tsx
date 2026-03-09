'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import {
  Plus,
  Download,
  ChevronLeft,
  ChevronRight,
  Filter,
  MoreHorizontal,
  X,
  Calendar,
  Clock,
  User,
  Building2,
  CreditCard,
  Mail,
  Phone,
  MapPin,
  Loader2,
  Inbox,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { bookingsApi, studiosApi } from '@/lib/supabase'

const statusConfig = {
  confirmed: {
    label: 'Confirmed',
    bgColor: 'bg-gray-200',
    textColor: 'text-gray-900',
    dotColor: 'bg-gray-900',
  },
  pending: {
    label: 'Pending',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-600',
    dotColor: 'bg-amber-500',
  },
  completed: {
    label: 'Completed',
    bgColor: 'bg-emerald-100',
    textColor: 'text-emerald-600',
    dotColor: 'bg-emerald-500',
  },
  cancelled: {
    label: 'Cancelled',
    bgColor: 'bg-rose-100',
    textColor: 'text-rose-600',
    dotColor: 'bg-rose-500',
  },
}

// Manual Booking Modal
interface ManualBookingModalProps {
  isOpen: boolean
  onClose: () => void
}

function ManualBookingModal({ isOpen, onClose }: ManualBookingModalProps) {
  const [mounted, setMounted] = useState(false)
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    studio: '',
    date: '',
    startTime: '',
    endTime: '',
    notes: '',
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!isOpen || !mounted) return null

  const handleSubmit = () => {
    // Handle form submission
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Manual Booking</h2>
            <p className="text-sm text-gray-500">Create a new booking manually</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Customer Information */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <User className="h-4 w-4 text-gray-900" />
                Customer Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                  <Input
                    placeholder="John Doe"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="h-12 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                  <Input
                    type="email"
                    placeholder="john@example.com"
                    value={formData.customerEmail}
                    onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                    className="h-12 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <Input
                    type="tel"
                    placeholder="+1 234 567 890"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Booking Details */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-gray-900" />
                Booking Details
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Studio *</label>
                  <select
                    value={formData.studio}
                    onChange={(e) => setFormData({ ...formData, studio: e.target.value })}
                    className="w-full h-12 rounded-xl border border-gray-200 px-4 text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                  >
                    <option value="">Select a studio...</option>
                    <option value="studio-alpha">Studio Alpha - $50/hr</option>
                    <option value="podcast-suite">Podcast Suite - $40/hr</option>
                    <option value="infinity-wall">Infinity Wall - $75/hr</option>
                    <option value="green-screen">Green Screen Room - $60/hr</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Time *</label>
                    <Input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="h-12 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Time *</label>
                    <Input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="h-12 rounded-xl"
                    />
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    placeholder="Any special requirements or notes..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full h-24 rounded-xl border border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900 resize-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-100 bg-gray-50">
          <Button variant="ghost" onClick={onClose} className="h-12 px-6 rounded-xl">
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="h-12 px-8 rounded-xl shadow-lg shadow-gray-300">
            Create Booking
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// Calendar Component
function BookingCalendar({
  currentDate,
  onPrevMonth,
  onNextMonth,
  viewMode,
  setViewMode,
  bookings,
}: {
  currentDate: Date
  onPrevMonth: () => void
  onNextMonth: () => void
  viewMode: 'month' | 'week' | 'list'
  setViewMode: (mode: 'month' | 'week' | 'list') => void
  bookings: any[]
}) {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Get first day of month and total days
  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // Generate calendar days
  const calendarDays: (number | null)[] = []
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null)
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day)
  }

  // Build calendar events from real bookings
  const calendarEvents: Record<number, { title: string; color: string }[]> = {}
  for (const booking of bookings) {
    if (!booking.date) continue
    const bookingDate = new Date(booking.date)
    if (bookingDate.getMonth() === month && bookingDate.getFullYear() === year) {
      const day = bookingDate.getDate()
      const studio = (booking.studio as any)?.title || (booking.studio as any)?.name || 'Studio'
      const time = booking.start_time || ''
      const statusColor = booking.status === 'confirmed'
        ? 'bg-gray-200 text-gray-900 border-gray-300'
        : booking.status === 'pending'
        ? 'bg-amber-50 text-amber-600 border-amber-100'
        : 'bg-emerald-50 text-emerald-600 border-emerald-100'
      if (!calendarEvents[day]) calendarEvents[day] = []
      calendarEvents[day].push({ title: `${studio}: ${time}`, color: statusColor })
    }
  }

  const today = new Date()
  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear()

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
      {/* Calendar Toolbar */}
      <div className="p-6 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <h3 className="text-2xl font-bold text-gray-900">
            {monthNames[month]} {year}
          </h3>
          <div className="flex items-center bg-gray-100 rounded-full p-1">
            <button
              onClick={onPrevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white hover:shadow-sm transition-all text-gray-600"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={onNextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white hover:shadow-sm transition-all text-gray-600"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 rounded-full p-1 h-11">
            {(['month', 'week', 'list'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  'px-5 flex items-center justify-center rounded-full transition-all text-sm font-semibold capitalize',
                  viewMode === mode
                    ? 'bg-white shadow-sm text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {mode}
              </button>
            ))}
          </div>
          <button className="w-11 h-11 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
            <Filter className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-6">
        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-gray-100 pb-4 mb-4">
          {dayNames.map((day) => (
            <div
              key={day}
              className="text-center text-xs font-black text-gray-400 uppercase tracking-widest"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-4">
          {calendarDays.map((day, index) => {
            const events = day ? calendarEvents[day] || [] : []
            return (
              <div
                key={index}
                className={cn(
                  'min-h-[120px] p-2 rounded-2xl border transition-all',
                  day
                    ? isToday(day)
                      ? 'bg-gray-100/50 ring-2 ring-gray-300 border-gray-200'
                      : 'border-gray-50 bg-gray-50/30 hover:bg-gray-50 hover:border-gray-100'
                    : 'border-transparent'
                )}
              >
                {day && (
                  <>
                    <span
                      className={cn(
                        'text-sm font-bold',
                        isToday(day) ? 'text-gray-900' : 'text-gray-400'
                      )}
                    >
                      {day}
                    </span>
                    {events.map((event, eventIndex) => (
                      <div
                        key={eventIndex}
                        className={cn(
                          'mt-2 p-2 border rounded-xl text-[10px] font-bold leading-tight cursor-pointer hover:opacity-80 transition-opacity',
                          event.color
                        )}
                      >
                        {event.title}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Bookings Table Component
function BookingsTable({ bookings }: { bookings: any[] }) {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/50">
            <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">
              Customer
            </th>
            <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">
              Studio
            </th>
            <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">
              Date & Time
            </th>
            <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">
              Price
            </th>
            <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">
              Status
            </th>
            <th className="px-6 py-4"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {bookings.map((booking) => {
            const status = statusConfig[booking.status as keyof typeof statusConfig] || statusConfig.pending
            const customer = booking.customer as any
            const studio = booking.studio as any
            const customerName = customer?.full_name || 'Onbekende klant'
            const customerEmail = customer?.email || ''
            const customerAvatar = customer?.avatar_url || ''
            const studioName = studio?.title || studio?.name || 'Studio'
            const bookingDate = booking.date
              ? new Date(booking.date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
              : ''
            const bookingTime = booking.start_time && booking.end_time
              ? `${booking.start_time} - ${booking.end_time}`
              : ''
            const price = booking.subtotal != null
              ? new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(Number(booking.subtotal))
              : '—'

            return (
              <tr
                key={booking.id}
                className="hover:bg-gray-50/50 transition-colors cursor-pointer"
              >
                <td className="px-6 py-5">
                  <Link href={`/bookings/${booking.id}`} className="flex items-center gap-3">
                    {customerAvatar ? (
                      <div
                        className="w-10 h-10 rounded-full bg-gray-200 bg-cover bg-center"
                        style={{ backgroundImage: `url(${customerAvatar})` }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-900 font-bold text-sm">
                        {customerName.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-gray-900">{customerName}</p>
                      <p className="text-xs text-gray-500">{customerEmail}</p>
                    </div>
                  </Link>
                </td>
                <td className="px-6 py-5">
                  <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-bold text-gray-600">
                    {studioName}
                  </span>
                </td>
                <td className="px-6 py-5">
                  <p className="text-sm font-semibold text-gray-900">{bookingDate}</p>
                  <p className="text-xs text-gray-500">{bookingTime}</p>
                </td>
                <td className="px-6 py-5">
                  <span className="font-bold text-gray-900">{price}</span>
                </td>
                <td className="px-6 py-5">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold',
                      status.bgColor,
                      status.textColor
                    )}
                  >
                    <span className={cn('w-1.5 h-1.5 rounded-full', status.dotColor)} />
                    {status.label}
                  </span>
                </td>
                <td className="px-6 py-5 text-right">
                  <button className="text-gray-400 hover:text-gray-600">
                    <MoreHorizontal className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-center">
        <button className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors">
          Load More Bookings
          <ChevronRight className="h-4 w-4 rotate-90" />
        </button>
      </div>
    </div>
  )
}

// Main Bookings Page
export default function BookingsPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'list'>('month')
  const [showManualBooking, setShowManualBooking] = useState(false)
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchBookings() {
      try {
        const data = await bookingsApi.getAll()
        setBookings(data || [])
      } catch (error) {
        console.error('Error fetching bookings:', error)
        setBookings([])
      } finally {
        setLoading(false)
      }
    }
    fetchBookings()
  }, [])

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-900" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Bookings</h1>
          <p className="text-gray-500 text-lg">
            Manage all studio reservations and availability
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-full h-12 px-6">
            <Download className="h-4 w-4 mr-2" />
            Export Schedule
          </Button>
          <Button
            className="rounded-full h-12 px-6 shadow-lg shadow-gray-300"
            onClick={() => setShowManualBooking(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Manual Booking
          </Button>
        </div>
      </div>

      {/* Calendar */}
      <BookingCalendar
        currentDate={currentDate}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        viewMode={viewMode}
        setViewMode={setViewMode}
        bookings={bookings}
      />

      {/* Upcoming Bookings */}
      {bookings.length > 0 ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-gray-900">Upcoming Bookings</h2>
          </div>
          <BookingsTable bookings={bookings} />
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-100">
          <Inbox className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Nog geen boekingen</h3>
          <p className="text-gray-500 mb-6">Zodra er boekingen binnenkomen verschijnen ze hier.</p>
          <Button
            className="rounded-full h-11 px-6 shadow-lg shadow-gray-300"
            onClick={() => setShowManualBooking(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Boeking Aanmaken
          </Button>
        </div>
      )}

      {/* Manual Booking Modal */}
      <ManualBookingModal
        isOpen={showManualBooking}
        onClose={() => setShowManualBooking(false)}
      />
    </div>
  )
}
