'use client'

import { useCallback, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Check, Loader2, AlertCircle, RefreshCw, Clock, Inbox } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { nl } from 'date-fns/locale'

type OutboxItem = {
  id: string
  status: 'pending' | 'sending' | 'sent' | 'failed' | 'cancelled'
  source: string
  to_email: string
  from_email: string
  subject: string
  attempts: number
  max_attempts: number
  last_error: string | null
  resend_id: string | null
  created_at: string
  sent_at: string | null
}

const statusStyle: Record<OutboxItem['status'], { cls: string; label: string }> = {
  pending:   { cls: 'bg-[var(--warning-tint)] text-[var(--warning-dark)]', label: 'Wachten' },
  sending:   { cls: 'bg-[var(--accent-tint)] text-[var(--accent)]',        label: 'Bezig' },
  sent:      { cls: 'bg-[var(--success-tint)] text-[var(--success)]',      label: 'Verstuurd' },
  failed:    { cls: 'bg-[var(--danger-tint)] text-[var(--danger)]',        label: 'Gefaald' },
  cancelled: { cls: 'bg-[var(--surface)] text-[var(--ink-ghost)] border border-[var(--edge)]', label: 'Geannuleerd' },
}

export function OutboxViewer() {
  const [items, setItems] = useState<OutboxItem[]>([])
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'failed' | 'pending' | 'sent'>('all')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/email/outbox?status=${filter}&limit=50`)
    if (res.ok) { const d = await res.json(); setItems(d.items) }
    setLoading(false)
  }, [filter])

  useEffect(() => { load() }, [load])

  async function retry(id: string) {
    setRetrying(id)
    const res = await fetch(`/api/email/outbox/${id}/retry`, { method: 'POST' })
    const data = await res.json()
    if (!res.ok) alert(`Retry gefaald: ${data.error ?? 'onbekende fout'}`)
    setRetrying(null)
    await load()
  }

  const failedCount  = items.filter(i => i.status === 'failed').length
  const pendingCount = items.filter(i => i.status === 'pending').length

  const FILTERS: { key: 'all' | 'failed' | 'pending' | 'sent'; label: string }[] = [
    { key: 'all',     label: 'Alle' },
    { key: 'failed',  label: `Gefaald${failedCount  ? ` (${failedCount})`  : ''}` },
    { key: 'pending', label: `Wachtend${pendingCount ? ` (${pendingCount})` : ''}` },
    { key: 'sent',    label: 'Verzonden' },
  ]

  return (
    <div className="bg-white border border-[var(--edge)] p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 flex items-center justify-center bg-[var(--accent-tint)]">
            <Inbox className="h-4 w-4 text-[var(--accent)]" />
          </div>
          <div>
            <div className="text-[14px] font-bold text-[var(--ink)]">Email outbox</div>
            <div className="text-[12px] text-[var(--ink-muted)]">Alle verzonden + gefaalde emails. Gefaalde kan je hier opnieuw proberen.</div>
          </div>
        </div>
        <button type="button" onClick={load} disabled={loading}
          className="inline-flex items-center gap-[6px] px-3 py-[7px] text-[12px] font-semibold border border-[var(--edge)] bg-transparent text-[var(--ink)] hover:bg-[var(--surface)] disabled:opacity-50 transition-colors">
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Ververs
        </button>
      </div>

      <div className="flex flex-wrap gap-[6px] mb-4">
        {FILTERS.map(f => (
          <button key={f.key} type="button" onClick={() => setFilter(f.key)}
            className={cn('px-3 py-[5px] text-[11px] font-semibold transition-colors',
              filter === f.key
                ? 'bg-[var(--ink)] text-white'
                : 'bg-[var(--surface)] text-[var(--ink-muted)] border border-[var(--edge)] hover:border-[var(--ink-ghost)]'
            )}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-8 flex justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-[var(--ink-ghost)]" />
        </div>
      ) : items.length === 0 ? (
        <div className="py-8 text-center text-[12px] text-[var(--ink-ghost)]">
          {filter === 'all' ? 'Nog geen emails via outbox.' : `Geen emails met status "${filter}".`}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map(item => {
            const s = statusStyle[item.status]
            return (
              <div key={item.id} className="border border-[var(--edge-soft)] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn('inline-flex items-center px-2 py-[2px] text-[10px] font-bold uppercase tracking-[0.04em]', s.cls)}>
                        {s.label}
                      </span>
                      <span className="text-[11px] text-[var(--ink-ghost)] font-mono">{item.source}</span>
                      {item.attempts > 1 && (
                        <span className="text-[11px] text-[var(--ink-ghost)]">{item.attempts}/{item.max_attempts} pogingen</span>
                      )}
                    </div>
                    <div className="text-[13px] font-semibold text-[var(--ink)] truncate">{item.subject}</div>
                    <div className="text-[11px] text-[var(--ink-muted)] mt-[2px]">Naar: {item.to_email} · Van: {item.from_email}</div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-[var(--ink-ghost)]">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(parseISO(item.created_at), 'd MMM HH:mm', { locale: nl })}
                      </span>
                      {item.sent_at && (
                        <span className="flex items-center gap-1 text-[var(--success)]">
                          <Check className="h-3 w-3" />
                          {format(parseISO(item.sent_at), 'd MMM HH:mm', { locale: nl })}
                        </span>
                      )}
                    </div>
                    {item.last_error && (
                      <div className="mt-2 flex items-start gap-1 text-[11px] text-[var(--danger)] bg-[var(--danger-tint)] p-2">
                        <AlertCircle className="h-3 w-3 mt-[1px] flex-shrink-0" />
                        <span className="font-mono break-all">{item.last_error}</span>
                      </div>
                    )}
                  </div>
                  {item.status === 'failed' && item.attempts < item.max_attempts && (
                    <button type="button" onClick={() => retry(item.id)} disabled={retrying === item.id}
                      className="inline-flex items-center gap-[5px] px-3 py-[6px] text-[12px] font-semibold border border-[var(--edge)] bg-transparent text-[var(--ink)] hover:bg-[var(--surface)] disabled:opacity-50 transition-colors flex-shrink-0">
                      {retrying === item.id
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <RefreshCw className="h-3 w-3" />}
                      Retry
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
