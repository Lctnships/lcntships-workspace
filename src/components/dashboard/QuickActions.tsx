'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, FileText, Send, BarChart2 } from 'lucide-react'

const actions = [
  {
    label: 'Add Studio',
    icon: Plus,
    href: '/studios/new',
    color: 'bg-gray-900 hover:bg-gray-900',
  },
  {
    label: 'New Lead',
    icon: Plus,
    href: '/sales?new=true',
    color: 'bg-orange-500 hover:bg-orange-600',
  },
  {
    label: 'Create Invoice',
    icon: FileText,
    href: '/documents?type=invoice',
    color: 'bg-emerald-500 hover:bg-emerald-600',
  },
  {
    label: 'Send Payout',
    icon: Send,
    href: '/finance?action=payout',
    color: 'bg-purple-500 hover:bg-purple-600',
  },
  {
    label: 'View Reports',
    icon: BarChart2,
    href: '/analytics',
    color: 'bg-blue-500 hover:bg-blue-600',
  },
]

export function QuickActions() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {actions.map((action) => {
            const Icon = action.icon
            return (
              <Button
                key={action.label}
                variant="ghost"
                className="h-auto flex-col gap-2 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl"
                asChild
              >
                <a href={action.href}>
                  <div className={`p-2 rounded-lg text-white ${action.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{action.label}</span>
                </a>
              </Button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
