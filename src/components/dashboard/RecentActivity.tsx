'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Calendar, Users, DollarSign, Rocket, Star } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface Activity {
  id: string
  type: 'studio' | 'booking' | 'partner' | 'payment' | 'lead' | 'review'
  title: string
  description: string
  timestamp: Date
}

function createMockActivities(): Activity[] {
  return [
    {
      id: '1',
      type: 'booking',
      title: 'New booking confirmed',
      description: 'Sarah Chen booked Sunlight Studios for Jan 28',
      timestamp: new Date(Date.now() - 1000 * 60 * 15),
    },
    {
      id: '2',
      type: 'partner',
      title: 'New partner onboarded',
      description: 'Echo Sound Studio joined the platform',
      timestamp: new Date(Date.now() - 1000 * 60 * 45),
    },
    {
      id: '3',
      type: 'payment',
      title: 'Payout processed',
      description: '$2,450 sent to Creative Loft Studios',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    },
    {
      id: '4',
      type: 'lead',
      title: 'Lead converted',
      description: 'Podcast Pro Studio signed contract',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4),
    },
    {
      id: '5',
      type: 'review',
      title: 'New 5-star review',
      description: 'Mike R. rated Sunlight Studios',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6),
    },
    {
      id: '6',
      type: 'studio',
      title: 'Studio listing updated',
      description: 'The Creative Loft added new photos',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8),
    },
  ]
}

const activityIcons = {
  studio: { icon: Building2, color: 'bg-blue-50 text-blue-600' },
  booking: { icon: Calendar, color: 'bg-emerald-50 text-emerald-600' },
  partner: { icon: Users, color: 'bg-purple-50 text-purple-600' },
  payment: { icon: DollarSign, color: 'bg-amber-50 text-amber-600' },
  lead: { icon: Rocket, color: 'bg-orange-50 text-orange-600' },
  review: { icon: Star, color: 'bg-pink-50 text-pink-600' },
}

export function RecentActivity() {
  const [activities, setActivities] = useState<Activity[]>([])

   
  useEffect(() => {
    setActivities(createMockActivities())
  }, [])

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-0">
          {activities.map((activity, index) => {
            const { icon: Icon, color } = activityIcons[activity.type]
            const isLast = index === activities.length - 1

            return (
              <div key={activity.id} className="flex gap-4 pb-4">
                {/* Timeline line */}
                <div className="flex flex-col items-center">
                  <div className={cn('p-2 rounded-lg', color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  {!isLast && <div className="w-px h-full bg-gray-200 mt-2" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                  <p className="text-sm text-gray-500 truncate">{activity.description}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
