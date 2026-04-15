import type { SupabaseClient } from '@supabase/supabase-js'

export type AalLevel = 'aal1' | 'aal2' | null

export interface MfaStatus {
  hasVerifiedFactor: boolean
  currentAal: AalLevel
  nextLevel: AalLevel
  verifiedFactorId: string | null
}

/**
 * Returns MFA enrollment + assurance-level status for the current session.
 * Safe to call on any SupabaseClient (server or browser). Errors swallow to
 * a permissive-but-unknown default (no verified factor, no aal) so callers
 * can decide how to react without crashing middleware.
 */
export async function getMfaStatus(supabase: SupabaseClient): Promise<MfaStatus> {
  try {
    const [factorsRes, aalRes] = await Promise.all([
      supabase.auth.mfa.listFactors(),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    ])

    const totp = factorsRes.data?.totp ?? []
    const verified = totp.find((f) => f.status === 'verified') ?? null

    const currentLevel = (aalRes.data?.currentLevel ?? null) as AalLevel
    const nextLevel = (aalRes.data?.nextLevel ?? null) as AalLevel

    return {
      hasVerifiedFactor: Boolean(verified),
      currentAal: currentLevel,
      nextLevel,
      verifiedFactorId: verified?.id ?? null,
    }
  } catch {
    return {
      hasVerifiedFactor: false,
      currentAal: null,
      nextLevel: null,
      verifiedFactorId: null,
    }
  }
}
