'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Check, Loader2, AlertCircle, Mail, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

type Recipient = 'rivaldo' | 'uriel'

type Step = { step: string; ok: boolean; detail?: string }
type Result = {
  ok: boolean
  steps: Step[]
  messageId?: string | null
  error?: string
}

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
      const data = await res.json()
      setResult(data)
    } catch (e) {
      setResult({ ok: false, steps: [], error: e instanceof Error ? e.message : 'Netwerkfout' })
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
          <Mail className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Email pipeline test</h3>
          <p className="text-sm text-gray-500">
            Stuur een testmail naar jezelf of Uriel — check daarna in Resend of 'ie delivered of bounced.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => runCheck('rivaldo')}
          disabled={loading !== null}
        >
          {loading === 'rivaldo' ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <Mail className="h-3.5 w-3.5 mr-1.5" />
          )}
          Naar Rivaldo
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => runCheck('uriel')}
          disabled={loading !== null}
        >
          {loading === 'uriel' ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <Mail className="h-3.5 w-3.5 mr-1.5" />
          )}
          Naar Uriel
        </Button>
        <a
          href="https://resend.com/emails"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 underline ml-auto self-center"
        >
          Open Resend dashboard
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {result && (
        <div
          className={cn(
            'rounded-lg border p-4',
            result.ok ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200',
          )}
        >
          <div className="flex items-center gap-2 mb-3">
            {result.ok ? (
              <Check className="h-5 w-5 text-emerald-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
            <span className={cn('font-semibold', result.ok ? 'text-emerald-900' : 'text-red-900')}>
              {result.ok ? 'Test succesvol — check je inbox' : 'Test gefaald'}
            </span>
          </div>

          <div className="space-y-1.5">
            {result.steps.map((s) => (
              <div key={s.step} className="flex items-start gap-2 text-sm">
                {s.ok ? (
                  <Check className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <span className="font-medium text-gray-900">{stepLabels[s.step] ?? s.step}</span>
                  {s.detail && (
                    <span className="text-gray-600 font-mono text-xs ml-2 break-all">
                      {s.detail}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {result.messageId && (
            <div className="mt-3 pt-3 border-t border-emerald-200 text-xs">
              <p className="font-medium text-gray-900">Resend message ID:</p>
              <code className="block mt-1 text-gray-700 break-all">{result.messageId}</code>
              <p className="text-gray-600 mt-2">
                Open <a href="https://resend.com/emails" target="_blank" rel="noreferrer" className="underline">resend.com/emails</a> en zoek op dit ID om de delivery/bounce status te zien.
              </p>
            </div>
          )}

          {result.error && <p className="mt-3 text-sm text-red-700">{result.error}</p>}
        </div>
      )}
    </div>
  )
}
