'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Edit3, Check, X as XIcon, MoreHorizontal, MapPin, Camera, ImageIcon, Plus, Phone, Mail, Globe, Loader2 } from 'lucide-react'
import { studiosApi, supabase, type Studio } from '@/lib/supabase'

type Tab = 'info' | 'boekingen' | 'producties' | 'contact'
type SaveState = 'idle' | 'unsaved' | 'saving' | 'saved'

interface BookingRow {
  id: string
  status: string | null
  total_amount: number | null
  service_fee: number | null
  start_datetime: string | null
  end_datetime: string | null
  total_hours: number | null
  notes: string | null
  created_at: string
}

const TYPE_OPTIONS = ['Fotostudio', 'Muziekstudio', 'Dansstudio', 'Podcaststudio', 'Multifunctioneel']
const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'active', label: 'Actief' },
  { value: 'draft', label: 'Concept' },
  { value: 'inactive', label: 'Inactief' },
]

function eur(n: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}
function fmtDateNL(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtMonthNL(d: string) {
  const date = new Date(d)
  const m = date.toLocaleString('nl-NL', { month: 'long' })
  return `${m.charAt(0).toUpperCase()}${m.slice(1)} ${date.getFullYear()}`
}
function fmtTime(d: string | null | undefined) {
  if (!d) return ''
  return new Date(d).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
}
function statusLabel(s: string | null | undefined) {
  if (!s) return 'Concept'
  const f = STATUS_OPTIONS.find(o => o.value === s.toLowerCase())
  return f?.label || s
}

export default function StudioDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = String(params.id || '')

  const [studio, setStudio] = useState<Studio | null>(null)
  const [draft, setDraft] = useState<Partial<Studio>>({})
  const [tab, setTab] = useState<Tab>('info')
  const [editing, setEditing] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [bookings, setBookings] = useState<BookingRow[]>([])

  useEffect(() => {
    if (!id) return
    setLoading(true)
    studiosApi.getById(id)
      .then(s => {
        setStudio(s)
        setDraft(s)
      })
      .catch(e => setErr(e instanceof Error ? e.message : 'Onbekende fout'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!id) return
    supabase
      .from('bookings')
      .select('id, status, total_amount, service_fee, start_datetime, end_datetime, total_hours, notes, created_at')
      .eq('studio_id', id)
      .order('start_datetime', { ascending: false })
      .limit(200)
      .then(({ data }) => setBookings((data as BookingRow[]) || []))
  }, [id])

  const setField = <K extends keyof Studio>(key: K, value: Studio[K]) => {
    setDraft(prev => ({ ...prev, [key]: value }))
    setSaveState('unsaved')
  }

  const enterEdit = () => {
    if (studio) setDraft(studio)
    setEditing(true)
    setSaveState('idle')
  }

  const cancelEdit = () => {
    if (studio) setDraft(studio)
    setEditing(false)
    setSaveState('idle')
  }

  const saveEdit = useCallback(async () => {
    if (!studio) return
    setSaveState('saving')
    try {
      const updated = await studiosApi.update(studio.id, draft)
      setStudio(updated)
      setDraft(updated)
      setSaveState('saved')
      setTimeout(() => {
        setEditing(false)
        setSaveState('idle')
      }, 800)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Kon niet opslaan')
      setSaveState('unsaved')
    }
  }, [draft, studio])

  const amenities = useMemo(() => (editing ? draft.amenities : studio?.amenities) || [], [editing, draft, studio])
  const images = useMemo(() => (studio?.images || []).filter(Boolean), [studio])

  const bookingStats = useMemo(() => {
    const total = bookings.length
    const revenue = bookings.reduce((s, b) => s + (Number(b.total_amount) || 0), 0)
    const confirmed = bookings.filter(b => (b.status || '').toLowerCase() === 'confirmed' || (b.status || '').toLowerCase() === 'completed').length
    const upcoming = bookings
      .filter(b => b.start_datetime && new Date(b.start_datetime).getTime() > Date.now())
      .sort((a, b) => new Date(a.start_datetime!).getTime() - new Date(b.start_datetime!).getTime())[0]
    const nextLabel = upcoming?.start_datetime
      ? `${Math.max(0, Math.ceil((new Date(upcoming.start_datetime).getTime() - Date.now()) / 86400000))}d`
      : '—'
    return { total, revenue, confirmed, nextLabel }
  }, [bookings])

  const groupedBookings = useMemo(() => {
    const out: { month: string; rows: BookingRow[] }[] = []
    const seen: Record<string, BookingRow[]> = {}
    for (const b of bookings) {
      const key = b.start_datetime ? fmtMonthNL(b.start_datetime) : 'Onbekend'
      if (!seen[key]) {
        seen[key] = []
        out.push({ month: key, rows: seen[key] })
      }
      seen[key].push(b)
    }
    return out
  }, [bookings])

  const cur = editing ? draft : studio || {}
  const title = (cur as Studio).title || studio?.title || 'Studio'
  const subtitle = `${(cur as Studio).type || studio?.type || '—'} · ${(cur as Studio).city || studio?.city || '—'}`

  return (
    <div style={{ margin: '-16px -16px 0 -16px', minHeight: 'calc(100vh - 0px)', background: 'var(--bg, #F9FAFE)', overflowX: 'hidden' }}>
      {/* Header */}
      <header className="sd-header">
        <button className="sd-back" onClick={() => router.push('/studios')} aria-label="Terug">
          <ArrowLeft style={{ width: 14, height: 14 }} />
        </button>
        <div className="sd-bc">
          <span className="sd-bc-parent" onClick={() => router.push('/studios')}>Studios</span>
          <span className="sd-bc-sep">/</span>
          <span className="sd-bc-cur">{title}</span>
        </div>
        <div style={{ flex: 1 }} />
        <div className="sd-actions">
          {editing && (
            <span className="sd-save-status">
              {saveState === 'saving' && 'Opslaan…'}
              {saveState === 'saved' && '✓ Opgeslagen'}
              {saveState === 'unsaved' && 'Niet opgeslagen'}
            </span>
          )}
          {!editing ? (
            <>
              <button className="sd-btn-outline" onClick={enterEdit}>
                <Edit3 style={{ width: 13, height: 13 }} /> Bewerken
              </button>
              <button className="sd-btn-icon" aria-label="Meer">
                <MoreHorizontal style={{ width: 15, height: 15 }} />
              </button>
            </>
          ) : (
            <>
              <button className="sd-btn-outline" onClick={cancelEdit} disabled={saveState === 'saving'}>Annuleren</button>
              <button className="sd-btn-primary" onClick={saveEdit} disabled={saveState === 'saving'}>
                {saveState === 'saving' ? <Loader2 className="sd-spin" style={{ width: 13, height: 13 }} /> : <Check style={{ width: 13, height: 13 }} />}
                Opslaan
              </button>
            </>
          )}
        </div>
      </header>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink-ghost)' }}>
          <Loader2 className="sd-spin" style={{ width: 24, height: 24 }} /> Studio laden…
        </div>
      ) : !studio ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink-ghost)' }}>Studio niet gevonden.</div>
      ) : (
        <div className="sd-page">
          <div className="sd-left">
            {/* Hero image */}
            <div className="sd-hero-img">
              {images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={images[0]} alt={title} />
              ) : (
                <div className="sd-hero-ph"><Camera style={{ width: 40, height: 40, color: 'var(--ink-ghost)' }} /></div>
              )}
            </div>

            {/* Identity bar */}
            <div className="sd-hero-info">
              <div className="sd-hero-left">
                <div className="sd-type">{subtitle}</div>
                <div className="sd-name">{title}</div>
                <div className="sd-city">
                  <MapPin style={{ width: 13, height: 13, color: 'var(--ink-ghost)' }} />
                  {(cur as Studio).address || studio.address || '—'}{(cur as Studio).city || studio.city ? ` · ${(cur as Studio).city || studio.city}` : ''}
                </div>
              </div>
              <div className="sd-hero-right">
                <div className="sd-chip-row">
                  <span className={`sd-chip ${ (studio.status || 'active') === 'active' ? 'sd-chip-active' : (studio.status === 'draft') ? 'sd-chip-draft' : 'sd-chip-inactive'}`}>
                    {statusLabel(studio.status).toLowerCase()}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', fontFamily: 'ui-monospace, Menlo, monospace' }}>
                    {eur(Number(studio.price_per_hour) || 0)}
                    <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--ink-ghost)' }}>/uur</span>
                  </span>
                </div>
                <div className="sd-stat-chips">
                  <div className="sd-sc"><span className="sd-sc-v">{studio.size_sqm || '—'}</span><span className="sd-sc-l">m²</span></div>
                  <div className="sd-sc"><span className="sd-sc-v">{studio.capacity || '—'}</span><span className="sd-sc-l">personen</span></div>
                  <div className="sd-sc"><span className="sd-sc-v">{bookingStats.total}</span><span className="sd-sc-l">boekingen</span></div>
                  <div className="sd-sc"><span className="sd-sc-v">{(studio.avg_rating || studio.rating || 0).toFixed(1)}</span><span className="sd-sc-l">★ rating</span></div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="sd-tabs">
              {(['info', 'boekingen', 'producties', 'contact'] as Tab[]).map(t => (
                <button key={t} className={`sd-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
                  {t === 'info' ? 'Info' : t === 'boekingen' ? 'Boekingen' : t === 'producties' ? 'Producties' : 'Contactpersoon'}
                </button>
              ))}
            </div>

            {err && <div style={{ padding: '12px 40px', fontSize: 12, color: 'var(--danger, #dc2626)' }}>{err}</div>}

            {/* INFO TAB */}
            {tab === 'info' && (
              <>
                <Section title="Basisinfo">
                  <div className="sd-grid sd-g3">
                    <Field label="Studionaam" editing={editing} value={(cur as Studio).title} onChange={v => setField('title', v)} />
                    <SelectField label="Type" editing={editing} value={(cur as Studio).type} options={TYPE_OPTIONS} onChange={v => setField('type', v)} />
                    <SelectField label="Status" editing={editing}
                      value={statusLabel((cur as Studio).status)}
                      options={STATUS_OPTIONS.map(o => o.label)}
                      onChange={v => {
                        const found = STATUS_OPTIONS.find(o => o.label === v)
                        if (found) setField('status', found.value)
                      }}
                    />
                  </div>
                </Section>

                <Section title="Beschrijving">
                  <Field
                    label=""
                    editing={editing}
                    value={(cur as Studio).description || ''}
                    onChange={v => setField('description', v)}
                    textarea
                  />
                </Section>

                <Section title="Locatie">
                  <div className="sd-grid sd-g2">
                    <Field label="Adres" editing={editing} value={(cur as Studio).address || ''} onChange={v => setField('address', v)} />
                    <Field label="Stad" editing={editing} value={(cur as Studio).city || ''} onChange={v => setField('city', v)} />
                    <Field label="Land" editing={editing} value={(cur as Studio).country || ''} onChange={v => setField('country', v)} />
                    <Field label="Locatie label" editing={editing} value={(cur as Studio).location || ''} onChange={v => setField('location', v)} />
                  </div>
                </Section>

                <Section title="Details">
                  <div className="sd-grid sd-g3">
                    <Field label="Uurprijs (€)" editing={editing} value={String((cur as Studio).price_per_hour || '')} onChange={v => setField('price_per_hour', Number(v))} type="number" />
                    <Field label="Max. capaciteit" editing={editing} value={String((cur as Studio).capacity || '')} onChange={v => setField('capacity', Number(v))} type="number" />
                    <Field label="Oppervlakte (m²)" editing={editing} value={String((cur as Studio).size_sqm || '')} onChange={v => setField('size_sqm', Number(v))} type="number" />
                    <Field label="Min. uren" editing={editing} value={String((cur as Studio).minimum_hours || '')} onChange={v => setField('minimum_hours', Number(v))} type="number" />
                    <Field label="Max. uren" editing={editing} value={String((cur as Studio).maximum_hours || '')} onChange={v => setField('maximum_hours', Number(v))} type="number" />
                  </div>
                </Section>

                <Section title="Voorzieningen">
                  <div className="sd-amen-wrap">
                    {amenities.map((a, i) => (
                      <span className="sd-amen" key={`${a}-${i}`}>
                        {a}
                        {editing && (
                          <button className="sd-amen-del" onClick={() => {
                            const next = (draft.amenities || []).filter((_, idx) => idx !== i)
                            setField('amenities', next)
                          }} aria-label="Verwijder">
                            <XIcon style={{ width: 11, height: 11 }} />
                          </button>
                        )}
                      </span>
                    ))}
                    {editing && (
                      <button className="sd-amen-add" onClick={() => {
                        const v = prompt('Nieuwe voorziening:')
                        if (!v?.trim()) return
                        setField('amenities', [...(draft.amenities || []), v.trim()])
                      }}>
                        <Plus style={{ width: 11, height: 11 }} /> toevoegen
                      </button>
                    )}
                  </div>
                </Section>

                <div className="sd-section-eye" style={{ padding: '16px 40px 8px', borderTop: '1px solid var(--edge)' }}>Foto&apos;s</div>
                <div className="sd-photo-grid">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="sd-photo-cell">
                      {images[i] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={images[i]} alt={`${title} ${i + 1}`} />
                      ) : (
                        <div className="sd-photo-ph"><ImageIcon style={{ width: 22, height: 22, color: 'var(--ink-ghost)' }} /></div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* BOEKINGEN TAB */}
            {tab === 'boekingen' && (
              <>
                <div className="sd-bk-summary">
                  <div className="sd-bk-cell"><span className="sd-bk-v">{bookingStats.total}</span><span className="sd-bk-l">Totaal boekingen</span></div>
                  <div className="sd-bk-cell"><span className="sd-bk-v">{eur(bookingStats.revenue)}</span><span className="sd-bk-l">Totale omzet</span></div>
                  <div className="sd-bk-cell"><span className="sd-bk-v">{bookingStats.confirmed}</span><span className="sd-bk-l">Bevestigd</span></div>
                  <div className="sd-bk-cell"><span className="sd-bk-v">{bookingStats.nextLabel}</span><span className="sd-bk-l">Volgende shoot</span></div>
                </div>

                <div className="sd-col-h">
                  <span>Omschrijving</span>
                  <span>Datum</span>
                  <span>Duur</span>
                  <span>Bedrag</span>
                  <span>Status</span>
                </div>

                {bookings.length === 0 ? (
                  <div style={{ padding: 24, color: 'var(--ink-ghost)', fontSize: 12, fontStyle: 'italic' }}>Geen boekingen voor deze studio.</div>
                ) : groupedBookings.map(g => {
                  const monthRev = g.rows.reduce((s, r) => s + (Number(r.total_amount) || 0), 0)
                  return (
                    <div key={g.month}>
                      <div className="sd-month-h">
                        <span className="sd-month-l">{g.month}</span>
                        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                          <span className="sd-month-c">{g.rows.length} boeking{g.rows.length === 1 ? '' : 'en'}</span>
                          <span className="sd-month-r">{eur(monthRev)}</span>
                        </div>
                      </div>
                      {g.rows.map(b => (
                        <div key={b.id} className="sd-bk-row">
                          <div>
                            <div className="sd-bk-name">{b.notes ? b.notes.split('\n')[0].slice(0, 80) : 'Boeking'}</div>
                            <div className="sd-bk-sub">{b.id.slice(0, 8)}</div>
                          </div>
                          <div>
                            <div className="sd-bk-date">{fmtDateNL(b.start_datetime)}</div>
                            <div className="sd-bk-time">{fmtTime(b.start_datetime)}{b.end_datetime ? `–${fmtTime(b.end_datetime)}` : ''}</div>
                          </div>
                          <div className="sd-bk-dur">{b.total_hours ? `${b.total_hours} uur` : '—'}</div>
                          <div className="sd-bk-amt">{eur(Number(b.total_amount) || 0)}</div>
                          <div>
                            <span className={`sd-chip ${(b.status || '').toLowerCase() === 'confirmed' || (b.status || '').toLowerCase() === 'completed' ? 'sd-chip-active' : 'sd-chip-inactive'}`}>
                              {(b.status || 'pending').toLowerCase()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </>
            )}

            {/* PRODUCTIES TAB */}
            {tab === 'producties' && (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-ghost)' }}>
                <div style={{ fontSize: 12, fontStyle: 'italic' }}>Producties voor deze studio worden gekoppeld vanuit /producties.</div>
              </div>
            )}

            {/* CONTACT TAB */}
            {tab === 'contact' && (
              <>
                <div className="sd-contact-card">
                  <div className="sd-contact-avatar">{(title || '?').slice(0, 2).toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div className="sd-contact-name">{title}</div>
                    <div className="sd-contact-role">Studio · Host</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {studio.host_id && (
                        <div className="sd-contact-row">
                          <Phone style={{ width: 13, height: 13, color: 'var(--ink-ghost)' }} />
                          <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>Host ID: {studio.host_id.slice(0, 8)}</span>
                        </div>
                      )}
                      <div className="sd-contact-row">
                        <MapPin style={{ width: 13, height: 13, color: 'var(--ink-ghost)' }} />
                        <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{studio.address || '—'}{studio.city ? `, ${studio.city}` : ''}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="sd-section-eye" style={{ padding: '18px 40px 0', borderTop: '1px solid var(--edge)' }}>Sleutelinformatie</div>
                <div className="sd-key-grid">
                  <KeyCell label="Toegangscode" value={(cur as Studio).entry_code} editing={editing} onChange={v => setField('entry_code', v)} />
                  <KeyCell label="Aankomst procedure" value={(cur as Studio).access_instructions} editing={editing} onChange={v => setField('access_instructions', v)} />
                  <KeyCell label="Parkeren" value={(cur as Studio).parking_info} editing={editing} onChange={v => setField('parking_info', v)} />
                  <KeyCell label="Check-in tijd" value={(cur as Studio).check_in_time} editing={editing} onChange={v => setField('check_in_time', v)} />
                  <KeyCell label="Wifi netwerk" value={(cur as Studio).wifi_network_name} editing={editing} onChange={v => setField('wifi_network_name', v)} />
                  <KeyCell label="Wifi wachtwoord" value={(cur as Studio).wifi_password} editing={editing} onChange={v => setField('wifi_password', v)} />
                </div>
              </>
            )}

            <div className="sd-footer">
              Studio #{studio.id.slice(0, 8)} · aangemaakt {fmtDateNL(studio.created_at)} · {bookingStats.total} boekingen
            </div>
          </div>

          {/* RIGHT PANEL */}
          <aside className="sd-right">
            <div className="sd-widget">
              <div className="sd-w-head"><span className="sd-w-eye">Statistieken</span></div>
              <div>
                <StatRow l="Totale omzet" v={eur(bookingStats.revenue)} />
                <StatRow l="Boekingen totaal" v={String(bookingStats.total)} />
                <StatRow l="Bevestigd" v={String(bookingStats.confirmed)} />
                <StatRow l="Gem. boekingswaarde" v={eur(bookingStats.total > 0 ? bookingStats.revenue / bookingStats.total : 0)} />
                <StatRow l="Volgende shoot" v={bookingStats.nextLabel} />
                <StatRow l="Rating" v={`${(studio.avg_rating || studio.rating || 0).toFixed(1)} ★`} />
              </div>
            </div>

            <div className="sd-widget">
              <div className="sd-action-body">
                <button className="sd-btn-full" onClick={() => router.push('/producties')}>Nieuwe productie plannen</button>
                <button className="sd-btn-full-out">Boeking toevoegen</button>
                <button className="sd-btn-full-out">Mail sturen naar host</button>
                <button className="sd-btn-ghost" onClick={async () => {
                  if (!confirm('Studio definitief verwijderen?')) return
                  try {
                    await studiosApi.delete(studio.id)
                    router.push('/studios')
                  } catch (e) {
                    setErr(e instanceof Error ? e.message : 'Verwijderen mislukt')
                  }
                }}>Studio verwijderen</button>
              </div>
            </div>
          </aside>
        </div>
      )}

      <style jsx>{`
        .sd-header {
          position: sticky; top: 0; z-index: 100;
          height: 58px; background: var(--bg, #F9FAFE);
          border-bottom: 1px solid var(--edge);
          display: flex; align-items: center;
          padding: 0 40px;
        }
        .sd-back {
          width: 28px; height: 28px;
          border: 1px solid var(--edge); border-radius: 50%;
          background: transparent;
          display: flex; align-items: center; justify-content: center;
          color: var(--ink-ghost); margin-right: 12px;
          cursor: pointer; transition: all 140ms;
        }
        .sd-back:hover { border-color: var(--ink-ghost); color: var(--ink-muted); }
        .sd-bc { display: flex; align-items: center; gap: 6px; font-size: 11.5px; }
        .sd-bc-parent { color: var(--ink-ghost); font-weight: 500; cursor: pointer; transition: color 120ms; }
        .sd-bc-parent:hover { color: var(--ink-muted); }
        .sd-bc-sep { color: var(--edge); }
        .sd-bc-cur { color: var(--ink-muted); font-weight: 600; }
        .sd-actions { display: flex; align-items: center; gap: 7px; }
        .sd-save-status { font-size: 10.5px; color: var(--ink-ghost); margin-right: 6px; }
        .sd-btn-outline {
          background: transparent; color: var(--ink);
          border: 1px solid var(--edge);
          padding: 5px 16px; border-radius: 9999px;
          font-size: 11px; font-weight: 600;
          display: inline-flex; align-items: center; gap: 5px;
          cursor: pointer; transition: all 130ms;
        }
        .sd-btn-outline:hover { border-color: var(--ink-ghost); background: var(--surface); }
        .sd-btn-outline:disabled { opacity: 0.5; cursor: default; }
        .sd-btn-primary {
          background: var(--accent, #0E4F6D); color: #fff; border: none;
          padding: 6px 16px; border-radius: 9999px;
          font-size: 11px; font-weight: 700; letter-spacing: 0.03em;
          display: inline-flex; align-items: center; gap: 5px;
          cursor: pointer; transition: opacity 130ms;
        }
        .sd-btn-primary:hover { opacity: 0.82; }
        .sd-btn-primary:disabled { opacity: 0.55; cursor: default; }
        .sd-btn-icon {
          width: 30px; height: 30px;
          border: 1px solid var(--edge); border-radius: 50%;
          background: transparent;
          display: inline-flex; align-items: center; justify-content: center;
          color: var(--ink-ghost); cursor: pointer; transition: all 130ms;
        }
        .sd-btn-icon:hover { border-color: var(--ink-ghost); color: var(--ink-muted); }
        .sd-spin { animation: sd-spin 0.9s linear infinite; }
        @keyframes sd-spin { to { transform: rotate(360deg); } }

        .sd-page {
          display: grid; grid-template-columns: minmax(0, 1fr) 300px;
          align-items: start;
        }
        .sd-left { border-right: 1px solid var(--edge); }

        .sd-hero-img {
          position: relative; width: 100%; aspect-ratio: 21/6;
          overflow: hidden; background: var(--surface);
          border-bottom: 1px solid var(--edge);
        }
        .sd-hero-img :global(img) {
          width: 100%; height: 100%; object-fit: cover; display: block;
        }
        .sd-hero-ph {
          width: 100%; height: 100%;
          background: linear-gradient(135deg, oklch(0.93 0 0) 0%, oklch(0.88 0 0) 100%);
          display: flex; align-items: center; justify-content: center;
        }
        .sd-hero-info {
          display: grid; grid-template-columns: 1fr auto;
          align-items: start; gap: 20px;
          padding: 20px 40px;
          border-bottom: 1px solid var(--edge);
        }
        .sd-hero-left { display: flex; flex-direction: column; gap: 8px; }
        .sd-type {
          font-size: 9px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.20em;
          color: var(--ink-ghost);
        }
        .sd-name {
          font-size: 24px; font-weight: 900; color: var(--ink);
          line-height: 1.15; letter-spacing: -0.01em;
        }
        .sd-city {
          font-size: 12px; color: var(--ink-muted);
          display: flex; align-items: center; gap: 5px;
        }
        .sd-hero-right {
          display: flex; flex-direction: column; align-items: flex-end;
          gap: 10px; padding-top: 4px;
        }
        .sd-chip-row { display: flex; align-items: center; gap: 6px; }
        .sd-chip {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 3px 9px; border-radius: 9999px;
          font-size: 9px; font-weight: 700;
          text-transform: lowercase; white-space: nowrap;
        }
        .sd-chip-active { background: #ecfdf5; color: var(--success, #15803d); }
        .sd-chip-draft { background: #fffbeb; color: #b45309; }
        .sd-chip-inactive { background: var(--surface); color: var(--ink-ghost); border: 1px solid var(--edge); }

        .sd-stat-chips {
          display: flex; align-items: center; gap: 0;
          border: 1px solid var(--edge); border-radius: 4px;
          overflow: hidden; margin-top: 4px;
        }
        .sd-sc {
          padding: 5px 14px;
          display: flex; flex-direction: column; align-items: center;
          border-right: 1px solid var(--edge);
        }
        .sd-sc:last-child { border-right: none; }
        .sd-sc-v {
          font-size: 15px; font-weight: 800; color: var(--ink);
          font-family: ui-monospace, Menlo, monospace;
        }
        .sd-sc-l {
          font-size: 8.5px; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.12em;
          color: var(--ink-ghost); margin-top: 1px;
        }

        .sd-tabs {
          display: flex; align-items: center;
          border-bottom: 1px solid var(--edge);
          padding: 0 40px;
          position: sticky; top: 58px;
          background: var(--bg, #F9FAFE); z-index: 5;
        }
        .sd-tab {
          height: 44px; padding: 0 18px;
          border: none; background: none;
          font-size: 11.5px; font-weight: 600; color: var(--ink-ghost);
          border-bottom: 2px solid transparent;
          margin-bottom: -1px; cursor: pointer;
          transition: all 130ms;
        }
        .sd-tab:hover { color: var(--ink-muted); }
        .sd-tab.active { color: var(--ink); border-bottom-color: var(--accent, #0E4F6D); }

        .sd-section { padding: 24px 40px; border-bottom: 1px solid var(--edge); }
        .sd-section-eye {
          font-size: 8.5px; font-weight: 700;
          letter-spacing: 0.20em; text-transform: uppercase;
          color: var(--ink-ghost); margin-bottom: 16px;
        }
        .sd-grid { display: grid; gap: 18px 28px; }
        .sd-g2 { grid-template-columns: 1fr 1fr; }
        .sd-g3 { grid-template-columns: 1fr 1fr 1fr; }

        .sd-amen-wrap { display: flex; flex-wrap: wrap; gap: 6px; }
        .sd-amen {
          padding: 4px 10px; border-radius: 9999px;
          font-size: 10.5px; font-weight: 500;
          background: var(--surface); border: 1px solid var(--edge);
          color: var(--ink-faint);
          display: inline-flex; align-items: center; gap: 5px;
        }
        .sd-amen-del {
          width: 13px; height: 13px;
          border: none; background: none; color: var(--ink-ghost);
          cursor: pointer;
          display: inline-flex; align-items: center; justify-content: center;
          border-radius: 50%; padding: 0;
          transition: color 110ms;
        }
        .sd-amen-del:hover { color: var(--danger, #dc2626); }
        .sd-amen-add {
          font-size: 10.5px; font-weight: 600; color: var(--accent, #0E4F6D);
          border: 1px dashed var(--edge); background: none;
          padding: 4px 12px; border-radius: 9999px;
          cursor: pointer;
          display: inline-flex; align-items: center; gap: 5px;
        }
        .sd-amen-add:hover { border-color: var(--accent, #0E4F6D); background: #e7f3f8; }

        .sd-photo-grid {
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 8px; padding: 16px 40px;
          border-bottom: 1px solid var(--edge);
        }
        .sd-photo-cell {
          aspect-ratio: 1; overflow: hidden;
          background: var(--surface);
          border: 1px solid var(--edge); border-radius: 3px;
        }
        .sd-photo-cell :global(img) {
          width: 100%; height: 100%; object-fit: cover; display: block;
        }
        .sd-photo-ph {
          width: 100%; height: 100%;
          background: oklch(0.95 0 0);
          display: flex; align-items: center; justify-content: center;
        }

        .sd-bk-summary {
          display: grid; grid-template-columns: repeat(4, 1fr);
          border-bottom: 1px solid var(--edge);
          background: var(--surface);
        }
        .sd-bk-cell {
          padding: 14px 24px;
          border-right: 1px solid var(--edge);
          display: flex; flex-direction: column; gap: 3px;
        }
        .sd-bk-cell:last-child { border-right: none; }
        .sd-bk-v {
          font-size: 20px; font-weight: 900;
          color: var(--ink);
          font-family: ui-monospace, Menlo, monospace;
          letter-spacing: -0.02em;
        }
        .sd-bk-l {
          font-size: 9px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.14em;
          color: var(--ink-ghost);
        }
        .sd-col-h {
          display: grid; grid-template-columns: 1fr 140px 72px 90px 100px;
          padding: 8px 40px 7px;
          background: var(--surface);
          border-bottom: 1px solid var(--edge);
        }
        .sd-col-h :global(span) {
          font-size: 8px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.16em;
          color: var(--ink-ghost);
        }
        .sd-month-h {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 40px 8px;
          background: oklch(0.975 0 0);
          border-bottom: 1px solid var(--edge);
          position: sticky; top: calc(58px + 44px);
        }
        .sd-month-l {
          font-size: 9px; font-weight: 700;
          letter-spacing: 0.18em; text-transform: uppercase;
          color: var(--ink-ghost);
        }
        .sd-month-c { font-size: 9px; color: var(--ink-ghost); }
        .sd-month-r {
          font-size: 10.5px; font-weight: 700;
          color: var(--ink-muted);
          font-family: ui-monospace, Menlo, monospace;
        }
        .sd-bk-row {
          display: grid; grid-template-columns: 1fr 140px 72px 90px 100px;
          align-items: center;
          padding: 13px 40px;
          border-bottom: 1px solid var(--edge-soft, #e5e5e5);
          transition: background 100ms;
        }
        .sd-bk-row:hover { background: oklch(0.988 0 0); }
        .sd-bk-name { font-size: 12.5px; font-weight: 700; color: var(--ink); }
        .sd-bk-sub { font-size: 10px; color: var(--ink-ghost); margin-top: 1px; }
        .sd-bk-date {
          font-size: 11px; font-weight: 600; color: var(--ink-muted);
          font-family: ui-monospace, Menlo, monospace;
        }
        .sd-bk-time { font-size: 9.5px; color: var(--ink-ghost); margin-top: 2px; }
        .sd-bk-dur { font-size: 11px; color: var(--ink-ghost); }
        .sd-bk-amt {
          font-size: 12px; font-weight: 700; color: var(--ink-muted);
          font-family: ui-monospace, Menlo, monospace;
        }

        .sd-contact-card {
          display: flex; align-items: flex-start; gap: 16px;
          padding: 24px 40px;
          border-bottom: 1px solid var(--edge);
        }
        .sd-contact-avatar {
          width: 48px; height: 48px; border-radius: 50%;
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 16px; font-weight: 900; color: #fff;
          background: var(--accent, #0E4F6D);
        }
        .sd-contact-name {
          font-size: 15px; font-weight: 800; color: var(--ink);
          margin-bottom: 2px;
        }
        .sd-contact-role {
          font-size: 11px; color: var(--ink-ghost);
          margin-bottom: 14px;
        }
        .sd-contact-row { display: flex; align-items: center; gap: 9px; }

        .sd-key-grid {
          display: grid; grid-template-columns: 1fr 1fr;
        }
        .sd-key-cell {
          padding: 16px 40px;
          border-right: 1px solid var(--edge-soft, #e5e5e5);
          border-bottom: 1px solid var(--edge-soft, #e5e5e5);
        }
        .sd-key-cell:nth-child(even) { border-right: none; }
        .sd-key-lbl {
          font-size: 7.5px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.18em;
          color: var(--ink-ghost); margin-bottom: 5px;
        }
        .sd-key-val {
          font-size: 12.5px; font-weight: 600;
          color: var(--ink-muted); line-height: 1.5;
        }

        .sd-footer {
          border-top: 1px solid var(--edge);
          padding: 10px 40px;
          font-size: 11px; color: var(--ink-ghost);
          font-family: ui-monospace, Menlo, monospace;
        }

        .sd-right {
          position: sticky; top: 58px;
          max-height: calc(100vh - 58px);
          overflow-y: auto;
          padding: 18px;
          display: flex; flex-direction: column; gap: 14px;
        }
        .sd-widget {
          border: 1px solid var(--edge);
          border-radius: 4px; overflow: hidden;
          background: var(--bg, #F9FAFE);
        }
        .sd-w-head {
          padding: 9px 13px;
          border-bottom: 1px solid var(--edge);
          background: var(--surface);
        }
        .sd-w-eye {
          font-size: 8px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.20em;
          color: var(--ink-ghost);
        }

        .sd-action-body {
          padding: 12px 13px;
          display: flex; flex-direction: column; gap: 6px;
        }
        .sd-btn-full {
          display: block; width: 100%;
          background: var(--accent, #0E4F6D); color: #fff; border: none;
          padding: 8px; border-radius: 4px;
          font-size: 11.5px; font-weight: 700;
          text-align: center; cursor: pointer;
          transition: opacity 130ms;
        }
        .sd-btn-full:hover { opacity: 0.82; }
        .sd-btn-full-out {
          display: block; width: 100%;
          background: transparent; color: var(--ink);
          border: 1px solid var(--edge);
          padding: 7px; border-radius: 4px;
          font-size: 11.5px; font-weight: 600;
          text-align: center; cursor: pointer;
          transition: all 130ms;
        }
        .sd-btn-full-out:hover { border-color: var(--ink-ghost); background: var(--surface); }
        .sd-btn-ghost {
          display: block; width: 100%;
          background: none; border: none;
          font-size: 11px; color: var(--ink-ghost);
          padding: 4px; cursor: pointer;
          text-align: center;
          transition: color 130ms;
        }
        .sd-btn-ghost:hover { color: var(--danger, #dc2626); }
      `}</style>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="sd-section">
      {title && <div className="sd-section-eye">{title}</div>}
      {children}
      <style jsx>{`
        .sd-section { padding: 24px 40px; border-bottom: 1px solid var(--edge); }
        .sd-section-eye {
          font-size: 8.5px; font-weight: 700;
          letter-spacing: 0.20em; text-transform: uppercase;
          color: var(--ink-ghost); margin-bottom: 16px;
        }
      `}</style>
    </div>
  )
}

function Field({ label, value, editing, onChange, textarea, type }: {
  label: string
  value: string | undefined
  editing: boolean
  onChange: (v: string) => void
  textarea?: boolean
  type?: string
}) {
  return (
    <div className="f-field">
      {label && <label className="f-label">{label}</label>}
      {!editing ? (
        <div className={`f-view${!value ? ' muted' : ''}`}>{value || '—'}</div>
      ) : textarea ? (
        <textarea className="f-ta" rows={4} value={value || ''} onChange={e => onChange(e.target.value)} />
      ) : (
        <input className="f-in" type={type || 'text'} value={value || ''} onChange={e => onChange(e.target.value)} />
      )}
      <style jsx>{`
        .f-field { display: flex; flex-direction: column; gap: 5px; }
        .f-label {
          font-size: 8px; font-weight: 700;
          letter-spacing: 0.20em; text-transform: uppercase;
          color: var(--ink-ghost);
        }
        .f-view {
          font-size: 12.5px; font-weight: 500; color: var(--ink);
          padding: 5px 0; min-height: 30px; line-height: 1.5;
        }
        .f-view.muted { color: var(--ink-ghost); font-style: italic; }
        .f-in {
          border: none; border-bottom: 1px solid var(--edge);
          background: transparent;
          padding: 5px 0; font-size: 12.5px; font-weight: 500;
          color: var(--ink); outline: none; width: 100%;
          font-family: inherit;
          transition: border-color 130ms;
        }
        .f-in:focus { border-bottom-color: var(--accent, #0E4F6D); }
        .f-ta {
          border: 1px solid var(--edge);
          background: transparent;
          padding: 10px 12px; font-size: 12.5px; color: var(--ink);
          outline: none; width: 100%;
          border-radius: 3px;
          resize: vertical; min-height: 80px;
          line-height: 1.65;
          font-family: inherit;
          transition: border-color 130ms;
        }
        .f-ta:focus { border-color: var(--accent, #0E4F6D); }
      `}</style>
    </div>
  )
}

function SelectField({ label, value, editing, options, onChange }: {
  label: string
  value: string | undefined
  editing: boolean
  options: string[]
  onChange: (v: string) => void
}) {
  return (
    <div className="f-field">
      {label && <label className="f-label">{label}</label>}
      {!editing ? (
        <div className={`f-view${!value ? ' muted' : ''}`}>{value || '—'}</div>
      ) : (
        <select className="f-sel" value={value || ''} onChange={e => onChange(e.target.value)}>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      )}
      <style jsx>{`
        .f-field { display: flex; flex-direction: column; gap: 5px; }
        .f-label {
          font-size: 8px; font-weight: 700;
          letter-spacing: 0.20em; text-transform: uppercase;
          color: var(--ink-ghost);
        }
        .f-view {
          font-size: 12.5px; font-weight: 500; color: var(--ink);
          padding: 5px 0; min-height: 30px; line-height: 1.5;
        }
        .f-view.muted { color: var(--ink-ghost); font-style: italic; }
        .f-sel {
          border: none; border-bottom: 1px solid var(--edge);
          background: transparent;
          padding: 5px 0; font-size: 12.5px; font-weight: 500;
          color: var(--ink); outline: none; width: 100%;
          appearance: none; -webkit-appearance: none;
          cursor: pointer;
          font-family: inherit;
          transition: border-color 130ms;
        }
        .f-sel:focus { border-bottom-color: var(--accent, #0E4F6D); }
      `}</style>
    </div>
  )
}

function KeyCell({ label, value, editing, onChange }: {
  label: string
  value: string | undefined | null
  editing: boolean
  onChange: (v: string) => void
}) {
  return (
    <div className="sd-key-cell">
      <div className="sd-key-lbl">{label}</div>
      {!editing ? (
        <div className="sd-key-val">{value || '—'}</div>
      ) : (
        <input className="kc-in" value={value || ''} onChange={e => onChange(e.target.value)} />
      )}
      <style jsx>{`
        .sd-key-cell {
          padding: 16px 40px;
          border-right: 1px solid var(--edge-soft, #e5e5e5);
          border-bottom: 1px solid var(--edge-soft, #e5e5e5);
        }
        .sd-key-cell:nth-child(even) { border-right: none; }
        .sd-key-lbl {
          font-size: 7.5px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.18em;
          color: var(--ink-ghost); margin-bottom: 5px;
        }
        .sd-key-val {
          font-size: 12.5px; font-weight: 600;
          color: var(--ink-muted); line-height: 1.5;
        }
        .kc-in {
          border: none; border-bottom: 1px solid var(--edge);
          background: transparent;
          padding: 5px 0; font-size: 12.5px; font-weight: 500;
          color: var(--ink); outline: none; width: 100%;
          font-family: inherit;
          margin-top: 4px;
          transition: border-color 130ms;
        }
        .kc-in:focus { border-bottom-color: var(--accent, #0E4F6D); }
      `}</style>
    </div>
  )
}

function StatRow({ l, v }: { l: string; v: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 13px',
      borderBottom: '1px solid var(--edge-soft, #e5e5e5)',
    }}>
      <span style={{ fontSize: 11, color: 'var(--ink-ghost)' }}>{l}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-muted)', fontFamily: 'ui-monospace, Menlo, monospace' }}>{v}</span>
    </div>
  )
}
