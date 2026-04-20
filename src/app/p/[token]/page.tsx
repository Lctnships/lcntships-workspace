'use client'

import { use, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import { nl } from 'date-fns/locale'
import { Calendar, Check, Loader2, MapPin, Lock, Clock } from 'lucide-react'

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

function formatDate(d: string) {
  try {
    return format(parseISO(d), 'EEEE d MMMM yyyy', { locale: nl })
  } catch {
    return d
  }
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
      .then((r) => {
        if (!r.ok) throw new Error('notfound')
        return r.json()
      })
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
      return setError('Ongeldig emailadres')
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
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="bg-white rounded-xl p-8 max-w-md text-center shadow-sm">
          <p className="text-gray-700">{loadErr}</p>
        </div>
      </div>
    )
  }

  if (!production) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="bg-white rounded-xl p-8 max-w-md text-center shadow-sm">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-6 w-6 text-green-600" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900 mb-1">Bedankt!</h1>
          <p className="text-sm text-gray-600">
            Je reactie is opgeslagen. Je hoort van ons zodra de finale datum bekend is.
          </p>
        </div>
      </div>
    )
  }

  const isClosed = production.status === 'closed'

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="h-5 w-5 text-gray-400" />
            <span className="text-xs uppercase tracking-wide text-gray-400 font-medium">
              Productie
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{production.title}</h1>
          {production.location && (
            <div className="flex items-center gap-1.5 text-sm text-gray-600 mt-1">
              <MapPin className="h-3.5 w-3.5" />
              {production.location}
            </div>
          )}
          {production.description && (
            <p className="text-sm text-gray-600 mt-3 whitespace-pre-wrap">{production.description}</p>
          )}

          {isClosed && (
            <div className="mt-6 bg-gray-100 border border-gray-200 rounded-lg p-4 flex items-start gap-3">
              <Lock className="h-4 w-4 text-gray-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">Deze poll is gesloten</p>
                {production.final_date && (
                  <p className="text-sm text-gray-700 mt-0.5">
                    Finale datum: <strong>{formatDate(production.final_date)}</strong>
                  </p>
                )}
              </div>
            </div>
          )}

          {!isClosed && production.deadline && (
            <div className="mt-5 flex items-center gap-2 text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
              <Clock className="h-3.5 w-3.5" />
              Sluit op {format(parseISO(production.deadline), 'd MMM HH:mm', { locale: nl })}
            </div>
          )}

          {!isClosed && (
            <>
              <div className="mt-6">
                <Label htmlFor="name">Je naam</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => { setName(e.target.value); if (isDuplicate) setIsDuplicate(false) }}
                  placeholder="Bijv. Nova"
                  className="mt-1"
                />
              </div>

              <div className="mt-4">
                <Label htmlFor="email">Email (optioneel)</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voor bevestiging finale datum"
                  className="mt-1"
                />
              </div>

              <div className="mt-5">
                <Label>Welke datums kan je?</Label>
                <p className="text-xs text-gray-500 mb-2">Selecteer alle datums die voor jou werken.</p>
                <div className="space-y-2">
                  {production.proposed_dates.map((d) => {
                    const checked = selected.has(d)
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggle(d)}
                        className={cn(
                          'w-full text-left border rounded-lg p-3 flex items-center gap-3 transition',
                          checked
                            ? 'border-gray-900 bg-gray-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white',
                        )}
                      >
                        <div
                          className={cn(
                            'w-5 h-5 rounded border flex items-center justify-center flex-shrink-0',
                            checked ? 'bg-gray-900 border-gray-900' : 'border-gray-300',
                          )}
                        >
                          {checked && <Check className="h-3.5 w-3.5 text-white" />}
                        </div>
                        <span className="text-sm text-gray-900 capitalize">{formatDate(d)}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="mt-5">
                <Label htmlFor="note">Opmerking (optioneel)</Label>
                <Textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Bijv. 'Alleen na 14:00'"
                  rows={2}
                  className="mt-1"
                />
              </div>

              {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

              <Button className="w-full mt-6" onClick={submit} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Versturen
              </Button>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">Powered by lcntships</p>
      </div>
    </div>
  )
}
