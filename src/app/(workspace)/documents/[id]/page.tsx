'use client'

import { use, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { workspaceClient } from '@/lib/workspace-client'
import { Loader2 } from 'lucide-react'
import type { Value } from 'platejs'

const DocumentEditor = dynamic(
  () => import('@/components/editor/DocumentEditor').then((m) => m.DocumentEditor),
  { ssr: false },
)

type DocRow = {
  id: string
  title: string
  content: Value
}

export default function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [doc, setDoc] = useState<DocRow | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      const { data, error } = await workspaceClient
        .from<DocRow[]>('workspace_documents')
        .select('id, title, content')
        .eq('id', id)
        .limit(1)
      if (!active) return
      if (error) {
        setErr(error.message)
        return
      }
      const row = Array.isArray(data) ? data[0] : null
      if (!row) {
        setErr('Document niet gevonden')
        return
      }
      setDoc(row)
    })()
    return () => {
      active = false
    }
  }, [id])

  if (err) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-sm text-gray-600">{err}</p>
      </div>
    )
  }

  if (!doc) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    )
  }

  return <DocumentEditor id={doc.id} initialTitle={doc.title} initialContent={doc.content} />
}
