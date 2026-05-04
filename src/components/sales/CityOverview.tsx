'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { MapPin, X, ArrowRight, ChevronDown } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
  PieChart,
  Pie,
  Legend,
} from 'recharts'

interface SalesLeadLite {
  id: string
  city?: string | null
  status: string
  company_name?: string
  contact_name?: string | null
}

interface CityStats {
  city: string
  total: number
  cold: number
  warm: number
  hot: number
  voicemail: number
  negotiation: number
  closed: number
  lost: number
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  cold: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Cold' },
  warm: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Warm' },
  hot: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Hot' },
  voicemail: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Voicemail' },
  negotiation: { bg: 'bg-violet-100', text: 'text-violet-700', label: 'Negotiation' },
  closed: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Closed' },
  lost: { bg: 'bg-red-100', text: 'text-red-700', label: 'Lost' },
}

const STATUS_KEYS: Array<keyof CityStats> = [
  'cold', 'warm', 'hot', 'voicemail', 'negotiation', 'closed', 'lost',
]

export function CityOverview({
  leads,
  onCityClick,
}: {
  leads: SalesLeadLite[]
  onCityClick: (city: string) => void
}) {
  const [detailCity, setDetailCity] = useState<string | null>(null)
  const [chartOpen, setChartOpen] = useState(true)
  const cities = useMemo<CityStats[]>(() => {
    const map = new Map<string, CityStats>()
    for (const lead of leads) {
      const city = (lead.city ?? '').trim() || 'Onbekend'
      let stats = map.get(city)
      if (!stats) {
        stats = {
          city,
          total: 0,
          cold: 0, warm: 0, hot: 0, voicemail: 0, negotiation: 0, closed: 0, lost: 0,
        }
        map.set(city, stats)
      }
      stats.total += 1
      const key = lead.status as keyof CityStats
      if (key in stats && key !== 'city' && key !== 'total') {
        ;(stats[key] as number) += 1
      }
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [leads])

  const totalStudios = leads.length
  const totalClosed = leads.filter((l) => l.status === 'closed').length
  const closedRate = totalStudios > 0 ? Math.round((totalClosed / totalStudios) * 100) : 0

  // Closed-only chart data (alleen steden met >=1 closed, gesorteerd)
  const closedChartData = useMemo(
    () =>
      cities
        .filter((c) => c.closed > 0)
        .map((c) => ({ city: c.city, closed: c.closed }))
        .sort((a, b) => b.closed - a.closed)
        .slice(0, 15),
    [cities],
  )

  const detailCityStats = detailCity ? cities.find((c) => c.city === detailCity) : null
  const detailCityLeads = detailCity ? leads.filter((l) => ((l.city ?? '').trim() || 'Onbekend') === detailCity) : []

  return (
    <div className="space-y-6">
      {/* Top stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Steden" value={cities.length} />
        <StatCard label="Studios totaal" value={totalStudios} />
        <StatCard label="Closed rate" value={`${closedRate}%`} subtle={`${totalClosed} closed`} />
      </div>

      {/* Closed per city chart */}
      {closedChartData.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <button
            onClick={() => setChartOpen(!chartOpen)}
            className="w-full flex items-end justify-between mb-5 group"
          >
            <div className="text-left">
              <h3 className="text-base font-bold text-gray-900 tracking-tight">Closed studios per stad</h3>
              <p className="text-xs text-gray-500 mt-1">
                Top {closedChartData.length} steden · {closedChartData.reduce((s, c) => s + c.closed, 0)} totaal binnengehaald
              </p>
            </div>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-gray-400 group-hover:text-gray-700 transition-transform',
                !chartOpen && '-rotate-90',
              )}
            />
          </button>
          {chartOpen && (
          <div style={{ height: Math.max(180, closedChartData.length * 36 + 20) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={closedChartData}
                layout="vertical"
                margin={{ top: 0, right: 36, left: 0, bottom: 0 }}
                barSize={20}
              >
                <defs>
                  <linearGradient id="closedBarGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#34d399" />
                  </linearGradient>
                </defs>
                <XAxis type="number" allowDecimals={false} hide />
                <YAxis
                  type="category"
                  dataKey="city"
                  tick={{ fontSize: 13, fill: '#0f172a', fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                  width={120}
                />
                <Tooltip
                  cursor={{ fill: '#f9fafb' }}
                  contentStyle={{
                    borderRadius: 10,
                    border: '1px solid #e5e7eb',
                    fontSize: 12,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                  }}
                  formatter={(v) => [`${v ?? 0} closed`, 'Studios']}
                  labelStyle={{ fontWeight: 600, color: '#0f172a' }}
                />
                <Bar dataKey="closed" fill="url(#closedBarGradient)" radius={[0, 8, 8, 0]}>
                  <LabelList
                    dataKey="closed"
                    position="right"
                    style={{ fill: '#0f172a', fontSize: 12, fontWeight: 600 }}
                    offset={8}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          )}
        </div>
      )}

      {/* City grid */}
      {cities.length === 0 ? (
        <div className="border border-dashed border-gray-200 rounded-xl py-16 text-center">
          <MapPin className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Nog geen leads met stad ingevuld.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cities.map((c) => (
            <button
              key={c.city}
              onClick={() => setDetailCity(c.city)}
              className="text-left bg-white border border-gray-100 rounded-2xl p-5 hover:border-gray-300 hover:shadow-sm transition group"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{c.city}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {c.total} studio{c.total === 1 ? '' : 's'}
                  </p>
                </div>
                <MapPin className="h-5 w-5 text-gray-300 group-hover:text-gray-500 transition" />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {STATUS_KEYS.map((key) => {
                  const value = c[key] as number
                  if (value === 0) return null
                  const cfg = STATUS_COLORS[key as string]
                  return (
                    <span
                      key={key}
                      className={cn(
                        'px-2 py-0.5 rounded-md text-xs font-medium',
                        cfg.bg,
                        cfg.text,
                      )}
                    >
                      {cfg.label}: {value}
                    </span>
                  )
                })}
              </div>
            </button>
          ))}
        </div>
      )}

      {detailCity && detailCityStats && (
        <CityDetailModal
          city={detailCity}
          stats={detailCityStats}
          leads={detailCityLeads}
          onClose={() => setDetailCity(null)}
          onFilterPipeline={() => {
            onCityClick(detailCity)
            setDetailCity(null)
          }}
        />
      )}
    </div>
  )
}

function CityDetailModal({
  city,
  stats,
  leads,
  onClose,
  onFilterPipeline,
}: {
  city: string
  stats: CityStats
  leads: SalesLeadLite[]
  onClose: () => void
  onFilterPipeline: () => void
}) {
  const pieData = STATUS_KEYS
    .map((key) => ({
      name: STATUS_COLORS[key as string].label,
      value: stats[key] as number,
      color: STATUS_HEX[key as string],
    }))
    .filter((d) => d.value > 0)

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1">Stad</p>
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">{city}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {stats.total} studio{stats.total === 1 ? '' : 's'} · {stats.closed} closed
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <div className="p-6 grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-3">Verdeling per status</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={36}>
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h3 className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-3">Studios in {city}</h3>
            <div className="space-y-1 max-h-56 overflow-y-auto">
              {leads.map((lead) => {
                const cfg = STATUS_COLORS[lead.status] ?? STATUS_COLORS.cold
                return (
                  <div key={lead.id} className="flex items-center justify-between py-2 px-2 rounded hover:bg-gray-50">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{lead.company_name}</p>
                      {lead.contact_name && <p className="text-xs text-gray-500 truncate">{lead.contact_name}</p>}
                    </div>
                    <span className={cn('px-2 py-0.5 rounded-md text-xs font-medium shrink-0', cfg.bg, cfg.text)}>
                      {cfg.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onFilterPipeline}
            className="text-sm font-medium text-gray-900 hover:text-black flex items-center gap-1.5"
          >
            Open in pipeline
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

const STATUS_HEX: Record<string, string> = {
  cold: '#9ca3af',
  warm: '#f59e0b',
  hot: '#f97316',
  voicemail: '#3b82f6',
  negotiation: '#8b5cf6',
  closed: '#10b981',
  lost: '#ef4444',
}

function StatCard({
  label,
  value,
  subtle,
}: {
  label: string
  value: string | number
  subtle?: string
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5">
      <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      {subtle && <p className="text-xs text-gray-500 mt-1">{subtle}</p>}
    </div>
  )
}
