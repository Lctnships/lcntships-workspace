'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Mail,
  CheckCircle,
  AlertTriangle,
  XCircle,
  MousePointerClick,
  Eye,
  RefreshCw,
  Loader2,
  ArrowLeft,
  TrendingUp,
  Clock,
  Ban,
  Send,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { workspaceClient as supabase } from '@/lib/workspace-client'

interface SentEmail {
  id: string
  lead_id: string
  subject: string
  sent_at: string
  status: string
  delivery_status: string
  last_event: string
  resend_id: string | null
  opened_at: string | null
  clicked_at: string | null
  bounced_at: string | null
  bounce_type: string | null
  complained_at: string | null
  delivered_at: string | null
  sales_leads?: {
    company_name: string
    contact_name: string
    email: string
    city: string
  }
}

type FilterStatus = 'all' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained' | 'sent' | 'failed'

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  delivered: { label: 'Afgeleverd', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle },
  sent: { label: 'Verstuurd', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Send },
  opened: { label: 'Geopend', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: Eye },
  clicked: { label: 'Geklikt', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: MousePointerClick },
  bounced: { label: 'Bounced', color: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
  complained: { label: 'Spam', color: 'bg-orange-50 text-orange-700 border-orange-200', icon: Ban },
  delivery_delayed: { label: 'Vertraagd', color: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: Clock },
  failed: { label: 'Mislukt', color: 'bg-red-50 text-red-600 border-red-200', icon: AlertTriangle },
}

function getStatusInfo(email: SentEmail) {
  const event = email.last_event || email.delivery_status || email.status || 'sent'
  return statusConfig[event] || statusConfig.sent
}

function formatDate(date: string | null) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatTimeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}m geleden`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}u geleden`
  const days = Math.floor(hours / 24)
  return `${days}d geleden`
}

