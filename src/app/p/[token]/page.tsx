'use client'

import { use, useEffect, useState } from 'react'
import { Check, Loader2, MapPin, Calendar } from 'lucide-react'

type PublicProduction = {
  id: string
  title: string
  description: string | null
  location: string | null
  proposed_dates: string[]
  status: 'open' | 'closed'
  final_date: string | null
  deadline: string | null
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function deadlineRelative(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now()
  if (ms < 0) return 'gesloten'
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const mins = Math.floor((ms % (1000 * 60 * 60)) / 60000)
  if (days >= 1) return `${days} d ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
  return `${hours} u ${String(mins).padStart(2, '0')}`
}

export default function PublicVotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [production, setProduction] = useState<PublicProduction | null>(null)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDuplicate, setIsDuplicate] = useState(false)

  useEffect(() => {
    fetch(`/api/productions/public/${token}`)
      .then(r => { if (!r.ok) throw new Error('notfound'); return r.json() })
      .then((data: PublicProduction) => setProduction(data))
      .catch(() => setLoadErr('Deze link is ongeldig of verlopen.'))
  }, [token])

  const toggle = (d: string) => {
    const next = new Set(selected)
    if (next.has(d)) next.delete(d)
    else next.add(d)
    setSelected(next)
  }

  const submit = async () => {
    setError(null)
    setIsDuplicate(false)
    if (!name.trim()) return setError('Vul je naam in')
    if (selected.size === 0) return setError('Selecteer minimaal één datum')
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return setError('Ongeldig e-mailadres')
    }

    setSubmitting(true)
    const res = await fetch(`/api/productions/public/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        voter_name: name.trim(),
        voter_email: email.trim() || null,
        available_dates: Array.from(selected),
        note: note.trim() || null,
      }),
    })
    setSubmitting(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Kon niet opslaan')
      if (data.duplicate) setIsDuplicate(true)
      return
    }
    setSubmitted(true)
  }

  if (loadErr) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#d4d1ca' }}>
        <div style={{ background: '#fff', border: '1px solid var(--edge)', padding: 36, maxWidth: 420, textAlign: 'center', borderRadius: 4 }}>
          <p style={{ fontSize: 14, color: 'var(--ink-muted)' }}>{loadErr}</p>
        </div>
      </div>
    )
  }

  if (!production) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#d4d1ca' }}>
        <Loader2 className="animate-spin" style={{ width: 22, height: 22, color: 'var(--ink-ghost)' }} />
      </div>
    )
  }

  const isClosed = production.status === 'closed' || !!production.final_date
  const deadlinePassed = production.deadline && new Date(production.deadline) < new Date()

  return (
    <div style={{ minHeight: '100vh', background: '#d4d1ca', padding: '40px 20px', fontFamily: "'League Spartan', ui-sans-serif, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 560, margin: '0 auto', background: '#F9FAFE', border: '1px solid var(--edge, oklch(0.922 0 0))', borderRadius: 6, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '28px 32px 18px', borderBottom: '1px solid var(--edge, oklch(0.922 0 0))' }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.20em', textTransform: 'uppercase', color: 'var(--ink-ghost, oklch(0.708 0 0))', marginBottom: 6 }}>
            Productie · stem op datum
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--ink, oklch(0.145 0 0))', lineHeight: 1.2, marginBottom: 10 }}>
            {production.title}
          </h1>
          {production.location && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-muted, oklch(0.45 0 0))' }}>
              <MapPin style={{ width: 13, height: 13 }} />
              {production.location}
            </div>
          )}
          {production.description && (
            <p style={{ fontSize: 13, color: 'var(--ink-muted, oklch(0.45 0 0))', lineHeight: 1.5, marginTop: 12, whiteSpace: 'pre-wrap' }}>
              {production.description}
            </p>
          )}
          {production.deadline && !deadlinePassed && (
            <div style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 9999, fontSize: 10.5, fontWeight: 600, background: 'oklch(0.97 0.05 72)', color: 'oklch(0.50 0.14 65)' }}>
              stemmen sluiten in {deadlineRelative(production.deadline)}
            </div>
          )}
        </div>

        {/* Closed state */}
        {isClosed ? (
          <div style={{ padding: '36px 32px', textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'oklch(0.96 0.04 145)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Check style={{ width: 24, height: 24, color: 'oklch(0.62 0.16 145)' }} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink, oklch(0.145 0 0))', marginBottom: 6 }}>
              {production.final_date ? 'Datum vastgesteld' : 'Stemmen gesloten'}
            </div>
            {production.final_date && (
              <div style={{ fontSize: 13, color: 'var(--ink-muted, oklch(0.45 0 0))' }}>
                {formatDate(production.final_date)}
              </div>
            )}
            <p style={{ fontSize: 12, color: 'var(--ink-ghost, oklch(0.708 0 0))', marginTop: 14 }}>
              Bedankt voor je stem. Verdere details ontvang je via email of WhatsApp.
            </p>
          </div>
        ) : submitted ? (
          <div style={{ padding: '36px 32px', textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'oklch(0.96 0.04 145)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Check style={{ width: 24, height: 24, color: 'oklch(0.62 0.16 145)' }} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink, oklch(0.145 0 0))', marginBottom: 6 }}>
              Je stem is opgeslagen
            </div>
            <p style={{ fontSize: 12, color: 'var(--ink-ghost, oklch(0.708 0 0))' }}>
              Bedankt — zodra de datum vaststaat hoor je het via email of WhatsApp.
            </p>
          </div>
        ) : (
          <>
            {/* Date selection */}
            <div style={{ padding: '20px 32px' }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-ghost, oklch(0.708 0 0))', marginBottom: 12 }}>
                Welke datums kun je?
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {production.proposed_dates.map(d => {
                  const isSel = selected.has(d)
                  return (
                    <button
                      key={d}
                      onClick={() => toggle(d)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '11px 14px',
                        border: `1px solid ${isSel ? 'var(--accent, #0E4F6D)' : 'var(--edge, oklch(0.922 0 0))'}`,
                        borderRadius: 5,
                        background: isSel ? 'var(--accent-tint, #e7f3f8)' : '#fff',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 130ms',
                        width: '100%',
                      }}
                    >
                      <div
                        style={{
                          width: 18, height: 18, borderRadius: 3, flexShrink: 0,
                          border: `1.5px solid ${isSel ? 'var(--accent, #0E4F6D)' : 'var(--edge, oklch(0.922 0 0))'}`,
                          background: isSel ? 'var(--accent, #0E4F6D)' : '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        {isSel && <Check style={{ width: 12, height: 12, color: '#fff' }} />}
                      </div>
                      <Calendar style={{ width: 14, height: 14, color: isSel ? 'var(--accent, #0E4F6D)' : 'var(--ink-ghost, oklch(0.708 0 0))', flexShrink: 0 }} />
                      <span style={{ fontSize: 13.5, fontWeight: isSel ? 700 : 600, color: isSel ? 'var(--accent, #0E4F6D)' : 'var(--ink, oklch(0.145 0 0))' }}>
                        {formatDate(d)}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Voter info */}
            <div style={{ padding: '8px 32px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-ghost, oklch(0.708 0 0))', marginBottom: 5 }}>
                  Je naam *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Bijv. Lisa van der Berg"
                  style={{ width: '100%', boxSizing: 'border-box', border: '1px solid var(--edge, oklch(0.922 0 0))', borderRadius: 3, padding: '9px 12px', fontSize: 13, color: 'var(--ink, oklch(0.145 0 0))', background: '#fff', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-ghost, oklch(0.708 0 0))', marginBottom: 5 }}>
                  E-mail (optioneel)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="naam@email.com"
                  style={{ width: '100%', boxSizing: 'border-box', border: '1px solid var(--edge, oklch(0.922 0 0))', borderRadius: 3, padding: '9px 12px', fontSize: 13, color: 'var(--ink, oklch(0.145 0 0))', background: '#fff', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-ghost, oklch(0.708 0 0))', marginBottom: 5 }}>
                  Notitie (optioneel)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="Voorkeur, voorwaarden, etc…"
                  style={{ width: '100%', boxSizing: 'border-box', border: '1px solid var(--edge, oklch(0.922 0 0))', borderRadius: 3, padding: '9px 12px', fontSize: 13, color: 'var(--ink, oklch(0.145 0 0))', background: '#fff', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
              {error && (
                <div style={{ padding: '8px 12px', background: 'oklch(0.97 0.03 27)', border: '1px solid oklch(0.577 0.245 27)', borderRadius: 3, fontSize: 12, color: 'oklch(0.577 0.245 27)' }}>
                  {error}
                  {isDuplicate && <div style={{ fontSize: 11, marginTop: 4, opacity: 0.85 }}>Je hebt al gestemd via deze link.</div>}
                </div>
              )}
              <button
                onClick={submit}
                disabled={submitting}
                style={{
                  width: '100%', padding: '11px 16px',
                  background: 'var(--accent, #0E4F6D)', color: '#fff', border: 'none',
                  borderRadius: 5, fontSize: 13, fontWeight: 700, letterSpacing: '0.03em',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.6 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  fontFamily: 'inherit',
                }}
              >
                {submitting && <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} />}
                Stem versturen
              </button>
            </div>
          </>
        )}

        {/* Footer */}
        <div style={{ padding: '10px 32px', borderTop: '1px solid var(--edge, oklch(0.922 0 0))', background: 'oklch(0.97 0 0)' }}>
          <div style={{ fontSize: 10, color: 'var(--ink-ghost, oklch(0.708 0 0))', fontFamily: 'ui-monospace, monospace', textAlign: 'center' }}>
            Lctnships · poll voor crew &amp; partners
          </div>
        </div>
      </div>
    </div>
  )
}
