'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Building2, Mail, MapPin, GripVertical } from 'lucide-react'
import { getInitials } from '@/lib/utils'
import type { SalesLead } from '@/types'

interface LeadCardProps {
  lead: SalesLead
  onClick?: () => void
}

const sourceColors = {
  apollo: 'bg-blue-100 text-blue-700',
  referral: 'bg-purple-100 text-purple-700',
  inbound: 'bg-emerald-100 text-emerald-700',
  outreach: 'bg-amber-100 text-amber-700',
}

const typeLabels: Record<string, string> = {
  photo: 'Photo',
  video: 'Video',
  podcast: 'Podcast',
  music: 'Music',
  event: 'Event',
}

export function LeadCard({ lead, onClick }: LeadCardProps) {
  return (
    <Card
      className="group cursor-grab active:cursor-grabbing hover:shadow-md transition-all"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="h-4 w-4 text-gray-400" />
          </div>
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarFallback className="bg-gray-200 text-gray-900 text-sm">
              {getInitials(lead.company_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">{lead.company_name}</p>
            {lead.contact_name && (
              <p className="text-sm text-gray-500 truncate">{lead.contact_name}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {lead.city && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <MapPin className="h-3 w-3" />
                  {lead.city}
                </span>
              )}
              {lead.studio_type && (
                <Badge variant="outline" className="text-xs">
                  {typeLabels[lead.studio_type] || lead.studio_type}
                </Badge>
              )}
              {lead.source && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${sourceColors[lead.source as keyof typeof sourceColors] || 'bg-gray-100 text-gray-700'}`}>
                  {lead.source}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
