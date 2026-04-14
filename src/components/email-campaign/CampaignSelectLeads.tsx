'use client'

import { useState, useEffect } from 'react'
import { Search, X, Users, ChevronRight, Loader2, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { salesLeadsApi, type SalesLead } from '@/lib/supabase'
import { workspaceClient } from '@/lib/workspace-client'

interface CampaignSelectLeadsProps {
  onNext: (selectedLeads: SalesLead[]) => void
  onCancel: () => void
}

const stageColors: Record<string, string> = {
  cold: 'bg-slate-100 text-slate-700',
  warm: 'bg-amber-50 text-amber-700',
  hot: 'bg-orange-50 text-orange-700',
  negotiation: 'bg-gray-100 text-black',
  closed: 'bg-emerald-50 text-emerald-700',
  lost: 'bg-red-50 text-red-700',
}

const stageLabels: Record<string, string> = {
  cold: 'Cold',
  warm: 'Warm',
  hot: 'Hot',
  negotiation: 'Negotiation',
  closed: 'Closed',
  lost: 'Lost',
}

function getInitials(firstName?: string, lastName?: string) {
  if (!firstName && !lastName) return '?'
  return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase()
}

function getAvatarColor(id: string) {
  const colors = [
    'bg-gray-200 text-gray-900',
    'bg-purple-100 text-purple-600',
    'bg-pink-100 text-pink-600',
    'bg-amber-100 text-amber-600',
    'bg-emerald-100 text-emerald-600',
    'bg-rose-100 text-rose-600',
    'bg-cyan-100 text-cyan-600',
    'bg-orange-100 text-orange-600',
  ]
  return colors[parseInt(id) % colors.length]
}

export function CampaignSelectLeads({ onNext, onCancel }: CampaignSelectLeadsProps) {
  const [leads, setLeads] = useState<SalesLead[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())
  const [stageFilter, setStageFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [emailFilter, setEmailFilter] = useState<string>('not_sent')
  const [sentLeadIds, setSentLeadIds] = useState<Set<string>>(new Set())
  const [sentDates, setSentDates] = useState<Record<string, string>>({})

  // Load leads and sent email data from Supabase
  useEffect(() => {
    const loadLeads = async () => {
      try {
        const [leadsData, sentData] = await Promise.all([
          salesLeadsApi.getAll(),
          workspaceClient.from<{lead_id: string; sent_at: string}[]>('sent_emails').select('lead_id, sent_at').order('sent_at', { ascending: false }).then(res => res.data || []),
        ])
        const leadsWithEmail = leadsData.filter(lead => lead.email)
        setLeads(leadsWithEmail)
        setSentLeadIds(new Set(sentData.map((s: { lead_id: string }) => s.lead_id)))
        // Store latest sent date per lead
        const dates: Record<string, string> = {}
        sentData.forEach((s: { lead_id: string; sent_at: string }) => {
          if (!dates[s.lead_id]) dates[s.lead_id] = s.sent_at
        })
        setSentDates(dates)
      } catch (error) {
        console.error('Error loading leads:', error)
      } finally {
        setLoading(false)
      }
    }
    loadLeads()
  }, [])

  // Filter leads
  const filteredLeads = leads.filter(lead => {
    const matchesSearch =
      searchQuery === '' ||
      lead.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.city?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStage = stageFilter === 'all' || lead.status === stageFilter
    const matchesSource = sourceFilter === 'all' || lead.source === sourceFilter
    const matchesEmail = emailFilter === 'all' ||
      (emailFilter === 'not_sent' && !sentLeadIds.has(lead.id)) ||
      (emailFilter === 'sent' && sentLeadIds.has(lead.id))

    return matchesSearch && matchesStage && matchesSource && matchesEmail
  })

  const toggleLead = (leadId: string) => {
    const newSelected = new Set(selectedLeads)
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId)
    } else {
      newSelected.add(leadId)
    }
    setSelectedLeads(newSelected)
  }

  const toggleAll = () => {
    if (selectedLeads.size === filteredLeads.length) {
      setSelectedLeads(new Set())
    } else {
      setSelectedLeads(new Set(filteredLeads.map(l => l.id)))
    }
  }

  const handleNext = () => {
    const selected = leads.filter(lead => selectedLeads.has(lead.id))
    onNext(selected)
  }

  // Get unique sources for filter
  const sources = [...new Set(leads.map(l => l.source).filter(Boolean))]

  if (loading) {
    return (
      <div className="flex flex-col h-full max-h-[900px] w-full max-w-[1100px] bg-white rounded-[32px] border border-gray-200 shadow-2xl overflow-hidden items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-900" />
        <p className="mt-4 text-gray-500">Leads laden...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full max-h-[900px] w-full max-w-[1100px] bg-white rounded-[32px] border border-gray-200 shadow-2xl overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-100 px-8 py-6">
        <div className="flex items-center gap-4 text-gray-900">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-900 text-white">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Selecteer Leads voor Campagne</h2>
            <p className="text-sm font-medium text-gray-500">
              Stap 1 van 3: Kies je ontvangers — {filteredLeads.length} van {leads.length} leads
              {selectedLeads.size > 0 && (
                <span className="text-gray-900 font-bold"> · {selectedLeads.size} geselecteerd</span>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="flex flex-col gap-6">
          {/* Search & Filters */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex-1 min-w-[300px]">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-gray-900 transition-colors" />
                <Input
                  className="w-full rounded-2xl border-none bg-gray-50 py-3.5 pl-12 pr-4 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-900/20"
                  placeholder="Zoek leads op naam, email of bedrijf..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="flex h-11 items-center gap-2 rounded-2xl bg-gray-50 px-5 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors whitespace-nowrap border-none cursor-pointer appearance-none pr-10"
                style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.75rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
              >
                <option value="all">Status: Alle</option>
                <option value="cold">Cold</option>
                <option value="warm">Warm</option>
                <option value="hot">Hot</option>
                <option value="negotiation">Negotiation</option>
                <option value="closed">Closed</option>
              </select>
              <select
                value={emailFilter}
                onChange={(e) => setEmailFilter(e.target.value)}
                className="flex h-11 items-center gap-2 rounded-2xl bg-gray-50 px-5 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors whitespace-nowrap border-none cursor-pointer appearance-none pr-10"
                style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.75rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
              >
                <option value="not_sent">Niet verstuurd</option>
                <option value="sent">Al verstuurd</option>
                <option value="all">Alle leads</option>
              </select>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="flex h-11 items-center gap-2 rounded-2xl bg-gray-50 px-5 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors whitespace-nowrap border-none cursor-pointer appearance-none pr-10"
                style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.75rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
              >
                <option value="all">Bron: Alle</option>
                {sources.map(source => (
                  <option key={source} value={source}>{source}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500">
                  <th className="w-16 px-6 py-4">
                    <Checkbox
                      checked={filteredLeads.length > 0 && selectedLeads.size === filteredLeads.length}
                      onCheckedChange={toggleAll}
                      className="h-5 w-5 rounded border-gray-300"
                    />
                  </th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider">Lead Details</th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider">Status</th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider">Email Status</th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-right">Locatie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="group hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <Checkbox
                        checked={selectedLeads.has(lead.id)}
                        onCheckedChange={() => toggleLead(lead.id)}
                        className="h-5 w-5 rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn("h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm", getAvatarColor(lead.id))}>
                          {getInitials(lead.contact_name?.split(' ')[0], lead.contact_name?.split(' ')[1])}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{lead.company_name}</p>
                          <p className="text-xs text-gray-500">{lead.contact_name} • {lead.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={cn("inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold capitalize", stageColors[lead.status || 'cold'])}>
                        {stageLabels[lead.status || 'cold']}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {sentLeadIds.has(lead.id) ? (
                        <div className="flex flex-col">
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 w-fit">
                            <Mail className="h-3 w-3" />
                            Verstuurd
                          </span>
                          {sentDates[lead.id] && (
                            <span className="text-[10px] text-gray-400 mt-0.5 pl-1">
                              {new Date(sentDates[lead.id]).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Niet verstuurd</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 text-right">{lead.city || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredLeads.length === 0 && (
              <div className="py-12 text-center text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Geen leads gevonden</p>
                <p className="text-sm mt-1">{leads.length === 0 ? 'Geen leads met emailadres beschikbaar' : 'Probeer een andere zoekterm of filter'}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="flex items-center justify-between border-t border-gray-100 px-8 py-6 bg-gray-50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-500">Geselecteerd:</span>
          <Badge className="bg-gray-900/10 text-gray-900 hover:bg-gray-900/20">
            {selectedLeads.size} Leads
          </Badge>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={onCancel}
            className="h-12 px-6 rounded-2xl text-sm font-bold"
          >
            Annuleren
          </Button>
          <Button
            onClick={handleNext}
            disabled={selectedLeads.size === 0}
            className="h-12 items-center gap-2 rounded-2xl px-8 text-sm font-bold shadow-lg shadow-gray-900/25 hover:shadow-gray-900/40 transition-all"
          >
            <span>Volgende: Schrijf Email</span>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </footer>
    </div>
  )
}
