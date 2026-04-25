'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronRight, Plus, FileText, Loader2, Download, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { workspaceClient } from '@/lib/workspace-client'

type DocNode = {
  id: string
  title: string
  icon: string | null
  parent_id: string | null
  updated_at: string
  children: DocNode[]
}

function getAllIds(nodes: DocNode[]): string[] {
  const ids: string[] = []
  const walk = (ns: DocNode[]) => {
    for (const n of ns) {
      ids.push(n.id)
      if (n.children.length > 0) walk(n.children)
    }
  }
  walk(nodes)
  return ids
}

function buildTree(flat: Omit<DocNode, 'children'>[]): DocNode[] {
  const byId = new Map<string, DocNode>()
  flat.forEach((n) => byId.set(n.id, { ...n, children: [] }))

  const roots: DocNode[] = []
  byId.forEach((node) => {
    if (node.parent_id && byId.has(node.parent_id)) {
      byId.get(node.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  })
  return roots
}

// Vind de root-ancestor van een doc-id (loop parent_id's omhoog)
function findRootAncestor(
  docId: string,
  flat: Omit<DocNode, 'children'>[],
): string | null {
  const byId = new Map(flat.map((d) => [d.id, d]))
  let current: string | null = docId
  const seen = new Set<string>()
  while (current && byId.has(current) && !seen.has(current)) {
    seen.add(current)
    const node: Omit<DocNode, 'children'> = byId.get(current)!
    if (!node.parent_id) return current
    current = node.parent_id
  }
  return current
}

export function DocumentTree({ scopeToRootOfId }: { scopeToRootOfId?: string } = {}) {
  const router = useRouter()
  const pathname = usePathname()
  const activeId = pathname?.match(/^\/documents\/([^/]+)/)?.[1]

  const [tree, setTree] = useState<DocNode[]>([])
  const [flatDocs, setFlatDocs] = useState<Array<Omit<DocNode, 'children'>>>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [creating, setCreating] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [dragOverPosition, setDragOverPosition] = useState<'before' | 'after' | 'inside' | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await workspaceClient
      .from<Array<Omit<DocNode, 'children'>>>('workspace_documents')
      .select('id, title, icon, parent_id, updated_at')
      .order('sort_order', { ascending: true })
      .order('updated_at', { ascending: false })
    if (!error && data) {
      setFlatDocs(data)
      const fullTree = buildTree(data)
      if (scopeToRootOfId) {
        const rootId = findRootAncestor(scopeToRootOfId, data)
        const scoped = rootId ? fullTree.filter((n) => n.id === rootId) : []
        setTree(scoped)
      } else {
        setTree(fullTree)
      }
    }
    setLoading(false)
  }, [scopeToRootOfId])

  useEffect(() => {
    load()
  }, [load, pathname])

  // Auto-expand de keten naar het actieve document — eenmalig per activeId
  const lastAutoExpandedFor = useRef<string | null>(null)
  useEffect(() => {
    if (!activeId) return
    if (lastAutoExpandedFor.current === activeId) return
    if (tree.length === 0) return
    lastAutoExpandedFor.current = activeId
    const next = new Set(expanded)
    const walk = (nodes: DocNode[], path: string[]): boolean => {
      for (const n of nodes) {
        if (n.id === activeId) {
          path.forEach((p) => next.add(p))
          return true
        }
        if (walk(n.children, [...path, n.id])) return true
      }
      return false
    }
    walk(tree, [])
    setExpanded(next)
  }, [activeId, tree]) // niet 'expanded' als dep — anders re-trigger na handmatig togglen

  const toggle = (id: string) => {
    const next = new Set(expanded)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setExpanded(next)
  }

  // 022a: drag-drop reorder
  const isDescendantOf = (ancestorId: string, candidateId: string): boolean => {
    const byId = new Map(flatDocs.map((d) => [d.id, d]))
    let cur: string | null = candidateId
    const seen = new Set<string>()
    while (cur && byId.has(cur) && !seen.has(cur)) {
      if (cur === ancestorId) return true
      seen.add(cur)
      cur = byId.get(cur)!.parent_id
    }
    return false
  }

  const handleDrop = async (
    draggedId: string,
    targetId: string,
    position: 'before' | 'after' | 'inside',
  ) => {
    if (draggedId === targetId) return
    // Voorkom dat je een node in z'n eigen subtree gooit
    if (isDescendantOf(draggedId, targetId)) return

    const target = flatDocs.find((d) => d.id === targetId)
    if (!target) return

    let newParentId: string | null
    let siblings: Array<Omit<DocNode, 'children'>>

    if (position === 'inside') {
      newParentId = targetId
      siblings = flatDocs.filter((d) => d.parent_id === targetId && d.id !== draggedId)
      // dragged komt aan het einde
      siblings.push({ ...flatDocs.find((d) => d.id === draggedId)! })
    } else {
      newParentId = target.parent_id
      siblings = flatDocs.filter((d) => d.parent_id === target.parent_id && d.id !== draggedId)
      const targetIndex = siblings.findIndex((d) => d.id === targetId)
      const dragged = flatDocs.find((d) => d.id === draggedId)!
      const insertAt = position === 'before' ? targetIndex : targetIndex + 1
      siblings.splice(insertAt, 0, dragged)
    }

    // Optimistic update
    const updates = siblings.map((s, idx) => ({ id: s.id, sort_order: idx * 10 }))
    const { error: parentErr } = await workspaceClient
      .from('workspace_documents')
      .update({ parent_id: newParentId })
      .eq('id', draggedId)
    if (parentErr) {
      alert(`Kon niet verplaatsen: ${parentErr.message}`)
      return
    }
    // Sort_orders per sibling
    await Promise.all(
      updates.map((u) =>
        workspaceClient
          .from('workspace_documents')
          .update({ sort_order: u.sort_order })
          .eq('id', u.id),
      ),
    )
    await load()
  }

  const addChild = async (parentId: string | null) => {
    setCreating(parentId ?? 'root')
    const { data, error } = await workspaceClient
      .from<Array<{ id: string }>>('workspace_documents')
      .insert({ title: 'Naamloos document', content: [], parent_id: parentId })
      .select('id')
    setCreating(null)
    const created = Array.isArray(data) ? data[0] : null
    if (error || !created) {
      alert(error?.message ?? 'Kon geen document aanmaken')
      return
    }
    if (parentId) {
      const next = new Set(expanded)
      next.add(parentId)
      setExpanded(next)
    }
    router.push(`/documents/${created.id}`)
  }

  const q = query.trim().toLowerCase()
  const filterTree = (nodes: DocNode[]): DocNode[] => {
    if (!q) return nodes
    const result: DocNode[] = []
    for (const n of nodes) {
      const childMatches = filterTree(n.children)
      const selfMatches = (n.title || '').toLowerCase().includes(q) ||
        (n.icon || '').toLowerCase().includes(q)
      if (selfMatches || childMatches.length > 0) {
        result.push({ ...n, children: childMatches })
      }
    }
    return result
  }
  const visibleTree = filterTree(tree)
  const searchExpanded = q ? new Set(getAllIds(visibleTree)) : expanded

  return (
    <aside className="w-60 shrink-0 border-r border-gray-100 bg-gray-50/50 flex flex-col h-[calc(100vh-64px)] sticky top-0">
      <div className="flex items-center justify-between px-3 py-3 border-b border-gray-100">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Documenten</span>
        <button
          onClick={() => addChild(null)}
          disabled={creating === 'root'}
          className="text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded p-1 transition disabled:opacity-50"
          title="Nieuw document"
        >
          {creating === 'root' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
        </button>
      </div>

      <div className="px-3 py-2 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zoek documenten..."
            className="w-full pl-7 pr-7 py-1.5 text-xs rounded-md bg-white border border-gray-200 focus:outline-none focus:border-gray-400"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
              title="Wis"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-1 py-2">
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          </div>
        ) : visibleTree.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4 px-3">
            {q ? `Geen resultaten voor "${query}"` : 'Nog geen documenten'}
          </p>
        ) : (
          <div className="space-y-0.5">
            {visibleTree.map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                depth={0}
                activeId={activeId}
                expanded={searchExpanded}
                onToggle={toggle}
                onAddChild={addChild}
                creating={creating}
                onDrop={handleDrop}
                dragOverId={dragOverId}
                dragOverPosition={dragOverPosition}
                setDragOver={(id, pos) => { setDragOverId(id); setDragOverPosition(pos) }}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}

function TreeNode({
  node,
  depth,
  activeId,
  expanded,
  onToggle,
  onAddChild,
  creating,
  onDrop,
  dragOverId,
  dragOverPosition,
  setDragOver,
}: {
  node: DocNode
  depth: number
  activeId: string | undefined
  expanded: Set<string>
  onToggle: (id: string) => void
  onAddChild: (parentId: string) => void
  creating: string | null
  onDrop: (draggedId: string, targetId: string, position: 'before' | 'after' | 'inside') => void
  dragOverId: string | null
  dragOverPosition: 'before' | 'after' | 'inside' | null
  setDragOver: (id: string | null, pos: 'before' | 'after' | 'inside' | null) => void
}) {
  const hasChildren = node.children.length > 0
  const isExpanded = expanded.has(node.id)
  const isActive = node.id === activeId
  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)
  const isDragOver = dragOverId === node.id

  useEffect(() => {
    if (!exportOpen) return
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [exportOpen])

  const doExport = (recursive: boolean, mode: 'print' | 'download') => {
    const url = `/api/documents/${node.id}/export?recursive=${recursive}&mode=${mode}`
    if (mode === 'print') {
      window.open(url, '_blank', 'noopener,noreferrer')
    } else {
      const a = document.createElement('a')
      a.href = url
      a.download = `${node.title || 'document'}.html`
      document.body.appendChild(a)
      a.click()
      a.remove()
    }
    setExportOpen(false)
  }

  return (
    <div>
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('text/x-doc-id', node.id)
          e.dataTransfer.effectAllowed = 'move'
        }}
        onDragOver={(e) => {
          const draggedId = e.dataTransfer.types.includes('text/x-doc-id') ? null : null
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
          const y = e.clientY - rect.top
          const third = rect.height / 3
          let pos: 'before' | 'after' | 'inside'
          if (y < third) pos = 'before'
          else if (y > rect.height - third) pos = 'after'
          else pos = 'inside'
          if (dragOverId !== node.id || dragOverPosition !== pos) {
            setDragOver(node.id, pos)
          }
          void draggedId
        }}
        onDragLeave={() => {
          if (dragOverId === node.id) setDragOver(null, null)
        }}
        onDrop={(e) => {
          e.preventDefault()
          e.stopPropagation()
          const draggedId = e.dataTransfer.getData('text/x-doc-id')
          const pos = dragOverPosition ?? 'after'
          setDragOver(null, null)
          if (draggedId && draggedId !== node.id) {
            onDrop(draggedId, node.id, pos)
          }
        }}
        className={cn(
          'group flex items-center gap-0.5 rounded-md px-1 py-1 transition hover:bg-gray-100 relative',
          isActive && 'bg-gray-200 hover:bg-gray-200',
          isDragOver && dragOverPosition === 'inside' && 'ring-2 ring-blue-400 bg-blue-50',
          isDragOver && dragOverPosition === 'before' && 'border-t-2 border-blue-500',
          isDragOver && dragOverPosition === 'after' && 'border-b-2 border-blue-500',
        )}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        <button
          onClick={() => hasChildren && onToggle(node.id)}
          className={cn(
            'shrink-0 p-0.5 rounded hover:bg-gray-200 transition',
            !hasChildren && 'invisible',
          )}
        >
          <ChevronRight
            className={cn('h-3 w-3 text-gray-500 transition-transform', isExpanded && 'rotate-90')}
          />
        </button>

        <Link href={`/documents/${node.id}`} className="flex items-center gap-1.5 min-w-0 flex-1">
          {node.icon ? (
            <span className="text-sm shrink-0">{node.icon}</span>
          ) : (
            <FileText className="h-3.5 w-3.5 text-gray-400 shrink-0" />
          )}
          <span className="text-sm text-gray-700 truncate">{node.title || 'Naamloos document'}</span>
        </Link>

        <div ref={exportRef} className="relative">
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setExportOpen(!exportOpen)
            }}
            className="opacity-0 group-hover:opacity-100 shrink-0 p-0.5 rounded hover:bg-gray-200 transition"
            title="Exporteren"
          >
            <Download className="h-3 w-3 text-gray-500" />
          </button>
          {exportOpen && (
            <div className="absolute right-0 top-full mt-1 z-30 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-1 text-sm">
              <button
                onClick={() => doExport(false, 'print')}
                className="w-full text-left px-3 py-1.5 hover:bg-gray-50"
              >
                Print als PDF
              </button>
              <button
                onClick={() => doExport(false, 'download')}
                className="w-full text-left px-3 py-1.5 hover:bg-gray-50"
              >
                Download als HTML
              </button>
              {hasChildren && (
                <>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={() => doExport(true, 'print')}
                    className="w-full text-left px-3 py-1.5 hover:bg-gray-50"
                  >
                    Print incl. subpaginas
                  </button>
                  <button
                    onClick={() => doExport(true, 'download')}
                    className="w-full text-left px-3 py-1.5 hover:bg-gray-50"
                  >
                    Download incl. subpaginas
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onAddChild(node.id)
          }}
          disabled={creating === node.id}
          className="opacity-0 group-hover:opacity-100 shrink-0 p-0.5 rounded hover:bg-gray-200 transition disabled:opacity-50"
          title="Sub-document toevoegen"
        >
          {creating === node.id ? (
            <Loader2 className="h-3 w-3 animate-spin text-gray-500" />
          ) : (
            <Plus className="h-3 w-3 text-gray-500" />
          )}
        </button>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              activeId={activeId}
              expanded={expanded}
              onToggle={onToggle}
              onAddChild={onAddChild}
              creating={creating}
              onDrop={onDrop}
              dragOverId={dragOverId}
              dragOverPosition={dragOverPosition}
              setDragOver={setDragOver}
            />
          ))}
        </div>
      )}
    </div>
  )
}
