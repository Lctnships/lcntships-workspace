'use client'

import { use, useCallback, useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MoreHorizontal, Share2, Send, Loader2 } from 'lucide-react'
import { workspaceClient } from '@/lib/workspace-client'
import type { Value } from 'platejs'

const DocumentEditor = dynamic(
  () => import('@/components/editor/DocumentEditor').then((m) => m.DocumentEditor),
  { ssr: false },
)

// ─── Types ────────────────────────────────────────────────────────────────────
type DocRow = {
  id: string
  title: string
  content: Value
  icon: string | null
  cover_url: string | null
  updated_at: string
  created_at: string
  parent_id: string | null
}

type Comment = {
  id: string
  author: string
  initials: string
  color: string
  time: string
  quote: string | null
  body: string
  resolved: boolean
}

type HistoryItem = { initials: string; color: string; author: string; action: string; time: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const m = Math.floor(ms / 60000)
  if (m < 1) return 'Zojuist'
  if (m < 60) return `${m} min geleden`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} uur geleden`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d} dag${d === 1 ? '' : 'en'} geleden`
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Demo comments (later: aparte tabel)
const DEMO_COMMENTS: Comment[] = [
  {
    id: 'c1',
    author: 'Rivaldo MA',
    initials: 'RM',
    color: '#0E4F6D',
    time: '10 min geleden',
    quote: 'De listing is alleen zichtbaar voor nieuwe gebruikers.',
    body: 'Kunnen we dit nog specifieker maken? "Nieuwe gebruikers via het platform" klinkt preciezer.',
    resolved: false,
  },
  {
    id: 'c2',
    author: 'Sofie V.',
    initials: 'SV',
    color: '#2E7D32',
    time: '1 uur geleden',
    quote: null,
    body: 'Planning ziet er goed uit. Ik zou week 2 en week 3 omwisselen.',
    resolved: false,
  },
]

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [doc, setDoc] = useState<DocRow | null>(null)
  const [parentTitle, setParentTitle] = useState<string>('')
  const [err, setErr] = useState<string | null>(null)
  const [rightTab, setRightTab] = useState<'comments' | 'history'>('comments')
  const [comments, setComments] = useState<Comment[]>(DEMO_COMMENTS)
  const [newComment, setNewComment] = useState('')
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved')

  useEffect(() => {
    let active = true
    ;(async () => {
      const { data, error } = await workspaceClient
        .from<DocRow[]>('workspace_documents')
        .select('id, title, content, icon, cover_url, updated_at, created_at, parent_id')
        .eq('id', id)
        .limit(1)
      if (!active) return
      if (error) { setErr(error.message); return }
      const row = Array.isArray(data) ? data[0] : null
      if (!row) { setErr('Document niet gevonden'); return }
      setDoc(row)

      if (row.parent_id) {
        const { data: parentData } = await workspaceClient
          .from<Array<{ title: string }>>('workspace_documents')
          .select('title')
          .eq('id', row.parent_id)
          .limit(1)
        if (parentData && parentData[0]) setParentTitle(parentData[0].title || '')
      }
    })()
    return () => { active = false }
  }, [id])

  // ── History from doc dates (lightweight) ──
  const history = useMemo<HistoryItem[]>(() => {
    if (!doc) return []
    const items: HistoryItem[] = []
    if (doc.updated_at && doc.updated_at !== doc.created_at) {
      items.push({
        initials: 'RM', color: '#0E4F6D',
        author: 'Rivaldo MA',
        action: 'heeft het document bijgewerkt',
        time: relativeTime(doc.updated_at),
      })
    }
    items.push({
      initials: 'RM', color: '#0E4F6D',
      author: 'Rivaldo MA',
      action: 'heeft het document aangemaakt',
      time: formatDate(doc.created_at),
    })
    return items
  }, [doc])

  const submitComment = useCallback(() => {
    const val = newComment.trim()
    if (!val) return
    setComments(prev => [
      {
        id: `c${Date.now()}`,
        author: 'Rivaldo MA', initials: 'RM', color: '#0E4F6D',
        time: 'Zojuist', quote: null, body: val, resolved: false,
      },
      ...prev,
    ])
    setNewComment('')
  }, [newComment])

  const toggleResolved = useCallback((commentId: string) => {
    setComments(prev => prev.map(c => c.id === commentId ? { ...c, resolved: !c.resolved } : c))
  }, [])

  if (err) {
    return (
      <div style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-muted)' }}>
        {err}
      </div>
    )
  }

  if (!doc) {
    return (
      <div style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="animate-spin" style={{ width: 22, height: 22, color: 'var(--ink-ghost)' }} />
      </div>
    )
  }

  return (
    <>
      <style jsx global>{`
        .doc-btn-icon {
          width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;
          background: none; border: none; color: var(--ink-ghost);
          cursor: pointer; border-radius: 4px; transition: background 0.12s, color 0.12s;
        }
        .doc-btn-icon:hover { background: var(--surface); color: var(--ink); }
        .doc-btn-sm {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 6px 12px; font-size: 12px; font-weight: 600;
          border: 1px solid var(--edge); background: #fff; color: var(--ink);
          cursor: pointer; border-radius: 3px; transition: background 0.12s;
        }
        .doc-btn-sm:hover { background: var(--surface); }
        .doc-meta-row { display: flex; align-items: center; gap: 8px; padding: 5px 0; border-bottom: 1px solid var(--edge-soft); font-size: 11px; }
        .doc-meta-row:last-child { border-bottom: none; }
        .doc-meta-key { color: var(--ink-ghost); min-width: 72px; font-weight: 600; }
        .doc-meta-val { color: var(--ink-muted); }
        .doc-tag { display: inline-flex; align-items: center; padding: 2px 7px; border-radius: 2px; font-size: 10px; font-weight: 700; background: var(--accent-tint); color: var(--accent); }
      `}</style>

      <div style={{ margin: '-16px -16px 0 -16px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', background: '#fff' }}>
        {/* Topbar */}
        <div
          style={{
            height: 52, background: '#fff', borderBottom: '1px solid var(--edge)',
            display: 'flex', alignItems: 'center', padding: '0 16px', flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
            <button className="doc-btn-icon" onClick={() => router.push('/documents')} title="Terug">
              <ArrowLeft style={{ width: 16, height: 16 }} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--ink-muted)', minWidth: 0 }}>
              <span>Documenten</span>
              {parentTitle && (
                <>
                  <span style={{ color: 'var(--ink-ghost)' }}>/</span>
                  <span>{parentTitle}</span>
                </>
              )}
              <span style={{ color: 'var(--ink-ghost)' }}>/</span>
              <span style={{ fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {doc.title || 'Naamloos document'}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ fontSize: 11, color: 'var(--ink-ghost)', display: 'flex', alignItems: 'center', gap: 5 }}>
              {saveStatus === 'saved' ? (
                <>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'oklch(0.65 0.16 145)' }} />
                  <span>Opgeslagen</span>
                </>
              ) : (
                <span>Wordt opgeslagen…</span>
              )}
            </div>
            <button className="doc-btn-sm">
              <Share2 style={{ width: 13, height: 13 }} />
              Delen
            </button>
            <button className="doc-btn-icon">
              <MoreHorizontal style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </div>

        {/* Layout: outline + editor + right panel */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* Outline sidebar */}
          <div
            style={{
              width: 240, flexShrink: 0, overflowY: 'auto',
              borderRight: '1px solid var(--edge)', padding: '20px 0', background: 'var(--bg, #F9FAFE)',
            }}
          >
            <div style={{ padding: '0 18px', marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-ghost)', marginBottom: 8, padding: '0 4px' }}>
                Documentoverzicht
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-ghost)', padding: '6px 8px', fontStyle: 'italic' }}>
                Automatisch gegenereerd uit koppen
              </div>
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid var(--edge)', margin: '10px 14px' }} />
            <div style={{ padding: '0 18px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-ghost)', marginBottom: 8, padding: '0 4px' }}>
                Eigenschappen
              </div>
              <div className="doc-meta-row">
                <span className="doc-meta-key">Type</span>
                <span className="doc-tag">Document</span>
              </div>
              {parentTitle && (
                <div className="doc-meta-row">
                  <span className="doc-meta-key">Map</span>
                  <span className="doc-meta-val">{parentTitle}</span>
                </div>
              )}
              <div className="doc-meta-row">
                <span className="doc-meta-key">Aangemaakt</span>
                <span className="doc-meta-val">{formatDate(doc.created_at)}</span>
              </div>
              <div className="doc-meta-row">
                <span className="doc-meta-key">Gewijzigd</span>
                <span className="doc-meta-val">{relativeTime(doc.updated_at)}</span>
              </div>
              <div className="doc-meta-row">
                <span className="doc-meta-key">Auteur</span>
                <span className="doc-meta-val">Rivaldo MA</span>
              </div>
              <div className="doc-meta-row">
                <span className="doc-meta-key">Status</span>
                <span className="doc-tag" style={{ background: '#e8f5e9', color: '#2e7d32' }}>Concept</span>
              </div>
            </div>
          </div>

          {/* Editor */}
          <div style={{ flex: 1, overflowY: 'auto', background: '#fff', minWidth: 0 }}>
            <DocumentEditor
              id={doc.id}
              initialTitle={doc.title}
              initialContent={doc.content}
              initialIcon={doc.icon}
              initialCoverUrl={doc.cover_url}
            />
          </div>

          {/* Right panel: comments / history */}
          <div
            style={{
              width: 280, flexShrink: 0, height: '100%',
              borderLeft: '1px solid var(--edge)', background: '#fff',
              display: 'flex', flexDirection: 'column',
            }}
          >
            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--edge)', flexShrink: 0 }}>
              <button
                onClick={() => setRightTab('comments')}
                style={{
                  flex: 1, padding: '13px 8px', background: 'none', border: 'none',
                  fontSize: 12, fontWeight: 600,
                  color: rightTab === 'comments' ? 'var(--accent)' : 'var(--ink-ghost)',
                  borderBottom: `2px solid ${rightTab === 'comments' ? 'var(--accent)' : 'transparent'}`,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Opmerkingen
              </button>
              <button
                onClick={() => setRightTab('history')}
                style={{
                  flex: 1, padding: '13px 8px', background: 'none', border: 'none',
                  fontSize: 12, fontWeight: 600,
                  color: rightTab === 'history' ? 'var(--accent)' : 'var(--ink-ghost)',
                  borderBottom: `2px solid ${rightTab === 'history' ? 'var(--accent)' : 'transparent'}`,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Geschiedenis
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {rightTab === 'comments' ? (
                comments.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--ink-ghost)' }}>
                    Nog geen opmerkingen. Plaats er een hieronder.
                  </div>
                ) : (
                  comments.map(c => (
                    <div
                      key={c.id}
                      style={{ padding: '14px 16px', borderBottom: '1px solid var(--edge-soft)', opacity: c.resolved ? 0.5 : 1 }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                          {c.initials}
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{c.author}</span>
                        <span style={{ fontSize: 11, color: 'var(--ink-ghost)', marginLeft: 'auto' }}>{c.time}</span>
                      </div>
                      {c.quote && (
                        <div style={{ background: 'var(--surface)', borderLeft: '2px solid var(--edge)', padding: '4px 8px', marginBottom: 6, fontSize: 11, color: 'var(--ink-ghost)', fontStyle: 'italic' }}>
                          &ldquo;{c.quote}&rdquo;
                        </div>
                      )}
                      <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--ink-muted)' }}>
                        {c.body}
                      </div>
                      <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                        <button
                          style={{ background: 'none', border: 'none', fontSize: 11, color: 'var(--ink-ghost)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}
                        >
                          Reageren
                        </button>
                        <button
                          onClick={() => toggleResolved(c.id)}
                          style={{ background: 'none', border: 'none', fontSize: 11, color: 'var(--ink-ghost)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, marginLeft: 'auto' }}
                        >
                          {c.resolved ? 'Heropenen' : 'Oplossen'}
                        </button>
                      </div>
                    </div>
                  ))
                )
              ) : (
                history.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--ink-ghost)' }}>
                    Geen geschiedenis beschikbaar.
                  </div>
                ) : (
                  history.map((h, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--edge-soft)' }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: h.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                        {h.initials}
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: 'var(--ink-muted)', lineHeight: 1.4 }}>
                          <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{h.author}</span> {h.action}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--ink-ghost)', marginTop: 2 }}>{h.time}</div>
                      </div>
                    </div>
                  ))
                )
              )}
            </div>

            {/* Comment input */}
            {rightTab === 'comments' && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--edge)', display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Opmerking toevoegen…"
                  rows={1}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment() } }}
                  style={{
                    flex: 1, border: '1px solid var(--edge)', background: 'var(--bg, #F9FAFE)',
                    padding: '7px 10px', fontSize: 12, fontFamily: 'inherit', color: 'var(--ink)',
                    resize: 'none', outline: 'none', minHeight: 34, borderRadius: 3,
                  }}
                />
                <button
                  onClick={submitComment}
                  className="doc-btn-icon"
                  title="Versturen"
                >
                  <Send style={{ width: 14, height: 14 }} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
