'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface EnrollData {
  factorId: string
  qrImage: string
  secret: string
  uri: string
}

export default function MfaEnrollPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [enroll, setEnroll] = useState<EnrollData | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)

  async function startEnrollment() {
    setError(null)
    setLoading(true)
    try {
      // Clean up any stale unverified factors first.
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const unverified = (factors?.all ?? []).filter((f) => f.status !== 'verified')
      for (const f of unverified) {
        await supabase.auth.mfa.unenroll({ factorId: f.id })
      }

      const { data, error: enrollErr } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `Authenticator-${Date.now()}`,
      })
      if (enrollErr) throw enrollErr
      if (!data) throw new Error('Geen enroll-data ontvangen')

      setEnroll({
        factorId: data.id,
        qrImage: data.totp.qr_code,
        secret: data.totp.secret,
        uri: data.totp.uri,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enrollment mislukt')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    startEnrollment()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!enroll) return
    setVerifying(true)
    setError(null)
    try {
      const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({
        factorId: enroll.factorId,
      })
      if (chErr) throw chErr
      if (!challenge) throw new Error('Geen challenge ontvangen')

      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId: enroll.factorId,
        challengeId: challenge.id,
        code,
      })
      if (verifyErr) throw verifyErr

      router.replace('/dashboard')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verificatie mislukt')
    } finally {
      setVerifying(false)
    }
  }

  async function handleReset() {
    if (!enroll) return
    try {
      await supabase.auth.mfa.unenroll({ factorId: enroll.factorId })
    } catch {
      // ignore
    }
    setEnroll(null)
    setCode('')
    await startEnrollment()
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Twee-factor authenticatie</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Scan de QR-code met je authenticator-app (1Password, Authy, Google Authenticator) en voer de 6-cijferige code in om te bevestigen.
        </p>
      </div>

      {loading && <p className="text-sm">Laden…</p>}

      {enroll && (
        <>
          <div className="border rounded p-4 bg-white flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={enroll.qrImage}
              alt="MFA QR code"
              width={240}
              height={240}
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
          <details className="text-xs">
            <summary className="cursor-pointer">Geen QR kunnen scannen? Toon secret</summary>
            <code className="block mt-2 p-2 bg-muted break-all">{enroll.secret}</code>
            <p className="mt-2 text-muted-foreground">
              Voer deze code handmatig in je authenticator-app in (type: Time-based).
            </p>
          </details>

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
            <div className="flex gap-2">
              <Button type="submit" disabled={verifying || code.length !== 6}>
                {verifying ? 'Verifiëren…' : 'Bevestigen'}
              </Button>
              <Button type="button" variant="outline" onClick={handleReset} disabled={verifying}>
                Opnieuw beginnen
              </Button>
            </div>
          </form>
        </>
      )}

      {!loading && !enroll && error && (
        <div className="space-y-3">
          <p className="text-sm text-red-600">{error}</p>
          <Button onClick={startEnrollment}>Opnieuw proberen</Button>
        </div>
      )}
    </div>
  )
}
