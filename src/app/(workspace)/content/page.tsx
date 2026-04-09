'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Camera,
  Video,
  Film,
  FileText,
  Plus,
  Search,
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
  Pencil,
  Trash2,
  User,
  Link2,
  Building2,
  Sparkles,
  Clapperboard,
  ListChecks,
  Package,
  ChevronDown,
  ChevronUp,
  Copy,
  Settings2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'

// ─── Types ───
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
}

interface ShotItem {
  shot: string
  description: string
  done: boolean
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
  shotlist: ShotItem[]
  equipment: string[]
  duration: string | null
  deliverables: string | null
  created_at: string
  updated_at: string
}

interface ContentTemplate {
  id: string
  name: string
  content_type: string
  description: string | null
  shotlist: ShotItem[]
  equipment: string[]
  duration: string | null
  deliverables: string | null
  notes: string | null
  created_by: string | null
  created_at: string
}

// ─── Config ───
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

// ─── Default Templates (used when DB is empty) ───
const defaultTemplates: Omit<ContentTemplate, 'id' | 'created_at'>[] = [
  {
    name: 'Studio Tour Reel',
    content_type: 'reel',
    description: 'Korte dynamische reel (30-60s) die de sfeer en ruimte van de studio laat zien. Doel: awareness + saves op Instagram.',
    shotlist: [
      { shot: 'Exterior establishing shot', description: 'Buiten → deur opent, stap naar binnen', done: false },
      { shot: 'Wide angle ruimte', description: 'Langzame gimbal pan van de hele studio', done: false },
      { shot: 'Detail shots (3x)', description: 'Apparatuur, texturen, lichtval op muur/vloer', done: false },
      { shot: 'POV walk-through', description: 'Steadicam vanuit first person door de ruimte', done: false },
      { shot: 'Hero shot', description: 'De mooiste hoek van de studio, goed belicht', done: false },
      { shot: 'Outro + CTA', description: 'Logo overlay + "Link in bio" of "Boek nu"', done: false },
    ],
    equipment: ['Camera (A7IV / BMPCC)', 'Gimbal (DJI RS3)', 'Wide-angle lens (16-35mm)', 'LED paneel / tube lights', 'Lav mic (voor voice-over)'],
    duration: '30-60 seconden',
    deliverables: '1x Reel (1080x1920, MP4)\n1x Behind the scenes story\nRuwe bestanden op Google Drive',
    notes: 'Film als de studio leeg is. Golden hour licht = bonus.\nMuziek: trending audio of royalty-free beat.\nEdit: snelle cuts, beat-synced transitions.',
    created_by: 'Rivaldo',
  },
  {
    name: 'Studio Fotoshoot',
    content_type: 'photo',
    description: 'Professionele fotoshoot voor website, socials en Google. Mix van wide shots, details en lifestyle.',
    shotlist: [
      { shot: 'Wide hero shot (3 hoeken)', description: 'Volledige studio vanuit 3 verschillende hoeken', done: false },
      { shot: 'Detail shots (5x)', description: 'Apparatuur close-ups, texturen, decoratie', done: false },
      { shot: 'Lifestyle shot', description: 'Iemand aan het werk in de studio (model of eigenaar)', done: false },
      { shot: 'Overhead / flat lay', description: 'Bovenaanzicht van setup of werkplek', done: false },
      { shot: 'Exterieur', description: 'Gevel, ingang, straat zichtbaar', done: false },
      { shot: 'Team / eigenaar portret', description: 'Casual portret, in de studio', done: false },
    ],
    equipment: ['Camera (full frame)', '24-70mm f/2.8', '85mm f/1.8 (portret)', 'Statief', '2x Softbox of LED paneel', 'Reflector'],
    duration: '2-3 uur op locatie',
    deliverables: '10-15 geëdite foto\'s (full-res + web)\n3x Instagram-ready crops (1080x1080)\n1x Google Business cover foto\nLightroom preset + ruwe bestanden',
    notes: 'Kleurprofiel: warm, clean, professioneel.\nGeen zware filters — moet er uitnodigend uitzien.\nOplevering binnen 5 werkdagen.',
    created_by: 'Rivaldo',
  },
  {
    name: 'Kennismakingsvideo',
    content_type: 'video',
    description: 'Interview-stijl video (1-2 min) met de eigenaar. Wie zijn ze, wat bieden ze, waarom lcntships.',
    shotlist: [
      { shot: 'A-cam interview', description: 'Medium close-up van de eigenaar, praat naar camera of interviewer', done: false },
      { shot: 'B-cam angle', description: 'Zij-aanzicht of over-the-shoulder voor cutaways', done: false },
      { shot: 'B-roll: werken in studio', description: 'Eigenaar doet iets in de studio (instellen, opruimen, werken)', done: false },
      { shot: 'B-roll: klant interactie', description: 'Handshake, rondleiding, of samen aan tafel', done: false },
      { shot: 'Close-up handen', description: 'Detail van werk (knoppen draaien, camera pakken, etc.)', done: false },
      { shot: 'Outro shot', description: 'Eigenaar loopt weg of zwaait, logo fade in', done: false },
    ],
    equipment: ['Camera (A7IV / BMPCC) x2', 'Lav mic (Rode Wireless GO)', 'Shotgun mic (backup)', '2x LED paneel', 'Statief x2', 'Monitor'],
    duration: '1-2 minuten (final cut)',
    deliverables: '1x YouTube/website video (1920x1080)\n1x Korte versie voor socials (60s)\n1x Audiogram / quote card\nSubtitles (SRT bestand)',
    notes: 'Interview vragen vooraf opsturen.\nGeluid is het belangrijkst — altijd levels checken.\nSubtitels verplicht (80% kijkt zonder geluid).',
    created_by: 'Rivaldo',
  },
  {
    name: 'Behind the Scenes',
    content_type: 'video',
    description: 'Authentieke BTS content van een echte sessie. Laat zien hoe het eraan toe gaat — raw en echt.',
    shotlist: [
      { shot: 'Aankomst / opbouw', description: 'Team arriveert, spullen uitladen, setup', done: false },
      { shot: 'De sessie zelf', description: 'Opnames lopen, artiest/klant aan het werk', done: false },
      { shot: 'Sfeer momenten', description: 'Lachen, concentratie, high-fives, koffie', done: false },
      { shot: 'Close-up equipment', description: 'Camera, microfoon, mixing desk in actie', done: false },
      { shot: 'Resultaat tease', description: 'Kort fragment van het eindresultaat op scherm/speaker', done: false },
    ],
    equipment: ['Camera (handheld OK)', 'Wide-angle lens', 'Lav mic of shotgun', 'Kleine LED (optioneel)'],
    duration: '60-90 seconden (reel) of 3-5 min (YouTube)',
    deliverables: '1x Reel (1080x1920)\n1x Langere versie (optioneel)\n3-5 BTS foto\'s\nRaw footage backup',
    notes: 'TOESTEMMING van klant/artiest verplicht!\nFilm discreet — niet in de weg zitten.\nRaw, authentiek gevoel > perfect geproduceerd.',
    created_by: 'Rivaldo',
  },
  {
    name: 'Social Media Content Pack',
    content_type: 'reel',
    description: 'Complete content pakket voor 2 weken Instagram. Feed posts, reels, en stories in één shoot.',
    shotlist: [
      { shot: 'Feed post 1: Hero studio shot', description: 'Mooiste hoek, goed belicht, clean', done: false },
      { shot: 'Feed post 2: Team/eigenaar', description: 'Casual portret of action shot', done: false },
      { shot: 'Feed post 3: Detail carrousel (5 slides)', description: '5 close-ups die samen een verhaal vertellen', done: false },
      { shot: 'Reel 1: Studio tour (30s)', description: 'Snelle gimbal walk-through', done: false },
      { shot: 'Reel 2: Day in the life (45s)', description: 'Eigenaar laat zijn dag zien', done: false },
      { shot: 'Stories (5x)', description: 'Mix van foto + video, polls, vragen, countdowns', done: false },
    ],
    equipment: ['Camera (full frame)', 'Gimbal', '24-70mm + 85mm', 'LED verlichting', 'Smartphone (backup + stories)', 'Ring light (optioneel)'],
    duration: 'Half dag (3-4 uur) op locatie',
    deliverables: '3x Feed posts (1080x1080 + 1080x1350)\n2x Reels (1080x1920)\n5x Stories (1080x1920)\nCaption suggesties + hashtags\nContent kalender (2 weken)',
    notes: 'Alles in lcntships brand style.\nCanva templates beschikbaar voor tekst overlays.\nPlan de shoot rond een druk moment voor authentieke content.',
    created_by: 'Rivaldo',
  },
  {
    name: 'Google Business Profiel',
    content_type: 'photo',
    description: 'Foto\'s specifiek voor Google Maps listing. Verhoogt zichtbaarheid en vertrouwen.',
    shotlist: [
      { shot: 'Cover foto', description: 'Beste wide shot van de studio (Google toont dit als eerste)', done: false },
      { shot: 'Interieur (3x)', description: '3 hoeken van binnen, helder en clean', done: false },
      { shot: 'Exterieur', description: 'Gevel + straatnaam zichtbaar', done: false },
      { shot: 'Team foto', description: 'Eigenaar of team, vriendelijk en professioneel', done: false },
    ],
    equipment: ['Camera of goede smartphone', 'Wide-angle lens', 'Natuurlijk licht (overdag)'],
    duration: '30-45 minuten',
    deliverables: '5-7 foto\'s (min. 720x720, liefst 2048px breed)\nGeoptimaliseerd voor Google (geen watermarks, geen collages)',
    notes: 'Google prefereert ECHTE foto\'s, geen stockfoto\'s.\nNatuurlijke belichting, geen zware edits.\nUpload direct naar Google Business via eigenaar account.',
    created_by: 'Rivaldo',
  },
]