export default function EmailAnalyticsPage() {
  const [emails, setEmails] = useState<SentEmail[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [lastSynced, setLastSynced] = useState<Date | null>(null)

  const loadEmails = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('sent_emails')
      .select('*, sales_leads(company_name, contact_name, email, city)')
      .order('sent_at', { ascending: false })

    if (!error && data) {
      setEmails(data as SentEmail[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadEmails()
  }, [loadEmails])

  const syncResend = async () => {
    setSyncing(true)
    try {
      // First sync existing resend_ids
      await fetch('/api/email/resend-sync')
      // Then try to match unlinked emails
      await fetch('/api/email/resend-sync', { method: 'POST' })
      // Reload data
      await loadEmails()
      setLastSynced(new Date())
    } catch (err) {
      console.error('Sync failed:', err)
    }
    setSyncing(false)
  }

  // Stats
  const stats = {
    total: emails.length,
    delivered: emails.filter(e => e.last_event === 'delivered' || e.delivered_at).length,
    opened: emails.filter(e => e.opened_at).length,
    clicked: emails.filter(e => e.clicked_at).length,
    bounced: emails.filter(e => e.last_event === 'bounced' || e.bounced_at).length,
    complained: emails.filter(e => e.last_event === 'complained' || e.complained_at).length,
    sent: emails.filter(e => (e.last_event || e.delivery_status) === 'sent').length,
    failed: emails.filter(e => e.last_event === 'failed' || e.delivery_status === 'failed').length,
  }

  const deliveryRate = stats.total > 0 ? Math.round((stats.delivered / stats.total) * 100) : 0
  const openRate = stats.delivered > 0 ? Math.round((stats.opened / stats.delivered) * 100) : 0
  const clickRate = stats.opened > 0 ? Math.round((stats.clicked / stats.opened) * 100) : 0
  const bounceRate = stats.total > 0 ? Math.round((stats.bounced / stats.total) * 100) : 0
  const failedRate = stats.total > 0 ? Math.round((stats.failed / stats.total) * 100) : 0

  // Filter emails
  const filteredEmails = emails.filter(email => {
    if (filter === 'all') return true
    if (filter === 'delivered') return email.last_event === 'delivered' || !!email.delivered_at
    if (filter === 'opened') return !!email.opened_at
    if (filter === 'clicked') return !!email.clicked_at
    if (filter === 'bounced') return email.last_event === 'bounced' || !!email.bounced_at
    if (filter === 'complained') return email.last_event === 'complained' || !!email.complained_at
    if (filter === 'sent') return (email.last_event || email.delivery_status) === 'sent'
    if (filter === 'failed') return email.last_event === 'failed' || email.delivery_status === 'failed'
    return true
  })

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.location.href = '/marketing'}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Email Analytics</h1>
            <p className="text-sm text-gray-500">
              Bekijk delivery status, opens, clicks en bounces van je campagnes
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastSynced && (
            <span className="text-xs text-gray-400">
              Laatste sync: {formatTimeAgo(lastSynced.toISOString())}
            </span>
          )}
          <Button
            onClick={syncResend}
            disabled={syncing}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
            {syncing ? 'Syncing...' : 'Sync Resend Data'}
          </Button>
          <Button
            onClick={() => window.location.href = '/marketing/campaign'}
            className="gap-2"
          >
            <Mail className="h-4 w-4" />
            Nieuwe Campagne
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { key: 'total', label: 'Totaal', value: stats.total, icon: Mail, color: 'bg-gray-50 text-gray-700', active: filter === 'all' },
          { key: 'delivered', label: 'Afgeleverd', value: stats.delivered, icon: CheckCircle, color: 'bg-emerald-50 text-emerald-700', active: filter === 'delivered', rate: `${deliveryRate}%` },
          { key: 'opened', label: 'Geopend', value: stats.opened, icon: Eye, color: 'bg-purple-50 text-purple-700', active: filter === 'opened', rate: `${openRate}%` },
          { key: 'clicked', label: 'Geklikt', value: stats.clicked, icon: MousePointerClick, color: 'bg-indigo-50 text-indigo-700', active: filter === 'clicked', rate: `${clickRate}%` },
          { key: 'bounced', label: 'Bounced', value: stats.bounced, icon: XCircle, color: 'bg-red-50 text-red-700', active: filter === 'bounced', rate: `${bounceRate}%` },
          { key: 'failed', label: 'Mislukt', value: stats.failed, icon: AlertTriangle, color: 'bg-orange-50 text-orange-700', active: filter === 'failed', rate: `${failedRate}%` },
          { key: 'sent', label: 'In transit', value: stats.sent, icon: Send, color: 'bg-blue-50 text-blue-700', active: filter === 'sent' },
        ].map(stat => {
          const Icon = stat.icon
          return (
            <button
              key={stat.key}
              onClick={() => setFilter(stat.key === 'total' ? 'all' : stat.key as FilterStatus)}
              className={cn(
                "flex flex-col gap-1 rounded-xl p-4 border transition-all text-left",
                stat.active
                  ? "border-gray-900 ring-1 ring-gray-900 shadow-sm"
                  : "border-gray-200 hover:border-gray-300"
              )}
            >
              <div className="flex items-center justify-between">
                <div className={cn("p-1.5 rounded-lg", stat.color)}>
                  <Icon className="h-4 w-4" />
                </div>
                {stat.rate && (
                  <span className="text-xs font-semibold text-gray-500">{stat.rate}</span>
                )}
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs font-medium text-gray-500">{stat.label}</p>
            </button>
          )
        })}
      </div>

      {/* Rate Overview Bar */}
      {stats.total > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-gray-400" />
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Delivery Funnel</h3>
          </div>
          <div className="flex items-center gap-1 h-8 rounded-lg overflow-hidden bg-gray-100">
            {stats.delivered > 0 && (
              <div
                className="h-full bg-emerald-500 transition-all duration-500 flex items-center justify-center"
                style={{ width: `${(stats.delivered / stats.total) * 100}%` }}
              >
                {deliveryRate > 10 && <span className="text-[10px] font-bold text-white">{deliveryRate}%</span>}
              </div>
            )}
            {stats.bounced > 0 && (
              <div
                className="h-full bg-red-400 transition-all duration-500 flex items-center justify-center"
                style={{ width: `${(stats.bounced / stats.total) * 100}%` }}
              >
                {bounceRate > 5 && <span className="text-[10px] font-bold text-white">{bounceRate}%</span>}
              </div>
            )}
            {stats.failed > 0 && (
              <div
                className="h-full bg-orange-400 transition-all duration-500 flex items-center justify-center"
                style={{ width: `${(stats.failed / stats.total) * 100}%` }}
              >
                {failedRate > 5 && <span className="text-[10px] font-bold text-white">{failedRate}%</span>}
              </div>
            )}
            {stats.sent > 0 && (
              <div
                className="h-full bg-blue-400 transition-all duration-500 flex items-center justify-center"
                style={{ width: `${(stats.sent / stats.total) * 100}%` }}
              >
                <span className="text-[10px] font-bold text-white">
                  {Math.round((stats.sent / stats.total) * 100)}%
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-6 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Afgeleverd</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400" /> Bounced</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-400" /> Mislukt</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-400" /> In transit</span>
          </div>
        </div>
      )}

      {/* Email List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
            {filter === 'all' ? 'Alle Emails' : statusConfig[filter]?.label || filter} ({filteredEmails.length})
          </h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : filteredEmails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Mail className="h-12 w-12 mb-3" />
            <p className="font-medium">Geen emails gevonden</p>
            <p className="text-sm mt-1">
              {stats.total === 0
                ? 'Start een campagne om emails te versturen'
                : 'Geen emails met deze filter'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredEmails.map(email => {
              const statusInfo = getStatusInfo(email)
              const StatusIcon = statusInfo.icon
              const isExpanded = expandedId === email.id
              const lead = email.sales_leads

              return (
                <div key={email.id}>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : email.id)}
                    className="w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50/50 transition-colors text-left"
                  >
                    {/* Status Icon */}
                    <div className={cn("p-2 rounded-lg shrink-0", statusInfo.color.split(' ').slice(0, 1).join(' '))}>
                      <StatusIcon className={cn("h-4 w-4", statusInfo.color.split(' ').slice(1, 2).join(' '))} />
                    </div>

                    {/* Lead Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 truncate">
                          {lead?.company_name || 'Onbekend bedrijf'}
                        </p>
                        <Badge variant="outline" className={cn("text-[10px] shrink-0 border", statusInfo.color)}>
                          {statusInfo.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {lead?.contact_name || '-'} · {lead?.email || '-'}
                      </p>
                    </div>

                    {/* Subject */}
                    <div className="hidden lg:block flex-1 min-w-0">
                      <p className="text-sm text-gray-600 truncate">{email.subject}</p>
                    </div>

                    {/* Time */}
                    <div className="hidden md:block shrink-0 text-right">
                      <p className="text-xs text-gray-500">{formatTimeAgo(email.sent_at)}</p>
                      <p className="text-[10px] text-gray-400">{formatDate(email.sent_at)}</p>
                    </div>

                    {/* Expand */}
                    <div className="shrink-0 text-gray-400">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-6 pb-5 pt-1 bg-gray-50/50">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Verstuurd</p>
                          <p className="text-gray-700">{formatDate(email.sent_at)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Afgeleverd</p>
                          <p className="text-gray-700">{formatDate(email.delivered_at)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Geopend</p>
                          <p className="text-gray-700">{formatDate(email.opened_at)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Geklikt</p>
                          <p className="text-gray-700">{formatDate(email.clicked_at)}</p>
                        </div>
                        {email.bounced_at && (
                          <div>
                            <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">Bounced</p>
                            <p className="text-red-600">{formatDate(email.bounced_at)}</p>
                            {email.bounce_type && (
                              <Badge variant="outline" className="mt-1 text-[10px] border-red-200 text-red-600">
                                {email.bounce_type}
                              </Badge>
                            )}
                          </div>
                        )}
                        {email.complained_at && (
                          <div>
                            <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wider mb-1">Spam klacht</p>
                            <p className="text-orange-600">{formatDate(email.complained_at)}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-200">
                        <span className="text-xs text-gray-400">
                          {email.resend_id ? `Resend ID: ${email.resend_id}` : 'Geen Resend ID gekoppeld'}
                        </span>
                        {lead?.city && (
                          <span className="text-xs text-gray-400">· {lead.city}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
