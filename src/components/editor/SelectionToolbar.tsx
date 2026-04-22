'use client'

import { FloatingToolbar } from '@/components/ui/floating-toolbar'
import { MarkToolbarButton } from '@/components/ui/mark-toolbar-button'
import { LinkToolbarButton } from '@/components/ui/link-toolbar-button'
import { Bold, Italic, Underline, Strikethrough, Code } from 'lucide-react'

/**
 * Zwevende toolbar die verschijnt boven geselecteerde tekst.
 * Gebruikt Plate's FloatingToolbar — auto positionering + auto hide bij deselectie.
 */
export function SelectionToolbar() {
  return (
    <FloatingToolbar className="flex items-center gap-0.5 rounded-lg border border-gray-200 bg-white shadow-lg p-1">
      <MarkToolbarButton nodeType="bold" tooltip="Vet (⌘B)">
        <Bold className="h-3.5 w-3.5" />
      </MarkToolbarButton>
      <MarkToolbarButton nodeType="italic" tooltip="Cursief (⌘I)">
        <Italic className="h-3.5 w-3.5" />
      </MarkToolbarButton>
      <MarkToolbarButton nodeType="underline" tooltip="Onderstreept (⌘U)">
        <Underline className="h-3.5 w-3.5" />
      </MarkToolbarButton>
      <MarkToolbarButton nodeType="strikethrough" tooltip="Doorhalen">
        <Strikethrough className="h-3.5 w-3.5" />
      </MarkToolbarButton>
      <div className="h-5 w-px bg-gray-200 mx-0.5" />
      <MarkToolbarButton nodeType="code" tooltip="Code">
        <Code className="h-3.5 w-3.5" />
      </MarkToolbarButton>
      <LinkToolbarButton />
    </FloatingToolbar>
  )
}
