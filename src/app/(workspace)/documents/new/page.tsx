'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

const DocumentEditor = dynamic(
  () => import('@/components/editor/DocumentEditor').then((m) => m.DocumentEditor),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    ),
  },
)

export default function NewDocumentPage() {
  return <DocumentEditor />
}
