'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Clock, MapPin, Calendar } from 'lucide-react'
import { formatTime, getInitials } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

interface Booking {
  id: string
  customerName: string
  studioName: string
  city: string
  startTime: string
  endTime: string
  status: 'confirmed' | 'pending' | 'completed'
}

const statusColors = {
  confirmed: 'success',
  pending: 'warning',
  completed: 'secondary',
} as const

export function TodayBookings() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const today = new Date().toISOString().split('T')[0]
        const { data } = await supabase
          .from('bookings')
          .select(`
            id, date, start_time, end_time, status,
            customer:customers(full_name),
            studio:studios(name, city)
          `)
          .eq('date', today)
          .order('start_time', { ascending: true })
          .limit(10)

        if (data) {
          setBookings(data.map((b: any) => ({
            id: b.id,
            customerName: b.customer?.full_name || 'Onbekend',
            studioName: b.studio?.name || 'Onbekend',
            city: b.studio?.city || '',
            startTime: b.start_time,
            endTime: b.end_time,
            status: b.status || 'pending',
          })))
        }
      } catch (err) {
        console.error('Error fetching bookings:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchBookings()
  }, [])

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Boekingen vandaag</CardTitle>
          <Badge variant="secondary" className="font-normal">
            {bookings.length} boekingen
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-6 text-sm text-gray-400">Laden...</div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Geen boekingen vandaag</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
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
                  {booking.city && (
                    <div className="flex items-center gap-1 text-gray-400 mt-0.5">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{booking.city}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
