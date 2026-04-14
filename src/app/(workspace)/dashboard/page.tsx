'use client'

import { useEffect, useState } from 'react'
import {
  DollarSign,
  Calendar,
  Users,
  Activity,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  Building2,
  UserPlus,
  CreditCard,
  FileText,
  Plus,
  Inbox,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { dashboardApi, profilesApi } from '@/lib/supabase'
import Link from 'next/link'

interface DashboardStats {
  studiosCount: number
  bookingsCount: number
  activeBookingsCount: number
  pendingBookingsCount: number
  partnersCount: number
  pendingPartnersCount: number
  usersCount: number
  totalRevenue: number
  totalPayouts: number
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('nl-NL').format(num)
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg shadow-gray-200/50 border border-gray-100 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="w-12 h-12 rounded-xl bg-gray-200" />
        <div className="w-16 h-5 rounded bg-gray-200" />
      </div>
      <div className="mt-4">
        <div className="w-24 h-8 rounded bg-gray-200" />
        <div className="w-20 h-4 rounded bg-gray-200 mt-2" />
      </div>
    </div>
  )
}

function SkeletonBlock() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg shadow-gray-200/50 border border-gray-100 animate-pulse">
      <div className="w-40 h-6 rounded bg-gray-200 mb-6" />
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-200 flex-shrink-0" />
            <div className="flex-1">
              <div className="w-32 h-4 rounded bg-gray-200" />
              <div className="w-48 h-3 rounded bg-gray-200 mt-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon: React.ElementType
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
        <Icon className="h-7 w-7 text-gray-400" />
      </div>
      <h3 className="text-sm font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 max-w-[240px]">{description}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-black transition-colors"
        >
          <Plus className="h-4 w-4" />
          {actionLabel}
        </Link>
      )}
    </div>
  )
}

