'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, AlertCircle, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) {
        setError(error.message)
      } else {
        setSent(true)
      }
    } catch {
      setError('Er is een onverwachte fout opgetreden.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        width: 360,
        background: '#fff',
        border: '1px solid var(--edge)',
        borderRadius: 3,
        padding: '36px 32px 28px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
      }}
    >
      {/* Wordmark */}
      <span
        style={{
          fontFamily: "'More Sugar', cursive",
          fontSize: 28,
          color: 'var(--accent)',
          display: 'block',
          marginBottom: 24,
          letterSpacing: '-0.5px',
        }}
      >
        lcntships
      </span>

      {/* Back link */}
      <Link
        href="/login"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 13,
          color: 'var(--ink-muted)',
          marginBottom: 16,
          fontWeight: 500,
        }}
      >
        <ChevronLeft size={15} />
        Terug naar inloggen
      </Link>

      {/* Heading */}
      <h1
        style={{
          fontFamily: "'League Spartan', sans-serif",
          fontSize: 18,
          fontWeight: 700,
          color: 'var(--ink)',
          margin: '0 0 4px',
          letterSpacing: '-0.01em',
        }}
      >
        Wachtwoord vergeten?
      </h1>
      <p
        style={{
          fontSize: 13,
          color: 'var(--ink-muted)',
          margin: '0 0 24px',
        }}
      >
        Vul je e-mailadres in en we sturen je een herstellink.
      </p>

      {/* Error banner */}
      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            background: 'var(--danger-tint)',
            border: '1px solid var(--danger)',
            borderRadius: 3,
            padding: '10px 12px',
            marginBottom: 16,
          }}
        >
          <AlertCircle size={14} style={{ color: 'var(--danger)', marginTop: 1, flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: 'var(--danger)', lineHeight: 1.4 }}>{error}</span>
        </div>
      )}

      {/* Success banner */}
      {sent && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            background: 'var(--success-tint, #ecfdf5)',
            border: '1px solid #10b981',
            borderRadius: 3,
            padding: '10px 12px',
            marginBottom: 16,
          }}
        >
          <CheckCircle2 size={14} style={{ color: '#10b981', marginTop: 1, flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: '#065f46', lineHeight: 1.4 }}>
            Als dit e-mailadres bekend is, ontvang je binnen enkele minuten een herstellink.
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 18 }}>
          <label
            htmlFor="email"
            style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--ink-muted)',
              marginBottom: 5,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            E-mailadres
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="naam@lcntships.com"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              height: 38,
              padding: '0 10px',
              border: '1px solid var(--edge)',
              borderRadius: 3,
              fontSize: 14,
              color: 'var(--ink)',
              outline: 'none',
              background: 'var(--bg, #F9FAFE)',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading || sent}
          style={{
            width: '100%',
            height: 40,
            background: loading || sent ? 'var(--ink-ghost)' : 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 3,
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "'League Spartan', sans-serif",
            cursor: loading || sent ? 'not-allowed' : 'pointer',
            letterSpacing: '0.02em',
            transition: 'opacity 0.15s',
          }}
        >
          {loading ? 'Versturen...' : sent ? 'Verstuurd' : 'Herstellink versturen'}
        </button>
      </form>
    </div>
  )
}
