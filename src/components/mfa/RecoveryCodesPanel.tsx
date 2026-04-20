'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Check, Copy, Download, AlertTriangle } from 'lucide-react'

interface Props {
  codes: string[]
  onContinue: () => void
}

export function RecoveryCodesPanel({ codes, onContinue }: Props) {
  const [copied, setCopied] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  const text = codes.join('\n')

  async function copyAll() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function download() {
    const blob = new Blob(
      [`lcntships Workspace — MFA recovery codes\n\n${text}\n\nBewaar deze codes veilig. Elk kan één keer gebruikt worden.\n`],
      { type: 'text/plain' },
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'lcntships-recovery-codes.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Bewaar je recovery codes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Deze codes zie je maar één keer. Bewaar ze in een wachtwoordmanager of print ze uit.
          Met een recovery code kan je inloggen als je je telefoon kwijt bent.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-900">
          Zodra je deze pagina sluit kan je ze niet meer zien. Nieuwe codes genereren
          ongeldigt alle oude codes.
        </p>
      </div>

      <div className="border rounded-lg p-4 bg-gray-50">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-sm">
          {codes.map((c) => (
            <span key={c} className="select-all">{c}</span>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={copyAll} size="sm">
          {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
          {copied ? 'Gekopieerd' : 'Kopiëren'}
        </Button>
        <Button variant="outline" onClick={download} size="sm">
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Downloaden
        </Button>
      </div>

      <label className="flex items-start gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-1"
        />
        <span>Ik heb mijn recovery codes op een veilige plek bewaard.</span>
      </label>

      <Button onClick={onContinue} disabled={!confirmed} className="w-full">
        Doorgaan naar dashboard
      </Button>
    </div>
  )
}
