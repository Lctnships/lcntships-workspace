'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Camera,
  Video,
  Film,
  FileText,
  Plus,
  Search,
  ExternalLink,
  MapPin,
  Phone,
  Mail,
  Globe,
  Instagram,
  Calendar,
  Clock,
  ChevronRight,
  X,
  Loader2,
  Check,
  Copy,
  Share2,
  Pencil,
  Trash2,
  Eye,
  Building2,
  Sparkles,
  User,
  Link2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'

// Types
interface ClosedStudio {
  id: string
  company_name: string
  contact_name?: string
  email?: string
  phone?: string
  city?: string
  address?: string
  website?: string
  instagram?: string
  notes?: string
  source?: string
  closed_at?: string
}

interface ContentBrief {
  id: string
  lead_id: string
  studio_name: string
  status: 'draft' | 'ready' | 'shared' | 'in_progress' | 'done'
  content_type: 'photo' | 'video' | 'reel' | 'story' | 'blog' | 'other' | null
  title: string | null
  description: string | null
  notes: string | null
  shoot_date: string | null
  assigned_to: string | null
  shared_with: string[] | null
  share_link: string
  created_at: string
  updated_at: string
}

const contentTypeConfig = {
  photo: { icon: Camera, label: 'Fotoshoot', color: 'bg-blue-100 text-blue-700' },
  video: { icon: Video, label: 'Video', color: 'bg-purple-100 text-purple-700' },
  reel: { icon: Film, label: 'Reel', color: 'bg-pink-100 text-pink-700' },
  story: { icon: Camera, label: 'Story', color: 'bg-orange-100 text-orange-700' },
  blog: { icon: FileText, label: 'Blog', color: 'bg-emerald-100 text-emerald-700' },
  other: { icon: Sparkles, label: 'Anders', color: 'bg-gray-100 text-gray-700' },
}

