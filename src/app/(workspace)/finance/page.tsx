'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowUp, ArrowDown, MoreHorizontal, Plus, RotateCw, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Period = 'maand' | 'kwartaal' | 'jaar'
type InvStatus = 'paid' | 'open' | 'overdue' | 'draft'

interface BookingRow {
  id: string
  total_amount: number | null
  service_fee: number | null
  host_payout: number | null
  status: string | null
  created_at: string
  start_datetime: string | null
  studio?: { id: string; title: string } | null
}

interface TxRow {
  id: string
  type: string
  amount: number
  description: string | null
  status: string
  created_at: string
}

interface StudioOption { id: string; title: string }

function eur(n: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}
function eurMonoK(n: number) {
  if (n >= 1000) return `€${Math.round(n / 1000)}k`
  return `€${Math.round(n)}`
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}
function initialsOf(name: string) {
  const parts = name.split(/\s+/).filter(Boolean).slice(0, 3)
  return parts.map(p => p[0]?.toUpperCase()).join('') || 'ST'
}

function getPeriodRange(p: Period, now = new Date()) {
  const year = now.getFullYear()
  if (p === 'maand') {
    const from = new Date(year, now.getMonth(), 1)
    const to = new Date(year, now.getMonth() + 1, 0, 23, 59, 59)
    const monthNL = now.toLocaleString('nl-NL', { month: 'long' })
    const monthCap = monthNL.charAt(0).toUpperCase() + monthNL.slice(1)
    return {
      from, to,
      label: `Omzet — ${monthCap} ${year}`,
      prevLabel: 'vs vorige maand',
      costsLabel: `${monthCap} ${year}`,
      chartLabel: `Omzet over tijd — ${monthCap.toLowerCase()} ${year}`,
      txLabel: 'deze maand',
    }
  }
  if (p === 'kwartaal') {
    const q = Math.floor(now.getMonth() / 3)
    const from = new Date(year, q * 3, 1)
    const to = new Date(year, q * 3 + 3, 0, 23, 59, 59)
    return {
      from, to,
      label: `Omzet — Q${q + 1} ${year}`,
      prevLabel: `vs Q${q === 0 ? 4 : q} ${q === 0 ? year - 1 : year}`,
      costsLabel: `Q${q + 1} ${year}`,
      chartLabel: `Omzet over tijd — Q${q + 1} ${year}`,
      txLabel: 'dit kwartaal',
    }
  }
  const from = new Date(year, 0, 1)
  const to = new Date(year, 11, 31, 23, 59, 59)
  return {
    from, to,
    label: `Omzet — ${year}`,
    prevLabel: `vs ${year - 1}`,
    costsLabel: `${year} YTD`,
    chartLabel: `Omzet over tijd — ${year}`,
    txLabel: 'dit jaar',
  }
}

function inferInvStatus(b: BookingRow): InvStatus {
  const s = (b.status || '').toLowerCase()
  if (s === 'paid' || s === 'completed' || s === 'confirmed') return 'paid'
  if (s === 'draft' || s === 'pending') return 'draft'
  const ageDays = (Date.now() - new Date(b.created_at).getTime()) / 86400000
  if (ageDays > 30) return 'overdue'
  return 'open'
}

const STATUS_CFG: Record<InvStatus, { cls: string; label: string }> = {
  paid: { cls: 's-paid', label: 'betaald' },
  open: { cls: 's-open', label: 'open' },
  overdue: { cls: 's-overdue', label: 'achterstallig' },
  draft: { cls: 's-draft', label: 'concept' },
}