// ─── Main Component ───
export default function ContentPage() {
  const [studios, setStudios] = useState<ClosedStudio[]>([])
  const [briefs, setBriefs] = useState<ContentBrief[]>([])
  const [templates, setTemplates] = useState<ContentTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStudio, setSelectedStudio] = useState<ClosedStudio | null>(null)
  const [showBriefModal, setShowBriefModal] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [editingBrief, setEditingBrief] = useState<ContentBrief | null>(null)
  const [selectedBrief, setSelectedBrief] = useState<ContentBrief | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'studios' | 'briefs' | 'templates'>('studios')

  // Brief form
  const [briefTitle, setBriefTitle] = useState('')
  const [briefType, setBriefType] = useState<ContentBrief['content_type']>('reel')
  const [briefDescription, setBriefDescription] = useState('')
  const [briefNotes, setBriefNotes] = useState('')
  const [briefShootDate, setBriefShootDate] = useState('')
  const [briefAssignedTo, setBriefAssignedTo] = useState('')
  const [briefSharedWith, setBriefSharedWith] = useState('')
  const [briefShotlist, setBriefShotlist] = useState<ShotItem[]>([])
  const [briefEquipment, setBriefEquipment] = useState<string[]>([])
  const [briefDuration, setBriefDuration] = useState('')
  const [briefDeliverables, setBriefDeliverables] = useState('')

  // Template form
  const [tplName, setTplName] = useState('')
  const [tplType, setTplType] = useState<string>('reel')
  const [tplDescription, setTplDescription] = useState('')
  const [tplShotlist, setTplShotlist] = useState<ShotItem[]>([])
  const [tplEquipment, setTplEquipment] = useState<string[]>([])
  const [tplDuration, setTplDuration] = useState('')
  const [tplDeliverables, setTplDeliverables] = useState('')
  const [tplNotes, setTplNotes] = useState('')
  const [editingTemplate, setEditingTemplate] = useState<ContentTemplate | null>(null)

  // ─── Data Loading ───
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const { data: closedLeads } = await supabase
        .from('sales_leads')
        .select('id, company_name, contact_name, email, phone, city, address, website, instagram, notes, updated_at')
        .eq('status', 'closed')
        .order('updated_at', { ascending: false })

      if (closedLeads) setStudios(closedLeads as unknown as ClosedStudio[])

      const { data: briefData } = await supabase
        .from('content_briefs' as never).select('*').order('created_at' as never, { ascending: false })
      if (briefData) setBriefs(briefData as unknown as ContentBrief[])

      const { data: tplData } = await supabase
        .from('content_templates' as never).select('*').order('created_at' as never, { ascending: false })
      if (tplData && (tplData as unknown[]).length > 0) {
        setTemplates(tplData as unknown as ContentTemplate[])
      } else {
        // Seed default templates
        const { data: seeded } = await supabase
          .from('content_templates' as never)
          .insert(defaultTemplates as never)
          .select('*')
        if (seeded) setTemplates(seeded as unknown as ContentTemplate[])
      }
    } catch (err) {
      console.error('Failed to load:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // ─── Helpers ───
  const filteredStudios = studios.filter(s =>
    !searchQuery || s.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.city || '').toLowerCase().includes(searchQuery.toLowerCase())
  )
  const getStudioBriefs = (id: string) => briefs.filter(b => b.lead_id === id)

  // ─── Brief Actions ───
  const openNewBrief = (studio: ClosedStudio, tpl?: ContentTemplate) => {
    setEditingBrief(null)
    setSelectedStudio(studio)
    if (tpl) {
      setBriefTitle(tpl.name)
      setBriefType(tpl.content_type as ContentBrief['content_type'])
      setBriefDescription(tpl.description || '')
      setBriefShotlist(tpl.shotlist?.map(s => ({ ...s, done: false })) || [])
      setBriefEquipment(tpl.equipment || [])
      setBriefDuration(tpl.duration || '')
      setBriefDeliverables(tpl.deliverables || '')
      setBriefNotes(tpl.notes || '')
    } else {
      setBriefTitle(''); setBriefType('reel'); setBriefDescription('')
      setBriefShotlist([]); setBriefEquipment([]); setBriefDuration('')
      setBriefDeliverables(''); setBriefNotes('')
    }
    setBriefShootDate(''); setBriefAssignedTo(''); setBriefSharedWith('')
    setShowBriefModal(true)
  }

  const openEditBrief = (brief: ContentBrief) => {
    setEditingBrief(brief)
    setSelectedStudio(studios.find(s => s.id === brief.lead_id) || null)
    setBriefTitle(brief.title || '')
    setBriefType(brief.content_type)
    setBriefDescription(brief.description || '')
    setBriefShotlist(brief.shotlist || [])
    setBriefEquipment(brief.equipment || [])
    setBriefDuration(brief.duration || '')
    setBriefDeliverables(brief.deliverables || '')
    setBriefNotes(brief.notes || '')
    setBriefShootDate(brief.shoot_date || '')
    setBriefAssignedTo(brief.assigned_to || '')
    setBriefSharedWith((brief.shared_with || []).join(', '))
    setShowBriefModal(true)
  }

  const saveBrief = async () => {
    if (!selectedStudio || !briefTitle.trim()) return
    setSaving(true)
    try {
      const data = {
        lead_id: selectedStudio.id, studio_name: selectedStudio.company_name,
        title: briefTitle.trim(), content_type: briefType,
        description: briefDescription.trim() || null, notes: briefNotes.trim() || null,
        shoot_date: briefShootDate || null, assigned_to: briefAssignedTo.trim() || null,
        shared_with: briefSharedWith.trim() ? briefSharedWith.split(',').map(s => s.trim()) : null,
        shotlist: briefShotlist, equipment: briefEquipment,
        duration: briefDuration.trim() || null, deliverables: briefDeliverables.trim() || null,
        updated_at: new Date().toISOString(),
      }
      if (editingBrief) {
        await supabase.from('content_briefs' as never).update(data as never).eq('id' as never, editingBrief.id as never)
      } else {
        await supabase.from('content_briefs' as never).insert({ ...data, status: 'draft' } as never)
      }
      await loadData()
      setShowBriefModal(false)
    } finally { setSaving(false) }
  }

  const updateBriefStatus = async (id: string, status: ContentBrief['status']) => {
    await supabase.from('content_briefs' as never).update({ status, updated_at: new Date().toISOString() } as never).eq('id' as never, id as never)
    await loadData()
    if (selectedBrief?.id === id) setSelectedBrief(prev => prev ? { ...prev, status } : null)
  }

  const deleteBrief = async (id: string) => {
    if (!confirm('Brief verwijderen?')) return
    await supabase.from('content_briefs' as never).delete().eq('id' as never, id as never)
    await loadData()
    if (selectedBrief?.id === id) setSelectedBrief(null)
  }

  const toggleShotDone = async (briefId: string, shotIndex: number) => {
    const brief = briefs.find(b => b.id === briefId)
    if (!brief) return
    const updated = [...(brief.shotlist || [])]
    updated[shotIndex] = { ...updated[shotIndex], done: !updated[shotIndex].done }
    await supabase.from('content_briefs' as never).update({ shotlist: updated } as never).eq('id' as never, briefId as never)
    setBriefs(prev => prev.map(b => b.id === briefId ? { ...b, shotlist: updated } : b))
    if (selectedBrief?.id === briefId) setSelectedBrief(prev => prev ? { ...prev, shotlist: updated } : null)
  }

  const copyShareLink = (brief: ContentBrief) => {
    navigator.clipboard.writeText(`${window.location.origin}/content/brief/${brief.share_link}`)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  // ─── Template Actions ───
  const openNewTemplate = () => {
    setEditingTemplate(null)
    setTplName(''); setTplType('reel'); setTplDescription('')
    setTplShotlist([{ shot: '', description: '', done: false }])
    setTplEquipment(['']); setTplDuration(''); setTplDeliverables(''); setTplNotes('')
    setShowTemplateModal(true)
  }

  const openEditTemplate = (tpl: ContentTemplate) => {
    setEditingTemplate(tpl)
    setTplName(tpl.name); setTplType(tpl.content_type); setTplDescription(tpl.description || '')
    setTplShotlist(tpl.shotlist?.length ? tpl.shotlist : [{ shot: '', description: '', done: false }])
    setTplEquipment(tpl.equipment?.length ? tpl.equipment : [''])
    setTplDuration(tpl.duration || ''); setTplDeliverables(tpl.deliverables || ''); setTplNotes(tpl.notes || '')
    setShowTemplateModal(true)
  }

  const saveTemplate = async () => {
    if (!tplName.trim()) return
    setSaving(true)
    try {
      const data = {
        name: tplName.trim(), content_type: tplType, description: tplDescription.trim() || null,
        shotlist: tplShotlist.filter(s => s.shot.trim()), equipment: tplEquipment.filter(e => e.trim()),
        duration: tplDuration.trim() || null, deliverables: tplDeliverables.trim() || null,
        notes: tplNotes.trim() || null, created_by: 'Rivaldo',
      }
      if (editingTemplate) {
        await supabase.from('content_templates' as never).update(data as never).eq('id' as never, editingTemplate.id as never)
      } else {
        await supabase.from('content_templates' as never).insert(data as never)
      }
      await loadData()
      setShowTemplateModal(false)
    } finally { setSaving(false) }
  }

  const deleteTemplate = async (id: string) => {
    if (!confirm('Template verwijderen?')) return
    await supabase.from('content_templates' as never).delete().eq('id' as never, id as never)
    await loadData()
  }

  // Stats
  const draftCount = briefs.filter(b => b.status === 'draft').length
  const activeCount = briefs.filter(b => ['ready', 'shared', 'in_progress'].includes(b.status)).length
  const doneCount = briefs.filter(b => b.status === 'done').length

  // ─── Render ───
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Content</h1>
        <p className="text-sm text-gray-500 mt-1">Productieplanning voor geclosede studios</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Building2, bg: 'bg-gray-100', color: 'text-gray-600', value: studios.length, label: 'Studios' },
          { icon: FileText, bg: 'bg-blue-100', color: 'text-blue-600', value: briefs.length, label: 'Briefs' },
          { icon: Clock, bg: 'bg-amber-100', color: 'text-amber-600', value: draftCount + activeCount, label: 'In voorbereiding' },
          { icon: Check, bg: 'bg-emerald-100', color: 'text-emerald-600', value: doneCount, label: 'Afgerond' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', s.bg)}>
                <s.icon className={cn('h-5 w-5', s.color)} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex bg-gray-100 rounded-xl p-1">
          {(['studios', 'briefs', 'templates'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize',
                activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {tab === 'studios' ? `Studios (${studios.length})` : tab === 'briefs' ? `Briefs (${briefs.length})` : `Templates (${templates.length})`}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Zoek..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 rounded-xl" />
        </div>
        {activeTab === 'templates' && (
          <Button onClick={openNewTemplate} className="rounded-xl">
            <Plus className="h-4 w-4 mr-2" /> Nieuwe Template
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="flex gap-6">
          {/* Main */}
          <div className="flex-1 min-w-0">

            {/* ── Studios Tab ── */}
            {activeTab === 'studios' && (
              filteredStudios.length === 0 ? (
                <Empty icon={Building2} title="Geen geclosede studios" sub='Studios met status "closed" verschijnen hier' />
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredStudios.map(studio => {
                    const sb = getStudioBriefs(studio.id)
                    return (
                      <div key={studio.id} onClick={() => { setSelectedStudio(studio); setSelectedBrief(null) }}
                        className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-gray-200 transition-all cursor-pointer group">
                        <div className="flex items-start justify-between mb-3">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">{studio.company_name}</h3>
                            {studio.city && <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5"><MapPin className="h-3.5 w-3.5" />{studio.city}</p>}
                          </div>
                          <Button size="sm" variant="outline" className="opacity-0 group-hover:opacity-100 rounded-lg h-8"
                            onClick={(e) => { e.stopPropagation(); openNewBrief(studio) }}>
                            <Plus className="h-3.5 w-3.5 mr-1" />Brief
                          </Button>
                        </div>
                        <div className="space-y-1 mb-3 text-sm text-gray-600">
                          {studio.contact_name && <p className="flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-gray-400" />{studio.contact_name}</p>}
                          {studio.website && (
                            <a href={studio.website.startsWith('http') ? studio.website : `https://${studio.website}`} target="_blank" rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()} className="text-blue-600 flex items-center gap-1.5 hover:underline truncate">
                              <Globe className="h-3.5 w-3.5" />{studio.website.replace(/^https?:\/\//, '')}
                            </a>
                          )}
                        </div>
                        {sb.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {sb.map(b => {
                              const st = statusConfig[b.status]
                              return <span key={b.id} className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium', st.color)}
                                onClick={e => { e.stopPropagation(); setSelectedBrief(b) }}>
                                <span className={cn('w-1.5 h-1.5 rounded-full', st.dot)} />{b.title}
                              </span>
                            })}
                          </div>
                        ) : <p className="text-xs text-gray-400 italic">Geen briefs</p>}
                      </div>
                    )
                  })}
                </div>
              )
            )}

            {/* ── Briefs Tab ── */}
            {activeTab === 'briefs' && (
              briefs.length === 0 ? (
                <Empty icon={FileText} title="Nog geen briefs" sub="Selecteer een studio en maak een brief" />
              ) : (
                <div className="space-y-3">
                  {briefs.map(brief => {
                    const st = statusConfig[brief.status]
                    const ct = brief.content_type ? contentTypeConfig[brief.content_type] : null
                    const CtIcon = ct?.icon || FileText
                    const shotsDone = (brief.shotlist || []).filter(s => s.done).length
                    const shotsTotal = (brief.shotlist || []).length
                    return (
                      <div key={brief.id} onClick={() => setSelectedBrief(brief)}
                        className={cn('bg-white rounded-2xl border border-gray-100 p-4 hover:border-gray-200 cursor-pointer transition-all',
                          selectedBrief?.id === brief.id && 'border-gray-900')}>
                        <div className="flex items-center gap-3">
                          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', ct?.color || 'bg-gray-100')}>
                            <CtIcon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-900 truncate">{brief.title}</h3>
                              <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium', st.color)}>
                                <span className={cn('w-1.5 h-1.5 rounded-full', st.dot)} />{st.label}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 flex items-center gap-2">
                              {brief.studio_name}
                              {shotsTotal > 0 && <span className="text-xs">({shotsDone}/{shotsTotal} shots)</span>}
                              {brief.shoot_date && <span>— {format(new Date(brief.shoot_date + 'T12:00:00'), 'd MMM', { locale: nl })}</span>}
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

            {/* ── Templates Tab ── */}
            {activeTab === 'templates' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {templates.map(tpl => {
                  const ct = contentTypeConfig[tpl.content_type as keyof typeof contentTypeConfig]
                  const Icon = ct?.icon || FileText
                  return (
                    <div key={tpl.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-gray-200 transition-all group">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', ct?.color || 'bg-gray-100')}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{tpl.name}</h3>
                            <p className="text-xs text-gray-500">{ct?.label} — {tpl.duration || 'Geen duur'}</p>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEditTemplate(tpl)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                            <Pencil className="h-3.5 w-3.5 text-gray-500" />
                          </button>
                          <button onClick={() => deleteTemplate(tpl.id)} className="p-1.5 hover:bg-red-50 rounded-lg">
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">{tpl.description}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><ListChecks className="h-3.5 w-3.5" />{tpl.shotlist?.length || 0} shots</span>
                        <span className="flex items-center gap-1"><Package className="h-3.5 w-3.5" />{tpl.equipment?.length || 0} items</span>
                      </div>
                      {/* Use template for a studio */}
                      {studios.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">Gebruik voor</p>
                          <div className="flex flex-wrap gap-1.5">
                            {studios.map(s => (
                              <button key={s.id} onClick={() => openNewBrief(s, tpl)}
                                className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-600 hover:border-gray-900 hover:text-gray-900 transition-colors">
                                {s.company_name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Detail Panel ── */}
          {selectedBrief && (
            <div className="w-[400px] flex-shrink-0 bg-white rounded-2xl border border-gray-100 p-6 h-fit sticky top-6 max-h-[calc(100vh-120px)] overflow-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900 text-lg">{selectedBrief.title}</h2>
                <button onClick={() => setSelectedBrief(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>

              {/* Status */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {(Object.entries(statusConfig) as [ContentBrief['status'], typeof statusConfig['draft']][]).map(([key, cfg]) => (
                  <button key={key} onClick={() => updateBriefStatus(selectedBrief.id, key)}
                    className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                      selectedBrief.status === key ? `${cfg.color} border-current` : 'border-gray-200 text-gray-500 hover:border-gray-300')}>
                    <span className={cn('w-2 h-2 rounded-full', selectedBrief.status === key ? cfg.dot : 'bg-gray-300')} />{cfg.label}
                  </button>
                ))}
              </div>

              {/* Info */}
              <div className="space-y-2 mb-4 text-sm">
                {selectedBrief.content_type && (
                  <div className="flex gap-2"><span className="text-gray-500 w-20">Type</span>
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', contentTypeConfig[selectedBrief.content_type]?.color)}>
                      {contentTypeConfig[selectedBrief.content_type]?.label}
                    </span>
                  </div>
                )}
                <div className="flex gap-2"><span className="text-gray-500 w-20">Studio</span><span className="text-gray-900">{selectedBrief.studio_name}</span></div>
                {selectedBrief.shoot_date && <div className="flex gap-2"><span className="text-gray-500 w-20">Shoot</span>
                  <span className="text-gray-900">{format(new Date(selectedBrief.shoot_date + 'T12:00:00'), 'EEEE d MMMM yyyy', { locale: nl })}</span></div>}
                {selectedBrief.assigned_to && <div className="flex gap-2"><span className="text-gray-500 w-20">Creator</span><span className="text-gray-900">{selectedBrief.assigned_to}</span></div>}
                {selectedBrief.duration && <div className="flex gap-2"><span className="text-gray-500 w-20">Duur</span><span className="text-gray-900">{selectedBrief.duration}</span></div>}
              </div>

              {/* Description */}
              {selectedBrief.description && (
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Omschrijving</label>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-xl p-3">{selectedBrief.description}</p>
                </div>
              )}

              {/* Shotlist */}
              {selectedBrief.shotlist && selectedBrief.shotlist.length > 0 && (
                <div className="mb-4">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-2">
                    <Clapperboard className="h-3.5 w-3.5" /> Shotlist ({selectedBrief.shotlist.filter(s => s.done).length}/{selectedBrief.shotlist.length})
                  </label>
                  <div className="space-y-1.5">
                    {selectedBrief.shotlist.map((shot, i) => (
                      <button key={i} onClick={() => toggleShotDone(selectedBrief.id, i)}
                        className={cn('w-full flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all text-sm',
                          shot.done ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-100 hover:border-gray-200')}>
                        <div className={cn('w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all',
                          shot.done ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300')}>
                          {shot.done && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <div className="min-w-0">
                          <p className={cn('font-medium', shot.done ? 'text-emerald-700 line-through' : 'text-gray-900')}>{shot.shot}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{shot.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Equipment */}
              {selectedBrief.equipment && selectedBrief.equipment.length > 0 && (
                <div className="mb-4">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-2">
                    <Package className="h-3.5 w-3.5" /> Apparatuur
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedBrief.equipment.map((item, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg bg-gray-100 text-xs text-gray-700">{item}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Deliverables */}
              {selectedBrief.deliverables && (
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Deliverables</label>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-xl p-3">{selectedBrief.deliverables}</p>
                </div>
              )}

              {/* Notes */}
              {selectedBrief.notes && (
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Notities</label>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-xl p-3">{selectedBrief.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <Button variant="outline" size="sm" className="flex-1 rounded-lg" onClick={() => copyShareLink(selectedBrief)}>
                  {copiedLink ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Link2 className="h-3.5 w-3.5 mr-1.5" />}
                  {copiedLink ? 'Gekopieerd!' : 'Deel link'}
                </Button>
                <Button variant="outline" size="sm" className="rounded-lg" onClick={() => openEditBrief(selectedBrief)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="sm" className="rounded-lg text-red-600 hover:bg-red-50" onClick={() => deleteBrief(selectedBrief.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Brief Modal ── */}
      {showBriefModal && (
        <Modal title={editingBrief ? 'Brief bewerken' : 'Nieuwe Content Brief'} subtitle={selectedStudio?.company_name}
          onClose={() => setShowBriefModal(false)} onSave={saveBrief} saving={saving} disabled={!briefTitle.trim()}>

          {/* Template picker */}
          {!editingBrief && templates.length > 0 && (
            <Field label="Template">
              <div className="flex flex-wrap gap-2">
                {templates.map(tpl => {
                  const ct = contentTypeConfig[tpl.content_type as keyof typeof contentTypeConfig]
                  const Icon = ct?.icon || FileText
                  return (
                    <button key={tpl.id} onClick={() => {
                      setBriefTitle(tpl.name); setBriefType(tpl.content_type as ContentBrief['content_type'])
                      setBriefDescription(tpl.description || ''); setBriefShotlist(tpl.shotlist?.map(s => ({ ...s, done: false })) || [])
                      setBriefEquipment(tpl.equipment || []); setBriefDuration(tpl.duration || '')
                      setBriefDeliverables(tpl.deliverables || ''); setBriefNotes(tpl.notes || '')
                    }} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                      briefTitle === tpl.name ? `${ct?.color} border-current` : 'border-gray-200 text-gray-600 hover:border-gray-300')}>
                      <Icon className="h-3.5 w-3.5" />{tpl.name}
                    </button>
                  )
                })}
              </div>
            </Field>
          )}

          <Field label="Titel *">
            <Input value={briefTitle} onChange={e => setBriefTitle(e.target.value)} placeholder="bv. Studio Tour Reel" className="rounded-xl" />
          </Field>

          <Field label="Type">
            <div className="flex flex-wrap gap-2">
              {(Object.entries(contentTypeConfig) as [string, typeof contentTypeConfig['photo']][]).map(([key, cfg]) => {
                const Icon = cfg.icon
                return <button key={key} onClick={() => setBriefType(key as ContentBrief['content_type'])}
                  className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                    briefType === key ? `${cfg.color} border-current` : 'border-gray-200 text-gray-500')}>
                  <Icon className="h-3.5 w-3.5" />{cfg.label}
                </button>
              })}
            </div>
          </Field>

          <Field label="Omschrijving">
            <textarea value={briefDescription} onChange={e => setBriefDescription(e.target.value)} rows={3}
              placeholder="Wat moet er gemaakt worden?" className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none" />
          </Field>

          {/* Shotlist */}
          <Field label={`Shotlist (${briefShotlist.length} shots)`}>
            <div className="space-y-2">
              {briefShotlist.map((shot, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={shot.shot} placeholder="Shot naam" className="rounded-xl flex-1"
                    onChange={e => { const u = [...briefShotlist]; u[i] = { ...u[i], shot: e.target.value }; setBriefShotlist(u) }} />
                  <Input value={shot.description} placeholder="Beschrijving" className="rounded-xl flex-1"
                    onChange={e => { const u = [...briefShotlist]; u[i] = { ...u[i], description: e.target.value }; setBriefShotlist(u) }} />
                  <button onClick={() => setBriefShotlist(briefShotlist.filter((_, j) => j !== i))} className="p-2 hover:bg-red-50 rounded-lg text-red-500">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button onClick={() => setBriefShotlist([...briefShotlist, { shot: '', description: '', done: false }])}
                className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1">
                <Plus className="h-3.5 w-3.5" /> Shot toevoegen
              </button>
            </div>
          </Field>

          {/* Equipment */}
          <Field label={`Apparatuur (${briefEquipment.length})`}>
            <div className="space-y-2">
              {briefEquipment.map((item, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={item} placeholder="bv. Camera (A7IV)" className="rounded-xl flex-1"
                    onChange={e => { const u = [...briefEquipment]; u[i] = e.target.value; setBriefEquipment(u) }} />
                  <button onClick={() => setBriefEquipment(briefEquipment.filter((_, j) => j !== i))} className="p-2 hover:bg-red-50 rounded-lg text-red-500">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button onClick={() => setBriefEquipment([...briefEquipment, ''])}
                className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1">
                <Plus className="h-3.5 w-3.5" /> Item toevoegen
              </button>
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Duur / Lengte">
              <Input value={briefDuration} onChange={e => setBriefDuration(e.target.value)} placeholder="bv. 30-60 seconden" className="rounded-xl" />
            </Field>
            <Field label="Shoot datum">
              <Input type="date" value={briefShootDate} onChange={e => setBriefShootDate(e.target.value)} className="rounded-xl" />
            </Field>
          </div>

          <Field label="Deliverables">
            <textarea value={briefDeliverables} onChange={e => setBriefDeliverables(e.target.value)} rows={3}
              placeholder="Wat lever je op? (formaten, aantallen)" className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Creator">
              <Input value={briefAssignedTo} onChange={e => setBriefAssignedTo(e.target.value)} placeholder="bv. Jay, Marvin" className="rounded-xl" />
            </Field>
            <Field label="Delen met">
              <Input value={briefSharedWith} onChange={e => setBriefSharedWith(e.target.value)} placeholder="bv. Jay, Uriel" className="rounded-xl" />
            </Field>
          </div>

          <Field label="Notities">
            <textarea value={briefNotes} onChange={e => setBriefNotes(e.target.value)} rows={3}
              placeholder="Extra info, tips, bijzonderheden..." className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none" />
          </Field>
        </Modal>
      )}

      {/* ── Template Modal ── */}
      {showTemplateModal && (
        <Modal title={editingTemplate ? 'Template bewerken' : 'Nieuwe Template'} onClose={() => setShowTemplateModal(false)}
          onSave={saveTemplate} saving={saving} disabled={!tplName.trim()}>
          <Field label="Naam *">
            <Input value={tplName} onChange={e => setTplName(e.target.value)} placeholder="bv. Behind the Scenes Reel" className="rounded-xl" />
          </Field>
          <Field label="Type">
            <div className="flex flex-wrap gap-2">
              {(Object.entries(contentTypeConfig) as [string, typeof contentTypeConfig['photo']][]).map(([key, cfg]) => {
                const Icon = cfg.icon
                return <button key={key} onClick={() => setTplType(key)}
                  className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                    tplType === key ? `${cfg.color} border-current` : 'border-gray-200 text-gray-500')}>
                  <Icon className="h-3.5 w-3.5" />{cfg.label}
                </button>
              })}
            </div>
          </Field>
          <Field label="Omschrijving">
            <textarea value={tplDescription} onChange={e => setTplDescription(e.target.value)} rows={3}
              placeholder="Wat is het doel van deze content?" className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none" />
          </Field>
          <Field label={`Shotlist (${tplShotlist.length})`}>
            <div className="space-y-2">
              {tplShotlist.map((shot, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={shot.shot} placeholder="Shot" className="rounded-xl flex-1"
                    onChange={e => { const u = [...tplShotlist]; u[i] = { ...u[i], shot: e.target.value }; setTplShotlist(u) }} />
                  <Input value={shot.description} placeholder="Beschrijving" className="rounded-xl flex-1"
                    onChange={e => { const u = [...tplShotlist]; u[i] = { ...u[i], description: e.target.value }; setTplShotlist(u) }} />
                  <button onClick={() => setTplShotlist(tplShotlist.filter((_, j) => j !== i))} className="p-2 hover:bg-red-50 rounded-lg text-red-500">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button onClick={() => setTplShotlist([...tplShotlist, { shot: '', description: '', done: false }])}
                className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1"><Plus className="h-3.5 w-3.5" /> Shot</button>
            </div>
          </Field>
          <Field label={`Apparatuur (${tplEquipment.length})`}>
            <div className="space-y-2">
              {tplEquipment.map((item, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={item} placeholder="bv. Gimbal" className="rounded-xl flex-1"
                    onChange={e => { const u = [...tplEquipment]; u[i] = e.target.value; setTplEquipment(u) }} />
                  <button onClick={() => setTplEquipment(tplEquipment.filter((_, j) => j !== i))} className="p-2 hover:bg-red-50 rounded-lg text-red-500">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button onClick={() => setTplEquipment([...tplEquipment, ''])}
                className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1"><Plus className="h-3.5 w-3.5" /> Item</button>
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Duur">
              <Input value={tplDuration} onChange={e => setTplDuration(e.target.value)} placeholder="bv. 30-60s" className="rounded-xl" />
            </Field>
            <Field label="Deliverables">
              <textarea value={tplDeliverables} onChange={e => setTplDeliverables(e.target.value)} rows={2}
                placeholder="Wat lever je op?" className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none" />
            </Field>
          </div>
          <Field label="Notities">
            <textarea value={tplNotes} onChange={e => setTplNotes(e.target.value)} rows={3}
              placeholder="Tips, do's & don'ts..." className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none" />
          </Field>
        </Modal>
      )}
    </div>
  )
}

// ─── Shared Components ───
function Empty({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub: string }) {
  return (
    <div className="text-center py-20">
      <Icon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500 font-medium">{title}</p>
      <p className="text-sm text-gray-400 mt-1">{sub}</p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>{children}</div>
}

function Modal({ title, subtitle, children, onClose, onSave, saving, disabled }: {
  title: string; subtitle?: string; children: React.ReactNode
  onClose: () => void; onSave: () => void; saving: boolean; disabled: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl m-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
            {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-6 space-y-4 overflow-auto flex-1">{children}</div>
        <div className="flex justify-end gap-2 p-6 border-t border-gray-100">
          <Button variant="outline" onClick={onClose}>Annuleren</Button>
          <Button onClick={onSave} disabled={saving || disabled}>
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Opslaan...</> : <><Check className="h-4 w-4 mr-2" />Opslaan</>}
          </Button>
        </div>
      </div>
    </div>
  )
}
