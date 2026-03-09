'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Loader2, Inbox } from 'lucide-react'
import { analyticsApi } from '@/lib/supabase'

export default function AnalyticsPage() {
  const [bookingsData, setBookingsData] = useState<{ month: string; bookings: number }[]>([])
  const [studioTypeData, setStudioTypeData] = useState<{ name: string; value: number; color: string }[]>([])
  const [topStudios, setTopStudios] = useState<{ name: string; bookings: number; revenue: number }[]>([])
  const [overviewStats, setOverviewStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const [trends, types, top, stats] = await Promise.all([
          analyticsApi.getBookingTrends(),
          analyticsApi.getStudioTypeDistribution(),
          analyticsApi.getTopStudios(),
          analyticsApi.getOverviewStats(),
        ])
        setBookingsData(trends || [])
        setStudioTypeData(types || [])
        setTopStudios(top || [])
        setOverviewStats(stats)
      } catch (error) {
        console.error('Error loading analytics:', error)
      } finally {
        setLoading(false)
      }
    }
    loadAnalytics()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-900" />
      </div>
    )
  }

  const hasData = bookingsData.length > 0 || studioTypeData.length > 0 || topStudios.length > 0

  if (!hasData) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Analytics" description="Platform performance metrics and insights" />
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <Inbox className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Nog geen analytics data</h3>
          <p className="text-gray-500">Zodra er boekingen en studio&apos;s zijn, verschijnen hier je inzichten.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Analytics" description="Platform performance metrics and insights" />

      {/* Overview Stats */}
      {overviewStats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-500">Totale Boekingen</p>
              <p className="text-3xl font-bold text-gray-900">{overviewStats.totalBookings}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-500">Totale Omzet</p>
              <p className="text-3xl font-bold text-gray-900">
                {new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(overviewStats.totalRevenue)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-500">Studio&apos;s</p>
              <p className="text-3xl font-bold text-gray-900">{overviewStats.totalStudios}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-500">Klanten</p>
              <p className="text-3xl font-bold text-gray-900">{overviewStats.totalCustomers}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bookings Over Time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bookings Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {bookingsData.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bookingsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#6B7280', fontSize: 12 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#6B7280', fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #E5E7EB',
                        borderRadius: '12px',
                      }}
                    />
                    <Bar dataKey="bookings" fill="#6366F1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-400">
                Nog geen booking data beschikbaar
              </div>
            )}
          </CardContent>
        </Card>

        {/* Studio Types Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Studios by Type</CardTitle>
          </CardHeader>
          <CardContent>
            {studioTypeData.length > 0 ? (
              <div className="h-[300px] flex items-center">
                <ResponsiveContainer width="50%" height="100%">
                  <PieChart>
                    <Pie
                      data={studioTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {studioTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #E5E7EB',
                        borderRadius: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-3">
                  {studioTypeData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm text-gray-600">{item.name}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-400">
                Nog geen studio types beschikbaar
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Studios */}
      {topStudios.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Performing Studios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topStudios.map((studio, index) => (
                <div key={studio.name} className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-sm font-medium text-gray-600">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{studio.name}</p>
                    <p className="text-sm text-gray-500">{studio.bookings} bookings</p>
                  </div>
                  <span className="font-semibold text-gray-900">
                    {new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(studio.revenue)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
