'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { studiosApi, partnersApi } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface StudioDisplay {
  id: string
  title: string
  location: string
  city: string
  type: string
  capacity?: number
  status?: string
  images?: string[]
  avg_rating?: number
  total_reviews?: number
  price_per_hour?: number
  amenities?: string[]
  description?: string
}

interface StudioFormData {
  name: string
  category: string
  contactPerson: string
  description: string
  address: string
  city: string
  postalCode: string
  country: string
  operatingHours: { day: string; enabled: boolean; open: string; close: string }[]
  instagram: string
  website: string
  spaceName: string
  capacity: string
  pricePerHour: string
}

const DEFAULT_HOURS: StudioFormData['operatingHours'] = [
  { day: 'Maandag',   enabled: true,  open: '09:00', close: '18:00' },
  { day: 'Dinsdag',   enabled: true,  open: '09:00', close: '18:00' },
  { day: 'Woensdag',  enabled: true,  open: '09:00', close: '18:00' },
  { day: 'Donderdag', enabled: true,  open: '09:00', close: '18:00' },
  { day: 'Vrijdag',   enabled: true,  open: '09:00', close: '20:00' },
  { day: 'Zaterdag',  enabled: false, open: '10:00', close: '16:00' },
  { day: 'Zondag',    enabled: false, open: '10:00', close: '16:00' },
]

const DEFAULT_FORM: StudioFormData = {
  name: '', category: '', contactPerson: '', description: '',
  address: '', city: '', postalCode: '', country: '',
  operatingHours: DEFAULT_HOURS,
  instagram: '', website: '', spaceName: '', capacity: '', pricePerHour: '',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function chipClass(status: string) {
  if (status === 'active')   return 'bg-[var(--success-tint)] text-[var(--success)]'
  if (status === 'draft')    return 'bg-[var(--warning-tint)] text-[var(--warning-dark)]'
  return 'bg-[var(--surface)] text-[var(--ink-ghost)] border border-[var(--edge)]'
}
function chipLabel(status: string) {
  if (status === 'active')   return 'actief'
  if (status === 'draft')    return 'concept'
  return 'inactief'
}
function studioType(s: StudioDisplay) {
  return s.type ? s.type.charAt(0).toUpperCase() + s.type.slice(1) : 'Studio'
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IcoGrid() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>
}
function IcoList() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
}
function IcoSearch() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
}
function IcoPlus() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
}
function IcoBuilding() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21V8l7-5 7 5v13M10 21v-5h4v5"/></svg>
}
function IcoPin() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 13-8 13s-8-7-8-13a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
}
function IcoExternalLink() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
}
function IcoEdit() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
}
function IcoClose() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
}
function IcoChevLeft() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
}
function IcoChevRight() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
}
function IcoCheck() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
}

// ─── Studio image placeholder ─────────────────────────────────────────────────

