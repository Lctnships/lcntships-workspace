'use client'

import { BasicNodesKit } from './basic-nodes-kit'
import { ListKit } from './list-kit'
import { TableKit } from './table-kit'
import { CodeBlockKit } from './code-block-kit'
import { IndentKit } from './indent-kit'
import { SlashKit } from './slash-kit'
import { LinkKit } from './link-kit'
import { MediaKit } from './media-kit'
import { CalloutKit } from './callout-kit'
import { DndKit } from './dnd-kit'
import { BlockMenuKit } from './block-menu-kit'
import { BlockSelectionKit } from './block-selection-kit'

// Master kit voor de Notion-achtige document editor
export const NotionKit = [
  ...BasicNodesKit,
  ...ListKit,
  ...TableKit,
  ...CodeBlockKit,
  ...IndentKit,
  ...LinkKit,
  ...MediaKit,
  ...CalloutKit,
  ...DndKit,
  ...BlockMenuKit,
  ...BlockSelectionKit,
  ...SlashKit,
]
