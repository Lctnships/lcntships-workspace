'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, GripVertical, X, Plus, FileDown } from 'lucide-react'
import { workspaceClient } from '@/lib/workspace-client'

// ─── Types ────────────────────────────────────────────────────────────────────
type ShotItem = { shot: string; description: string; done: boolean }

type ContentBrief = {
  id: string
  lead_id: string | null
  production_id: string | null
  studio_name: string | null
  status: 'draft' | 'ready' | 'shared' | 'in_progress' | 'done'
  content_type: 'photo' | 'video' | 'reel' | 'story' | 'blog' | 'other' | null
  title: string | null
  description: string | null
  notes: string | null
  shoot_date: string | null
  shotlist: ShotItem[]
  equipment: string[]
  duration: string | null
  deliverables: string | null
  call_time: string | null
  end_time: string | null
  contact_person: string | null
  contact_phone: string | null
}

type Production = {
  id: string
  title: string
  description: string | null
  location: string | null
  final_date: string | null
  lead_id: string | null
}

// ─── Templates ────────────────────────────────────────────────────────────────
// Identiek aan de defaultTemplates uit /content (single source of truth).
const TEMPLATES: Record<string, {
  name: string; type: string; duration: string; desc: string
  shots: { t: string; d: string }[]
  equip: string[]; deliv: string[]; notes: string
}> = {
  'do-we-ship': {
    name: 'Do We Ship', type: 'video', duration: '45–90 seconden (TikTok / Reels)',
    desc: 'TikTok series waarin een host de studio presenteert en de kijkers laat beslissen. Energiek, snel, interactief. Eindigt altijd met: "Do we ship? Laat het ons weten in de comments!"',
    shots: [
      { t: 'Hook / intro (3s)', d: 'Host kijkt in camera: "Yo, we zijn bij [studio naam]... do we ship?" — direct energie' },
      { t: 'Eerste indruk buiten', d: 'Host loopt naar de ingang, reageert op de gevel/omgeving. Eerlijk eerste reactie.' },
      { t: 'Walk-in reveal', d: 'Deur open → host stapt binnen → reactie op de ruimte. Cut op het moment van de reveal.' },
      { t: 'Studio tour met host', d: 'Host loopt door de studio, wijst dingen aan, geeft commentary. Houd het snel en entertaining.' },
      { t: 'Highlight moment', d: 'Het beste / meest unieke ding in de studio. Host licht het uit: "Oke DIT is hard."' },
      { t: 'Equipment / faciliteiten check', d: 'Snelle cuts van wat er beschikbaar is. Host geeft score of reactie per item.' },
      { t: 'Vibe check', d: 'Host zit/staat in de studio, voelt de sfeer. "De vibe hier is..."' },
      { t: 'Outro — Do We Ship?', d: 'Host kijkt in camera: "Dus... do we ship [studio naam]? Laat het weten in de comments!" Eindig met lcntships logo.' },
    ],
    equip: ['Camera (A7IV of smartphone met goede kwaliteit)', 'Gimbal (DJI RS3 / OM)', 'Lav mic (Rode Wireless GO)', 'Wide-angle lens', 'LED paneel (1x compact)', 'Smartphone voor B-roll'],
    deliv: ['1x TikTok/Reel (1080x1920, MP4)', '1x Langere versie voor YouTube Shorts (optioneel)', 'Raw footage backup op Drive', 'Thumbnail frame'],
    notes: 'De host MOET energie hebben — dit is entertainment, geen corporate video.\nSnelle cuts, geen dode momenten. Elke 2-3 seconden een nieuw shot.\nTrending audio gebruiken of eigen voice-over.\nEindig ALTIJD met "Do we ship?" + CTA naar comments.\nPost op TikTok + Instagram Reels + YouTube Shorts.',
  },
  '3d-studio-tour': {
    name: '3D Studio Tour', type: 'video', duration: '1-2 uur op locatie + 2-3 uur post-processing',
    desc: 'Professionele 360-graden virtuele tour van de studio. Klanten kunnen de ruimte verkennen alsof ze er zijn. Voor de website en Google Maps.',
    shots: [
      { t: 'Entrance / lobby scan', d: 'Start bij de ingang, 360 capture van de eerste ruimte die je ziet' },
      { t: 'Main studio room', d: 'Centrale scan van de hoofdruimte — camera op statief, midden in de kamer' },
      { t: 'Tweede hoek main room', d: 'Tweede scanpositie in dezelfde ruimte voor volledige coverage' },
      { t: 'Control room / booth', d: 'Als er een aparte ruimte is (regiekamer, vocal booth, etc.)' },
      { t: 'Lounge / wachtruimte', d: 'Scan van chill area, keuken, of wachtruimte als die er is' },
      { t: 'Detail anchors (3-5x)', d: 'Hotspot foto\'s van specifieke items: mixing desk, camera setup, decor' },
    ],
    equip: ['360 camera (Insta360 X3 / Ricoh Theta Z1)', 'Statief (met 360 mount)', 'Matterport camera (optioneel, voor premium kwaliteit)', 'Tablet voor real-time preview', 'Verlichting (alle lichten in de studio AAN)'],
    deliv: ['1x Interactieve 3D tour (Matterport / Kuula embed)', '1x Shareable link voor website', '1x Google Maps Street View upload', 'Floor plan (optioneel)', "5x Hotspot detail foto's"],
    notes: 'Studio MOET 100% opgeruimd zijn — alles is zichtbaar in 360.\nAlle lichten aan, geen donkere hoeken.\nGeen mensen in beeld tijdens de scan.\nNa upload: embed op de studio pagina van lcntships.com.\nGoogle Maps integratie verhoogt SEO ranking.',
  },
  'studio-fotos': {
    name: "Professionele Studio Foto's", type: 'photo', duration: '1.5-2 uur op locatie',
    desc: "Set van 6-8 high-quality foto's van de studio. Worden gebruikt voor de website, socials, en het lcntships platform.",
    shots: [
      { t: 'Wide hero shot #1', d: 'De mooiste hoek van de studio, alles in beeld. DIT is de hoofdfoto.' },
      { t: 'Wide hero shot #2', d: 'Tweede hoek van de studio, andere kant. Laat de diepte zien.' },
      { t: 'Equipment close-up', d: 'De belangrijkste apparatuur in de studio, scherp en goed belicht' },
      { t: 'Detail / textuur shot', d: 'Iets unieks: muur, vloer, neon sign, artwork, akoestische panelen' },
      { t: 'Sfeer / moody shot', d: 'Studio met creatieve belichting — laat de vibe voelen' },
      { t: 'Lifestyle shot', d: 'Iemand aan het werk in de studio. Niet geposeerd, voelt natuurlijk.' },
      { t: 'Exterieur / gevel', d: 'De buitenkant van het pand. Herkenbaar voor bezoekers.' },
      { t: 'Eigenaar portret', d: 'Clean portret van de eigenaar IN de studio. Casual, zelfverzekerd.' },
    ],
    equip: ['Camera (full frame — A7IV, R6, etc.)', '24-70mm f/2.8 (main lens)', '35mm of 50mm f/1.4 (portret + detail)', 'Statief', '2x LED paneel of softbox', 'Reflector'],
    deliv: ["6-8 geëdite foto's (full-res TIFF + web JPG)", "Alle foto's in 2 crops: landscape (16:9) + square (1:1)", '1x lcntships platform hero image (1920x1080)', 'Lightroom preset voor consistentie', 'Raw bestanden op Google Drive'],
    notes: 'Kleurstijl: warm, professioneel, uitnodigend. Geen koude/blauwe tint.\nStudio moet opgeruimd zijn — check vooraf met eigenaar.\nShoot bij daglicht als er ramen zijn, anders full LED setup.\nOplevering binnen 5 werkdagen na shoot.',
  },
  'reel-no-host': {
    name: 'Studio Reel (zonder presentator)', type: 'reel', duration: '30-60 seconden',
    desc: 'Cinematic reel van de studio zonder host. Puur visuals, sfeer, en muziek. Laat de ruimte voor zichzelf spreken.',
    shots: [
      { t: 'Establishing shot buiten', d: 'Slow motion of timelapse van de buitenkant → deur gaat open' },
      { t: 'Gimbal walk-in', d: 'Vloeiende gimbal movement van deur naar binnen. Reveal moment.' },
      { t: 'Wide slow pan', d: 'Langzame pan van links naar rechts door de hele studio' },
      { t: 'Detail shots (4-5x)', d: 'Close-ups: knoppen, faders, microfoon, licht reflecties, texturen. Snelle cuts.' },
      { t: 'Overhead / drone shot', d: 'Bovenaanzicht van de studio (als mogelijk). Anders hoog statief.' },
      { t: 'Moody lighting shot', d: 'Studio met alleen sfeerverlichting aan. Cinematic feel.' },
      { t: 'Hero closing shot', d: 'De mooiste compositie van de studio. Eindshot. Logo fade-in.' },
    ],
    equip: ['Camera (A7IV / BMPCC / FX3)', 'Gimbal (DJI RS3)', 'Wide-angle lens (16-35mm)', '50mm of 85mm (detail shots)', 'LED tube lights / practicals', 'ND filter (als er veel daglicht is)'],
    deliv: ['1x Reel (1080x1920, MP4) — Instagram/TikTok ready', '1x Landscape versie (1920x1080) voor website', 'Color graded + sound designed', 'Raw footage op Google Drive'],
    notes: 'Geen voice-over, geen tekst. Puur cinematic visuals + muziek.\nMuziek: ambient, lo-fi, of cinematic beat. Moet de sfeer matchen.\nShoot in 4K, lever in 1080p. Geeft ruimte voor reframing.\nElke shot minimaal 3 seconden, max 5. Snelle maar smooth cuts.\nFilm op golden hour of met studio lights only voor beste sfeer.',
  },
  'blank': { name: 'Lege brief', type: '', duration: '', desc: '', shots: [], equip: [], deliv: [], notes: '' },
}