function StudioImg({ studio, className }: { studio: StudioDisplay; className?: string }) {
  const img = studio.images?.[0]
  if (img) {
    return <img src={img} alt={studio.title} className={cn('object-cover w-full h-full', className)} />
  }
  return (
    <div className={cn('w-full h-full flex items-center justify-center bg-[var(--surface)]', className)}>
      <span className="opacity-20 text-[var(--ink-ghost)]"><IcoBuilding /></span>
    </div>
  )
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

function DetailPanel({ studio, onClose }: { studio: StudioDisplay; onClose: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      {/* Image */}
      <div className="w-full aspect-video rounded-[3px] overflow-hidden border border-[var(--edge)] bg-[var(--surface)]">
        <StudioImg studio={studio} className="w-full h-full" />
      </div>

      {/* Header */}
      <div className="pb-3 border-b border-[var(--edge)]">
        <div className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-[var(--ink-ghost)] mb-1">{studioType(studio)}</div>
        <div className="text-[15px] font-extrabold text-[var(--ink)] leading-[1.2] mb-2">{studio.title}</div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('inline-flex items-center px-[9px] py-[3px] rounded-full text-[9px] font-bold', chipClass(studio.status ?? 'active'))}>
            {chipLabel(studio.status ?? 'active')}
          </span>
          {studio.city && (
            <span className="flex items-center gap-1 text-[10.5px] text-[var(--ink-ghost)]">
              <IcoPin />{studio.city}
            </span>
          )}
        </div>
      </div>

      {/* Facts */}
      <div className="border border-[var(--edge)] rounded-[4px] overflow-hidden bg-[var(--bg)]">
        <div className="px-[13px] py-[9px] border-b border-[var(--edge)] bg-[var(--surface)]">
          <span className="text-[8px] font-bold uppercase tracking-[0.20em] text-[var(--ink-ghost)]">Details</span>
        </div>
        <div className="grid grid-cols-2 gap-x-[14px] gap-y-[10px] p-[13px]">
          {[
            ['Prijs/uur', studio.price_per_hour ? `€${studio.price_per_hour}` : '—'],
            ['Capaciteit', studio.capacity ? `${studio.capacity} pers.` : '—'],
            ['Rating', studio.avg_rating ? `★ ${studio.avg_rating.toFixed(1)} (${studio.total_reviews ?? 0})` : 'Geen'],
            ['Type', studioType(studio)],
          ].map(([lbl, val]) => (
            <div key={lbl}>
              <div className="text-[7.5px] font-bold uppercase tracking-[0.16em] text-[var(--ink-ghost)] mb-[3px]">{lbl}</div>
              <div className="text-[13px] font-bold text-[var(--ink-muted)]">{val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Amenities */}
      {studio.amenities && studio.amenities.length > 0 && (
        <div className="border border-[var(--edge)] rounded-[4px] overflow-hidden bg-[var(--bg)]">
          <div className="px-[13px] py-[9px] border-b border-[var(--edge)] bg-[var(--surface)]">
            <span className="text-[8px] font-bold uppercase tracking-[0.20em] text-[var(--ink-ghost)]">Faciliteiten</span>
          </div>
          <div className="flex flex-wrap gap-[5px] p-[13px]">
            {studio.amenities.map((a) => (
              <span key={a} className="px-[9px] py-[3px] rounded-full text-[10.5px] font-medium bg-[var(--surface)] border border-[var(--edge)] text-[var(--ink-faint)]">
                {a}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-[6px]">
        <Link
          href={`/studios/${studio.id}`}
          className="flex items-center gap-[5px] w-full bg-[var(--accent)] text-white border-none px-[14px] py-[9px] rounded-[6px] text-[11.5px] font-bold transition-opacity hover:opacity-80"
        >
          <IcoExternalLink />
          Studio volledig openen
        </Link>
        <Link
          href={`/studios/${studio.id}?edit=1`}
          className="flex items-center gap-[5px] w-full bg-transparent text-[var(--ink)] border border-[var(--edge)] px-[14px] py-[8px] rounded-[6px] text-[11.5px] font-semibold transition-all hover:border-[var(--ink-ghost)] hover:bg-[var(--surface)]"
        >
          <IcoEdit />
          Bewerken
        </Link>
      </div>
    </div>
  )
}

// ─── Add Studio slide-in panel ────────────────────────────────────────────────

const STEPS = ['Studio basics', 'Locatie & tijden', 'Foto\'s & media', 'Ruimtes']

function AddPanel({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<StudioFormData>(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upd = <K extends keyof StudioFormData>(k: K, v: StudioFormData[K]) =>
    setForm(prev => ({ ...prev, [k]: v }))

  const handleNext = async () => {
    if (step < 4) { setStep(step + 1); return }
    setSaving(true); setError(null)
    try {
      const partners = await partnersApi.getAll()
      const hostId = partners[0]?.id
      await studiosApi.create({
        title: form.name,
        description: form.description,
        type: form.category || 'photo',
        location: `${form.city}, ${form.country || 'Netherlands'}`,
        address: form.address,
        city: form.city,
        country: form.country || 'Netherlands',
        price_per_hour: parseFloat(form.pricePerHour) || 0,
        capacity: parseInt(form.capacity) || 1,
        host_id: hostId,
        status: 'active',
        is_published: true,
        amenities: [],
        rules: [],
        images: [],
      })
      setForm(DEFAULT_FORM); setStep(1)
      onAdded(); onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Opslaan mislukt')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Sluiten"
        className="fixed inset-0 z-[200] w-full cursor-default"
        style={{ background: 'rgba(5,15,22,.38)', border: 'none' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 bottom-0 z-[201] flex flex-col bg-[var(--bg)] border-l border-[var(--edge)]"
        style={{ width: 520 }}
      >
        {/* Head */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--edge)] flex-shrink-0">
          <div>
            <div className="text-[14px] font-extrabold text-[var(--ink)]">Studio toevoegen</div>
            <div className="text-[10px] text-[var(--ink-ghost)] font-mono mt-[2px]">Stap {step} van 4</div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-[3px] text-[var(--ink-ghost)] hover:text-[var(--ink-muted)] hover:bg-[var(--surface)] transition-all"
            style={{ border: 'none', background: 'none' }}
          >
            <IcoClose />
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex border-b border-[var(--edge)] bg-[var(--surface)] flex-shrink-0" style={{ height: 48 }}>
          {STEPS.map((lbl, i) => (
            <div
              key={lbl}
              className={cn(
                'flex items-center gap-2 flex-1 border-r border-[var(--edge)] last:border-r-0 px-4 text-[10px] font-semibold',
                i + 1 === step ? 'bg-[var(--bg)] text-[var(--ink-muted)]' : 'text-[var(--ink-ghost)]',
              )}
            >
              <div
                className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0 border-[1.5px]',
                  i + 1 < step
                    ? 'bg-[var(--success)] border-[var(--success)] text-white'
                    : i + 1 === step
                      ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                      : 'border-[var(--edge)] text-[var(--ink-ghost)]',
                )}
              >
                {i + 1 < step ? <IcoCheck /> : i + 1}
              </div>
              <span>{lbl}</span>
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5" style={{ scrollbarWidth: 'thin' }}>
          {step === 1 && <Step1 form={form} upd={upd} />}
          {step === 2 && <Step2 form={form} upd={upd} />}
          {step === 3 && <Step3 form={form} upd={upd} />}
          {step === 4 && <Step4 form={form} upd={upd} />}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-[13px] border-t border-[var(--edge)] bg-[var(--surface)] flex-shrink-0">
          {error && <p className="text-[11px] text-red-600 mr-auto">{error}</p>}
          <button
            onClick={() => step > 1 && setStep(step - 1)}
            disabled={step === 1}
            className="flex items-center gap-1 text-[11.5px] font-semibold text-[var(--ink-ghost)] border border-[var(--edge)] bg-none px-[14px] py-[7px] rounded-full transition-all hover:border-[var(--ink-ghost)] hover:text-[var(--ink-muted)] disabled:opacity-30"
            style={{ background: 'none' }}
          >
            <IcoChevLeft /> Vorige
          </button>
          <button
            onClick={handleNext}
            disabled={saving}
            className="flex items-center gap-1 text-[11.5px] font-bold text-white bg-[var(--accent)] border-none px-[18px] py-[8px] rounded-full transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Opslaan…</> : step === 4 ? <><IcoCheck /> Studio publiceren</> : <>Volgende <IcoChevRight /></>}
          </button>
        </div>
      </div>
    </>
  )
}

function FLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[8px] font-bold uppercase tracking-[0.20em] text-[var(--ink-ghost)] mb-[5px]">{children}</div>
}
function FInput({ value, onChange, placeholder, type = 'text' }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border-b border-[var(--edge)] bg-transparent py-[5px] text-[12.5px] font-medium text-[var(--ink)] outline-none focus:border-[var(--accent)] placeholder:text-[var(--ink-ghost)] placeholder:font-normal transition-colors"
    />
  )
}
function FSelect({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full border-b border-[var(--edge)] bg-transparent py-[5px] text-[12.5px] font-medium text-[var(--ink)] outline-none focus:border-[var(--accent)] appearance-none transition-colors"
    >
      {children}
    </select>
  )
}

function Step1({ form, upd }: { form: StudioFormData; upd: <K extends keyof StudioFormData>(k: K, v: StudioFormData[K]) => void }) {
  return (
    <>
      <div>
        <div className="text-[16px] font-extrabold text-[var(--ink)] mb-1">Studio basics</div>
        <div className="text-[11.5px] text-[var(--ink-ghost)] mb-5">De essentiële informatie over de studio.</div>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        <div><FLabel>Naam</FLabel><FInput value={form.name} onChange={v => upd('name', v)} placeholder="bv. Studio Maris" /></div>
        <div>
          <FLabel>Type</FLabel>
          <FSelect value={form.category} onChange={v => upd('category', v)}>
            <option value="">Kies type</option>
            <option value="photo">Fotostudio</option>
            <option value="music">Muziekstudio</option>
            <option value="podcast">Podcaststudio</option>
            <option value="dance">Dansstudio</option>
            <option value="video">Videostudio</option>
            <option value="other">Multifunctioneel</option>
          </FSelect>
        </div>
        <div className="col-span-2"><FLabel>Contactpersoon</FLabel><FInput value={form.contactPerson} onChange={v => upd('contactPerson', v)} placeholder="Naam" /></div>
        <div className="col-span-2">
          <FLabel>Beschrijving</FLabel>
          <textarea
            value={form.description}
            onChange={e => upd('description', e.target.value)}
            placeholder="Wat maakt deze studio bijzonder?"
            rows={4}
            className="w-full border border-[var(--edge)] rounded-[3px] bg-transparent px-[11px] py-[9px] text-[12.5px] text-[var(--ink)] outline-none focus:border-[var(--accent)] placeholder:text-[var(--ink-ghost)] resize-y min-h-[80px] transition-colors"
          />
        </div>
      </div>
    </>
  )
}

function Step2({ form, upd }: { form: StudioFormData; upd: <K extends keyof StudioFormData>(k: K, v: StudioFormData[K]) => void }) {
  const toggleDay = (i: number) => {
    const h = [...form.operatingHours]
    h[i] = { ...h[i], enabled: !h[i].enabled }
    upd('operatingHours', h)
  }
  const setTime = (i: number, field: 'open' | 'close', val: string) => {
    const h = [...form.operatingHours]
    h[i] = { ...h[i], [field]: val }
    upd('operatingHours', h)
  }
  return (
    <>
      <div>
        <div className="text-[16px] font-extrabold text-[var(--ink)] mb-1">Locatie & tijden</div>
        <div className="text-[11.5px] text-[var(--ink-ghost)] mb-5">Adres en openingsuren van de studio.</div>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 mb-6">
        <div className="col-span-2"><FLabel>Straat & huisnummer</FLabel><FInput value={form.address} onChange={v => upd('address', v)} placeholder="bv. Keizersgracht 123" /></div>
        <div><FLabel>Stad</FLabel><FInput value={form.city} onChange={v => upd('city', v)} placeholder="Amsterdam" /></div>
        <div><FLabel>Postcode</FLabel><FInput value={form.postalCode} onChange={v => upd('postalCode', v)} placeholder="1234 AB" /></div>
      </div>
      <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--ink-ghost)] mb-3">Openingstijden</div>
      {form.operatingHours.map((day, i) => (
        <div key={day.day} className={cn('flex items-center gap-3 py-[7px] border-b border-[var(--edge-soft)] last:border-b-0', !day.enabled && 'opacity-50')}>
          <div className="text-[11.5px] font-semibold text-[var(--ink-muted)] min-w-[80px]">{day.day}</div>
          <button
            type="button"
            onClick={() => toggleDay(i)}
            className={cn('relative w-8 h-[18px] rounded-full flex-shrink-0 transition-colors', day.enabled ? 'bg-[var(--accent)]' : 'bg-[var(--edge)]')}
            style={{ border: 'none' }}
          >
            <span
              className="absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-transform"
              style={{ left: 2, transform: day.enabled ? 'translateX(14px)' : 'translateX(0)' }}
            />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <input type="time" value={day.open} disabled={!day.enabled} onChange={e => setTime(i, 'open', e.target.value)}
              className="border-b border-[var(--edge)] bg-transparent text-[11px] text-[var(--ink-muted)] py-[2px] outline-none w-[70px] disabled:cursor-not-allowed" />
            <span className="text-[10px] text-[var(--ink-ghost)]">–</span>
            <input type="time" value={day.close} disabled={!day.enabled} onChange={e => setTime(i, 'close', e.target.value)}
              className="border-b border-[var(--edge)] bg-transparent text-[11px] text-[var(--ink-muted)] py-[2px] outline-none w-[70px] disabled:cursor-not-allowed" />
          </div>
        </div>
      ))}
    </>
  )
}

function Step3({ form: _form, upd: _upd }: { form: StudioFormData; upd: <K extends keyof StudioFormData>(k: K, v: StudioFormData[K]) => void }) {
  return (
    <>
      <div>
        <div className="text-[16px] font-extrabold text-[var(--ink)] mb-1">Foto&#39;s & media</div>
        <div className="text-[11.5px] text-[var(--ink-ghost)] mb-5">Voeg foto&#39;s toe aan de studio.</div>
      </div>
      <div className="border border-dashed border-[var(--edge)] rounded-[4px] p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-[var(--accent)] hover:bg-[var(--accent-tint)] transition-all">
        <IcoBuilding />
        <div className="text-[12.5px] font-bold text-[var(--ink-muted)]">Foto&#39;s uploaden</div>
        <div className="text-[10.5px] text-[var(--ink-ghost)]">JPG, PNG of WEBP · max 10 MB per foto</div>
      </div>
      <div className="grid grid-cols-4 gap-2 mt-4">
        {[1,2,3].map(n => (
          <div key={n} className="aspect-square rounded-[3px] bg-[var(--surface)] border border-[var(--edge)] overflow-hidden" />
        ))}
        <div className="aspect-square rounded-[3px] border border-dashed border-[var(--edge)] flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-[var(--accent)] hover:bg-[var(--accent-tint)] transition-all">
          <span className="text-[var(--ink-ghost)] text-[16px]">+</span>
          <span className="text-[9.5px] text-[var(--ink-ghost)]">Toevoegen</span>
        </div>
      </div>
    </>
  )
}

function Step4({ form, upd }: { form: StudioFormData; upd: <K extends keyof StudioFormData>(k: K, v: StudioFormData[K]) => void }) {
  return (
    <>
      <div>
        <div className="text-[16px] font-extrabold text-[var(--ink)] mb-1">Ruimte & tarieven</div>
        <div className="text-[11.5px] text-[var(--ink-ghost)] mb-5">Vul de details van de eerste ruimte in.</div>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        <div className="col-span-2"><FLabel>Ruimtenaam</FLabel><FInput value={form.spaceName} onChange={v => upd('spaceName', v)} placeholder="bv. Studio A" /></div>
        <div><FLabel>Capaciteit</FLabel><FInput type="number" value={form.capacity} onChange={v => upd('capacity', v)} placeholder="0" /></div>
        <div><FLabel>Prijs per uur (€)</FLabel><FInput type="number" value={form.pricePerHour} onChange={v => upd('pricePerHour', v)} placeholder="0.00" /></div>
      </div>
      {/* Review summary */}
      <div className="mt-6 border border-[var(--edge)] rounded-[4px] p-5 bg-[var(--surface)]">
        <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--ink-ghost)] mb-4">Samenvatting</div>
        <div className="grid grid-cols-2 gap-4">
          {[['Naam', form.name || '—'], ['Stad', form.city || '—'], ['Prijs/uur', form.pricePerHour ? `€${form.pricePerHour}` : '—'], ['Capaciteit', form.capacity || '—']].map(([l, v]) => (
            <div key={l}>
              <div className="text-[8px] font-bold uppercase tracking-[0.18em] text-[var(--ink-ghost)] mb-1">{l}</div>
              <div className="text-[14px] font-extrabold text-[var(--ink)]">{v}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StudiosPage() {
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [search, setSearch] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [studios, setStudios] = useState<StudioDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<StudioDisplay | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  const fetchStudios = useCallback(async () => {
    try {
      setLoading(true)
      const data = await studiosApi.getAll()
      setStudios((data || []).map(s => ({
        id: s.id,
        title: s.title || (s as unknown as Record<string, unknown>)['name'] as string || '',
        location: s.location || s.city || '',
        city: s.city || '',
        type: s.type || '',
        capacity: s.capacity,
        status: s.status,
        images: s.images,
        avg_rating: s.avg_rating,
        total_reviews: s.total_reviews,
        price_per_hour: s.price_per_hour,
        amenities: s.amenities ?? [],
        description: s.description ?? '',
      })))
    } catch { setStudios([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchStudios() }, [fetchStudios])

  const cities = Array.from(new Set(studios.map(s => s.city).filter(Boolean)))
  const types  = Array.from(new Set(studios.map(s => studioType(s)).filter(Boolean)))

  const filtered = studios.filter(s => {
    const q = search.toLowerCase()
    if (q && !s.title.toLowerCase().includes(q) && !s.city.toLowerCase().includes(q)) return false
    if (cityFilter && s.city !== cityFilter) return false
    if (typeFilter && studioType(s) !== typeFilter) return false
    if (statusFilter && s.status !== statusFilter) return false
    return true
  })

  const counts = {
    active:   studios.filter(s => s.status === 'active').length,
    draft:    studios.filter(s => s.status === 'draft').length,
    inactive: studios.filter(s => s.status === 'inactive').length,
    total:    studios.length,
  }

  return (
    <div className="flex flex-col bg-[var(--bg)]">

      {/* Header bar */}
      <div className="flex items-center gap-0 mb-4 pb-4 border-b border-[var(--edge)]" style={{ height: 48 }}>
          <span className="text-[9px] font-bold tracking-[0.20em] uppercase text-[var(--ink-ghost)] mr-6 whitespace-nowrap">Studios</span>

          {/* View toggle */}
          <div className="flex border border-[var(--edge)] rounded-[6px] overflow-hidden mr-3">
            {(['grid', 'list'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={cn('w-8 h-[30px] flex items-center justify-center transition-all', v === view ? 'bg-[var(--surface)] text-[var(--ink-muted)]' : 'text-[var(--ink-ghost)] hover:text-[var(--ink-faint)]')}
                style={{ border: 'none', background: v === view ? 'var(--surface)' : 'none' }}>
                {v === 'grid' ? <IcoGrid /> : <IcoList />}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative mr-2">
            <span className="absolute left-[10px] top-1/2 -translate-y-1/2 text-[var(--ink-ghost)]"><IcoSearch /></span>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Zoek op naam of stad…"
              className="w-[220px] pl-[30px] pr-[10px] py-[6px] border border-[var(--edge)] rounded-[6px] bg-[var(--surface)] text-[11.5px] text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:bg-[var(--bg)] focus:w-[270px] placeholder:text-[var(--ink-ghost)] transition-all"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-[6px]">
            <select value={cityFilter} onChange={e => setCityFilter(e.target.value)}
              className="h-[30px] px-[9px] border border-[var(--edge)] rounded-[6px] bg-[var(--surface)] text-[10.5px] font-semibold text-[var(--ink-muted)] outline-none focus:border-[var(--accent)] appearance-none">
              <option value="">Alle steden</option>
              {cities.map(c => <option key={c}>{c}</option>)}
            </select>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              className="h-[30px] px-[9px] border border-[var(--edge)] rounded-[6px] bg-[var(--surface)] text-[10.5px] font-semibold text-[var(--ink-muted)] outline-none focus:border-[var(--accent)] appearance-none">
              <option value="">Alle types</option>
              {types.map(t => <option key={t}>{t}</option>)}
            </select>
            {(['active', 'draft', 'inactive'] as const).map(s => (
              <button key={s} onClick={() => setStatusFilter(statusFilter === s ? null : s)}
                className={cn('h-[30px] px-3 border rounded-[6px] text-[10.5px] font-semibold transition-all',
                  statusFilter === s ? 'bg-[var(--ink)] text-white border-[var(--ink)]' : 'bg-[var(--surface)] text-[var(--ink-ghost)] border-[var(--edge)] hover:border-[var(--ink-ghost)] hover:text-[var(--ink-muted)]')}
                style={{ border: undefined }}>
                {s === 'active' ? 'Actief' : s === 'draft' ? 'Concept' : 'Inactief'}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-[5px] bg-[var(--accent)] text-white border-none px-4 py-[6px] rounded-full text-[11px] font-bold tracking-[0.03em] transition-opacity hover:opacity-80">
            <IcoPlus />Studio toevoegen
          </button>
      </div>

      {/* Content */}
      <div className="grid flex-1" style={{ gridTemplateColumns: '1fr 296px' }}>

        {/* Left */}
        <div className="border-r border-[var(--edge)]">

          {/* Stats bar */}
          <div className="grid border-b border-[var(--edge)]" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {[
              { label: 'Actief',   value: counts.active,   key: 'active',   sub: 'gepubliceerd op platform' },
              { label: 'Concept',  value: counts.draft,    key: 'draft',    sub: 'nog niet live' },
              { label: 'Inactief', value: counts.inactive, key: 'inactive', sub: 'tijdelijk offline' },
              { label: 'Totaal',   value: counts.total,    key: null,       sub: 'in het systeem' },
            ].map(({ label, value, key, sub }) => (
              <div
                key={label}
                onClick={() => key && setStatusFilter(statusFilter === key ? null : key)}
                className={cn(
                  'px-7 py-4 border-r border-[var(--edge)] last:border-r-0 transition-colors',
                  key && 'cursor-pointer hover:bg-[var(--surface)]',
                  key && statusFilter === key && 'bg-[var(--accent-tint)]',
                )}
              >
                <div className="text-[7.5px] font-bold uppercase tracking-[0.20em] text-[var(--ink-ghost)] mb-1">{label}</div>
                <div className="text-[28px] font-extrabold tracking-[-0.025em] leading-none text-[var(--ink)]">{loading ? '–' : value}</div>
                <div className="text-[10px] text-[var(--ink-ghost)] mt-[3px]">{sub}</div>
              </div>
            ))}
          </div>

          {/* Grid / List */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-5 w-5 animate-spin text-[var(--ink-ghost)]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-[var(--ink-ghost)]">
              <span className="opacity-20"><IcoBuilding /></span>
              <div className="text-[11.5px] font-bold">Geen studio&#39;s gevonden</div>
              <div className="text-[10.5px] opacity-50">Pas je filters of zoekopdracht aan</div>
            </div>
          ) : view === 'grid' ? (
            <div className="grid border-b border-[var(--edge-soft)]" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {filtered.map((s, i) => (
                <div
                  key={s.id}
                  onClick={() => setSelected(selected?.id === s.id ? null : s)}
                  className={cn(
                    'border-b border-r border-[var(--edge-soft)] cursor-pointer transition-colors overflow-hidden relative',
                    (i + 1) % 3 === 0 && 'border-r-0',
                    selected?.id === s.id ? 'bg-[var(--accent-tint)]' : 'hover:bg-[oklch(0.988_0_0)]',
                  )}
                >
                  <div className="relative w-full overflow-hidden" style={{ aspectRatio: '16/9' }}>
                    <StudioImg studio={s} className="transition-transform duration-250 hover:scale-[1.02]" />
                    <span className={cn('absolute top-[10px] left-[10px] text-[8.5px] font-bold lowercase tracking-[0.03em] px-2 py-[3px] rounded-full', chipClass(s.status ?? 'active'))}>
                      {chipLabel(s.status ?? 'active')}
                    </span>
                  </div>
                  <div className="px-4 py-[14px]">
                    <div className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-[var(--ink-ghost)] mb-1">{studioType(s)}</div>
                    <div className="text-[13px] font-extrabold text-[var(--ink)] leading-[1.2] mb-[3px]">{s.title}</div>
                    <div className="text-[10.5px] text-[var(--ink-ghost)] font-medium mb-[10px]">{s.city}</div>
                    <div className="flex items-center gap-3">
                      {s.price_per_hour && <span className="flex items-center gap-1 text-[11px] text-[var(--ink-ghost)]"><strong className="text-[var(--ink-muted)]">€{s.price_per_hour}/u</strong></span>}
                      {s.avg_rating ? <span className="text-[11px] text-[var(--ink-ghost)]"><strong className="text-[var(--ink-muted)]">★ {s.avg_rating.toFixed(1)}</strong> ({s.total_reviews})</span> : null}
                      {s.capacity ? <span className="text-[11px] text-[var(--ink-ghost)]"><strong className="text-[var(--ink-muted)]">{s.capacity}</strong> pers.</span> : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col">
              {/* List header */}
              <div className="grid px-6 py-[7px] border-b border-[var(--edge)] bg-[var(--surface)]"
                style={{ gridTemplateColumns: '48px 1fr 100px 90px 80px 80px' }}>
                {['', 'Studio', 'Type', 'Prijs/uur', 'Rating', 'Status'].map(h => (
                  <div key={h} className="text-[8px] font-bold uppercase tracking-[0.18em] text-[var(--ink-ghost)]">{h}</div>
                ))}
              </div>
              {filtered.map(s => (
                <div
                  key={s.id}
                  onClick={() => setSelected(selected?.id === s.id ? null : s)}
                  className={cn(
                    'grid px-6 items-center border-b border-[var(--edge-soft)] cursor-pointer transition-colors',
                    selected?.id === s.id ? 'bg-[var(--accent-tint)]' : 'hover:bg-[oklch(0.988_0_0)]',
                  )}
                  style={{ gridTemplateColumns: '48px 1fr 100px 90px 80px 80px' }}
                >
                  <div className="w-9 h-9 rounded-[3px] overflow-hidden bg-[var(--surface)] my-[10px] flex-shrink-0 flex items-center justify-center">
                    <StudioImg studio={s} />
                  </div>
                  <div>
                    <div className="text-[12.5px] font-bold text-[var(--ink)]">{s.title}</div>
                    <div className="text-[10.5px] text-[var(--ink-ghost)] mt-[1px]">{s.city}</div>
                  </div>
                  <div className="text-[11px] text-[var(--ink-faint)]">{studioType(s)}</div>
                  <div className="text-[11.5px] font-bold text-[var(--ink-muted)] font-mono">{s.price_per_hour ? `€${s.price_per_hour}` : '—'}</div>
                  <div className="text-[11.5px] font-bold text-[var(--ink-muted)]">{s.avg_rating ? `★ ${s.avg_rating.toFixed(1)}` : '—'}</div>
                  <div><span className={cn('inline-flex px-[9px] py-[3px] rounded-full text-[9px] font-bold', chipClass(s.status ?? 'active'))}>{chipLabel(s.status ?? 'active')}</span></div>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-[var(--edge)] px-10 py-[10px]">
            <span className="text-[11px] text-[var(--ink-ghost)] font-mono">
              Lctnships Workspace · Studios · {filtered.length} weergegeven
            </span>
          </div>
        </div>

        {/* Right panel */}
        <div className="sticky top-[48px] max-h-[calc(100vh-48px)] overflow-y-auto p-[18px] flex flex-col gap-4" style={{ scrollbarWidth: 'thin' }}>
          {selected ? (
            <DetailPanel studio={selected} onClose={() => setSelected(null)} />
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <span className="opacity-20 text-[var(--ink-ghost)]"><IcoBuilding /></span>
              <div className="text-[11.5px] font-bold text-[var(--ink-ghost)]">Selecteer een studio</div>
              <div className="text-[10.5px] text-[var(--ink-ghost)] opacity-50">Klik op een kaart voor details</div>
            </div>
          )}
        </div>
      </div>

      {/* Add panel slide-in */}
      {showAdd && <AddPanel onClose={() => setShowAdd(false)} onAdded={fetchStudios} />}
    </div>
  )
}
