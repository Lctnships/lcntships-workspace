'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Building2,
  DollarSign,
  Edit,
  TrendingUp,
  FileText,
  Download,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { partnersApi, documentsApi, transactionsApi } from '@/lib/supabase'
import type { Partner, Document, Transaction } from '@/lib/supabase'

const weeklyPerformance = [40, 55, 45, 70, 60, 85, 95]

export default function PartnerDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [partner, setPartner] = useState<Partner | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const [partnerData, docsData, txData] = await Promise.all([
          partnersApi.getById(id),
          documentsApi.getByPartner(id),
          transactionsApi.getByPartner(id),
        ])
        setPartner(partnerData)
        setDocuments(docsData)
        setTransactions(txData)
      } catch (error) {
        console.error('Failed to fetch partner data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchData()
    }
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-900" />
      </div>
    )
  }

  if (!partner) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Building2 className="h-12 w-12 text-gray-300" />
        <h2 className="text-xl font-bold text-gray-900">Partner not found</h2>
        <p className="text-gray-500 text-sm">The partner you are looking for does not exist or has been removed.</p>
        <Link href="/partners">
          <Button variant="outline" className="rounded-xl">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Partners
          </Button>
        </Link>
      </div>
    )
  }

  const statusColor =
    partner.status === 'active'
      ? 'bg-emerald-100 text-emerald-700'
      : partner.status === 'pending'
      ? 'bg-amber-100 text-amber-700'
      : partner.status === 'suspended'
      ? 'bg-red-100 text-red-700'
      : 'bg-gray-100 text-gray-700'

  const totalRevenue = partner.total_revenue ?? 0
  const totalPayouts = partner.total_payouts ?? 0

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumbs & Header Actions */}
      <div className="flex justify-between items-end">
        <div>
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/partners"
              className="text-gray-400 text-sm font-medium hover:text-gray-900 transition-colors"
            >
              Partners
            </Link>
            <span className="text-gray-400 text-sm">/</span>
            <span className="text-gray-900 text-sm font-medium">{partner.company_name} Profile</span>
          </div>

          {/* Header with Avatar */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden shadow-sm">
              {partner.avatar_url ? (
                <img
                  src={partner.avatar_url}
                  alt={partner.company_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="h-8 w-8 text-gray-700" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                  {partner.company_name}
                </h1>
                <Badge className={cn('uppercase text-xs tracking-wider', statusColor)}>
                  {partner.status}
                </Badge>
              </div>
              <p className="text-gray-500 text-sm mt-1">
                {partner.tier && <span className="capitalize">{partner.tier} tier</span>}
                {partner.created_at && <span> · Joined {formatDate(partner.created_at)}</span>}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button className="rounded-xl h-11 px-5">
            <Mail className="h-4 w-4 mr-2" />
            Message
          </Button>
          <Button variant="outline" className="rounded-xl h-11 px-5">
            <Edit className="h-4 w-4 mr-2" />
            Edit Details
          </Button>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Overview Card */}
        <div className="col-span-12 lg:col-span-8 bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Partner Overview</h2>
          </div>
          <div className="grid grid-cols-2 gap-y-8 gap-x-12">
            <div className="flex flex-col gap-1.5">
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Contact Name</p>
              <p className="text-gray-900 font-medium">{partner.contact_name}</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Email Address</p>
              <p className="text-gray-900 font-medium">{partner.email}</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Phone Number</p>
              <p className="text-gray-900 font-medium">{partner.phone || '—'}</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">City</p>
              <p className="text-gray-900 font-medium">{partner.city || '—'}</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Country</p>
              <p className="text-gray-900 font-medium">{partner.country || '—'}</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Commission Rate</p>
              <p className="text-gray-900 font-medium">
                {partner.commission_rate != null ? `${partner.commission_rate}%` : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Financials Card */}
        <div className="col-span-12 lg:col-span-4 bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Financials</h2>
          <div className="space-y-6">
            <div className="p-5 bg-gray-50 rounded-2xl">
              <p className="text-gray-500 text-sm font-medium mb-1">Total Revenue</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900">
                  {formatCurrency(totalRevenue)}
                </span>
              </div>
            </div>
            <div className="p-5 border border-gray-100 rounded-2xl">
              <p className="text-gray-500 text-sm font-medium mb-1">Total Payouts</p>
              <span className="text-2xl font-bold text-gray-900">
                {formatCurrency(totalPayouts)}
              </span>
            </div>
            <a
              href="#"
              className="flex items-center justify-between text-gray-900 text-sm font-bold hover:underline px-2"
            >
              <span>View Payout History</span>
              <ChevronRight className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Studio Performance Card */}
        <div className="col-span-12 lg:col-span-7 bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Studio Performance</h2>
              <p className="text-gray-500 text-sm">Monthly Booking Trends</p>
            </div>
            <select className="bg-gray-50 border-none rounded-lg text-xs font-bold pr-10 focus:ring-gray-900">
              <option>Last 30 Days</option>
              <option>Last 6 Months</option>
            </select>
          </div>

          {/* Chart Visualization */}
          <div className="relative h-48 w-full mt-4">
            <div className="absolute inset-0 flex items-end gap-2 px-2">
              {weeklyPerformance.map((value, index) => (
                <div
                  key={index}
                  className={cn(
                    'flex-1 rounded-t-lg transition-all',
                    index === weeklyPerformance.length - 1
                      ? 'bg-gray-900'
                      : index >= weeklyPerformance.length - 3
                      ? 'bg-gray-700'
                      : 'bg-gray-300'
                  )}
                  style={{ height: `${value}%` }}
                />
              ))}
            </div>
            <div className="absolute inset-0 border-b border-l border-gray-100" />
          </div>
          <div className="flex justify-between mt-4 px-2 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
            <span>Week 1</span>
            <span>Week 2</span>
            <span>Week 3</span>
            <span>Week 4</span>
          </div>
        </div>

        {/* Documents Card */}
        <div className="col-span-12 lg:col-span-5 bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Documents</h2>
            <button className="text-gray-900 text-xs font-bold hover:underline">
              Upload New
            </button>
          </div>
          <div className="space-y-4">
            {documents.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No documents yet</p>
            ) : (
              documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl border border-gray-100 hover:border-gray-300 transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-orange-100">
                      <FileText className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{doc.name}</p>
                      <p className="text-[11px] text-gray-400">
                        {doc.type || 'Document'}
                        {doc.created_at && ` · ${formatDate(doc.created_at)}`}
                      </p>
                    </div>
                  </div>
                  <Download className="h-5 w-5 text-gray-300 group-hover:text-gray-900 transition-colors" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
