'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        setError(
          error.message === 'Invalid login credentials'
            ? 'Onjuist e-mailadres of wachtwoord.'
            : error.message,
        )
      } else {
        router.push('/dashboard')
        router.refresh()
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
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <span
          style={{
            fontFamily: "'More Sugar', cursive",
            fontSize: 28,
            color: 'var(--accent)',
            letterSpacing: '-0.5px',
          }}
        >
          lcntships
        </span>
      </div>

      {/* Heading */}
      <h1
        style={{
          fontFamily: "'League Spartan', sans-serif",
          fontSize: 18,
          fontWeight: 600,
          color: 'var(--ink)',
          margin: '0 0 4px',
          textAlign: 'center',
        }}
      >
        Inloggen op Workspace
      </h1>
      <p
        style={{
          fontSize: 13,
          color: 'var(--ink-muted)',
          textAlign: 'center',
          margin: '0 0 24px',
        }}
      >
        Intern platform — alleen voor teamleden
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

      <form onSubmit={handleLogin}>
        {/* Email */}
        <div style={{ marginBottom: 14 }}>
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
            placeholder="jij@lctnships.com"
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
              background: '#fff',
            }}
          />
        </div>

        {/* Password */}
        <div style={{ marginBottom: 18 }}>
          <label
            htmlFor="password"
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
            Wachtwoord
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                height: 38,
                padding: '0 36px 0 10px',
                border: '1px solid var(--edge)',
                borderRadius: 3,
                fontSize: 14,
                color: 'var(--ink)',
                outline: 'none',
                background: '#fff',
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
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
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {/* Remember + forgot */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}
        >
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              color: 'var(--ink-muted)',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              style={{ accentColor: 'var(--accent)', width: 13, height: 13 }}
            />
            {'Onthoud mij'}
          </label>
          <a
            href="/forgot-password"
            style={{
              fontSize: 13,
              color: 'var(--accent)',
              textDecoration: 'none',
            }}
          >
            Wachtwoord vergeten?
          </a>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            height: 40,
            background: loading ? 'var(--ink-ghost)' : 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 3,
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "'League Spartan', sans-serif",
            cursor: loading ? 'not-allowed' : 'pointer',
            letterSpacing: '0.02em',
            transition: 'opacity 0.15s',
          }}
        >
          {loading ? 'Inloggen...' : 'Inloggen'}
        </button>
      </form>

      {/* Footer */}
      <p
        style={{
          marginTop: 20,
          textAlign: 'center',
          fontSize: 12,
          color: 'var(--ink-ghost)',
          lineHeight: 1.5,
        }}
      >
        Geen toegang?{' '}
        <span style={{ color: 'var(--ink-muted)' }}>
          Neem contact op met de beheerder.
        </span>
      </p>
    </div>
  )
}
