'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  startOfWeek,
  endOfWeek,
} from 'date-fns'

interface CalendarBooking {
  id: string
  date: Date
  studioName: string
  customerName: string
  time: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
}

interface BookingCalendarProps {
  bookings?: CalendarBooking[]
}

const statusColors = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  confirmed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  completed: 'bg-gray-100 text-gray-700 border-gray-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
}

export function BookingCalendar({ bookings = [] }: BookingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const getBookingsForDate = (date: Date) => {
    return bookings.filter((booking) => isSameDay(booking.date, date))
  }

  const selectedDateBookings = selectedDate ? getBookingsForDate(selectedDate) : []

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Calendar */}
      <Card className="lg:col-span-2">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Week Days */}
          <div className="grid grid-cols-7 mb-2">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const dayBookings = getBookingsForDate(day)
              const isCurrentMonth = isSameMonth(day, currentMonth)
              const isSelected = selectedDate && isSameDay(day, selectedDate)
              const isTodayDate = isToday(day)

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    'min-h-[100px] p-2 rounded-xl text-left transition-all border-2',
                    isCurrentMonth ? 'bg-white' : 'bg-gray-50',
                    isSelected ? 'border-gray-900 bg-gray-100/50' : 'border-transparent',
                    'hover:border-gray-600'
                  )}
                >
                  <span
                    className={cn(
                      'inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium',
                      isTodayDate && 'bg-gray-900 text-white',
                      !isTodayDate && isCurrentMonth && 'text-gray-900',
                      !isCurrentMonth && 'text-gray-400'
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                  <div className="mt-1 space-y-1">
                    {dayBookings.slice(0, 2).map((booking) => (
                      <div
                        key={booking.id}
                        className={cn(
                          'text-xs px-1.5 py-0.5 rounded truncate border',
                          statusColors[booking.status]
                        )}
                      >
                        {booking.time} - {booking.studioName}
                      </div>
                    ))}
                    {dayBookings.length > 2 && (
                      <div className="text-xs text-gray-500 px-1">
                        +{dayBookings.length - 2} more
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Details */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            {selectedDate ? format(selectedDate, 'EEEE, MMMM d') : 'Select a date'}
          </h3>

          {selectedDateBookings.length > 0 ? (
            <div className="space-y-3">
              {selectedDateBookings.map((booking) => (
                <div key={booking.id} className="p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">{booking.time}</span>
                    <Badge
                      variant={
                        booking.status === 'confirmed'
                          ? 'success'
                          : booking.status === 'pending'
                          ? 'warning'
                          : 'secondary'
                      }
                    >
                      {booking.status}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{booking.studioName}</p>
                  <p className="text-sm text-gray-500">{booking.customerName}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No bookings for this date</p>
              <Button variant="outline" className="mt-4" size="sm">
                Create Booking
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