export default function FinancePage() {
  const [period, setPeriod] = useState<Period>('kwartaal')
  const [studioFilter, setStudioFilter] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [txs, setTxs] = useState<TxRow[]>([])
  const [studios, setStudios] = useState<StudioOption[]>([])
  const [payoutPaid, setPayoutPaid] = useState<Set<string>>(new Set())

  const range = useMemo(() => getPeriodRange(period), [period])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setErr(null)
      try {
        const fromIso = range.from.toISOString()
        const toIso = range.to.toISOString()

        const [bkRes, txRes, stRes] = await Promise.all([
          supabase
            .from('bookings')
            .select('id, total_amount, service_fee, host_payout, status, created_at, start_datetime, studio:studios(id, title)')
            .gte('created_at', fromIso)
            .lte('created_at', toIso)
            .order('created_at', { ascending: false }),
          supabase
            .from('transactions')
            .select('id, type, amount, description, status, created_at')
            .gte('created_at', fromIso)
            .lte('created_at', toIso)
            .order('created_at', { ascending: false })
            .limit(100),
          supabase
            .from('studios')
            .select('id, title')
            .order('title', { ascending: true }),
        ])
        if (bkRes.error) throw new Error(bkRes.error.message)
        if (txRes.error) throw new Error(txRes.error.message)
        setBookings((bkRes.data as unknown as BookingRow[]) || [])
        setTxs((txRes.data as unknown as TxRow[]) || [])
        setStudios((stRes.data as StudioOption[]) || [])
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Onbekende fout')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [range])

  const filteredBookings = useMemo(
    () => studioFilter ? bookings.filter(b => b.studio?.id === studioFilter) : bookings,
    [bookings, studioFilter]
  )

  const kpis = useMemo(() => {
    const totalRevenue = filteredBookings.reduce((s, b) => s + (Number(b.total_amount) || 0), 0)
    const fees = filteredBookings.reduce((s, b) => s + (Number(b.service_fee) || 0), 0)
    const open = filteredBookings.filter(b => inferInvStatus(b) === 'open' || inferInvStatus(b) === 'overdue')
    const openTotal = open.reduce((s, b) => s + (Number(b.total_amount) || 0), 0)
    const overdueCount = open.filter(b => inferInvStatus(b) === 'overdue').length
    const paid = filteredBookings.filter(b => inferInvStatus(b) === 'paid')
    const paidTotal = paid.reduce((s, b) => s + (Number(b.host_payout) || 0), 0)
    const paidStudios = new Set(paid.map(b => b.studio?.id).filter(Boolean)).size
    const pendingPayouts = filteredBookings
      .filter(b => inferInvStatus(b) === 'paid')
      .reduce((acc, b) => {
        const key = b.studio?.id || 'unknown'
        const k = `${period}_${key}`
        if (payoutPaid.has(k)) return acc
        return acc + (Number(b.host_payout) || 0)
      }, 0)
    return { totalRevenue, fees, openTotal, openCount: open.length, overdueCount, paidTotal, paidStudios, pendingPayouts }
  }, [filteredBookings, payoutPaid, period])

  const invoices = useMemo(() => filteredBookings.slice(0, 12), [filteredBookings])

  const costs = useMemo(() => {
    const studioRent = filteredBookings.reduce((s, b) => s + (Number(b.host_payout) || 0), 0)
    const platformFees = filteredBookings.reduce((s, b) => s + (Number(b.service_fee) || 0), 0)
    const refunds = txs.filter(t => (t.type || '').toLowerCase() === 'refund').reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0)
    const other = txs.filter(t => (t.type || '').toLowerCase() === 'expense').reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0)
    const total = studioRent + platformFees + refunds + other
    const items = [
      { cat: 'Studio uitbetalingen', sub: `${new Set(filteredBookings.map(b => b.studio?.id).filter(Boolean)).size} studio's`, amount: studioRent },
      { cat: 'Platform fees', sub: '15% van omzet', amount: platformFees },
      { cat: 'Refunds', sub: `${txs.filter(t => (t.type || '').toLowerCase() === 'refund').length} terugbetalingen`, amount: refunds },
      { cat: 'Overige uitgaven', sub: 'transacties type expense', amount: other },
    ].sort((a, b) => b.amount - a.amount)
    return items.map(i => ({
      ...i,
      pct: total > 0 ? Math.round((i.amount / total) * 100) : 0,
    }))
  }, [filteredBookings, txs])

  const payouts = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number; amount: number }>()
    for (const b of filteredBookings) {
      if (inferInvStatus(b) !== 'paid') continue
      const id = b.studio?.id
      const name = b.studio?.title
      if (!id || !name) continue
      const cur = map.get(id) || { id, name, count: 0, amount: 0 }
      cur.count += 1
      cur.amount += Number(b.host_payout) || 0
      map.set(id, cur)
    }
    return Array.from(map.values())
      .filter(p => p.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8)
  }, [filteredBookings])

  const chartData = useMemo(() => {
    const days = Math.max(1, Math.ceil((range.to.getTime() - range.from.getTime()) / 86400000))
    const buckets = period === 'maand' ? 7 : period === 'kwartaal' ? 6 : 7
    const span = days / buckets
    const points: { rev: number; fee: number; x: number; label: string }[] = []
    for (let i = 0; i < buckets; i++) {
      const start = new Date(range.from.getTime() + i * span * 86400000)
      const end = new Date(range.from.getTime() + (i + 1) * span * 86400000)
      const subset = filteredBookings.filter(b => {
        const t = new Date(b.created_at).getTime()
        return t >= start.getTime() && t < end.getTime()
      })
      const rev = subset.reduce((s, b) => s + (Number(b.total_amount) || 0), 0)
      const fee = subset.reduce((s, b) => s + (Number(b.service_fee) || 0), 0)
      const x = 30 + (i / Math.max(1, buckets - 1)) * 700
      const label = period === 'jaar'
        ? start.toLocaleString('nl-NL', { month: 'short' })
        : start.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
      points.push({ rev, fee, x, label })
    }
    const maxRev = Math.max(...points.map(p => p.rev), 1)
    const yAt = (v: number) => 150 - (v / maxRev) * 140
    const revPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${yAt(p.rev)}`).join(' ')
    const revArea = `${revPath} L760,160 L30,160 Z`
    const feePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${yAt(p.fee)}`).join(' ')
    const feeArea = `${feePath} L760,160 L30,160 Z`
    const yLabels = [maxRev, maxRev * 0.66, maxRev * 0.33, maxRev * 0.1].map(eurMonoK)
    return { points, revPath, revArea, feePath, feeArea, yLabels }
  }, [filteredBookings, range, period])

  return (
    <div style={{ margin: '-16px -16px 0 -16px', minHeight: 'calc(100vh - 0px)', background: 'var(--bg, #F9FAFE)', overflowX: 'hidden' }}>
      <header className="fin-header">
        <span className="fin-eyebrow">Finance</span>
        <div className="fin-tabs">
          {(['maand', 'kwartaal', 'jaar'] as Period[]).map(p => (
            <button
              key={p}
              className={`fin-tab${period === p ? ' active' : ''}`}
              onClick={() => setPeriod(p)}
            >
              {p === 'maand' ? 'Deze maand' : p === 'kwartaal' ? 'Dit kwartaal' : 'Dit jaar'}
            </button>
          ))}
        </div>
        <select className="fin-studio-filter" value={studioFilter} onChange={e => setStudioFilter(e.target.value)}>
          <option value="">Alle studio&apos;s</option>
          {studios.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <div className="fin-actions">
          <button className="fin-btn-outline">Exporteren</button>
          <Link href="/finance/invoices" className="fin-btn-primary">
            <Plus style={{ width: 13, height: 13 }} />
            Factuur aanmaken
          </Link>
        </div>
      </header>

      <div className="fin-kpi-strip">
        <div className="fin-kpi">
          <div className="fin-kpi-label">{range.label}</div>
          <div className="fin-kpi-value">{eur(kpis.totalRevenue)}</div>
          <div className="fin-kpi-sub">{range.prevLabel}</div>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-label">Platform fees (15%)</div>
          <div className="fin-kpi-value">{eur(kpis.fees)}</div>
          <div className="fin-kpi-sub">van totale omzet</div>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-label">Openstaande facturen</div>
          <div className="fin-kpi-value danger">{eur(kpis.openTotal)}</div>
          <div className="fin-kpi-sub">{kpis.openCount} open · {kpis.overdueCount} achterstallig</div>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-label">Uitbetaald aan hosts</div>
          <div className="fin-kpi-value success">{eur(kpis.paidTotal)}</div>
          <div className="fin-kpi-sub">{period === 'maand' ? 'deze maand' : period === 'kwartaal' ? 'dit kwartaal' : 'dit jaar'} · {kpis.paidStudios} studio{kpis.paidStudios === 1 ? '' : '’s'}</div>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-label">In behandeling</div>
          <div className="fin-kpi-value">{eur(kpis.pendingPayouts)}</div>
          <div className="fin-kpi-sub">te verwerken uitbetalingen</div>
        </div>
      </div>

      {err && <div style={{ padding: '14px 40px', fontSize: 12, color: 'var(--danger, #dc2626)' }}>Fout: {err}</div>}

      <div className="fin-main">
        <div className="fin-left">
          <div className="fin-chart-section">
            <div className="fin-section-head">
              <span className="fin-section-eyebrow">{range.chartLabel}</span>
              <div className="fin-chart-legend">
                <div className="fin-legend-item"><div className="fin-legend-dot" style={{ background: '#0E4F6D' }} /><span>Omzet</span></div>
                <div className="fin-legend-item"><div className="fin-legend-dot" style={{ background: 'oklch(0.65 0.16 145)' }} /><span>Platform fees</span></div>
              </div>
            </div>
            <div style={{ position: 'relative', height: 160 }}>
              <svg viewBox="0 0 760 160" preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                <defs>
                  <linearGradient id="fin-rev-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0E4F6D" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#0E4F6D" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="fin-fee-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.65 0.16 145)" stopOpacity="0.10" />
                    <stop offset="100%" stopColor="oklch(0.65 0.16 145)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <line x1="0" y1="0" x2="760" y2="0" stroke="oklch(0.96 0 0)" />
                <line x1="0" y1="40" x2="760" y2="40" stroke="oklch(0.96 0 0)" />
                <line x1="0" y1="80" x2="760" y2="80" stroke="oklch(0.96 0 0)" />
                <line x1="0" y1="120" x2="760" y2="120" stroke="oklch(0.96 0 0)" />
                {chartData.yLabels.map((l, i) => (
                  <text key={i} x="4" y={9 + i * 40} fontSize="9" fill="oklch(0.708 0 0)" fontFamily="ui-monospace,Menlo,monospace">{l}</text>
                ))}
                <path d={chartData.revArea} fill="url(#fin-rev-grad)" />
                <path d={chartData.revPath} fill="none" stroke="#0E4F6D" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
                <path d={chartData.feeArea} fill="url(#fin-fee-grad)" />
                <path d={chartData.feePath} fill="none" stroke="oklch(0.65 0.16 145)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="4 2" />
                {chartData.points.map((p, i) => (
                  <text key={i} x={p.x} y={176} fontSize="9" fill="oklch(0.708 0 0)" fontFamily="ui-monospace,Menlo,monospace" textAnchor="middle">{p.label}</text>
                ))}
              </svg>
            </div>
          </div>

          <div className="fin-invoices-section">
            <div className="fin-table-head-row">
              <span className="fin-section-eyebrow">Facturen</span>
              <span className="fin-table-meta">{invoices.length} factu{invoices.length === 1 ? 'ur' : 'ren'}</span>
            </div>
            <table className="fin-inv-table">
              <thead>
                <tr>
                  <th style={{ width: 120 }}>Nummer</th>
                  <th>Klant</th>
                  <th style={{ width: 120 }}>Datum</th>
                  <th style={{ width: 130 }}>Status</th>
                  <th style={{ width: 140, textAlign: 'right' }}>Bedrag</th>
                  <th style={{ width: 36 }} />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ padding: 28, textAlign: 'center', color: 'var(--ink-ghost)' }}>
                    <Loader2 className="fin-spin" style={{ width: 16, height: 16, display: 'inline-block', verticalAlign: 'middle' }} /> Laden…
                  </td></tr>
                ) : invoices.length === 0 ? (
                  <tr className="fin-empty-row"><td colSpan={6}>Geen facturen voor deze selectie.</td></tr>
                ) : invoices.map(b => {
                  const st = inferInvStatus(b)
                  const cfg = STATUS_CFG[st]
                  const num = `LTC-INV-${b.id.slice(0, 6).toUpperCase()}`
                  const clientName = b.studio?.title || 'Onbekend'
                  const sub = b.start_datetime ? fmtDate(b.start_datetime) : '—'
                  const amount = Number(b.total_amount) || 0
                  const fee = Number(b.service_fee) || Math.round(amount * 0.15)
                  return (
                    <tr key={b.id} className="fin-inv-row">
                      <td><span className="fin-inv-num">{num}</span></td>
                      <td>
                        <div className="fin-inv-client">{clientName}</div>
                        <div className="fin-inv-sub">{sub}</div>
                      </td>
                      <td><span className="fin-inv-date">{fmtDate(b.created_at)}</span></td>
                      <td><span className={`fin-status-chip ${cfg.cls}`}>{cfg.label}</span></td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="fin-inv-amount">{eur(amount)}</div>
                        <div className="fin-inv-fee">{eur(fee)} platform (15%)</div>
                      </td>
                      <td>
                        <button className="fin-icon-btn" aria-label="Acties">
                          <MoreHorizontal style={{ width: 14, height: 14 }} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="fin-costs-section">
            <div className="fin-table-head-row">
              <span className="fin-section-eyebrow">Kosten per categorie</span>
              <span className="fin-table-meta">{range.costsLabel}</span>
            </div>
            <div>
              {costs.map((c, i) => (
                <div key={i} className="fin-cost-row">
                  <div style={{ flex: 1 }}>
                    <div className="fin-cost-cat">{c.cat}</div>
                    <div className="fin-cost-sub">{c.sub}</div>
                  </div>
                  <div className="fin-cost-pct">{c.pct}%</div>
                  <div className="fin-cost-track"><div className="fin-cost-bar" style={{ width: `${Math.max(2, c.pct * 2)}%` }} /></div>
                  <div className="fin-cost-amount">{eur(c.amount)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="fin-footer">
            <span>Lctnships Workspace · Finance · {range.costsLabel} · EUR</span>
          </div>
        </div>

        <aside className="fin-right">
          <div className="fin-widget">
            <div className="fin-w-head">
              <span className="fin-w-eye">Uitbetalingen</span>
              <span className="fin-w-meta">{eur(kpis.pendingPayouts)} open</span>
            </div>
            <div>
              {payouts.length === 0 ? (
                <div style={{ padding: 14, fontSize: 11, color: 'var(--ink-ghost)' }}>Geen open uitbetalingen.</div>
              ) : payouts.map(p => {
                const key = `${period}_${p.id}`
                const done = payoutPaid.has(key)
                return (
                  <div key={p.id} className="fin-payout-row">
                    <div className="fin-payout-avatar" style={{ background: '#0E4F6D' }}>{initialsOf(p.name)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="fin-payout-name">{p.name}</div>
                      <div className="fin-payout-sub">{p.count} boeking{p.count === 1 ? '' : 'en'}</div>
                    </div>
                    <div className="fin-payout-amount">{eur(p.amount)}</div>
                    <button
                      className={`fin-pay-btn${done ? ' done' : ''}`}
                      disabled={done}
                      onClick={() => setPayoutPaid(prev => {
                        const next = new Set(prev)
                        next.add(key)
                        return next
                      })}
                    >
                      {done ? 'Betaald' : 'Betalen'}
                    </button>
                  </div>
                )
              })}
            </div>
            {payouts.length > 0 && (
              <div className="fin-payout-footer">
                <button
                  className="fin-pay-all-btn"
                  onClick={() => setPayoutPaid(prev => {
                    const next = new Set(prev)
                    payouts.forEach(p => next.add(`${period}_${p.id}`))
                    return next
                  })}
                >
                  Verwerk alle uitbetalingen
                </button>
              </div>
            )}
          </div>

          <div className="fin-widget">
            <div className="fin-w-head">
              <span className="fin-w-eye">Recente transacties</span>
              <span className="fin-w-meta">{range.txLabel}</span>
            </div>
            <div>
              {txs.length === 0 ? (
                <div style={{ padding: 14, fontSize: 11, color: 'var(--ink-ghost)' }}>Geen transacties.</div>
              ) : txs.slice(0, 8).map(t => {
                const amount = Number(t.amount) || 0
                const isRefund = (t.type || '').toLowerCase() === 'refund'
                const pos = amount > 0 && !isRefund
                return (
                  <div key={t.id} className="fin-tx-row">
                    <div className="fin-tx-icon" style={{ background: isRefund ? '#fef3c7' : pos ? '#ecfdf5' : '#fef2f2' }}>
                      {isRefund ? <RotateCw style={{ width: 14, height: 14, color: '#b45309' }} /> : pos ? <ArrowDown style={{ width: 14, height: 14, color: 'var(--success, #15803d)' }} /> : <ArrowUp style={{ width: 14, height: 14, color: 'var(--danger, #dc2626)' }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="fin-tx-desc">{t.description || t.type}</div>
                      <div className="fin-tx-date">{fmtDate(t.created_at)}</div>
                    </div>
                    <div className={`fin-tx-amount ${pos ? 'pos' : 'neg'}`}>{pos ? '+' : '−'}{eur(Math.abs(amount))}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </aside>
      </div>

      <style jsx>{`
        .fin-header {
          position: sticky; top: 0; z-index: 100;
          height: 58px; background: var(--bg, #F9FAFE);
          border-bottom: 1px solid var(--edge);
          display: flex; align-items: center;
          padding: 0 40px; gap: 0;
        }
        .fin-eyebrow {
          font-size: 9px; font-weight: 700;
          letter-spacing: 0.20em; text-transform: uppercase;
          color: var(--ink-ghost); margin-right: 24px; white-space: nowrap;
        }
        .fin-tabs { display: flex; align-items: center; height: 100%; }
        .fin-tab {
          height: 100%; padding: 0 16px;
          border: none; background: none;
          font-size: 11.5px; font-weight: 600;
          color: var(--ink-ghost);
          border-bottom: 2px solid transparent;
          transition: all 130ms; cursor: pointer;
        }
        .fin-tab:hover { color: var(--ink-muted); }
        .fin-tab.active { color: var(--ink); border-bottom-color: var(--accent, #0E4F6D); }
        .fin-studio-filter {
          height: 30px; padding: 0 24px 0 10px;
          border: 1px solid var(--edge); border-radius: 6px;
          background: var(--surface);
          font-size: 11px; font-weight: 600; color: var(--ink-muted);
          outline: none; appearance: none; -webkit-appearance: none;
          margin-left: 16px; cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23aaaaaa' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 8px center;
        }
        .fin-studio-filter:focus { border-color: var(--accent, #0E4F6D); }
        .fin-actions { display: flex; align-items: center; gap: 8px; }
        .fin-btn-outline {
          height: 30px; padding: 0 14px;
          border: 1px solid var(--edge); border-radius: 9999px;
          background: transparent;
          font-size: 11px; font-weight: 600; color: var(--ink);
          cursor: pointer; transition: all 130ms;
        }
        .fin-btn-outline:hover { border-color: var(--ink-ghost); background: var(--surface); }
        .fin-btn-primary {
          background: var(--accent, #0E4F6D); color: #fff; border: none;
          padding: 6px 16px; border-radius: 9999px;
          font-size: 11px; font-weight: 700; letter-spacing: 0.03em;
          display: inline-flex; align-items: center; gap: 5px;
          cursor: pointer; text-decoration: none;
        }
        .fin-btn-primary:hover { opacity: 0.82; }
        .fin-spin { animation: fin-spin 0.9s linear infinite; }
        @keyframes fin-spin { to { transform: rotate(360deg); } }

        .fin-kpi-strip {
          display: grid; grid-template-columns: repeat(5, 1fr);
          border-bottom: 1px solid var(--edge);
        }
        .fin-kpi { padding: 20px 28px; border-right: 1px solid var(--edge); }
        .fin-kpi:last-child { border-right: none; }
        .fin-kpi-label {
          font-size: 7.5px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.20em;
          color: var(--ink-ghost); margin-bottom: 7px;
        }
        .fin-kpi-value {
          font-size: 28px; font-weight: 800;
          letter-spacing: -0.025em; line-height: 1;
          color: var(--ink);
        }
        .fin-kpi-value.danger { color: var(--danger, #dc2626); }
        .fin-kpi-value.success { color: var(--success, #15803d); }
        .fin-kpi-sub { font-size: 10px; color: var(--ink-ghost); margin-top: 5px; }

        .fin-main {
          display: grid; grid-template-columns: minmax(0, 1fr) 340px;
          align-items: start;
        }
        .fin-left { border-right: 1px solid var(--edge); }

        .fin-chart-section {
          border-bottom: 1px solid var(--edge);
          padding: 28px 40px 32px;
        }
        .fin-section-head {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 18px;
        }
        .fin-section-eyebrow {
          font-size: 9px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.20em;
          color: var(--ink-ghost);
        }
        .fin-chart-legend { display: flex; align-items: center; gap: 14px; }
        .fin-legend-item {
          display: flex; align-items: center; gap: 5px;
          font-size: 10px; font-weight: 600; color: var(--ink-ghost);
        }
        .fin-legend-dot { width: 8px; height: 8px; border-radius: 50%; }

        .fin-invoices-section { border-bottom: 1px solid var(--edge); }
        .fin-table-head-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 40px;
          background: var(--surface);
          border-bottom: 1px solid var(--edge);
        }
        .fin-table-meta {
          font-size: 9.5px; color: var(--ink-ghost);
          font-family: ui-monospace, Menlo, monospace;
        }
        .fin-inv-table { width: 100%; border-collapse: collapse; }
        .fin-inv-table th {
          padding: 7px 12px 6px;
          font-size: 7.5px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.18em;
          color: var(--ink-ghost); text-align: left;
          background: var(--surface);
          border-bottom: 1px solid var(--edge);
        }
        .fin-inv-table th:first-child { padding-left: 40px; }
        .fin-inv-table th:last-child { padding-right: 40px; }
        .fin-inv-table td {
          padding: 11px 12px;
          border-bottom: 1px solid var(--edge-soft, #e5e5e5);
          vertical-align: middle;
        }
        .fin-inv-table td:first-child { padding-left: 40px; }
        .fin-inv-table td:last-child { padding-right: 40px; text-align: right; }
        .fin-inv-row { cursor: pointer; transition: background 100ms; }
        .fin-inv-row:hover { background: oklch(0.988 0 0); }
        .fin-inv-num {
          font-size: 11px; font-weight: 700;
          font-family: ui-monospace, Menlo, monospace;
          color: var(--ink-muted);
        }
        .fin-inv-client {
          font-size: 12.5px; font-weight: 600; color: var(--ink);
        }
        .fin-inv-sub {
          font-size: 10px; color: var(--ink-ghost); margin-top: 2px;
        }
        .fin-inv-date {
          font-size: 11px; color: var(--ink-muted);
          font-family: ui-monospace, Menlo, monospace;
        }
        .fin-inv-amount {
          font-size: 12.5px; font-weight: 700; color: var(--ink);
          font-family: ui-monospace, Menlo, monospace;
        }
        .fin-inv-fee {
          font-size: 9.5px; color: var(--ink-ghost);
          font-family: ui-monospace, Menlo, monospace;
          margin-top: 2px;
        }
        .fin-status-chip {
          display: inline-flex; align-items: center;
          padding: 3px 9px; border-radius: 9999px;
          font-size: 9px; font-weight: 700;
          text-transform: lowercase; white-space: nowrap;
        }
        .fin-status-chip.s-paid { background: #ecfdf5; color: var(--success, #15803d); }
        .fin-status-chip.s-open { background: #e7f3f8; color: var(--accent, #0E4F6D); }
        .fin-status-chip.s-overdue { background: #fef2f2; color: var(--danger, #dc2626); }
        .fin-status-chip.s-draft { background: var(--surface); color: var(--ink-ghost); border: 1px solid var(--edge); }
        .fin-icon-btn {
          width: 26px; height: 26px;
          border: none; background: none;
          color: var(--ink-ghost);
          display: inline-flex; align-items: center; justify-content: center;
          border-radius: 4px; cursor: pointer;
          transition: all 110ms;
        }
        .fin-icon-btn:hover { color: var(--ink-muted); background: var(--surface); }

        .fin-empty-row td {
          padding: 28px 40px;
          font-size: 11.5px; color: var(--ink-ghost);
          font-style: italic; text-align: left;
        }

        .fin-costs-section { border-bottom: 1px solid var(--edge); }
        .fin-cost-row {
          display: flex; align-items: center; gap: 14px;
          padding: 13px 40px;
          border-bottom: 1px solid var(--edge-soft, #e5e5e5);
          transition: background 100ms;
        }
        .fin-cost-row:last-child { border-bottom: none; }
        .fin-cost-row:hover { background: oklch(0.988 0 0); }
        .fin-cost-cat {
          font-size: 12.5px; font-weight: 600; color: var(--ink);
        }
        .fin-cost-sub { font-size: 10.5px; color: var(--ink-ghost); }
        .fin-cost-pct {
          font-size: 10px; font-weight: 700;
          color: var(--ink-ghost);
          min-width: 32px; text-align: right;
        }
        .fin-cost-track {
          width: 120px; height: 4px;
          background: var(--edge);
          border-radius: 2px;
          flex-shrink: 0;
          overflow: hidden;
        }
        .fin-cost-bar {
          height: 100%;
          border-radius: 2px;
          background: var(--accent, #0E4F6D);
        }
        .fin-cost-amount {
          font-size: 12.5px; font-weight: 700; color: var(--ink);
          font-family: ui-monospace, Menlo, monospace;
          min-width: 80px; text-align: right;
        }

        .fin-footer {
          border-top: 1px solid var(--edge);
          padding: 10px 40px;
          font-size: 11px; color: var(--ink-ghost);
          font-family: ui-monospace, Menlo, monospace;
        }

        .fin-right {
          position: sticky; top: 58px;
          max-height: calc(100vh - 58px);
          overflow-y: auto; padding: 20px;
          display: flex; flex-direction: column; gap: 14px;
        }
        .fin-widget {
          border: 1px solid var(--edge);
          border-radius: 4px; overflow: hidden;
          background: var(--bg, #F9FAFE);
        }
        .fin-w-head {
          padding: 9px 13px;
          border-bottom: 1px solid var(--edge);
          background: var(--surface);
          display: flex; align-items: center; justify-content: space-between;
        }
        .fin-w-eye {
          font-size: 8px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.20em;
          color: var(--ink-ghost);
        }
        .fin-w-meta {
          font-size: 9.5px; color: var(--ink-ghost);
          font-family: ui-monospace, Menlo, monospace;
        }

        .fin-payout-row {
          display: flex; align-items: center; gap: 9px;
          padding: 10px 13px;
          border-bottom: 1px solid var(--edge-soft, #e5e5e5);
        }
        .fin-payout-row:last-child { border-bottom: none; }
        .fin-payout-avatar {
          width: 28px; height: 28px; border-radius: 50%;
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 9px; font-weight: 900; color: #fff;
        }
        .fin-payout-name {
          font-size: 11.5px; font-weight: 700;
          color: var(--ink-muted); line-height: 1.2;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .fin-payout-sub { font-size: 9.5px; color: var(--ink-ghost); }
        .fin-payout-amount {
          font-size: 12px; font-weight: 700; color: var(--ink);
          font-family: ui-monospace, Menlo, monospace;
          margin-right: 4px;
        }
        .fin-pay-btn {
          font-size: 10px; font-weight: 700;
          background: var(--accent, #0E4F6D); color: #fff;
          border: none; padding: 4px 10px;
          border-radius: 9999px;
          cursor: pointer;
          flex-shrink: 0;
          transition: opacity 130ms;
        }
        .fin-pay-btn:hover { opacity: 0.82; }
        .fin-pay-btn.done {
          background: #ecfdf5; color: var(--success, #15803d);
          cursor: default;
        }
        .fin-payout-footer {
          padding: 10px 13px;
          border-top: 1px solid var(--edge);
        }
        .fin-pay-all-btn {
          display: block; width: 100%;
          background: var(--accent, #0E4F6D); color: #fff; border: none;
          padding: 8px; border-radius: 5px;
          font-size: 11.5px; font-weight: 700;
          text-align: center; cursor: pointer;
          transition: opacity 130ms;
        }
        .fin-pay-all-btn:hover { opacity: 0.82; }

        .fin-tx-row {
          display: flex; align-items: center; gap: 9px;
          padding: 9px 13px;
          border-bottom: 1px solid var(--edge-soft, #e5e5e5);
        }
        .fin-tx-row:last-child { border-bottom: none; }
        .fin-tx-icon {
          width: 28px; height: 28px; border-radius: 5px;
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .fin-tx-desc {
          font-size: 11px; font-weight: 600;
          color: var(--ink-muted); line-height: 1.2;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .fin-tx-date { font-size: 9.5px; color: var(--ink-ghost); margin-top: 1px; }
        .fin-tx-amount {
          font-size: 12px; font-weight: 700;
          font-family: ui-monospace, Menlo, monospace;
        }
        .fin-tx-amount.pos { color: var(--success, #15803d); }
        .fin-tx-amount.neg { color: var(--danger, #dc2626); }
      `}</style>
    </div>
  )
}