const statusConfig = {
  draft: { label: 'Concept', color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
  ready: { label: 'Klaar', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  shared: { label: 'Gedeeld', color: 'bg-violet-100 text-violet-700', dot: 'bg-violet-500' },
  in_progress: { label: 'In productie', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  done: { label: 'Afgerond', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
}

export default function ContentPage() {
  const [studios, setStudios] = useState<ClosedStudio[]>([])
  const [briefs, setBriefs] = useState<ContentBrief[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStudio, setSelectedStudio] = useState<ClosedStudio | null>(null)
  const [showBriefModal, setShowBriefModal] = useState(false)
  const [editingBrief, setEditingBrief] = useState<ContentBrief | null>(null)
  const [selectedBrief, setSelectedBrief] = useState<ContentBrief | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'studios' | 'briefs'>('studios')

  // Brief form state
  const [briefTitle, setBriefTitle] = useState('')
  const [briefType, setBriefType] = useState<ContentBrief['content_type']>('photo')
  const [briefDescription, setBriefDescription] = useState('')
  const [briefNotes, setBriefNotes] = useState('')
  const [briefShootDate, setBriefShootDate] = useState('')
  const [briefAssignedTo, setBriefAssignedTo] = useState('')
  const [briefSharedWith, setBriefSharedWith] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // Load closed studios
      const { data: closedLeads } = await supabase
        .from('sales_leads')
        .select('id, company_name, contact_name, email, phone, city, address, website, instagram, notes, source, updated_at')
        .eq('status', 'closed')
        .order('updated_at', { ascending: false })

      if (closedLeads) {
        setStudios(closedLeads.map(l => ({ ...l, closed_at: l.updated_at })) as unknown as ClosedStudio[])
      }

      // Load content briefs
      const { data: briefData } = await supabase
        .from('content_briefs' as never)
        .select('*')
        .order('created_at' as never, { ascending: false })

      if (briefData) {
        setBriefs(briefData as unknown as ContentBrief[])
      }
    } catch (err) {
      console.error('Failed to load content data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filteredStudios = studios.filter(s =>
    searchQuery === '' ||
    s.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.city || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.contact_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStudioBriefs = (studioId: string) => briefs.filter(b => b.lead_id === studioId)

  const openNewBrief = (studio: ClosedStudio) => {
    setEditingBrief(null)
    setBriefTitle('')
    setBriefType('photo')
    setBriefDescription('')
    setBriefNotes('')
    setBriefShootDate('')
    setBriefAssignedTo('')
    setBriefSharedWith('')
    setSelectedStudio(studio)
    setShowBriefModal(true)
  }

  const openEditBrief = (brief: ContentBrief) => {
    setEditingBrief(brief)
    setBriefTitle(brief.title || '')
    setBriefType(brief.content_type)
    setBriefDescription(brief.description || '')
    setBriefNotes(brief.notes || '')
    setBriefShootDate(brief.shoot_date || '')
    setBriefAssignedTo(brief.assigned_to || '')
    setBriefSharedWith((brief.shared_with || []).join(', '))
    const studio = studios.find(s => s.id === brief.lead_id) || null
    setSelectedStudio(studio)
    setShowBriefModal(true)
  }

  const saveBrief = async () => {
    if (!selectedStudio || !briefTitle.trim()) return
    setSaving(true)
    try {
      const briefData = {
        lead_id: selectedStudio.id,
        studio_name: selectedStudio.company_name,
        title: briefTitle.trim(),
        content_type: briefType,
        description: briefDescription.trim() || null,
        notes: briefNotes.trim() || null,
        shoot_date: briefShootDate || null,
        assigned_to: briefAssignedTo.trim() || null,
        shared_with: briefSharedWith.trim() ? briefSharedWith.split(',').map(s => s.trim()) : null,
        updated_at: new Date().toISOString(),
      }

      if (editingBrief) {
        await supabase
          .from('content_briefs' as never)
          .update(briefData as never)
          .eq('id' as never, editingBrief.id as never)
      } else {
        await supabase
          .from('content_briefs' as never)
          .insert({ ...briefData, status: 'draft' } as never)
      }

      await loadData()
      setShowBriefModal(false)
    } catch (err) {
      console.error('Failed to save brief:', err)
    } finally {
      setSaving(false)
    }
  }

  const updateBriefStatus = async (briefId: string, status: ContentBrief['status']) => {
    await supabase
      .from('content_briefs' as never)
      .update({ status, updated_at: new Date().toISOString() } as never)
      .eq('id' as never, briefId as never)
    await loadData()
    if (selectedBrief?.id === briefId) {
      setSelectedBrief(prev => prev ? { ...prev, status } : null)
    }
  }

  const deleteBrief = async (briefId: string) => {
    if (!confirm('Weet je zeker dat je deze brief wilt verwijderen?')) return
    await supabase.from('content_briefs' as never).delete().eq('id' as never, briefId as never)
    await loadData()
    if (selectedBrief?.id === briefId) setSelectedBrief(null)
  }

  const copyShareLink = (brief: ContentBrief) => {
    const link = `${window.location.origin}/content/brief/${brief.share_link}`
    navigator.clipboard.writeText(link)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  // Stats
  const totalBriefs = briefs.length
  const draftCount = briefs.filter(b => b.status === 'draft').length
  const inProgressCount = briefs.filter(b => b.status === 'in_progress' || b.status === 'shared').length
  const doneCount = briefs.filter(b => b.status === 'done').length

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content</h1>
          <p className="text-sm text-gray-500 mt-1">Bereid content voor geclosede studios en deel met creators</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{studios.length}</p>
              <p className="text-xs text-gray-500">Geclosed Studios</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalBriefs}</p>
              <p className="text-xs text-gray-500">Content Briefs</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{draftCount + inProgressCount}</p>
              <p className="text-xs text-gray-500">In voorbereiding</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Check className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{doneCount}</p>
              <p className="text-xs text-gray-500">Afgerond</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setActiveTab('studios')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === 'studios' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            Studios ({studios.length})
          </button>
          <button
            onClick={() => setActiveTab('briefs')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === 'briefs' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            Briefs ({totalBriefs})
          </button>
        </div>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Zoek studio..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="flex gap-6">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {activeTab === 'studios' ? (
              /* Studios Grid */
              filteredStudios.length === 0 ? (
                <div className="text-center py-20">
                  <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">Geen geclosede studios</p>
                  <p className="text-sm text-gray-400 mt-1">Studios met status &quot;closed&quot; verschijnen hier</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredStudios.map(studio => {
                    const studioBriefs = getStudioBriefs(studio.id)
                    return (
                      <div
                        key={studio.id}
                        className={cn(
                          'bg-white rounded-2xl border border-gray-100 p-5 hover:border-gray-200 transition-all cursor-pointer group',
                          selectedBrief && 'opacity-60'
                        )}
                        onClick={() => { setSelectedStudio(studio); setSelectedBrief(null) }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">{studio.company_name}</h3>
                            {studio.city && (
                              <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                                <MapPin className="h-3.5 w-3.5" />
                                {studio.city}
                              </p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="opacity-0 group-hover:opacity-100 transition-opacity rounded-lg h-8"
                            onClick={(e) => { e.stopPropagation(); openNewBrief(studio) }}
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Brief
                          </Button>
                        </div>

                        {/* Contact info */}
                        <div className="space-y-1.5 mb-3">
                          {studio.contact_name && (
                            <p className="text-sm text-gray-600 flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-gray-400" />
                              {studio.contact_name}
                            </p>
                          )}
                          {studio.email && (
                            <p className="text-sm text-gray-600 flex items-center gap-1.5 truncate">
                              <Mail className="h-3.5 w-3.5 text-gray-400" />
                              {studio.email}
                            </p>
                          )}
                          {studio.website && (
                            <a
                              href={studio.website.startsWith('http') ? studio.website : `https://${studio.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-sm text-blue-600 flex items-center gap-1.5 hover:underline truncate"
                            >
                              <Globe className="h-3.5 w-3.5" />
                              {studio.website.replace(/^https?:\/\//, '')}
                            </a>
                          )}
                          {studio.instagram && (
                            <a
                              href={studio.instagram.startsWith('http') ? studio.instagram : `https://instagram.com/${studio.instagram.replace('@', '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-sm text-pink-600 flex items-center gap-1.5 hover:underline"
                            >
                              <Instagram className="h-3.5 w-3.5" />
                              {studio.instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//, '@')}
                            </a>
                          )}
                        </div>

                        {/* Briefs count */}
                        {studioBriefs.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {studioBriefs.map(brief => {
                              const st = statusConfig[brief.status]
                              return (
                                <span
                                  key={brief.id}
                                  className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium', st.color)}
                                  onClick={(e) => { e.stopPropagation(); setSelectedBrief(brief) }}
                                >
                                  <span className={cn('w-1.5 h-1.5 rounded-full', st.dot)} />
                                  {brief.title || 'Brief'}
                                </span>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 italic">Geen briefs — klik + Brief</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            ) : (
              /* Briefs List */
              briefs.length === 0 ? (
                <div className="text-center py-20">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">Nog geen content briefs</p>
                  <p className="text-sm text-gray-400 mt-1">Selecteer een studio en maak een brief aan</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {briefs.map(brief => {
                    const st = statusConfig[brief.status]
                    const ct = brief.content_type ? contentTypeConfig[brief.content_type] : null
                    const CtIcon = ct?.icon || FileText
                    return (
                      <div
                        key={brief.id}
                        onClick={() => setSelectedBrief(brief)}
                        className={cn(
                          'bg-white rounded-2xl border border-gray-100 p-4 hover:border-gray-200 transition-all cursor-pointer',
                          selectedBrief?.id === brief.id && 'border-gray-900'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', ct?.color || 'bg-gray-100 text-gray-600')}>
                            <CtIcon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-900 truncate">{brief.title || 'Naamloos'}</h3>
                              <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium', st.color)}>
                                <span className={cn('w-1.5 h-1.5 rounded-full', st.dot)} />
                                {st.label}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 truncate">
                              {brief.studio_name}
                              {brief.shoot_date && ` — ${format(new Date(brief.shoot_date + 'T12:00:00'), 'd MMM yyyy', { locale: nl })}`}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            )}
          </div>

          {/* Detail Panel */}
          {(selectedBrief || selectedStudio) && (
            <div className="w-[380px] flex-shrink-0 bg-white rounded-2xl border border-gray-100 p-6 h-fit sticky top-6">
              {selectedBrief ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-gray-900 text-lg">{selectedBrief.title}</h2>
                    <button onClick={() => setSelectedBrief(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                      <X className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>

                  {/* Status */}
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-500 mb-2">Status</label>
                    <div className="flex flex-wrap gap-1.5">
                      {(Object.entries(statusConfig) as [ContentBrief['status'], typeof statusConfig[ContentBrief['status']]][]).map(([key, config]) => (
                        <button
                          key={key}
                          onClick={() => updateBriefStatus(selectedBrief.id, key)}
                          className={cn(
                            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                            selectedBrief.status === key
                              ? `${config.color} border-current`
                              : 'border-gray-200 text-gray-500 hover:border-gray-300'
                          )}
                        >
                          <span className={cn('w-2 h-2 rounded-full', selectedBrief.status === key ? config.dot : 'bg-gray-300')} />
                          {config.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Type & Date */}
                  <div className="space-y-3 mb-4">
                    {selectedBrief.content_type && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500 w-20">Type</span>
                        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', contentTypeConfig[selectedBrief.content_type]?.color)}>
                          {contentTypeConfig[selectedBrief.content_type]?.label}
                        </span>
                      </div>
                    )}
                    {selectedBrief.shoot_date && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500 w-20">Shoot</span>
                        <span className="text-gray-900 flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-gray-400" />
                          {format(new Date(selectedBrief.shoot_date + 'T12:00:00'), 'EEEE d MMMM yyyy', { locale: nl })}
                        </span>
                      </div>
                    )}
                    {selectedBrief.assigned_to && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500 w-20">Creator</span>
                        <span className="text-gray-900">{selectedBrief.assigned_to}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500 w-20">Studio</span>
                      <span className="text-gray-900">{selectedBrief.studio_name}</span>
                    </div>
                  </div>

                  {/* Description */}
                  {selectedBrief.description && (
                    <div className="mb-4">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Omschrijving</label>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-xl p-3">{selectedBrief.description}</p>
                    </div>
                  )}

                  {/* Notes */}
                  {selectedBrief.notes && (
                    <div className="mb-4">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Notities</label>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-xl p-3">{selectedBrief.notes}</p>
                    </div>
                  )}

                  {/* Shared with */}
                  {selectedBrief.shared_with && selectedBrief.shared_with.length > 0 && (
                    <div className="mb-4">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Gedeeld met</label>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedBrief.shared_with.map((name, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 text-xs text-gray-700">
                            <User className="h-3 w-3" />
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-3 border-t border-gray-100">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 rounded-lg"
                      onClick={() => copyShareLink(selectedBrief)}
                    >
                      {copiedLink ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Link2 className="h-3.5 w-3.5 mr-1.5" />}
                      {copiedLink ? 'Gekopieerd!' : 'Deel link'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      onClick={() => openEditBrief(selectedBrief)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => deleteBrief(selectedBrief.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </>
              ) : selectedStudio ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-gray-900 text-lg">{selectedStudio.company_name}</h2>
                    <button onClick={() => setSelectedStudio(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                      <X className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>

                  <div className="space-y-2 mb-5">
                    {selectedStudio.contact_name && (
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" /> {selectedStudio.contact_name}
                      </p>
                    )}
                    {selectedStudio.address && (
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" /> {selectedStudio.address}, {selectedStudio.city}
                      </p>
                    )}
                    {selectedStudio.phone && (
                      <a href={`tel:${selectedStudio.phone}`} className="text-sm text-gray-600 flex items-center gap-2 hover:text-gray-900">
                        <Phone className="h-4 w-4 text-gray-400" /> {selectedStudio.phone}
                      </a>
                    )}
                    {selectedStudio.email && (
                      <a href={`mailto:${selectedStudio.email}`} className="text-sm text-gray-600 flex items-center gap-2 hover:text-gray-900">
                        <Mail className="h-4 w-4 text-gray-400" /> {selectedStudio.email}
                      </a>
                    )}
                    {selectedStudio.website && (
                      <a href={selectedStudio.website.startsWith('http') ? selectedStudio.website : `https://${selectedStudio.website}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 flex items-center gap-2 hover:underline">
                        <Globe className="h-4 w-4" /> {selectedStudio.website.replace(/^https?:\/\//, '')}
                      </a>
                    )}
                    {selectedStudio.instagram && (
                      <a href={selectedStudio.instagram.startsWith('http') ? selectedStudio.instagram : `https://instagram.com/${selectedStudio.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-sm text-pink-600 flex items-center gap-2 hover:underline">
                        <Instagram className="h-4 w-4" /> {selectedStudio.instagram}
                      </a>
                    )}
                  </div>

                  {/* Studio briefs */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-700">Content Briefs</h3>
                      <Button size="sm" variant="outline" className="h-7 rounded-lg text-xs" onClick={() => openNewBrief(selectedStudio)}>
                        <Plus className="h-3 w-3 mr-1" /> Nieuw
                      </Button>
                    </div>
                    {getStudioBriefs(selectedStudio.id).length > 0 ? (
                      <div className="space-y-2">
                        {getStudioBriefs(selectedStudio.id).map(brief => {
                          const st = statusConfig[brief.status]
                          return (
                            <button
                              key={brief.id}
                              onClick={() => setSelectedBrief(brief)}
                              className="w-full flex items-center gap-2 p-2.5 rounded-xl border border-gray-100 hover:border-gray-200 text-left transition-all"
                            >
                              <span className={cn('w-2 h-2 rounded-full', st.dot)} />
                              <span className="text-sm text-gray-900 flex-1 truncate">{brief.title}</span>
                              <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', st.color)}>{st.label}</span>
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 italic">Nog geen briefs voor deze studio</p>
                    )}
                  </div>

                  <Button className="w-full rounded-xl" onClick={() => openNewBrief(selectedStudio)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Content Brief Aanmaken
                  </Button>
                </>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* Brief Modal */}
      {showBriefModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg m-4 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {editingBrief ? 'Brief bewerken' : 'Nieuwe Content Brief'}
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">{selectedStudio?.company_name}</p>
              </div>
              <button onClick={() => setShowBriefModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Titel *</label>
                <Input
                  value={briefTitle}
                  onChange={(e) => setBriefTitle(e.target.value)}
                  placeholder="bv. Instagram Reel — Studio Tour"
                  className="rounded-xl"
                />
              </div>

              {/* Content Type */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Type content</label>
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(contentTypeConfig) as [string, typeof contentTypeConfig['photo']][]).map(([key, config]) => {
                    const Icon = config.icon
                    return (
                      <button
                        key={key}
                        onClick={() => setBriefType(key as ContentBrief['content_type'])}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                          briefType === key
                            ? `${config.color} border-current`
                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {config.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Omschrijving</label>
                <textarea
                  value={briefDescription}
                  onChange={(e) => setBriefDescription(e.target.value)}
                  rows={4}
                  placeholder="Wat moet er gemaakt worden? Welke sfeer, stijl, boodschap?"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                />
              </div>

              {/* Shoot date */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Shoot datum</label>
                <Input
                  type="date"
                  value={briefShootDate}
                  onChange={(e) => setBriefShootDate(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              {/* Assigned to */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Content Creator</label>
                <Input
                  value={briefAssignedTo}
                  onChange={(e) => setBriefAssignedTo(e.target.value)}
                  placeholder="bv. Jay, Marvin, extern"
                  className="rounded-xl"
                />
              </div>

              {/* Shared with */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Delen met (komma-gescheiden)</label>
                <Input
                  value={briefSharedWith}
                  onChange={(e) => setBriefSharedWith(e.target.value)}
                  placeholder="bv. Jay, Rivaldo, Uriel"
                  className="rounded-xl"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Extra notities</label>
                <textarea
                  value={briefNotes}
                  onChange={(e) => setBriefNotes(e.target.value)}
                  rows={3}
                  placeholder="Locatie details, materiaal nodig, bijzonderheden..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 p-6 border-t border-gray-100">
              <Button variant="outline" onClick={() => setShowBriefModal(false)}>
                Annuleren
              </Button>
              <Button onClick={saveBrief} disabled={saving || !briefTitle.trim()}>
                {saving ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Opslaan...</>
                ) : (
                  <><Check className="h-4 w-4 mr-2" /> {editingBrief ? 'Bijwerken' : 'Aanmaken'}</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
