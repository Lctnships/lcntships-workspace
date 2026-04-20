'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { RecoveryCodesPanel } from './RecoveryCodesPanel'
import { Check, Loader2, Shield, ShieldOff, RefreshCw, AlertTriangle } from 'lucide-react'

type FactorInfo = {
  id: string
  friendlyName: string
  createdAt: string
}

export function MfaManager() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [factor, setFactor] = useState<FactorInfo | null>(null)
  const [recoveryRemaining, setRecoveryRemaining] = useState<number | null>(null)
  const [newCodes, setNewCodes] = useState<string[] | null>(null)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase.auth.mfa.listFactors()
      const verified = (data?.totp ?? []).find((f) => f.status === 'verified')
      setFactor(
        verified
          ? {
              id: verified.id,
              friendlyName: verified.friendly_name ?? 'Authenticator',
              createdAt: verified.created_at ?? '',
            }
          : null,
      )
      const res = await fetch('/api/mfa/recovery-codes')
      if (res.ok) {
        const json = await res.json()
        setRecoveryRemaining(json.remaining)
      }
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  async function regenerateCodes() {
    setWorking(true)
    setError(null)
    try {
      const res = await fetch('/api/mfa/recovery-codes', { method: 'POST' })
      if (!res.ok) throw new Error('Kon niet genereren')
      const json = await res.json()
      setNewCodes(json.codes)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fout')
    } finally {
      setWorking(false)
    }
  }

  async function resetDevice() {
    if (!factor) return
    if (!confirm('Weet je zeker dat je je authenticator wilt loskoppelen? Je moet daarna een nieuw apparaat koppelen voor je weer kunt inloggen.')) return
    setWorking(true)
    setError(null)
    try {
      await supabase.auth.mfa.unenroll({ factorId: factor.id })
      router.replace('/settings/security/mfa-enroll')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kon niet resetten')
      setWorking(false)
    }
  }

  if (newCodes) {
    return (
      <RecoveryCodesPanel
        codes={newCodes}
        onContinue={async () => {
          setNewCodes(null)
          await load()
        }}
      />
    )
  }

  if (loading) {
    return <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
  }

  if (!factor) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-600">
          Twee-factor authenticatie staat nog niet aan voor dit account.
        </p>
        <Button onClick={() => router.push('/settings/security/mfa-enroll')} size="sm">
          <Shield className="h-3.5 w-3.5 mr-1.5" />
          MFA inschakelen
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
        <Check className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm">
          <p className="font-medium text-emerald-900">{factor.friendlyName} is actief</p>
          <p className="text-xs text-emerald-800/70 mt-0.5">
            Gekoppeld op {factor.createdAt ? new Date(factor.createdAt).toLocaleDateString('nl-NL') : 'onbekend'}
          </p>
        </div>
      </div>

      {recoveryRemaining !== null && recoveryRemaining < 3 && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-amber-900">
              {recoveryRemaining === 0 ? 'Geen recovery codes meer' : `Nog maar ${recoveryRemaining} recovery code${recoveryRemaining === 1 ? '' : 's'} over`}
            </p>
            <p className="text-xs text-amber-800/80 mt-0.5">
              Genereer nieuwe codes zodat je niet buitengesloten raakt als je telefoon kwijt is.
            </p>
          </div>
        </div>
      )}

      <div
        className={cn(
          'flex items-center justify-between p-3 border rounded-lg',
          recoveryRemaining !== null && recoveryRemaining < 3
            ? 'border-amber-200 bg-amber-50/40'
            : 'border-gray-100',
        )}
      >
        <div className="text-sm">
          <p className="font-medium text-gray-900">Recovery codes</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {recoveryRemaining ?? 0} ongebruikte code{recoveryRemaining === 1 ? '' : 's'} over
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={regenerateCodes} disabled={working}>
          {working ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
          Nieuwe genereren
        </Button>
      </div>

      <div className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
        <div className="text-sm">
          <p className="font-medium text-gray-900">Nieuw apparaat koppelen</p>
          <p className="text-xs text-gray-500 mt-0.5">Verwijdert huidige authenticator en start opnieuw</p>
        </div>
        <Button variant="outline" size="sm" onClick={resetDevice} disabled={working}>
          <ShieldOff className="h-3.5 w-3.5 mr-1.5" />
          Resetten
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
