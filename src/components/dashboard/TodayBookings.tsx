'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Clock, MapPin } from 'lucide-react'
import { formatTime, getInitials } from '@/lib/utils'

interface Booking {
  id: string
  customerName: string
  studioName: string
  city: string
  startTime: string
  endTime: string
  status: 'confirmed' | 'pending' | 'completed'
}

const mockBookings: Booking[] = [
  {
    id: '1',
    customerName: 'Sarah Chen',
    studioName: 'Sunlight Studios',
    city: 'Los Angeles',
    startTime: '09:00',
    endTime: '12:00',
    status: 'confirmed',
  },
  {
    id: '2',
    customerName: 'Mike Rodriguez',
    studioName: 'Echo Sound Studio',
    city: 'New York',
    startTime: '10:00',
    endTime: '14:00',
    status: 'confirmed',
  },
  {
    id: '3',
    customerName: 'Emily Watson',
    studioName: 'The Creative Loft',
    city: 'Chicago',
    startTime: '14:00',
    endTime: '18:00',
    status: 'pending',
  },
  {
    id: '4',
    customerName: 'James Kim',
    studioName: 'Podcast Pro Studio',
    city: 'Austin',
    startTime: '16:00',
    endTime: '19:00',
    status: 'confirmed',
  },
]

const statusColors = {
  confirmed: 'success',
  pending: 'warning',
  completed: 'secondary',
} as const

export function TodayBookings() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Today&apos;s Bookings</CardTitle>
          <Badge variant="secondary" className="font-normal">
            {mockBookings.length} bookings
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {mockBookings.map((booking) => (
          <div
            key={booking.id}
            className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-gray-200 text-gray-900 text-sm font-medium">
                {getInitials(booking.customerName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-gray-900 truncate">{booking.customerName}</p>
                <Badge variant={statusColors[booking.status]} className="text-xs">
                  {booking.status}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 truncate">{booking.studioName}</p>
            </div>
            <div className="text-right text-sm">
              <div className="flex items-center gap-1 text-gray-500">
                <Clock className="h-3.5 w-3.5" />
                <span>{formatTime(booking.startTime)} - {formatTime(booking.endTime)}</span>
              </div>
              <div className="flex items-center gap-1 text-gray-400 mt-0.5">
                <MapPin className="h-3.5 w-3.5" />
                <span>{booking.city}</span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
