'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function MfaChallengeInner() {
  const router = useRouter()
  const params = useSearchParams()
  const redirectTo = params.get('redirect') || '/dashboard'
  const supabase = createClient()

  const [factorId, setFactorId] = useState<string | null>(null)
  const [challengeId, setChallengeId] = useState<string | null>(null)
  const [code, setCode] = useState('')
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
      // Start a fresh challenge so the user can retry.
      if (factorId) {
        const { data: ch } = await supabase.auth.mfa.challenge({ factorId })
        if (ch) setChallengeId(ch.id)
      }
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
        <h1 className="text-2xl font-semibold">Verifieer je identiteit</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Voer de 6-cijferige code uit je authenticator-app in.
        </p>
      </div>

      {loading ? (
        <p className="text-sm">Laden…</p>
      ) : (
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
