'use client'

import { useMemo } from 'react'

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

const STATUS_TONES: Record<string, { bg: string; fg: string; dot: string; label: string }> = {
  cold: { bg: 'oklch(0.96 0.005 240)', fg: 'oklch(0.40 0.012 240)', dot: 'oklch(0.55 0.012 240)', label: 'cold' },
  warm: { bg: 'oklch(0.97 0.06 72)', fg: 'oklch(0.48 0.14 65)', dot: 'oklch(0.68 0.16 72)', label: 'warm' },
  hot: { bg: 'oklch(0.97 0.06 40)', fg: 'oklch(0.45 0.18 35)', dot: 'oklch(0.60 0.22 30)', label: 'hot' },
  voicemail: { bg: 'oklch(0.97 0.04 280)', fg: 'oklch(0.46 0.18 280)', dot: 'oklch(0.60 0.20 280)', label: 'voicemail' },
  negotiation: { bg: 'oklch(0.94 0 0)', fg: 'oklch(0.20 0 0)', dot: 'oklch(0.22 0 0)', label: 'onderhandeling' },
  closed: { bg: 'oklch(0.96 0.06 145)', fg: 'oklch(0.42 0.16 145)', dot: 'oklch(0.58 0.18 145)', label: 'gesloten' },
  lost: { bg: 'oklch(0.97 0.03 27)', fg: 'oklch(0.48 0.20 27)', dot: 'oklch(0.57 0.24 27)', label: 'verloren' },
}

const STATUS_ORDER: Array<keyof CityStats> = [
  'cold', 'warm', 'hot', 'voicemail', 'negotiation', 'closed', 'lost',
]

export function CityOverview({
  leads,
  onCityClick,
}: {
  leads: SalesLeadLite[]
  onCityClick: (city: string) => void
}) {
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

  const maxTotal = Math.max(1, ...cities.map(c => c.total))

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 1,
        background: 'var(--edge)',
      }}
    >
      {cities.map((city) => {
        const fillPct = Math.round((city.total / maxTotal) * 100)
        return (
          <button
            key={city.city}
            onClick={() => onCityClick(city.city)}
            style={{
              background: 'var(--bg, #F9FAFE)',
              padding: '22px 28px',
              cursor: 'pointer',
              transition: 'background 110ms',
              border: 'none',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg, #F9FAFE)' }}
          >
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)', marginBottom: 5 }}>
              {city.city}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-ghost)', marginBottom: 12 }}>
              {city.total} {city.total === 1 ? 'studio' : "studio's"}
            </div>
            <div style={{ height: 4, borderRadius: 2, background: 'var(--edge)', overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ height: '100%', background: 'var(--accent)', borderRadius: 2, width: `${fillPct}%` }} />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {STATUS_ORDER.map((status) => {
                const count = city[status] as number
                if (count === 0) return null
                const tone = STATUS_TONES[status as string]
                return (
                  <span
                    key={status as string}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '2px 7px', borderRadius: 9999,
                      fontSize: 9, fontWeight: 600, letterSpacing: '0.02em',
                      background: tone.bg, color: tone.fg,
                    }}
                  >
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: tone.dot }} />
                    {count} {tone.label}
                  </span>
                )
              })}
            </div>
          </button>
        )
      })}
    </div>
  )
}
