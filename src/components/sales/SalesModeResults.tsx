'use client'

import Link from 'next/link'
import {
  BarChart3,
  ThumbsUp,
  ThumbsDown,
  Edit3,
  ArrowRight,
  Search,
  RotateCcw,
  CheckCircle2,
  Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SessionStats {
  reviewed: number
  statusChanges: number
  approved: number
  rejected: number
  notesEdited: number
}

interface SalesModeResultsProps {
  stats: SessionStats
  totalLeads: number
  filterLabel: string
  onRestart: () => void
  onClose: () => void
}

export function SalesModeResults({ stats, totalLeads, filterLabel, onRestart, onClose }: SalesModeResultsProps) {
  const completionRate = totalLeads > 0 ? Math.round((stats.reviewed / totalLeads) * 100) : 0

  return (
    <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
      <div className="max-w-lg w-full mx-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-gray-900 flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Sales Ronde Afgerond</h1>
          <p className="text-gray-500">
            {filterLabel} &mdash; {stats.reviewed} van {totalLeads} leads bekeken
          </p>
        </div>

        {/* Completion bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-gray-500">Voortgang</span>
            <span className="font-semibold text-gray-900">{completionRate}%</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gray-900 rounded-full transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-gray-50 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Eye className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.reviewed}</div>
                <div className="text-sm text-gray-500">Bekeken</div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Edit3 className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.statusChanges}</div>
                <div className="text-sm text-gray-500">Status wijzigingen</div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <ThumbsUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.approved}</div>
                <div className="text-sm text-gray-500">Goedgekeurd</div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <ThumbsDown className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.rejected}</div>
                <div className="text-sm text-gray-500">Afgewezen</div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {completionRate < 100 && (
            <Button onClick={onRestart} className="w-full" size="lg">
              <RotateCcw className="h-4 w-4 mr-2" />
              Doorgaan waar je gebleven was
            </Button>
          )}

          <Button onClick={onClose} variant={completionRate < 100 ? 'outline' : 'default'} className="w-full" size="lg">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Terug naar overzicht
          </Button>

          <Link href="/scraper" className="block">
            <Button variant="outline" className="w-full" size="lg">
              <Search className="h-4 w-4 mr-2" />
              Meer leads scrapen
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
