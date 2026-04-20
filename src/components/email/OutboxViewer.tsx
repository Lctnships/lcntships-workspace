'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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

const statusStyle: Record<OutboxItem['status'], { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Wachten' },
  sending: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Bezig' },
  sent: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Verstuurd' },
  failed: { bg: 'bg-red-50', text: 'text-red-700', label: 'Gefaald' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Geannuleerd' },
}

export function OutboxViewer() {
  const [items, setItems] = useState<OutboxItem[]>([])
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'failed' | 'pending' | 'sent'>('all')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/email/outbox?status=${filter}&limit=50`)
    if (res.ok) {
      const data = await res.json()
      setItems(data.items)
    }
    setLoading(false)
  }, [filter])

  useEffect(() => {
    load()
  }, [load])

  async function retry(id: string) {
    setRetrying(id)
    const res = await fetch(`/api/email/outbox/${id}/retry`, { method: 'POST' })
    const data = await res.json()
    if (!res.ok) alert(`Retry gefaald: ${data.error ?? 'onbekende fout'}`)
    setRetrying(null)
    await load()
  }

  const failedCount = items.filter((i) => i.status === 'failed').length
  const pendingCount = items.filter((i) => i.status === 'pending').length

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <Inbox className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Email outbox</h3>
            <p className="text-sm text-gray-500">
              Alle verzonden + gefaalde emails. Gefaalde kan je hier opnieuw proberen.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
          Ververs
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {(['all', 'failed', 'pending', 'sent'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1 rounded-lg text-xs font-medium transition',
              filter === f ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            )}
          >
            {f === 'all' ? 'Alle' : f === 'failed' ? `Gefaald${failedCount ? ` (${failedCount})` : ''}` : f === 'pending' ? `Wachtend${pendingCount ? ` (${pendingCount})` : ''}` : 'Verzonden'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-8 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">
          {filter === 'all' ? 'Nog geen emails via outbox. Stuur een testmail hierboven.' : `Geen emails met status "${filter}".`}
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const s = statusStyle[item.status]
            return (
              <div key={item.id} className="border border-gray-100 rounded-lg p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={cn(s.bg, s.text, 'border-0')}>{s.label}</Badge>
                      <span className="text-xs text-gray-400 font-mono">{item.source}</span>
                      {item.attempts > 1 && (
                        <span className="text-xs text-gray-400">
                          {item.attempts}/{item.max_attempts} pogingen
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-900 truncate">{item.subject}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Naar: {item.to_email} · Van: {item.from_email}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(parseISO(item.created_at), 'd MMM HH:mm', { locale: nl })}
                      </span>
                      {item.sent_at && (
                        <span className="flex items-center gap-1 text-emerald-600">
                          <Check className="h-3 w-3" />
                          {format(parseISO(item.sent_at), 'd MMM HH:mm', { locale: nl })}
                        </span>
                      )}
                    </div>
                    {item.last_error && (
                      <div className="mt-2 flex items-start gap-1.5 text-xs text-red-600 bg-red-50 rounded p-2">
                        <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span className="font-mono break-all">{item.last_error}</span>
                      </div>
                    )}
                  </div>
                  {item.status === 'failed' && item.attempts < item.max_attempts && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => retry(item.id)}
                      disabled={retrying === item.id}
                    >
                      {retrying === item.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                          Retry
                        </>
                      )}
                    </Button>
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
