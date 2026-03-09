'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Target, TrendingUp, Calendar, Rocket } from 'lucide-react'

interface GoalTrackerProps {
  currentStudios: number
  goalStudios: number
  weeklyGrowth: number
  monthlyTarget: number
}

export function GoalTracker({
  currentStudios = 127,
  goalStudios = 1000,
  weeklyGrowth = 12,
  monthlyTarget = 50,
}: GoalTrackerProps) {
  const percentage = Math.round((currentStudios / goalStudios) * 100)
  const remaining = goalStudios - currentStudios
  const weeksToGoal = Math.ceil(remaining / weeklyGrowth)

  return (
    <div className="space-y-6">
      {/* Main Goal Card */}
      <Card className="bg-gradient-to-br from-gray-900 via-gray-900 to-purple-600 text-white border-0">
        <CardContent className="p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 text-gray-200">
                <Target className="h-5 w-5" />
                <span className="text-lg font-medium">Road to 1,000 Studios</span>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-6xl font-bold">{currentStudios}</span>
                <span className="text-2xl text-gray-300">/ {goalStudios}</span>
              </div>
              <p className="mt-2 text-gray-300">studios onboarded</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
                <TrendingUp className="h-4 w-4" />
                <span className="font-medium">+{weeklyGrowth} this week</span>
              </div>
              <p className="text-sm text-gray-300">~{weeksToGoal} weeks to goal</p>
            </div>
          </div>

          <Progress value={percentage} className="h-4 bg-white/20 [&>div]:bg-white" />

          <div className="flex items-center justify-between mt-4 text-sm">
            <span className="text-gray-300">{percentage}% complete</span>
            <span className="text-gray-300">{remaining} studios to go</span>
          </div>
        </CardContent>
      </Card>

      {/* Mini Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">This Month</p>
                <p className="text-xl font-bold text-gray-900">+28</p>
              </div>
            </div>
            <div className="mt-3">
              <Progress value={(28 / monthlyTarget) * 100} className="h-2" />
              <p className="mt-1 text-xs text-gray-500">{monthlyTarget} target</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Avg Weekly</p>
                <p className="text-xl font-bold text-gray-900">{weeklyGrowth}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-gray-500">studios per week</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-50">
                <Rocket className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Conversion Rate</p>
                <p className="text-xl font-bold text-gray-900">18%</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-gray-500">lead to partner</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
