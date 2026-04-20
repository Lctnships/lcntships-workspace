'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Mode = 'totp' | 'recovery'

function MfaChallengeInner() {
  const router = useRouter()
  const params = useSearchParams()
  const redirectTo = params.get('redirect') || '/dashboard'
  const supabase = createClient()

  const [mode, setMode] = useState<Mode>('totp')
  const [factorId, setFactorId] = useState<string | null>(null)
  const [challengeId, setChallengeId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const { data, error: lfErr } = await supabase.auth.mfa.listFactors()
        if (lfErr) throw lfErr
        const verified = (data?.totp ?? []).find((f) => f.status === 'verified')
        if (!verified) {
          router.replace('/settings/security/mfa-enroll')
          return
        }
        setFactorId(verified.id)
        const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({
          factorId: verified.id,
        })
        if (chErr) throw chErr
        setChallengeId(ch!.id)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Kon MFA challenge niet starten')
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!factorId || !challengeId) return
    setVerifying(true)
    setError(null)
    try {
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code,
      })
      if (vErr) throw vErr
      router.replace(redirectTo)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verificatie mislukt')
      if (factorId) {
        const { data: ch } = await supabase.auth.mfa.challenge({ factorId })
        if (ch) setChallengeId(ch.id)
      }
    } finally {
      setVerifying(false)
    }
  }

  async function handleRecovery(e: React.FormEvent) {
    e.preventDefault()
    setVerifying(true)
    setError(null)
    try {
      const res = await fetch('/api/mfa/recovery-codes/consume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: recoveryCode }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Ongeldige code')
      }
      router.replace('/settings/security/mfa-enroll')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kon code niet verifiëren')
    } finally {
      setVerifying(false)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <div className="max-w-sm mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {mode === 'totp' ? 'Verifieer je identiteit' : 'Gebruik recovery code'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {mode === 'totp'
            ? 'Voer de 6-cijferige code uit je authenticator-app in.'
            : 'Voer een recovery code in. Daarna moet je een nieuw apparaat koppelen.'}
        </p>
      </div>

      {loading ? (
        <p className="text-sm">Laden…</p>
      ) : mode === 'totp' ? (
        <>
          <form onSubmit={handleVerify} className="space-y-3">
            <Input
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              required
              autoFocus
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={verifying || code.length !== 6} className="w-full">
              {verifying ? 'Verifiëren…' : 'Verifiëren'}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => { setMode('recovery'); setError(null) }}
            className="text-xs text-muted-foreground underline block"
          >
            Geen toegang tot je authenticator? Gebruik een recovery code
          </button>
        </>
      ) : (
        <>
          <form onSubmit={handleRecovery} className="space-y-3">
            <Input
              placeholder="XXXX-XXXX-XXXX"
              value={recoveryCode}
              onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
              required
              autoFocus
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={verifying || recoveryCode.length < 12} className="w-full">
              {verifying ? 'Verifiëren…' : 'Gebruik code'}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => { setMode('totp'); setError(null) }}
            className="text-xs text-muted-foreground underline block"
          >
            Terug naar authenticator-code
          </button>
        </>
      )}

      <button
        type="button"
        onClick={handleSignOut}
        className="text-xs text-muted-foreground underline"
      >
        Uitloggen
      </button>
    </div>
  )
}

export default function MfaChallengePage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm">Laden…</div>}>
      <MfaChallengeInner />
    </Suspense>
  )
}
