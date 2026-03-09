'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Target, TrendingUp } from 'lucide-react'

interface GoalProgressProps {
  currentStudios: number
  goalStudios: number
}

export function GoalProgress({ currentStudios = 127, goalStudios = 1000 }: GoalProgressProps) {
  const percentage = Math.round((currentStudios / goalStudios) * 100)
  const remaining = goalStudios - currentStudios

  return (
    <Card className="bg-gradient-to-br from-gray-900 via-gray-900 to-purple-600 text-white border-0">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 text-gray-200">
              <Target className="h-4 w-4" />
              <span className="text-sm font-medium">Road to 1000 Studios</span>
            </div>
            <p className="mt-2 text-4xl font-bold">{currentStudios}</p>
            <p className="text-sm text-gray-300">studios onboarded</p>
          </div>
          <div className="flex items-center gap-1 bg-white/20 rounded-full px-3 py-1">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm font-medium">+12 this week</span>
          </div>
        </div>

        <Progress value={percentage} className="h-3 bg-white/20 [&>div]:bg-white" />

        <div className="flex items-center justify-between mt-3 text-sm">
          <span className="text-gray-300">{percentage}% complete</span>
          <span className="text-gray-300">{remaining} studios to go</span>
        </div>
      </CardContent>
    </Card>
  )
}
