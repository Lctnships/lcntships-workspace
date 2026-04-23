'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronRight, Plus, FileText, Loader2, Download } from 'lucide-react'
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
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [creating, setCreating] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await workspaceClient
      .from<Array<Omit<DocNode, 'children'>>>('workspace_documents')
      .select('id, title, icon, parent_id, updated_at')
      .order('sort_order', { ascending: true })
      .order('updated_at', { ascending: false })
    if (!error && data) {
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

      <div className="flex-1 overflow-y-auto px-1 py-2">
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          </div>
        ) : tree.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4 px-3">Nog geen documenten</p>
        ) : (
          <div className="space-y-0.5">
            {tree.map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                depth={0}
                activeId={activeId}
                expanded={expanded}
                onToggle={toggle}
                onAddChild={addChild}
                creating={creating}
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
}: {
  node: DocNode
  depth: number
  activeId: string | undefined
  expanded: Set<string>
  onToggle: (id: string) => void
  onAddChild: (parentId: string) => void
  creating: string | null
}) {
  const hasChildren = node.children.length > 0
  const isExpanded = expanded.has(node.id)
  const isActive = node.id === activeId
  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

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
        className={cn(
          'group flex items-center gap-0.5 rounded-md px-1 py-1 transition hover:bg-gray-100 relative',
          isActive && 'bg-gray-200 hover:bg-gray-200',
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
            />
          ))}
        </div>
      )}
    </div>
  )
}
