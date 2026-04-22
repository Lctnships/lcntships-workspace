'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plate, usePlateEditor } from 'platejs/react'
import type { Value } from 'platejs'

import { NotionKit } from './plugins/notion-kit'
import { SelectionToolbar } from './SelectionToolbar'
import { Editor, EditorContainer } from '@/components/ui/editor'
import { MarkToolbarButton } from '@/components/ui/mark-toolbar-button'
import { Toolbar } from '@/components/ui/toolbar'
import { Button } from '@/components/ui/button'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code as CodeIcon,
  ArrowLeft,
  Trash2,
  Image as ImageIcon,
  Smile,
} from 'lucide-react'
import { workspaceClient } from '@/lib/workspace-client'
import { cn } from '@/lib/utils'

const emptyDoc: Value = [{ type: 'p', children: [{ text: '' }] }]

interface DocumentEditorProps {
  id?: string
  initialTitle?: string
  initialContent?: Value
  initialIcon?: string | null
  initialCoverUrl?: string | null
}

const EMOJI_PICKER = ['📄', '📝', '✨', '📚', '🎬', '📸', '🎨', '🚀', '💡', '🎯', '⭐', '🔥', '💼', '📊', '🗂️', '📁']

export function DocumentEditor({
  id,
  initialTitle = '',
  initialContent,
  initialIcon = null,
  initialCoverUrl = null,
}: DocumentEditorProps) {
  const router = useRouter()
  const [title, setTitle] = useState(initialTitle || 'Naamloos document')
  const [icon, setIcon] = useState<string | null>(initialIcon)
  const [coverUrl, setCoverUrl] = useState<string | null>(initialCoverUrl)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [documentId, setDocumentId] = useState<string | undefined>(id)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const dirtyRef = useRef(false)

  const editor = usePlateEditor({
    plugins: NotionKit,
    value: initialContent ?? emptyDoc,
  })

  const save = useCallback(async () => {
    setSaving(true)
    setError(null)
    const content = editor.children as Value
    try {
      if (documentId) {
        const { error: err } = await workspaceClient
          .from('workspace_documents')
          .update({ title, content, icon, cover_url: coverUrl })
          .eq('id', documentId)
        if (err) throw new Error(err.message)
      } else {
        const { data, error: err } = await workspaceClient
          .from<{ id: string }[]>('workspace_documents')
          .insert({ title, content, icon, cover_url: coverUrl })
          .select('id')
        if (err) throw new Error(err.message)
        const created = Array.isArray(data) && data[0]
        if (created) {
          setDocumentId(created.id)
          window.history.replaceState(null, '', `/documents/${created.id}`)
        }
      }
      setSavedAt(new Date())
      dirtyRef.current = false
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Opslaan mislukt')
    } finally {
      setSaving(false)
    }
  }, [editor, title, icon, coverUrl, documentId])

  // Auto-save: markeer dirty bij wijziging, save na 2s stilte
  useEffect(() => {
    const handler = () => {
      dirtyRef.current = true
    }
    // listen for Plate onChange via window event wordt complex, dus simpel:
    // track dirty via title/icon/cover changes én poll editor content
    const interval = setInterval(() => {
      if (dirtyRef.current && !saving) {
        save()
      }
    }, 2000)
    return () => {
      clearInterval(interval)
      window.removeEventListener('plate-change', handler)
    }
  }, [save, saving])

  // Mark dirty op title/icon/cover
  useEffect(() => {
    dirtyRef.current = true
  }, [title, icon, coverUrl])

  // ⌘S / Ctrl+S handmatig
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        save()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [save])

  const deleteDoc = async () => {
    if (!documentId) return
    if (!confirm('Weet je zeker dat je dit document wilt verwijderen?')) return
    const { error: err } = await workspaceClient
      .from('workspace_documents')
      .delete()
      .eq('id', documentId)
    if (err) {
      alert(`Kon niet verwijderen: ${err.message}`)
      return
    }
    router.push('/documents')
  }

  const uploadCover = async (file: File) => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
    setCoverUrl(dataUrl)
  }

  const onCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadCover(file)
  }

  const savedLabel = savedAt
    ? `Opgeslagen ${savedAt.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`
    : documentId
      ? 'Ongewijzigd'
      : 'Nog niet opgeslagen'

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] bg-white">
      {/* === Fixed toolbar bovenin === */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="flex items-center gap-2 px-4 py-2">
          <Button variant="ghost" size="sm" onClick={() => router.push('/documents')}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Terug
          </Button>
          <div className="h-5 w-px bg-gray-200" />
          <Plate editor={editor}>
            <InlineToolbar />
          </Plate>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {saving ? 'Opslaan...' : savedLabel}
            </span>
            {documentId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={deleteDoc}
                className="text-red-600 hover:bg-red-50 h-8 w-8 p-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-2 text-sm text-red-700">{error}</div>
      )}

      {/* === Cover image === */}
      {coverUrl ? (
        <div
          className="relative h-48 md:h-60 w-full bg-cover bg-center"
          style={{ backgroundImage: `url(${coverUrl})` }}
        >
          <button
            onClick={() => setCoverUrl(null)}
            className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white text-xs px-3 py-1 rounded-md backdrop-blur"
          >
            Verwijder cover
          </button>
        </div>
      ) : null}

      {/* === Page content === */}
      <div className={cn('flex-1 flex justify-center', !coverUrl && 'pt-8')}>
        <div className="w-full max-w-[860px] px-16 pb-40">
          {/* Icon picker */}
          <div className="mt-[-24px] mb-2 relative">
            {icon ? (
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="text-6xl hover:bg-gray-100 rounded-lg p-2 -ml-2 transition"
              >
                {icon}
              </button>
            ) : (
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="flex items-center gap-1.5 text-gray-400 hover:text-gray-700 text-sm"
              >
                <Smile className="h-4 w-4" />
                Icon toevoegen
              </button>
            )}
            {showEmojiPicker && (
              <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-20 grid grid-cols-8 gap-1">
                {EMOJI_PICKER.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      setIcon(emoji)
                      setShowEmojiPicker(false)
                    }}
                    className="text-2xl hover:bg-gray-100 rounded p-1 transition"
                  >
                    {emoji}
                  </button>
                ))}
                {icon && (
                  <button
                    onClick={() => {
                      setIcon(null)
                      setShowEmojiPicker(false)
                    }}
                    className="col-span-8 text-xs text-red-600 hover:bg-red-50 rounded py-1 mt-1"
                  >
                    Verwijder icon
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Cover toevoegen knop (als nog geen cover) */}
          {!coverUrl && (
            <div className="mb-4 flex gap-3">
              <button
                onClick={() => coverInputRef.current?.click()}
                className="flex items-center gap-1.5 text-gray-400 hover:text-gray-700 text-sm"
              >
                <ImageIcon className="h-4 w-4" />
                Cover toevoegen
              </button>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onCoverChange}
              />
            </div>
          )}

          {/* Titel */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Naamloos document"
            className="w-full text-4xl md:text-5xl font-bold text-gray-900 placeholder:text-gray-300 bg-transparent border-none outline-none mb-6 tracking-tight"
          />

          {/* Plate editor */}
          <Plate editor={editor}>
            <EditorContainer>
              <Editor
                variant="default"
                placeholder="Begin met typen, of gebruik / voor commands..."
                className="!px-0 !pb-40"
              />
              <SelectionToolbar />
            </EditorContainer>
          </Plate>
        </div>
      </div>
    </div>
  )
}

// Inline toolbar met format-knoppen (komt in de sticky header)
function InlineToolbar() {
  return (
    <Toolbar className="flex items-center gap-0.5">
      <MarkToolbarButton nodeType="bold" tooltip="Vet (⌘B)">
        <Bold className="h-4 w-4" />
      </MarkToolbarButton>
      <MarkToolbarButton nodeType="italic" tooltip="Cursief (⌘I)">
        <Italic className="h-4 w-4" />
      </MarkToolbarButton>
      <MarkToolbarButton nodeType="underline" tooltip="Onderstreept (⌘U)">
        <Underline className="h-4 w-4" />
      </MarkToolbarButton>
      <MarkToolbarButton nodeType="strikethrough" tooltip="Doorhalen">
        <Strikethrough className="h-4 w-4" />
      </MarkToolbarButton>
      <MarkToolbarButton nodeType="code" tooltip="Code">
        <CodeIcon className="h-4 w-4" />
      </MarkToolbarButton>
    </Toolbar>
  )
}