const TPL_KEYS = Object.keys(TEMPLATES)

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function BriefBuilderPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const productionId = params.id

  const [production, setProduction] = useState<Production | null>(null)
  const [brief, setBrief] = useState<ContentBrief | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedTick, setSavedTick] = useState(false)
  const [unsaved, setUnsaved] = useState(false)
  const [selTpl, setSelTpl] = useState('do-we-ship')
  const [dbTemplates, setDbTemplates] = useState<Array<{ id: string; name: string; content_type: string; description: string | null; shotlist: ShotItem[]; equipment: string[]; duration: string | null; deliverables: string | null; notes: string | null }>>([])

  // Form state
  const [title, setTitle] = useState('')
  const [contentType, setContentType] = useState<ContentBrief['content_type']>('reel')
  const [status, setStatus] = useState<ContentBrief['status']>('draft')
  const [shootDate, setShootDate] = useState('')
  const [duration, setDuration] = useState('')
  const [callTime, setCallTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [shotlist, setShotlist] = useState<ShotItem[]>([])
  const [equipment, setEquipment] = useState<string[]>([])
  const [deliverables, setDeliverables] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [newEquip, setNewEquip] = useState('')

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/productions/${productionId}`)
    if (!res.ok) { setLoading(false); return }
    const data = await res.json()
    setProduction(data.production)

    // Existing brief?
    const { data: briefs } = await workspaceClient
      .from<ContentBrief[]>('content_briefs')
      .select('*')
      .eq('production_id', productionId)
      .order('created_at', { ascending: false })
      .limit(1)

    if (briefs && briefs.length > 0) {
      const b = (briefs as unknown as ContentBrief[])[0]
      setBrief(b)
      setTitle(b.title || data.production.title || '')
      setContentType(b.content_type || 'reel')
      setStatus(b.status || 'draft')
      setShootDate(b.shoot_date || data.production.final_date || '')
      setDuration(b.duration || '')
      setCallTime(b.call_time || '')
      setEndTime(b.end_time || '')
      setContactPerson(b.contact_person || '')
      setContactPhone(b.contact_phone || '')
      setShotlist(b.shotlist || [])
      setEquipment(b.equipment || [])
      setDeliverables(b.deliverables ? b.deliverables.split('\n').filter(Boolean) : [])
      setNotes(b.notes || '')
      setDescription(b.description || '')
    } else {
      // Initialize from production
      setTitle(data.production.title || '')
      setShootDate(data.production.final_date || '')
      setDescription(data.production.description || '')
    }
    setLocation(data.production.location || '')
    setLoading(false)
  }, [productionId])

  useEffect(() => { load() }, [load])

  // ── Save ──────────────────────────────────────────────────────────────────
  const save = async (newStatus?: ContentBrief['status']) => {
    setSaving(true)
    const payload = {
      title: title.trim() || null,
      content_type: contentType,
      status: newStatus || status,
      shoot_date: shootDate || null,
      duration: duration.trim() || null,
      call_time: callTime || null,
      end_time: endTime || null,
      contact_person: contactPerson.trim() || null,
      contact_phone: contactPhone.trim() || null,
      description: description.trim() || null,
      notes: notes.trim() || null,
      shotlist,
      equipment,
      deliverables: deliverables.join('\n'),
      production_id: productionId,
      lead_id: production?.lead_id ?? null,
      studio_name: production?.title ?? null,
      updated_at: new Date().toISOString(),
    }

    if (brief) {
      await workspaceClient.from('content_briefs').update(payload as never).eq('id' as never, brief.id as never)
    } else {
      const { data: created } = await workspaceClient
        .from('content_briefs')
        .insert({ ...payload, share_link: '' } as never)
        .select()
        .single()
      if (created && typeof created === 'object' && 'id' in created) {
        setBrief(created as unknown as ContentBrief)
      }
    }
    setSaving(false)
    setUnsaved(false)
    setSavedTick(true)
    setTimeout(() => setSavedTick(false), 2200)
    if (newStatus) setStatus(newStatus)
  }

  const markChanged = () => setUnsaved(true)

  const applyTemplate = () => {
    const t = TEMPLATES[selTpl]
    if (!t) return
    if (t.type) setContentType(t.type as ContentBrief['content_type'])
    if (t.duration) setDuration(t.duration)
    if (t.desc) setDescription(t.desc)
    if (t.notes) setNotes(t.notes)
    setShotlist(t.shots.map(s => ({ shot: s.t, description: s.d, done: false })))
    setEquipment([...t.equip])
    setDeliverables([...t.deliv])
    if (t.name && !title) setTitle(t.name)
    markChanged()
  }

  // ── Shotlist helpers ──────────────────────────────────────────────────────
  const addShot = () => { setShotlist([...shotlist, { shot: '', description: '', done: false }]); markChanged() }
  const removeShot = (i: number) => { setShotlist(shotlist.filter((_, idx) => idx !== i)); markChanged() }
  const updateShot = (i: number, field: 'shot' | 'description', val: string) => {
    setShotlist(shotlist.map((s, idx) => idx === i ? { ...s, [field]: val } : s)); markChanged()
  }

  const addEquip = () => {
    const v = newEquip.trim(); if (!v) return
    setEquipment([...equipment, v]); setNewEquip(''); markChanged()
  }
  const removeEquip = (i: number) => { setEquipment(equipment.filter((_, idx) => idx !== i)); markChanged() }

  const addDeliv = () => { setDeliverables([...deliverables, '']); markChanged() }
  const removeDeliv = (i: number) => { setDeliverables(deliverables.filter((_, idx) => idx !== i)); markChanged() }
  const updateDeliv = (i: number, val: string) => {
    setDeliverables(deliverables.map((d, idx) => idx === i ? val : d)); markChanged()
  }

  const saveStatus = useMemo(() => {
    if (saving) return 'Opslaan…'
    if (savedTick) return 'Opgeslagen'
    if (unsaved) return 'Niet opgeslagen'
    return ''
  }, [saving, savedTick, unsaved])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 64px)', color: 'var(--ink-ghost)', fontSize: 13 }}>
        Brief laden…
      </div>
    )
  }

  return (
    <>
      <style jsx global>{`
        .bb-input {
          border: none; border-bottom: 1px solid var(--edge); background: transparent;
          padding: 5px 0; font-size: 12.5px; font-weight: 500; color: var(--ink);
          outline: none; width: 100%; transition: border-color 130ms; font-family: inherit;
        }
        .bb-input:focus { border-bottom-color: var(--accent); }
        .bb-input::placeholder { color: var(--ink-ghost); font-weight: 400; }
        .bb-textarea {
          border: 1px solid var(--edge); background: transparent;
          padding: 10px 12px; font-size: 12.5px; color: var(--ink);
          outline: none; width: 100%; border-radius: 3px;
          resize: vertical; min-height: 80px; line-height: 1.65;
          font-family: inherit; transition: border-color 130ms;
        }
        .bb-textarea:focus { border-color: var(--accent); }
        .bb-label { font-size: 8px; font-weight: 700; letter-spacing: 0.20em; text-transform: uppercase; color: var(--ink-ghost); }
      `}</style>

      <div style={{ margin: '-16px -16px 0', minHeight: 'calc(100vh - 64px)', background: 'var(--bg, #F9FAFE)' }}>
        {/* Header */}
        <div
          style={{
            height: 58, background: 'var(--bg, #F9FAFE)', borderBottom: '1px solid var(--edge)',
            display: 'flex', alignItems: 'center', gap: 16, padding: '0 24px',
            position: 'sticky', top: 64, zIndex: 30,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <button
              onClick={() => router.push(`/marketing/agenda/${productionId}`)}
              style={{ width: 28, height: 28, border: '1px solid var(--edge)', borderRadius: '50%', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-ghost)', cursor: 'pointer' }}
              title="Terug"
            >
              <ArrowLeft style={{ width: 14, height: 14 }} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5 }}>
              <span style={{ color: 'var(--ink-ghost)', fontWeight: 500 }}>
                {production?.title || 'Productie'}
              </span>
              <span style={{ color: 'var(--edge)', fontSize: 13 }}>/</span>
              <span style={{ color: 'var(--ink-muted)', fontWeight: 600 }}>Brief</span>
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <input
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); markChanged() }}
              placeholder="Brief titel…"
              style={{
                fontSize: 14, fontWeight: 700, color: 'var(--ink)',
                border: 'none', background: 'transparent', textAlign: 'center',
                outline: 'none', padding: '4px 12px', borderRadius: 4,
                minWidth: 240, maxWidth: 420, width: '100%', fontFamily: 'inherit',
              }}
              onFocus={(e) => { e.target.style.background = 'var(--surface)' }}
              onBlur={(e) => { e.target.style.background = 'transparent' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 10.5, color: savedTick ? 'oklch(0.65 0.16 145)' : 'var(--ink-ghost)', minWidth: 90, textAlign: 'right' }}>
              {saveStatus}
            </span>
            <button
              onClick={() => save()}
              disabled={saving}
              style={{
                background: 'transparent', color: 'var(--ink)', border: '1px solid var(--edge)',
                padding: '5px 16px', borderRadius: 9999, fontSize: 11.5, fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Opslaan
            </button>
            <button
              onClick={() => save('ready')}
              disabled={saving}
              style={{
                background: 'var(--accent)', color: '#fff', border: 'none',
                padding: '6px 16px', borderRadius: 9999, fontSize: 11.5, fontWeight: 700,
                letterSpacing: '0.035em', cursor: 'pointer',
              }}
            >
              Publiceer brief
            </button>
          </div>
        </div>

        {/* Body grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', alignItems: 'start' }}>
          {/* Left column */}
          <div style={{ borderRight: '1px solid var(--edge)' }}>
            {/* Call sheet section */}
            <Section title="Call sheet">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 18 }}>
                <Field label="Type shoot">
                  <select
                    className="bb-input"
                    value={contentType || ''}
                    onChange={(e) => { setContentType(e.target.value as ContentBrief['content_type']); markChanged() }}
                  >
                    <option value="reel">Reel</option>
                    <option value="photo">Fotoshoot</option>
                    <option value="video">Video</option>
                    <option value="story">Interview</option>
                    <option value="other">Product</option>
                  </select>
                </Field>
                <Field label="Status">
                  <select
                    className="bb-input"
                    value={status}
                    onChange={(e) => { setStatus(e.target.value as ContentBrief['status']); markChanged() }}
                  >
                    <option value="draft">Concept</option>
                    <option value="ready">Klaar</option>
                    <option value="shared">Gedeeld</option>
                    <option value="in_progress">In productie</option>
                    <option value="done">Afgerond</option>
                  </select>
                </Field>
                <Field label="Shoot datum">
                  <input
                    type="date"
                    className="bb-input"
                    value={shootDate}
                    onChange={(e) => { setShootDate(e.target.value); markChanged() }}
                  />
                </Field>
                <Field label="Duratie output">
                  <input
                    type="text"
                    className="bb-input"
                    value={duration}
                    onChange={(e) => { setDuration(e.target.value); markChanged() }}
                    placeholder="bijv. 30–60 sec"
                  />
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 18, marginTop: 18 }}>
                <Field label="Call time">
                  <input type="time" className="bb-input" value={callTime} onChange={(e) => { setCallTime(e.target.value); markChanged() }} />
                </Field>
                <Field label="Eindtijd">
                  <input type="time" className="bb-input" value={endTime} onChange={(e) => { setEndTime(e.target.value); markChanged() }} />
                </Field>
                <Field label="Contactpersoon">
                  <input type="text" className="bb-input" value={contactPerson} onChange={(e) => { setContactPerson(e.target.value); markChanged() }} placeholder="Naam" />
                </Field>
                <Field label="Telefoon">
                  <input type="text" className="bb-input" value={contactPhone} onChange={(e) => { setContactPhone(e.target.value); markChanged() }} placeholder="+31 6 …" />
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: 18 }}>
                <Field label="Locatie / Studio">
                  <input type="text" className="bb-input" value={location} disabled placeholder="Studio naam of adres" />
                </Field>
              </div>
            </Section>

            {/* Description */}
            <Section title="Omschrijving">
              <textarea
                className="bb-textarea"
                rows={3}
                value={description}
                onChange={(e) => { setDescription(e.target.value); markChanged() }}
                placeholder="Beschrijf de productie, doel, en toon…"
              />
            </Section>

            {/* Shotlist */}
            <Section title="Shot list" meta={`${shotlist.length} shots`}>
              <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 12 }}>
                {shotlist.map((s, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 9,
                      padding: '10px 0', borderBottom: '1px solid var(--edge-soft)',
                    }}
                  >
                    <GripVertical style={{ width: 13, height: 13, color: 'var(--ink-ghost)', marginTop: 6, opacity: 0.4, flexShrink: 0 }} />
                    <div
                      style={{
                        width: 20, height: 20, borderRadius: '50%',
                        background: 'var(--surface)', border: '1px solid var(--edge)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9, fontWeight: 700, fontFamily: 'ui-monospace, monospace',
                        color: 'var(--ink-ghost)', flexShrink: 0, marginTop: 4,
                      }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <input
                        type="text"
                        value={s.shot}
                        onChange={(e) => updateShot(i, 'shot', e.target.value)}
                        placeholder="Shot omschrijving…"
                        style={{
                          border: 'none', background: 'transparent',
                          fontSize: 12.5, fontWeight: 600, color: 'var(--ink)',
                          outline: 'none', width: '100%', padding: '2px 0', fontFamily: 'inherit',
                        }}
                      />
                      <textarea
                        rows={1}
                        value={s.description}
                        onChange={(e) => updateShot(i, 'description', e.target.value)}
                        placeholder="Details, technische instructies…"
                        style={{
                          border: 'none', background: 'transparent',
                          fontSize: 11, color: 'var(--ink-faint)',
                          outline: 'none', width: '100%', resize: 'none', padding: '2px 0',
                          lineHeight: 1.45, fontFamily: 'inherit',
                        }}
                      />
                    </div>
                    <button
                      onClick={() => removeShot(i)}
                      style={{
                        width: 21, height: 21, border: 'none', background: 'none',
                        color: 'var(--ink-ghost)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: 3, cursor: 'pointer', flexShrink: 0, marginTop: 3,
                      }}
                      title="Verwijderen"
                    >
                      <X style={{ width: 13, height: 13 }} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={addShot}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontSize: 10.5, fontWeight: 600, color: 'var(--accent)',
                  border: '1px dashed var(--edge)', background: 'none',
                  padding: '5px 13px', borderRadius: 4, cursor: 'pointer',
                }}
              >
                <Plus style={{ width: 11, height: 11 }} />
                shot toevoegen
              </button>
            </Section>

            {/* Equipment */}
            <Section title="Equipment" meta={`${equipment.length} items`}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {equipment.map((e, i) => (
                  <span
                    key={i}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '4px 9px', borderRadius: 9999, fontSize: 11, fontWeight: 500,
                      background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-muted)',
                    }}
                  >
                    {e}
                    <button
                      onClick={() => removeEquip(i)}
                      style={{ width: 13, height: 13, border: 'none', background: 'none', color: 'var(--ink-ghost)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                    >
                      <X style={{ width: 11, height: 11 }} />
                    </button>
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="text"
                  value={newEquip}
                  onChange={(e) => setNewEquip(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEquip() } }}
                  placeholder="Item toevoegen…"
                  style={{
                    border: 'none', borderBottom: '1px solid var(--edge)', background: 'transparent',
                    fontSize: 12, color: 'var(--ink)', outline: 'none', padding: '4px 0',
                    flex: 1, maxWidth: 240, fontFamily: 'inherit',
                  }}
                />
                <button
                  onClick={addEquip}
                  style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--accent)', border: 'none', background: 'none', padding: '3px 8px', borderRadius: 3, cursor: 'pointer' }}
                >
                  + toevoegen
                </button>
              </div>
            </Section>

            {/* Deliverables */}
            <Section title="Deliverables" meta={`${deliverables.length} items`}>
              <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 12 }}>
                {deliverables.map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--edge-soft)' }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--ink-ghost)', flexShrink: 0 }} />
                    <input
                      type="text"
                      value={d}
                      onChange={(e) => updateDeliv(i, e.target.value)}
                      placeholder="Deliverable…"
                      style={{
                        flex: 1, border: 'none', background: 'transparent',
                        fontSize: 12, color: 'var(--ink-muted)', outline: 'none', padding: 0, fontFamily: 'inherit',
                      }}
                    />
                    <button
                      onClick={() => removeDeliv(i)}
                      style={{ width: 19, height: 19, border: 'none', background: 'none', color: 'var(--ink-ghost)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3, cursor: 'pointer' }}
                    >
                      <X style={{ width: 12, height: 12 }} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={addDeliv}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontSize: 10.5, fontWeight: 600, color: 'var(--accent)',
                  border: '1px dashed var(--edge)', background: 'none',
                  padding: '5px 13px', borderRadius: 4, cursor: 'pointer',
                }}
              >
                <Plus style={{ width: 11, height: 11 }} />
                deliverable toevoegen
              </button>
            </Section>

            {/* Notes */}
            <Section title="Notities voor de crew">
              <textarea
                className="bb-textarea"
                rows={5}
                value={notes}
                onChange={(e) => { setNotes(e.target.value); markChanged() }}
                placeholder="Technische instructies, aandachtspunten, shoot-regels voor de dag zelf…"
              />
            </Section>

            <div style={{ padding: '11px 24px', borderTop: '1px solid var(--edge)' }}>
              <span style={{ fontSize: 11, color: 'var(--ink-ghost)', fontFamily: 'ui-monospace, monospace' }}>
                Productie · Brief · Lctnships Workspace
              </span>
            </div>
          </div>

          {/* Right column */}
          <div
            style={{
              position: 'sticky', top: 122, maxHeight: 'calc(100vh - 122px)',
              overflowY: 'auto', padding: 18,
              display: 'flex', flexDirection: 'column', gap: 14,
            }}
          >
            {/* Template widget */}
            <div style={{ border: '1px solid var(--edge)', borderRadius: 4, overflow: 'hidden', background: 'var(--bg, #F9FAFE)' }}>
              <div style={{ padding: '9px 13px', borderBottom: '1px solid var(--edge)' }}>
                <span style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.20em', color: 'var(--ink-ghost)' }}>Template</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {TPL_KEYS.map(key => {
                  const t = TEMPLATES[key]
                  const isSel = selTpl === key
                  return (
                    <button
                      key={key}
                      onClick={() => setSelTpl(key)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 9,
                        padding: '9px 13px', cursor: 'pointer',
                        borderBottom: '1px solid var(--edge-soft)',
                        border: 'none', background: isSel ? 'var(--accent-tint)' : 'transparent',
                        textAlign: 'left', width: '100%', fontFamily: 'inherit',
                      }}
                    >
                      <span
                        style={{
                          width: 13, height: 13, borderRadius: '50%',
                          border: `1.5px solid ${isSel ? 'var(--accent)' : 'var(--edge)'}`,
                          background: isSel ? 'var(--accent)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}
                      >
                        {isSel && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff' }} />}
                      </span>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink-muted)', flex: 1 }}>{t.name}</span>
                      {t.shots.length > 0 && (
                        <span style={{ fontSize: 9.5, color: 'var(--ink-ghost)', fontFamily: 'ui-monospace, monospace' }}>
                          {t.shots.length}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
              <button
                onClick={applyTemplate}
                style={{
                  display: 'block', width: 'calc(100% - 26px)', margin: '11px 13px',
                  background: 'var(--accent)', color: '#fff', border: 'none',
                  padding: 8, borderRadius: 4, fontSize: 11.5, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Toepassen
              </button>
            </div>

            {/* Summary widget */}
            <div style={{ border: '1px solid var(--edge)', borderRadius: 4, overflow: 'hidden', background: 'var(--bg, #F9FAFE)' }}>
              <div style={{ padding: '9px 13px', borderBottom: '1px solid var(--edge)' }}>
                <span style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.20em', color: 'var(--ink-ghost)' }}>Overzicht</span>
              </div>
              <div style={{ padding: '12px 13px', display: 'flex', flexDirection: 'column' }}>
                <SumRow lbl="Shots" val={String(shotlist.length)} />
                <SumRow lbl="Equipment" val={String(equipment.length)} />
                <SumRow lbl="Deliverables" val={String(deliverables.length)} />
                <SumRow lbl="Status" val={status.toLowerCase()} />
              </div>
            </div>

            {/* Actions widget */}
            <div style={{ border: '1px solid var(--edge)', borderRadius: 4, overflow: 'hidden', background: 'var(--bg, #F9FAFE)' }}>
              <div style={{ padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                <button
                  onClick={() => save('ready')}
                  disabled={saving}
                  style={{
                    display: 'block', width: '100%', background: 'var(--accent)', color: '#fff',
                    border: 'none', padding: 8, borderRadius: 4, fontSize: 11.5, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Publiceer brief
                </button>
                <button
                  onClick={() => save('draft')}
                  disabled={saving}
                  style={{
                    display: 'block', width: '100%', background: 'transparent', color: 'var(--ink)',
                    border: '1px solid var(--edge)', padding: 7, borderRadius: 4,
                    fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Opslaan als concept
                </button>
                <button
                  onClick={() => window.print()}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    width: '100%', background: 'none', border: 'none',
                    fontSize: 11, color: 'var(--ink-ghost)', padding: 4,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  <FileDown style={{ width: 12, height: 12 }} />
                  Exporteren als PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Section({ title, meta, children }: Readonly<{ title: string; meta?: string; children: React.ReactNode }>) {
  return (
    <div style={{ borderBottom: '1px solid var(--edge)' }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 24px', background: 'var(--surface)', borderBottom: '1px solid var(--edge)',
        }}
      >
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.20em', textTransform: 'uppercase', color: 'var(--ink-ghost)' }}>
          {title}
        </span>
        {meta && <span style={{ fontSize: 10.5, color: 'var(--ink-ghost)' }}>{meta}</span>}
      </div>
      <div style={{ padding: '22px 24px' }}>{children}</div>
    </div>
  )
}

function Field({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label className="bb-label">{label}</label>
      {children}
    </div>
  )
}

function SumRow({ lbl, val }: Readonly<{ lbl: string; val: string }>) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--edge-soft)' }}>
      <span style={{ fontSize: 11, color: 'var(--ink-ghost)' }}>{lbl}</span>
      <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-muted)', fontFamily: 'ui-monospace, monospace' }}>{val}</span>
    </div>
  )
}
