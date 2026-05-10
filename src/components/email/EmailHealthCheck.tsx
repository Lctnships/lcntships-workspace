'use client'

import { useState } from 'react'
import { Check, Loader2, AlertCircle, Mail, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

type Recipient = 'rivaldo' | 'uriel'
type Step = { step: string; ok: boolean; detail?: string }
type Result = { ok: boolean; steps: Step[]; messageId?: string | null; error?: string }

const stepLabels: Record<string, string> = {
  env: 'Env vars aanwezig',
  resend: 'Resend API call',
  db_log: 'sent_emails DB insert',
}

export function EmailHealthCheck() {
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState<Recipient | null>(null)

  async function runCheck(recipient: Recipient) {
    setLoading(recipient)
    setResult(null)
    try {
      const res = await fetch('/api/email/health-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient }),
      })
      setResult(await res.json())
    } catch (e) {
      setResult({ ok: false, steps: [], error: e instanceof Error ? e.message : 'Netwerkfout' })
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="bg-white border border-[var(--edge)] p-6 mb-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 flex items-center justify-center bg-[var(--accent-tint)]">
          <Mail className="h-4 w-4 text-[var(--accent)]" />
        </div>
        <div>
          <div className="text-[14px] font-bold text-[var(--ink)]">Email pipeline test</div>
          <div className="text-[12px] text-[var(--ink-muted)]">Stuur een testmail naar jezelf of Uriel — check daarna in Resend of &apos;ie delivered of bounced.</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(['rivaldo', 'uriel'] as const).map(r => (
          <button key={r} type="button" onClick={() => runCheck(r)} disabled={loading !== null}
            className="inline-flex items-center gap-[6px] px-3 py-[7px] text-[12px] font-semibold border border-[var(--edge)] bg-transparent text-[var(--ink)] hover:bg-[var(--surface)] disabled:opacity-50 transition-colors">
            {loading === r
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <Mail className="h-3 w-3" />}
            Naar {r === 'rivaldo' ? 'Rivaldo' : 'Uriel'}
          </button>
        ))}
        <a href="https://resend.com/emails" target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1 text-[12px] text-[var(--accent)] hover:underline ml-auto">
          Open Resend dashboard
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {result && (
        <div className={cn('mt-4 border p-4', result.ok
          ? 'bg-[var(--success-tint)] border-[var(--success)]'
          : 'bg-[var(--danger-tint)] border-[var(--danger)]')}>
          <div className="flex items-center gap-2 mb-3">
            {result.ok
              ? <Check className="h-4 w-4 text-[var(--success)]" />
              : <AlertCircle className="h-4 w-4 text-[var(--danger)]" />}
            <span className={cn('text-[13px] font-semibold', result.ok ? 'text-[var(--success)]' : 'text-[var(--danger)]')}>
              {result.ok ? 'Test succesvol — check je inbox' : 'Test gefaald'}
            </span>
          </div>
          <div className="flex flex-col gap-[6px]">
            {result.steps.map(s => (
              <div key={s.step} className="flex items-start gap-2 text-[12px]">
                {s.ok
                  ? <Check className="h-3.5 w-3.5 text-[var(--success)] mt-[1px] flex-shrink-0" />
                  : <AlertCircle className="h-3.5 w-3.5 text-[var(--danger)] mt-[1px] flex-shrink-0" />}
                <div className="flex-1">
                  <span className="font-semibold text-[var(--ink)]">{stepLabels[s.step] ?? s.step}</span>
                  {s.detail && <span className="text-[var(--ink-muted)] font-mono text-[11px] ml-2 break-all">{s.detail}</span>}
                </div>
              </div>
            ))}
          </div>
          {result.messageId && (
            <div className="mt-3 pt-3 border-t border-[var(--edge)] text-[11px]">
              <div className="font-semibold text-[var(--ink)]">Resend message ID:</div>
              <code className="block mt-1 text-[var(--ink-muted)] break-all font-mono">{result.messageId}</code>
            </div>
          )}
          {result.error && <div className="mt-3 text-[12px] text-[var(--danger)]">{result.error}</div>}
        </div>
      )}
    </div>
  )
}
