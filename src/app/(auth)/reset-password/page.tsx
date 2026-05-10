'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('Wachtwoord moet minstens 8 tekens zijn.')
      return
    }
    if (password !== confirm) {
      setError('Wachtwoorden komen niet overeen.')
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setError(error.message)
      } else {
        setDone(true)
        setTimeout(() => router.push('/dashboard'), 1500)
      }
    } catch {
      setError('Er is een onverwachte fout opgetreden.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    height: 38,
    padding: '0 36px 0 10px',
    border: '1px solid var(--edge)',
    borderRadius: 3,
    fontSize: 14,
    color: 'var(--ink)',
    outline: 'none',
    background: 'var(--bg, #F9FAFE)',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--ink-muted)',
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
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
        Nieuw wachtwoord instellen
      </h1>
      <p style={{ fontSize: 13, color: 'var(--ink-muted)', margin: '0 0 24px' }}>
        Kies een sterk wachtwoord van minstens 8 tekens.
      </p>

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

      {done && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            background: '#ecfdf5',
            border: '1px solid #10b981',
            borderRadius: 3,
            padding: '10px 12px',
            marginBottom: 16,
          }}
        >
          <CheckCircle2 size={14} style={{ color: '#10b981', marginTop: 1, flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: '#065f46', lineHeight: 1.4 }}>
            Wachtwoord gewijzigd. Je wordt doorgestuurd...
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 14 }}>
          <label htmlFor="password" style={labelStyle}>Nieuw wachtwoord</label>
          <div style={{ position: 'relative' }}>
            <input
              id="password"
              type={show ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--ink-ghost)',
                padding: 2,
                display: 'flex',
                alignItems: 'center',
              }}
              tabIndex={-1}
            >
              {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label htmlFor="confirm" style={labelStyle}>Bevestig wachtwoord</label>
          <input
            id="confirm"
            type={show ? 'text' : 'password'}
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            style={{ ...inputStyle, padding: '0 10px' }}
          />
        </div>

        <button
          type="submit"
          disabled={loading || done}
          style={{
            width: '100%',
            height: 40,
            background: loading || done ? 'var(--ink-ghost)' : 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 3,
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "'League Spartan', sans-serif",
            cursor: loading || done ? 'not-allowed' : 'pointer',
            letterSpacing: '0.02em',
          }}
        >
          {loading ? 'Opslaan...' : done ? 'Opgeslagen' : 'Wachtwoord opslaan'}
        </button>
      </form>
    </div>
  )
}
