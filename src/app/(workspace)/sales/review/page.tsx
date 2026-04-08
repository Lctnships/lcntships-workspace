'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Trash2,
  Building2,
  MapPin,
  Phone,
  Mail,
  User,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ThumbsDown,
  Check,
  X,
  Globe,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface SalesLead {
  id: string
  company_name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  city: string | null
  address: string | null
  website: string | null
  status: string
  source: string | null
  notes: string | null
}

export default function ReviewPage() {
  const [leads, setLeads] = useState<SalesLead[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [deleted, setDeleted] = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    fetchRejectedLeads()
  }, [])

  const fetchRejectedLeads = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/leads')
      const data: SalesLead[] = await res.json()

      // Filter leads that are rejected (approval tag in notes) or status = lost
      const rejected = data.filter(lead => {
        const hasRejectedTag = lead.notes?.includes('[APPROVAL:rejected]')
        const isLost = lead.status === 'lost'
        return hasRejectedTag || isLost
      })

      setLeads(rejected)
    } catch (err) {
      console.error('Error fetching leads:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    const remaining = leads.filter(l => !deleted.has(l.id))
    if (selected.size === remaining.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(remaining.map(l => l.id)))
    }
  }

  const deleteSelected = async () => {
    if (selected.size === 0) return
    setDeleting(true)
    try {
      const toDelete = [...selected]
      for (const id of toDelete) {
        await fetch(`/api/leads/${id}`, { method: 'DELETE' })
      }
      setDeleted(prev => {
        const next = new Set(prev)
        toDelete.forEach(id => next.add(id))
        return next
      })
      setSelected(new Set())
      setConfirmDelete(false)
    } catch (err) {
      console.error('Error deleting leads:', err)
    } finally {
      setDeleting(false)
    }
  }

  const remainingLeads = leads.filter(l => !deleted.has(l.id))
  const rejectedCount = remainingLeads.filter(l => l.notes?.includes('[APPROVAL:rejected]')).length
  const lostCount = remainingLeads.filter(l => l.status === 'lost').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/sales">
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Wekelijkse Review</h1>
            <p className="text-sm text-gray-500">Overzicht van afgewezen en verloren leads — opschonen</p>
          </div>
        </div>
        {selected.size > 0 && (
          <Button
            onClick={() => setConfirmDelete(true)}
            variant="outline"
            className="rounded-xl gap-2 text-red-600 border-red-200 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            {selected.size} verwijderen
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-500">Totaal</span>
          </div>
          <p className="text-2xl font-bold mt-1 text-gray-900">{remainingLeads.length}</p>
        </div>
        <div className="bg-red-50 rounded-2xl border border-red-100 p-4">
          <div className="flex items-center gap-2">
            <ThumbsDown className="h-4 w-4 text-red-500" />
            <span className="text-xs font-medium text-red-600">Afgewezen</span>
          </div>
          <p className="text-2xl font-bold mt-1 text-red-700">{rejectedCount}</p>
        </div>
        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-gray-500" />
            <span className="text-xs font-medium text-gray-600">Verloren</span>
          </div>
          <p className="text-2xl font-bold mt-1 text-gray-700">{lostCount}</p>
        </div>
      </div>

      {/* Select all bar */}
      {remainingLeads.length > 0 && (
        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 px-4 py-3">
          <button onClick={selectAll} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
            <div className={cn(
              'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors',
              selected.size === remainingLeads.length
                ? 'bg-gray-900 border-gray-900'
                : selected.size > 0
                  ? 'bg-gray-400 border-gray-400'
                  : 'border-gray-300'
            )}>
              {selected.size > 0 && <Check className="h-3 w-3 text-white" />}
            </div>
            {selected.size === 0
              ? 'Alles selecteren'
              : `${selected.size} van ${remainingLeads.length} geselecteerd`}
          </button>
          {selected.size > 0 && (
            <button onClick={() => setSelected(new Set())} className="text-xs text-gray-400 hover:text-gray-600">
              Deselecteren
            </button>
          )}
        </div>
      )}

      {/* Leads list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">Laden...</span>
        </div>
      ) : remainingLeads.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-700">Alles opgeschoond!</h3>
          <p className="text-sm text-gray-500 mt-1">
            Er zijn geen afgewezen of verloren leads meer om te reviewen.
          </p>
          <Link href="/sales">
            <Button className="mt-4 rounded-xl">Terug naar Sales Pipeline</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {remainingLeads.map(lead => {
            const isSelected = selected.has(lead.id)
            const isRejected = lead.notes?.includes('[APPROVAL:rejected]')
            const cleanNotes = lead.notes?.replace(/\[APPROVAL:(approved|rejected|pending)\]\s*/g, '').trim()

            return (
              <div
                key={lead.id}
                className={cn(
                  'bg-white rounded-2xl border p-4 transition-all',
                  isSelected ? 'border-red-300 bg-red-50/50' : 'border-gray-100 hover:border-gray-200'
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleSelect(lead.id)}
                    className={cn(
                      'w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors',
                      isSelected ? 'bg-red-500 border-red-500' : 'border-gray-300 hover:border-gray-400'
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3 text-white" />}
                  </button>

                  {/* Lead info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{lead.company_name}</span>
                      {isRejected && (
                        <Badge className="bg-red-100 text-red-700 text-[10px]">
                          <ThumbsDown className="h-2.5 w-2.5 mr-1" />
                          Afgewezen
                        </Badge>
                      )}
                      {lead.status === 'lost' && (
                        <Badge className="bg-gray-100 text-gray-700 text-[10px]">
                          <XCircle className="h-2.5 w-2.5 mr-1" />
                          Verloren
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      {lead.contact_name && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {lead.contact_name}
                        </span>
                      )}
                      {lead.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {lead.city}
                        </span>
                      )}
                      {lead.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {lead.phone}
                        </span>
                      )}
                      {lead.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {lead.email}
                        </span>
                      )}
                    </div>
                    {cleanNotes && (
                      <p className="text-xs text-gray-400 mt-1.5 italic line-clamp-2">{cleanNotes}</p>
                    )}
                  </div>

                  {/* Quick delete */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 flex-shrink-0"
                    onClick={() => {
                      setSelected(new Set([lead.id]))
                      setConfirmDelete(true)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">
              {selected.size === 1 ? 'Lead verwijderen?' : `${selected.size} leads verwijderen?`}
            </h3>
            <p className="text-sm text-gray-500 mt-2">
              Dit kan niet ongedaan gemaakt worden. De lead{selected.size > 1 ? 's' : ''} en alle bijbehorende data worden permanent verwijderd.
            </p>
            <div className="flex gap-2 mt-6">
              <Button
                variant="ghost"
                className="flex-1 rounded-xl"
                onClick={() => setConfirmDelete(false)}
              >
                Annuleren
              </Button>
              <Button
                className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 gap-2"
                onClick={deleteSelected}
                disabled={deleting}
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Verwijderen
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