function RevenueChart({ revenue, payouts }: { revenue: number; payouts: number }) {
  // When there's no data, show empty state
  if (revenue === 0 && payouts === 0) {
    return (
      <EmptyState
        icon={DollarSign}
        title="Nog geen omzet data"
        description="Zodra er boekingen binnenkomen verschijnt hier je omzet vs. uitbetalingen grafiek."
      />
    )
  }

  // Simple bar chart showing revenue vs payouts totals
  const maxValue = Math.max(revenue, payouts, 1)

  return (
    <div className="space-y-6 py-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Revenue</span>
          <span className="text-sm font-bold text-gray-900">{formatCurrency(revenue)}</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gray-900 transition-all duration-700"
            style={{ width: `${(revenue / maxValue) * 100}%` }}
          />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Payouts</span>
          <span className="text-sm font-bold text-emerald-600">{formatCurrency(payouts)}</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-700"
            style={{ width: `${(payouts / maxValue) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [studios, setStudios] = useState<{ id: string; title: string; status: string | null }[]>([])
  const [recentBookings, setRecentBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState<string>('')

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [dashStats, studioList, bookings, profile] = await Promise.all([
          dashboardApi.getStats(),
          dashboardApi.getStudios(),
          dashboardApi.getRecentBookings(4),
          profilesApi.getCurrent(),
        ])
        setStats(dashStats)
        setStudios(studioList)
        setRecentBookings(bookings)
        if (profile?.full_name) {
          setUserName(profile.full_name.split(' ')[0])
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err, JSON.stringify(err, Object.getOwnPropertyNames(err as object)))
      } finally {
        setLoading(false)
      }
    }
    loadDashboard()
  }, [])

  const [formattedDate, setFormattedDate] = useState('')

  useEffect(() => {
    setFormattedDate(
      new Date().toLocaleDateString('nl-NL', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    )
  }, [])

  const metrics: {
    label: string
    value: string
    change: string
    trend: 'up' | 'down' | 'neutral'
    icon: React.ElementType
    iconBg: string
    iconColor: string
  }[] = stats
    ? [
        {
          label: 'Totale Omzet',
          value: formatCurrency(stats.totalRevenue),
          change: stats.totalRevenue > 0 ? `${stats.bookingsCount} boekingen` : 'Nog geen omzet',
          trend: stats.totalRevenue > 0 ? 'up' : 'neutral',
          icon: DollarSign,
          iconBg: 'bg-emerald-100',
          iconColor: 'text-emerald-600',
        },
        {
          label: 'Actieve Boekingen',
          value: formatNumber(stats.activeBookingsCount),
          change: stats.pendingBookingsCount > 0 ? `${stats.pendingBookingsCount} pending` : 'Geen pending',
          trend: stats.activeBookingsCount > 0 ? 'up' : 'neutral',
          icon: Calendar,
          iconBg: 'bg-gray-200',
          iconColor: 'text-gray-900',
        },
        {
          label: 'Partners',
          value: formatNumber(stats.partnersCount),
          change: stats.pendingPartnersCount > 0 ? `${stats.pendingPartnersCount} in review` : stats.partnersCount > 0 ? 'Alle actief' : 'Nog geen partners',
          trend: stats.partnersCount > 0 ? 'up' : 'neutral',
          icon: Users,
          iconBg: 'bg-amber-100',
          iconColor: 'text-amber-600',
        },
        {
          label: "Studio's",
          value: formatNumber(stats.studiosCount),
          change: stats.studiosCount > 0 ? 'Actief' : 'Nog geen studios',
          trend: stats.studiosCount > 0 ? 'up' : 'neutral',
          icon: Building2,
          iconBg: 'bg-purple-100',
          iconColor: 'text-purple-600',
        },
      ]
    : []

  // Build recent activity from real data
  const recentActivity = recentBookings.map((booking: any, index: number) => ({
    id: booking.id || index,
    type: 'booking' as const,
    icon: Calendar,
    iconBg: 'bg-gray-200',
    iconColor: 'text-gray-900',
    title: `Boeking ${booking.status || 'aangemaakt'}`,
    description: booking.studio?.title || 'Studio',
    time: booking.created_at
      ? new Date(booking.created_at).toLocaleDateString('nl-NL', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '',
  }))

  // Pending tasks based on real counts
  const pendingTasks = stats
    ? [
        ...(stats.pendingPartnersCount > 0
          ? [
              {
                id: 'partner-review',
                title: 'Partner aanvragen beoordelen',
                count: stats.pendingPartnersCount,
                priority: 'high' as const,
                icon: Users,
                href: '/partners',
              },
            ]
          : []),
        ...(stats.pendingBookingsCount > 0
          ? [
              {
                id: 'pending-bookings',
                title: 'Boekingen goedkeuren',
                count: stats.pendingBookingsCount,
                priority: 'medium' as const,
                icon: Calendar,
                href: '/bookings',
              },
            ]
          : []),
      ]
    : []

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Welcome back{userName ? `, ${userName}` : ''}
          </h1>
          <p className="text-gray-500 mt-1 font-medium text-sm sm:text-base">{formattedDate}</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500">
          <Clock className="h-4 w-4" />
          <span>Last updated: Just now</span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4">
        {loading
          ? [1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)
          : metrics.map((metric) => {
              const Icon = metric.icon
              return (
                <div
                  key={metric.label}
                  className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg shadow-gray-200/50 border border-gray-100 hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className={cn(
                        'w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                        metric.iconBg
                      )}
                    >
                      <Icon className={cn('h-5 w-5 sm:h-6 sm:w-6', metric.iconColor)} />
                    </div>
                    <div
                      className={cn(
                        'hidden sm:flex items-center gap-1 text-sm font-semibold',
                        metric.trend === 'up'
                          ? 'text-emerald-600'
                          : metric.trend === 'down'
                            ? 'text-rose-600'
                            : 'text-gray-500'
                      )}
                    >
                      {metric.trend === 'up' && <TrendingUp className="h-4 w-4" />}
                      {metric.trend === 'down' && <TrendingDown className="h-4 w-4" />}
                      {metric.trend === 'neutral' && <CheckCircle2 className="h-4 w-4 text-gray-400" />}
                      <span>{metric.change}</span>
                    </div>
                  </div>
                  <div className="mt-3 sm:mt-4">
                    <p className="text-2xl sm:text-3xl font-black text-gray-900">{metric.value}</p>
                    <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">{metric.label}</p>
                  </div>
                </div>
              )
            })}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-12">
        {/* Revenue Chart */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-4 sm:p-6 shadow-lg shadow-gray-200/50 border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Revenue vs Payouts</h2>
              <p className="text-sm text-gray-500 mt-1">Totaaloverzicht</p>
            </div>
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-gray-900" />
                <span className="text-sm text-gray-600 font-medium">Revenue</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-sm text-gray-600 font-medium">Payouts</span>
              </div>
            </div>
          </div>
          {loading ? (
            <div className="animate-pulse space-y-4 py-4">
              <div className="h-3 bg-gray-200 rounded-full w-full" />
              <div className="h-3 bg-gray-200 rounded-full w-3/4" />
            </div>
          ) : (
            <RevenueChart
              revenue={stats?.totalRevenue || 0}
              payouts={stats?.totalPayouts || 0}
            />
          )}
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-4 sm:p-6 shadow-lg shadow-gray-200/50 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Recente Activiteit</h2>
            {recentActivity.length > 0 && (
              <Link
                href="/bookings"
                className="text-sm text-gray-900 font-semibold hover:text-black flex items-center gap-1"
              >
                Bekijk alles <ArrowUpRight className="h-4 w-4" />
              </Link>
            )}
          </div>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-xl bg-gray-200 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="w-32 h-4 rounded bg-gray-200" />
                    <div className="w-48 h-3 rounded bg-gray-200 mt-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentActivity.length > 0 ? (
            <div className="space-y-4">
              {recentActivity.map((activity) => {
                const Icon = activity.icon
                return (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                        activity.iconBg
                      )}
                    >
                      <Icon className={cn('h-5 w-5', activity.iconColor)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{activity.title}</p>
                      <p className="text-sm text-gray-500 truncate">{activity.description}</p>
                      <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState
              icon={Inbox}
              title="Nog geen activiteit"
              description="Zodra er boekingen, partners of transacties zijn, verschijnt de activiteit hier."
            />
          )}
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        {/* Studio Overview */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg shadow-gray-200/50 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Studio Overzicht</h2>
              <p className="text-sm text-gray-500 mt-1">Alle studio&apos;s op het platform</p>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-gray-400" />
              <span className="text-sm font-semibold text-gray-600">
                {loading ? '...' : `${studios.length} Studio${studios.length !== 1 ? "'s" : ''}`}
              </span>
            </div>
          </div>
          {loading ? (
            <div className="space-y-4 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i}>
                  <div className="w-48 h-4 rounded bg-gray-200 mb-2" />
                  <div className="h-2.5 bg-gray-200 rounded-full" />
                </div>
              ))}
            </div>
          ) : studios.length > 0 ? (
            <div className="space-y-5">
              {studios.map((studio, index) => {
                const colors = ['bg-gray-900', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500']
                const isActive = studio.status === 'active'
                return (
                  <div key={studio.id}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">{studio.title}</span>
                      <span
                        className={cn(
                          'text-xs font-semibold px-2 py-0.5 rounded-full',
                          isActive
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-100 text-gray-600'
                        )}
                      >
                        {studio.status || 'draft'}
                      </span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-500', colors[index % colors.length])}
                        style={{ width: isActive ? '100%' : '30%' }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState
              icon={Building2}
              title="Nog geen studio's toegevoegd"
              description="Voeg je eerste studio toe om boekingen te ontvangen."
              actionLabel="Studio toevoegen"
              actionHref="/studios"
            />
          )}
        </div>

        {/* Pending Tasks */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg shadow-gray-200/50 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Openstaande Taken</h2>
              <p className="text-sm text-gray-500 mt-1">Items die je aandacht nodig hebben</p>
            </div>
            {pendingTasks.length > 0 && (
              <span className="bg-rose-100 text-rose-700 text-sm font-bold px-3 py-1 rounded-full">
                {pendingTasks.reduce((acc, task) => acc + task.count, 0)} Totaal
              </span>
            )}
          </div>
          {loading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-200" />
                    <div>
                      <div className="w-40 h-4 rounded bg-gray-200" />
                      <div className="w-20 h-3 rounded bg-gray-200 mt-2" />
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gray-200" />
                </div>
              ))}
            </div>
          ) : pendingTasks.length > 0 ? (
            <div className="space-y-3">
              {pendingTasks.map((task) => {
                const Icon = task.icon
                return (
                  <Link
                    key={task.id}
                    href={task.href}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center',
                          task.priority === 'high' ? 'bg-rose-100' : 'bg-amber-100'
                        )}
                      >
                        <Icon
                          className={cn(
                            'h-5 w-5',
                            task.priority === 'high' ? 'text-rose-600' : 'text-amber-600'
                          )}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {task.priority === 'high' ? (
                            <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
                          ) : (
                            <Clock className="h-3.5 w-3.5 text-amber-500" />
                          )}
                          <span
                            className={cn(
                              'text-xs font-medium',
                              task.priority === 'high' ? 'text-rose-500' : 'text-amber-500'
                            )}
                          >
                            {task.priority === 'high' ? 'Hoge Prioriteit' : 'Medium Prioriteit'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="bg-white px-3 py-1 rounded-full text-sm font-bold text-gray-700 shadow-sm">
                        {task.count}
                      </span>
                      <ArrowUpRight className="h-5 w-5 text-gray-400 group-hover:text-gray-900 transition-colors" />
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <EmptyState
              icon={CheckCircle2}
              title="Alles bijgewerkt!"
              description="Er zijn geen openstaande taken. Zodra er acties nodig zijn verschijnen ze hier."
            />
          )}
        </div>
      </div>

      {/* Footer Note */}
      <div className="flex items-center justify-center gap-4 text-gray-400 pt-4">
        <span className="text-sm">*</span>
        <span className="text-xs font-medium uppercase tracking-widest">
          Executive Dashboard - Live data
        </span>
      </div>
    </div>
  )
}
