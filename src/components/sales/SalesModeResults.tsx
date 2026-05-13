'use client'

import Link from 'next/link'
import {
  BarChart3,
  ThumbsUp,
  ThumbsDown,
  Edit3,
  Search,
  RotateCcw,
  CheckCircle2,
  Eye,
} from 'lucide-react'

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
    <div className="fixed inset-0 z-50 bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Card */}
        <div className="bg-white border border-gray-200 rounded-md">
          {/* Head */}
          <div className="px-8 py-7 border-b border-gray-200 text-center">
            <div className="w-12 h-12 rounded-full bg-[#0E4F6D] flex items-center justify-center mx-auto mb-3">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-[22px] font-black text-gray-900 leading-tight tracking-tight mb-1">
              Sales Ronde Afgerond
            </h1>
            <p className="text-[12px] text-gray-500">
              {filterLabel} &mdash; {stats.reviewed} van {totalLeads} leads bekeken
            </p>
          </div>

          {/* Progress */}
          <div className="px-8 pt-5 pb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[8px] font-bold tracking-[0.20em] uppercase text-gray-400">Voortgang</span>
              <span className="text-[10.5px] font-mono font-bold text-gray-700">{completionRate}%</span>
            </div>
            <div className="h-[3px] bg-gray-200 rounded overflow-hidden">
              <div
                className="h-full bg-[#0E4F6D] rounded transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>

          {/* Stats grid */}
          <div className="px-8 py-4 grid grid-cols-2 gap-2.5">
            <StatTile icon={Eye} value={stats.reviewed} label="Bekeken" tone="blue" />
            <StatTile icon={Edit3} value={stats.statusChanges} label="Status wijzigingen" tone="purple" />
            <StatTile icon={ThumbsUp} value={stats.approved} label="Goedgekeurd" tone="emerald" />
            <StatTile icon={ThumbsDown} value={stats.rejected} label="Afgewezen" tone="red" />
          </div>

          {/* Actions */}
          <div className="px-8 pb-6 pt-4 border-t border-gray-200 flex flex-col gap-2">
            {completionRate < 100 && (
              <button
                onClick={onRestart}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-3 rounded text-[12px] font-extrabold tracking-wider text-white bg-[#0E4F6D] hover:opacity-85 transition-opacity"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Doorgaan waar je gebleven was
              </button>
            )}
            <button
              onClick={onClose}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-3 rounded text-[12px] font-bold tracking-wider border border-gray-200 bg-white text-gray-600 hover:border-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-all"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Terug naar overzicht
            </button>
            <Link
              href="/scraper"
              className="w-full flex items-center justify-center gap-1.5 px-3 py-3 rounded text-[12px] font-bold tracking-wider border border-gray-200 bg-white text-gray-600 hover:border-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-all"
            >
              <Search className="h-3.5 w-3.5" />
              Meer leads scrapen
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatTile({
  icon: Icon, value, label, tone,
}: {
  icon: typeof Eye
  value: number
  label: string
  tone: 'blue' | 'purple' | 'emerald' | 'red'
}) {
  const toneMap = {
    blue: { bg: 'bg-blue-50', fg: 'text-blue-600' },
    purple: { bg: 'bg-purple-50', fg: 'text-purple-600' },
    emerald: { bg: 'bg-emerald-50', fg: 'text-emerald-600' },
    red: { bg: 'bg-red-50', fg: 'text-red-500' },
  } as const
  const t = toneMap[tone]
  return (
    <div className="bg-gray-50 border border-gray-200 rounded p-3">
      <div className="flex items-center gap-2.5">
        <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${t.bg}`}>
          <Icon className={`h-3.5 w-3.5 ${t.fg}`} />
        </div>
        <div className="min-w-0">
          <div className="text-[18px] font-black text-gray-900 leading-none">{value}</div>
          <div className="text-[8.5px] font-bold tracking-[0.12em] uppercase text-gray-400 mt-1">{label}</div>
        </div>
      </div>
    </div>
  )
}
