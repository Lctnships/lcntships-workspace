'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  X,
  User,
  MapPin,
  CheckCircle,
  Calendar,
  Send,
  Ban,
  CreditCard,
  Clock,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'
import { bookingsApi } from '@/lib/supabase'

const statusConfig = {
  confirmed: {
    label: 'Confirmed',
    bgColor: 'bg-emerald-100',
    textColor: 'text-emerald-700',
    dotColor: 'bg-emerald-500',
  },
  pending: {
    label: 'Pending',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-700',
    dotColor: 'bg-amber-500',
  },
  completed: {
    label: 'Completed',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
    dotColor: 'bg-blue-500',
  },
  cancelled: {
    label: 'Cancelled',
    bgColor: 'bg-rose-100',
    textColor: 'text-rose-700',
    dotColor: 'bg-rose-500',
  },
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatDateTime(dateStr?: string): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function formatTime(dateStr?: string): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function getHoursDiff(start?: string, end?: string): number {
  if (!start || !end) return 0
  const diff = new Date(end).getTime() - new Date(start).getTime()
  return Math.round((diff / (1000 * 60 * 60)) * 10) / 10
}

export default function BookingDetailPage() {
  const params = useParams()
  const id = params.id as string

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [booking, setBooking] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchBooking() {
      try {
        setLoading(true)
        const data = await bookingsApi.getById(id)
        setBooking(data)
      } catch (err) {
        console.error('Failed to fetch booking:', err)
        setError('Failed to load booking')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchBooking()
    }
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-900" />
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <p className="text-gray-500 text-lg font-medium">
          {error || 'Booking not found'}
        </p>
        <Link href="/bookings">
          <Button variant="outline" className="rounded-full">
            Back to Bookings
          </Button>
        </Link>
      </div>
    )
  }

  const status =
    statusConfig[booking.status as keyof typeof statusConfig] ||
    statusConfig.pending

  const studio = booking.studio
  const customer = booking.customer
  const startTime = booking.start_datetime || booking.start_time
  const endTime = booking.end_datetime || booking.end_time
  const hours = booking.total_hours || getHoursDiff(startTime, endTime)
  const totalPrice = booking.total_price || booking.total_amount || 0
  const serviceFee = booking.service_fee || 0
  const equipmentTotal = booking.equipment_total || 0
  const subtotal = totalPrice - serviceFee
  const studioImage =
    studio?.images && studio.images.length > 0
      ? studio.images[0]
      : null
  const bookingLabel = booking.booking_number || booking.id.slice(0, 8)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2">
        <Link
          href="/bookings"
          className="text-gray-500 text-sm font-medium hover:text-gray-900 transition-colors"
        >
          Bookings
        </Link>
        <span className="text-gray-400 text-sm">/</span>
        <span className="text-gray-900 text-sm font-semibold">
          Booking #{bookingLabel}
        </span>
      </div>

      {/* Main Detail Card */}
      <div className="bg-white shadow-xl shadow-gray-200/50 rounded-3xl overflow-hidden border border-gray-100">
        {/* Header Section */}
        <div className="p-8 border-b border-gray-100 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-gray-900 text-4xl font-black tracking-tight">
                Booking #{bookingLabel}
              </h1>
              <span
                className={cn(
                  'inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold',
                  status.bgColor,
                  status.textColor
                )}
              >
                <span
                  className={cn('w-2 h-2 rounded-full mr-2', status.dotColor)}
                />
                {status.label}
              </span>
            </div>
            <p className="text-gray-500 font-medium">
              Created on {formatDateTime(booking.created_at)}
            </p>
          </div>
          <Link
            href="/bookings"
            className="rounded-full bg-gray-100 p-2 text-gray-500 hover:bg-gray-200 transition-all"
          >
            <X className="h-5 w-5" />
          </Link>
        </div>

        {/* Tabs */}
        <div className="px-8 bg-gray-50/50">
          <div className="flex border-b border-gray-100 gap-8">
            <button className="flex flex-col items-center justify-center border-b-2 border-gray-900 text-gray-900 pb-3 pt-4">
              <p className="text-sm font-bold leading-normal tracking-wide">
                Details
              </p>
            </button>
            <button className="flex flex-col items-center justify-center border-b-2 border-transparent text-gray-500 pb-3 pt-4 hover:text-gray-700">
              <p className="text-sm font-bold leading-normal tracking-wide">
                Activity Log
              </p>
            </button>
            <button className="flex flex-col items-center justify-center border-b-2 border-transparent text-gray-500 pb-3 pt-4 hover:text-gray-700">
              <p className="text-sm font-bold leading-normal tracking-wide">
                Documents
              </p>
            </button>
          </div>
        </div>

        {/* Content Grid */}
        <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Column: Info */}
          <div className="lg:col-span-8 space-y-10">
            {/* Customer Information */}
            <section>
              <div className="flex items-center gap-2 mb-6">
                <User className="h-5 w-5 text-gray-900" />
                <h2 className="text-xl font-bold text-gray-900">
                  Customer Information
                </h2>
              </div>
              <div className="flex items-start gap-6 bg-gray-50 p-6 rounded-3xl">
                <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-gray-900 text-2xl font-black">
                  {customer?.full_name
                    ? getInitials(customer.full_name)
                    : '??'}
                </div>
                <div className="flex-1 grid grid-cols-2 gap-y-4 gap-x-8">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                      Full Name
                    </p>
                    <p className="text-gray-900 font-semibold">
                      {customer?.full_name || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                      Email Address
                    </p>
                    {customer?.email ? (
                      <a
                        href={`mailto:${customer.email}`}
                        className="text-gray-900 font-medium hover:text-gray-900 underline decoration-gray-200"
                      >
                        {customer.email}
                      </a>
                    ) : (
                      <p className="text-gray-900 font-medium">-</p>
                    )}
                  </div>
                  {customer?.phone && (
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                        Phone Number
                      </p>
                      <p className="text-gray-900 font-medium">
                        {customer.phone}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Studio Information */}
            <section>
              <div className="flex items-center gap-2 mb-6">
                <MapPin className="h-5 w-5 text-gray-900" />
                <h2 className="text-xl font-bold text-gray-900">
                  Studio Details
                </h2>
              </div>
              <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden">
                {/* Studio Image */}
                {studioImage && (
                  <div className="h-48 w-full bg-gray-200 relative">
                    <div
                      className="absolute inset-0 bg-cover bg-center opacity-80"
                      style={{ backgroundImage: `url(${studioImage})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900/40 to-transparent" />
                    <div className="absolute bottom-4 left-6 flex items-center gap-2 bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-lg">
                      <MapPin className="h-4 w-4 text-gray-900" />
                      <span className="text-xs font-bold text-gray-900">
                        {studio?.location || '-'}
                      </span>
                    </div>
                  </div>
                )}

                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-2xl font-black text-gray-900">
                        {studio?.title || '-'}
                      </h3>
                      <p className="text-gray-500 font-medium">
                        {studio?.type || '-'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                        Time Slot
                      </p>
                      <p className="text-gray-900 font-bold">
                        {formatTime(startTime)} - {formatTime(endTime)}{' '}
                        ({hours}h)
                      </p>
                    </div>
                  </div>

                  {studio?.amenities && studio.amenities.length > 0 && (
                    <>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                        Amenities
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {studio.amenities.map(
                          (amenity: string, index: number) => (
                            <span
                              key={index}
                              className="px-4 py-1.5 rounded-full bg-gray-100 text-gray-600 text-sm font-medium"
                            >
                              {amenity}
                            </span>
                          )
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </section>

            {/* Notes / Special Requests */}
            {(booking.notes || booking.special_requests) && (
              <section>
                <div className="flex items-center gap-2 mb-6">
                  <Clock className="h-5 w-5 text-gray-900" />
                  <h2 className="text-xl font-bold text-gray-900">Notes</h2>
                </div>
                <div className="bg-gray-50 p-6 rounded-3xl">
                  {booking.notes && (
                    <p className="text-gray-700 text-sm">{booking.notes}</p>
                  )}
                  {booking.special_requests && (
                    <div className="mt-2">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                        Special Requests
                      </p>
                      <p className="text-gray-700 text-sm">
                        {booking.special_requests}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>

          {/* Right Column: Financials */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100 sticky top-24">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Financial Summary
              </h2>

              <div className="space-y-4 mb-8">
                {subtotal > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-medium">
                      Subtotal ({hours}h)
                    </span>
                    <span className="text-gray-900 font-semibold">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                )}
                {equipmentTotal > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-medium">
                      Equipment
                    </span>
                    <span className="text-gray-900 font-semibold">
                      {formatCurrency(equipmentTotal)}
                    </span>
                  </div>
                )}
                {serviceFee > 0 && (
                  <>
                    <div className="border-t border-gray-200 my-4" />
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 font-medium">
                        Service Fee
                      </span>
                      <span className="text-gray-900 font-semibold">
                        {formatCurrency(serviceFee)}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Total Amount */}
              <div className="bg-gray-100 p-6 rounded-2xl mb-8 border border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-gray-900 font-bold text-lg">
                    Total Amount
                  </span>
                  <span className="text-gray-900 font-black text-3xl">
                    {formatCurrency(totalPrice)}
                  </span>
                </div>
                {booking.payment_status && (
                  <p className="text-gray-700 text-[10px] font-bold uppercase tracking-widest mt-2 text-right">
                    Payment: {booking.payment_status}
                  </p>
                )}
              </div>

              {/* Payment Status */}
              <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-200">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    {booking.payment_status === 'paid'
                      ? 'Payment Received'
                      : booking.payment_status === 'refunded'
                        ? 'Payment Refunded'
                        : 'Payment Pending'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDateTime(booking.created_at)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Action Footer */}
        <div className="p-6 bg-white border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button className="rounded-full px-8 h-14 shadow-lg shadow-gray-300">
              <CheckCircle className="h-5 w-5 mr-2" />
              Check-in Customer
            </Button>
            <Button
              variant="outline"
              className="rounded-full px-6 h-14 border-2 border-gray-300 text-gray-900 hover:bg-gray-100"
            >
              <Send className="h-5 w-5 mr-2" />
              Send Message
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="rounded-full px-6 h-14">
              <Calendar className="h-5 w-5 mr-2" />
              Reschedule
            </Button>
            <Button
              variant="outline"
              className="rounded-full px-6 h-14 text-rose-600 bg-rose-50 hover:bg-rose-100 border-rose-200"
            >
              <Ban className="h-5 w-5 mr-2" />
              Cancel Booking
            </Button>
          </div>
        </div>
      </div>

      {/* Security Note */}
      <div className="flex items-center justify-center gap-4 text-gray-400">
        <span className="text-sm">🔒</span>
        <span className="text-xs font-medium uppercase tracking-widest">
          End-to-end encrypted workspace management
        </span>
      </div>
    </div>
  )
}
