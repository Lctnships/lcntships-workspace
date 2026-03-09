'use client'

import { useState, useEffect } from 'react'
import {
  DollarSign,
  Percent,
  Wallet,
  Clock,
  TrendingUp,
  Download,
  Calendar,
  ChevronDown,
  ArrowRight,
  Building2,
  FileText,
  Search,
  Filter,
  MoreHorizontal,
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  Inbox
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatCurrency } from '@/lib/utils'
import { transactionsApi, financeApi } from '@/lib/supabase'

const studioColors = ['bg-gray-900', 'bg-emerald-500', 'bg-orange-500', 'bg-purple-500']

export default function FinancePage() {
  const [dateRange] = useState('Last 30 Days')
  const [transactions, setTransactions] = useState<any[]>([])
  const [revenueByStudio, setRevenueByStudio] = useState<any[]>([])
  const [overview, setOverview] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadFinance() {
      try {
        const [txs, revenue, stats] = await Promise.all([
          transactionsApi.getAll(),
          financeApi.getRevenueByStudio(),
          financeApi.getOverview(),
        ])
        setTransactions(txs || [])
        setRevenueByStudio(revenue || [])
        setOverview(stats)
      } catch (error) {
        console.error('Error loading finance:', error)
      } finally {
        setLoading(false)
      }
    }
    loadFinance()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-900" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Finance Overview</h1>
          <p className="text-gray-500 mt-1">Track revenue, payouts, and financial health for your studios.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span>{dateRange}</span>
            <ChevronDown className="h-4 w-4 text-gray-500" />
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Revenue */}
        <Card className="shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-gray-500">Total Revenue</p>
              <DollarSign className="h-5 w-5 text-gray-400" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{formatCurrency(overview?.totalRevenue ?? 0)}</h3>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-xs font-semibold text-emerald-500">+8.2%</span>
                <span className="text-xs text-gray-500 ml-1">vs last month</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Platform Fees */}
        <Card className="shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-gray-500">Platform Fees (15%)</p>
              <Percent className="h-5 w-5 text-gray-400" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{formatCurrency(overview?.platformFees ?? 0)}</h3>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs font-medium text-gray-500">Your commission earnings</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Partner Payouts */}
        <Card className="shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-gray-500">Partner Payouts</p>
              <Wallet className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{formatCurrency(overview?.partnerPayouts ?? 0)}</h3>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs font-semibold text-orange-500">Processed</span>
                <span className="text-xs text-gray-500 ml-1">in last 30 days</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Payouts */}
        <Card className="shadow-[0_2px_8px_rgba(0,0,0,0.04)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-gray-900/5 to-transparent rounded-bl-3xl" />
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-gray-500">Pending Payouts</p>
              <Clock className="h-5 w-5 text-gray-900" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{formatCurrency(overview?.pendingPayouts ?? 0)}</h3>
              <div className="flex items-center gap-1 mt-1">
                <span className="px-1.5 py-0.5 rounded-md bg-gray-200 text-gray-900 text-[10px] font-bold uppercase tracking-wider">
                  Arriving Thu
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart (Left - Wide) */}
        <Card className="lg:col-span-2 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Gross Volume</CardTitle>
                <p className="text-sm text-gray-500">Income trends over time</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="h-7 px-3 text-xs rounded-full">Daily</Button>
                <Button size="sm" variant="ghost" className="h-7 px-3 text-xs rounded-full text-gray-500">Weekly</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {/* Chart */}
            <div className="relative w-full h-64">
              {/* Grid Lines */}
              <div className="absolute inset-0 flex flex-col justify-between text-xs text-gray-300 pointer-events-none">
                <div className="border-b border-gray-100 w-full h-0 flex items-center"><span className="-ml-8 text-gray-400">$40k</span></div>
                <div className="border-b border-gray-100 w-full h-0 flex items-center"><span className="-ml-8 text-gray-400">$30k</span></div>
                <div className="border-b border-gray-100 w-full h-0 flex items-center"><span className="-ml-8 text-gray-400">$20k</span></div>
                <div className="border-b border-gray-100 w-full h-0 flex items-center"><span className="-ml-8 text-gray-400">$10k</span></div>
                <div className="border-b border-gray-100 w-full h-0 flex items-center"><span className="-ml-8 text-gray-400">$0</span></div>
              </div>
              {/* Graph Line */}
              <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                <defs>
                  <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#6366F1" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0,80 C10,75 20,60 30,65 C40,70 50,40 60,35 C70,30 80,45 90,20 L100,25 L100,100 L0,100 Z" fill="url(#chartGradient)" />
                <path d="M0,80 C10,75 20,60 30,65 C40,70 50,40 60,35 C70,30 80,45 90,20 L100,25" fill="none" stroke="#6366F1" strokeLinecap="round" strokeWidth="3" vectorEffect="non-scaling-stroke" />
              </svg>
              {/* Hover Tooltip Indicator */}
              <div className="absolute top-[20%] left-[90%] w-3 h-3 bg-white border-2 border-gray-900 rounded-full shadow-md z-10" />
              <div className="absolute top-[5%] left-[78%] bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg z-20">
                Jan 28: $38,420
              </div>
            </div>
            {/* X Axis Labels */}
            <div className="flex justify-between mt-4 text-xs font-medium text-gray-500">
              <span>Jan 1</span>
              <span>Jan 8</span>
              <span>Jan 15</span>
              <span>Jan 22</span>
              <span>Jan 29</span>
            </div>
          </CardContent>
        </Card>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          {/* Next Payout Card */}
          <Card className="shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Next Payout</h3>
                  <p className="text-sm text-gray-500 mt-1">Scheduled for Thursday</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-900">
                  <Building2 className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-6">
                <span className="text-3xl font-bold text-gray-900 tracking-tight">{formatCurrency(overview?.pendingPayouts ?? 0)}</span>
              </div>
              <div className="mt-6">
                <Button className="w-full gap-2">
                  <span>Payout Now</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Revenue by Studio */}
          <Card className="shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold">Revenue by Studio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {revenueByStudio.map((studio, index) => (
                <div key={studio.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-900">{studio.name}</span>
                    <span className="font-bold text-gray-900">{formatCurrency(studio.revenue)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={cn("h-2 rounded-full", studioColors[index % studioColors.length])}
                      style={{ width: `${studio.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <Card className="shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Recent Transactions</h3>
            <p className="text-sm text-gray-500">Latest financial activity across all studios</p>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search transactions..."
                className="pl-9 h-9 w-full sm:w-64 bg-gray-50"
              />
            </div>
            <Button variant="outline" size="icon" className="h-9 w-9">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="py-3 px-6 text-xs font-semibold uppercase tracking-wider text-gray-500">Transaction</th>
                <th className="py-3 px-6 text-xs font-semibold uppercase tracking-wider text-gray-500">Studio</th>
                <th className="py-3 px-6 text-xs font-semibold uppercase tracking-wider text-gray-500">Date</th>
                <th className="py-3 px-6 text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                <th className="py-3 px-6 text-xs font-semibold uppercase tracking-wider text-gray-500 text-right">Amount</th>
                <th className="py-3 px-6 text-xs font-semibold uppercase tracking-wider text-gray-500 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <Inbox className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-500">No transactions yet</p>
                    <p className="text-xs text-gray-400 mt-1">Transactions will appear here once recorded.</p>
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="group hover:bg-gray-50/50 transition-colors cursor-pointer">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center",
                          tx.type === 'payment' ? 'bg-gray-200 text-gray-900' : 'bg-orange-100 text-orange-600'
                        )}>
                          {tx.type === 'payment' ? (
                            <ArrowDownLeft className="h-4 w-4" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4" />
                          )}
                        </div>
                        <span className="font-medium text-gray-900">{tx.description}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-500">{tx.partner?.company_name ?? '—'}</td>
                    <td className="py-4 px-6 text-sm text-gray-500">{tx.created_at ? new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                    <td className="py-4 px-6">
                      <Badge
                        variant={
                          tx.status === 'succeeded' ? 'success' :
                          tx.status === 'processing' ? 'secondary' :
                          'warning'
                        }
                        className={cn(
                          "capitalize",
                          tx.status === 'succeeded' && "bg-emerald-50 text-emerald-700 border-emerald-200",
                          tx.status === 'processing' && "bg-gray-100 text-gray-600 border-gray-200",
                          tx.status === 'pending' && "bg-yellow-50 text-yellow-700 border-yellow-200"
                        )}
                      >
                        {tx.status}
                      </Badge>
                    </td>
                    <td className="py-4 px-6 text-sm font-semibold text-gray-900 text-right font-mono">
                      {tx.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(tx.amount))}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-center">
          <Button variant="ghost" className="text-sm font-medium text-gray-900 hover:text-black gap-1">
            View all transactions
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* Quick Actions Footer */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button className="group flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-gray-600 transition-colors text-left">
          <div className="h-10 w-10 rounded-lg bg-gray-50 flex items-center justify-center text-gray-500 group-hover:text-gray-900 transition-colors">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900">Update Bank Info</h4>
            <p className="text-xs text-gray-500">Manage payout methods</p>
          </div>
        </button>
        <button className="group flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-gray-600 transition-colors text-left">
          <div className="h-10 w-10 rounded-lg bg-gray-50 flex items-center justify-center text-gray-500 group-hover:text-gray-900 transition-colors">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900">Tax Forms</h4>
            <p className="text-xs text-gray-500">Download tax documents</p>
          </div>
        </button>
        <button className="group flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-gray-600 transition-colors text-left">
          <div className="h-10 w-10 rounded-lg bg-gray-50 flex items-center justify-center text-gray-500 group-hover:text-gray-900 transition-colors">
            <Download className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900">Export Reports</h4>
            <p className="text-xs text-gray-500">Download CSV or PDF</p>
          </div>
        </button>
        <button className="group flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-gray-600 transition-colors text-left">
          <div className="h-10 w-10 rounded-lg bg-gray-50 flex items-center justify-center text-gray-500 group-hover:text-gray-900 transition-colors">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900">Payout History</h4>
            <p className="text-xs text-gray-500">View all past payouts</p>
          </div>
        </button>
      </div>
    </div>
  )
}
