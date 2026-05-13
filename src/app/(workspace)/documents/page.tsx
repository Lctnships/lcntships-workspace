'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Search, Upload, FolderPlus, Plus, X, ChevronLeft, ChevronRight,
  Grid3X3, List, Folder, Clock, FileText, Image as ImageIcon,
  FileSpreadsheet, Video, Music, MoreHorizontal, Loader2,
} from 'lucide-react'
import { workspaceClient } from '@/lib/workspace-client'

// ─── Types ────────────────────────────────────────────────────────────────────
type DocType = 'pdf' | 'img' | 'sheet' | 'video' | 'audio' | 'doc'

type Doc = {
  id: string
  name: string
  type: DocType
  folder: string
  date: string
  href: string
}

type FolderItem = { name: string; color: string; count: number }

// ─── Static folder palette ────────────────────────────────────────────────────
const DEFAULT_FOLDERS: FolderItem[] = [
  { name: 'Contracten', color: '#1565C0', count: 0 },
  { name: 'Facturen', color: '#2E7D32', count: 0 },
  { name: 'Templates', color: '#6A1B9A', count: 0 },
  { name: 'Marketing', color: '#E65100', count: 0 },
  { name: 'Studio-info', color: '#C62828', count: 0 },
  { name: 'Overig', color: '#263238', count: 0 },
]

const FOLDER_COLORS = ['#1565C0', '#2E7D32', '#6A1B9A', '#E65100', '#C62828', '#263238']

const TEMPLATES = [
  { id: 't1', name: 'Leeg document', desc: 'Begin met een lege pagina' },
  { id: 't2', name: 'Contracttemplate', desc: 'Partnerovereenkomst' },
  { id: 't3', name: 'Factuurtemplate', desc: 'Factuuroverzicht' },
  { id: 't4', name: 'Propositie', desc: 'Business proposal' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function inferType(name: string): DocType {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  if (['pdf'].includes(ext)) return 'pdf'
  if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) return 'img'
  if (['xlsx', 'xls', 'csv', 'numbers'].includes(ext)) return 'sheet'
  if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) return 'video'
  if (['mp3', 'wav', 'm4a', 'flac'].includes(ext)) return 'audio'
  return 'doc'
}

function typeLabel(t: DocType): string {
  return { pdf: 'PDF', img: 'Afbeelding', sheet: 'Spreadsheet', video: 'Video', audio: 'Audio', doc: 'Document' }[t]
}

function typeStyles(t: DocType): { bg: string; fg: string } {
  return {
    pdf: { bg: '#FFF3E0', fg: '#E65100' },
    img: { bg: '#E3F2FD', fg: '#1565C0' },
    sheet: { bg: '#E8F5E9', fg: '#2E7D32' },
    video: { bg: '#FCE4EC', fg: '#C62828' },
    audio: { bg: 'var(--surface)', fg: 'var(--ink-ghost)' },
    doc: { bg: 'var(--accent-tint)', fg: 'var(--accent)' },
  }[t]
}

function TypeIcon({ t, size = 18 }: { t: DocType; size?: number }) {
  const Icon = { pdf: FileText, img: ImageIcon, sheet: FileSpreadsheet, video: Video, audio: Music, doc: FileText }[t]
  return <Icon style={{ width: size, height: size }} />
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('Alle types')
  const [folderFilter, setFolderFilter] = useState('Alle mappen')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showFolderModal, setShowFolderModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data } = await workspaceClient
        .from<Array<{ id: string; title: string; updated_at: string; created_at: string }>>('workspace_documents')
        .select('id, title, updated_at, created_at')
        .order('updated_at', { ascending: false })
        .limit(200)
      if (cancelled) return
      const items: Doc[] = (data ?? []).map(d => ({
        id: d.id,
        name: d.title || 'Naamloos document',
        type: inferType(d.title || ''),
        folder: 'Overig',
        date: formatDate(d.updated_at),
        href: `/documents/${d.id}`,
      }))
      setDocs(items)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Compute folder counts
  const folders = useMemo<FolderItem[]>(() => {
    const counts = new Map<string, number>()
    for (const d of docs) counts.set(d.folder, (counts.get(d.folder) || 0) + 1)
    return DEFAULT_FOLDERS.map(f => ({ ...f, count: counts.get(f.name) || 0 }))
  }, [docs])

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return docs.filter(d => {
      if (q && !d.name.toLowerCase().includes(q) && !d.folder.toLowerCase().includes(q)) return false
      if (typeFilter !== 'Alle types' && typeLabel(d.type) !== typeFilter) return false
      if (folderFilter !== 'Alle mappen' && d.folder !== folderFilter) return false
      return true
    })
  }, [docs, searchQuery, typeFilter, folderFilter])

  const recent = useMemo(() => docs.slice(0, 6), [docs])

  return (
    <>
      <style jsx global>{`
        .dx-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; font-size: 13px; font-weight: 600; border: 1px solid transparent; cursor: pointer; white-space: nowrap; font-family: inherit; transition: background 0.15s, opacity 0.15s; }
        .dx-btn-primary { background: var(--accent); color: white; border-color: var(--accent); }
        .dx-btn-primary:hover { opacity: 0.88; }
        .dx-btn-outline { background: white; color: var(--ink); border-color: var(--edge); }
        .dx-btn-outline:hover { background: var(--surface); }
        .dx-input { border: none; background: transparent; font-size: 13px; color: var(--ink); outline: none; font-family: inherit; }
        .dx-input::placeholder { color: var(--ink-ghost); }
        .dx-select { border: 1px solid var(--edge); background: white; padding: 6px 10px; font-size: 12px; color: var(--ink-muted); outline: none; font-family: inherit; cursor: pointer; }
        .dx-view-btn { padding: 6px 10px; background: transparent; border: none; color: var(--ink-ghost); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.15s, color 0.15s; }
        .dx-view-btn.active { background: var(--accent); color: white; }
        .dx-section-label { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-ghost); }
        .dx-fi { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
      `}</style>

      <div style={{ margin: '-16px -16px 0', minHeight: 'calc(100vh - 64px)', background: 'var(--bg, #F9FAFE)', padding: '36px 40px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28, gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em' }}>Documenten</div>
            <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: 3 }}>Beheer en organiseer alle bestanden en documenten</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="dx-btn dx-btn-outline" onClick={() => setShowUploadModal(true)}>
              <Upload style={{ width: 14, height: 14 }} />
              Uploaden
            </button>
            <button className="dx-btn dx-btn-outline" onClick={() => setShowFolderModal(true)}>
              <FolderPlus style={{ width: 14, height: 14 }} />
              Nieuwe map
            </button>
            <button className="dx-btn dx-btn-primary" onClick={() => setShowCreateModal(true)}>
              <Plus style={{ width: 14, height: 14 }} />
              Nieuw document
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'white', border: '1px solid var(--edge)', padding: '10px 16px', marginBottom: 24, flexWrap: 'wrap' }}>
          <Search style={{ width: 15, height: 15, color: 'var(--ink-ghost)' }} />
          <input
            type="text"
            className="dx-input"
            placeholder="Zoek documenten, mappen…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1, minWidth: 180 }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <select className="dx-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option>Alle types</option>
              <option>PDF</option>
              <option>Spreadsheet</option>
              <option>Afbeelding</option>
              <option>Video</option>
              <option>Document</option>
            </select>
            <select className="dx-select" value={folderFilter} onChange={(e) => setFolderFilter(e.target.value)}>
              <option>Alle mappen</option>
              {DEFAULT_FOLDERS.map(f => <option key={f.name}>{f.name}</option>)}
            </select>
            <div style={{ display: 'flex', border: '1px solid var(--edge)', background: 'white', overflow: 'hidden' }}>
              <button
                className={`dx-view-btn${view === 'grid' ? ' active' : ''}`}
                onClick={() => setView('grid')}
                title="Rasterweergave"
              >
                <Grid3X3 style={{ width: 14, height: 14 }} />
              </button>
              <button
                className={`dx-view-btn${view === 'list' ? ' active' : ''}`}
                onClick={() => setView('list')}
                title="Lijstweergave"
              >
                <List style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>
        </div>

        {/* Folders */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span className="dx-section-label">
            <Folder style={{ width: 13, height: 13 }} />
            Mappen
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 32, flexWrap: 'wrap' }}>
          {folders.map(f => (
            <button
              key={f.name}
              onClick={() => setFolderFilter(f.name)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', background: 'white', border: '1px solid var(--edge)',
                cursor: 'pointer', minWidth: 152, transition: 'border-color 0.15s',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--ink-ghost)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--edge)' }}
            >
              <div style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: f.color }}>
                <Folder style={{ width: 22, height: 22, fill: f.color }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{f.name}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-ghost)' }}>{f.count} item{f.count !== 1 ? 's' : ''}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Recent */}
        <RecentSection docs={recent} />

        {/* All documents */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span className="dx-section-label">
            <FileText style={{ width: 13, height: 13 }} />
            Alle documenten
          </span>
          <span style={{ fontSize: 12, color: 'var(--ink-ghost)' }}>{filtered.length} bestand{filtered.length !== 1 ? 'en' : ''}</span>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-ghost)' }}>
            <Loader2 className="animate-spin" style={{ width: 22, height: 22, display: 'inline-block' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', fontSize: 13, color: 'var(--ink-ghost)', background: 'white', border: '1px solid var(--edge)' }}>
            Geen documenten gevonden voor dit filter.
          </div>
        ) : view === 'grid' ? (
          <DocsGrid docs={filtered} />
        ) : (
          <DocsList docs={filtered} />
        )}
      </div>

      {showCreateModal && <CreateDocModal onClose={() => setShowCreateModal(false)} />}
      {showFolderModal && <FolderModal onClose={() => setShowFolderModal(false)} />}
      {showUploadModal && <UploadModal onClose={() => setShowUploadModal(false)} />}
    </>
  )
}

// ─── Recent section ───────────────────────────────────────────────────────────
function RecentSection({ docs }: Readonly<{ docs: Doc[] }>) {
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null)
  if (docs.length === 0) return null
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span className="dx-section-label">
          <Clock style={{ width: 13, height: 13 }} />
          Recent
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => scrollEl?.scrollBy({ left: -180, behavior: 'smooth' })}
            style={{ background: 'none', border: '1px solid var(--edge)', padding: '4px 6px', cursor: 'pointer', color: 'var(--ink-ghost)', display: 'flex', alignItems: 'center' }}
          >
            <ChevronLeft style={{ width: 13, height: 13 }} />
          </button>
          <button
            onClick={() => scrollEl?.scrollBy({ left: 180, behavior: 'smooth' })}
            style={{ background: 'none', border: '1px solid var(--edge)', padding: '4px 6px', cursor: 'pointer', color: 'var(--ink-ghost)', display: 'flex', alignItems: 'center' }}
          >
            <ChevronRight style={{ width: 13, height: 13 }} />
          </button>
        </div>
      </div>
      <div
        ref={setScrollEl}
        style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4, marginBottom: 32, scrollbarWidth: 'none' }}
      >
        {docs.map(d => {
          const styles = typeStyles(d.type)
          return (
            <Link
              key={d.id}
              href={d.href}
              style={{
                flexShrink: 0, width: 158, background: 'white',
                border: '1px solid var(--edge)', overflow: 'hidden',
                textDecoration: 'none', color: 'inherit',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--ink-ghost)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--edge)' }}
            >
              <div style={{ height: 88, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)' }}>
                <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: styles.bg, color: styles.fg }}>
                  <TypeIcon t={d.type} size={20} />
                </div>
              </div>
              <div style={{ padding: '10px 12px', borderTop: '1px solid var(--edge-soft)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {d.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-ghost)', marginTop: 2 }}>{d.date}</div>
              </div>
            </Link>
          )
        })}
      </div>
    </>
  )
}

// ─── Docs grid ────────────────────────────────────────────────────────────────
function DocsGrid({ docs }: Readonly<{ docs: Doc[] }>) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
      {docs.map(d => {
        const styles = typeStyles(d.type)
        return (
          <Link
            key={d.id}
            href={d.href}
            style={{
              background: 'white', border: '1px solid var(--edge)',
              padding: 16, cursor: 'pointer',
              textDecoration: 'none', color: 'inherit',
              transition: 'border-color 0.15s', display: 'block',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--ink-ghost)' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--edge)' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', background: styles.bg, color: styles.fg }}>
                <TypeIcon t={d.type} size={18} />
              </div>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
                style={{ background: 'none', border: 'none', color: 'var(--ink-ghost)', padding: '2px 4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <MoreHorizontal style={{ width: 14, height: 14 }} />
              </button>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {d.name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-ghost)', marginTop: 4 }}>
              {d.folder} · {d.date}
            </div>
          </Link>
        )
      })}
    </div>
  )
}

// ─── Docs list ────────────────────────────────────────────────────────────────
function DocsList({ docs }: Readonly<{ docs: Doc[] }>) {
  return (
    <div style={{ background: 'white', border: '1px solid var(--edge)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--edge)' }}>
            <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-ghost)' }}>Naam</th>
            <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-ghost)' }}>Map</th>
            <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-ghost)' }}>Type</th>
            <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-ghost)' }}>Gewijzigd</th>
            <th style={{ width: 40 }}></th>
          </tr>
        </thead>
        <tbody>
          {docs.map(d => {
            const styles = typeStyles(d.type)
            return (
              <tr key={d.id} style={{ borderBottom: '1px solid var(--edge-soft)' }}>
                <td style={{ padding: '11px 14px' }}>
                  <Link href={d.href} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: styles.bg, color: styles.fg, flexShrink: 0 }}>
                      <TypeIcon t={d.type} size={16} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{d.name}</span>
                  </Link>
                </td>
                <td style={{ padding: '11px 14px', fontSize: 13, color: 'var(--ink-muted)' }}>{d.folder}</td>
                <td style={{ padding: '11px 14px', fontSize: 13, color: 'var(--ink-muted)' }}>{typeLabel(d.type)}</td>
                <td style={{ padding: '11px 14px', fontSize: 13, color: 'var(--ink-muted)' }}>{d.date}</td>
                <td style={{ padding: '11px 14px' }}>
                  <button style={{ background: 'none', border: 'none', color: 'var(--ink-ghost)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}>
                    <MoreHorizontal style={{ width: 14, height: 14 }} />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Modals ───────────────────────────────────────────────────────────────────
function ModalShell({ title, onClose, maxWidth = 560, children, footer }: Readonly<{ title: string; onClose: () => void; maxWidth?: number; children: React.ReactNode; footer?: React.ReactNode }>) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.42)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'white', border: '1px solid var(--edge)', width: '100%', maxWidth }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--edge)' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{title}</span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--ink-ghost)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
          >
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>
        {children}
        {footer}
      </div>
    </div>
  )
}

function CreateDocModal({ onClose }: Readonly<{ onClose: () => void }>) {
  const [tab, setTab] = useState<'template' | 'upload'>('template')
  const [selectedTpl, setSelectedTpl] = useState<string | null>(null)
  const [docName, setDocName] = useState('')

  return (
    <ModalShell
      title="Nieuw document"
      onClose={onClose}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 22px', borderTop: '1px solid var(--edge)' }}>
          <button className="dx-btn dx-btn-outline" onClick={onClose}>Annuleren</button>
          <button className="dx-btn dx-btn-primary">Document aanmaken</button>
        </div>
      }
    >
      <div style={{ display: 'flex', borderBottom: '1px solid var(--edge)' }}>
        <button
          onClick={() => setTab('template')}
          style={{
            flex: 1, padding: 12, background: 'none', border: 'none',
            fontSize: 13, fontWeight: 600,
            color: tab === 'template' ? 'var(--accent)' : 'var(--ink-ghost)',
            borderBottom: `2px solid ${tab === 'template' ? 'var(--accent)' : 'transparent'}`,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Template kiezen
        </button>
        <button
          onClick={() => setTab('upload')}
          style={{
            flex: 1, padding: 12, background: 'none', border: 'none',
            fontSize: 13, fontWeight: 600,
            color: tab === 'upload' ? 'var(--accent)' : 'var(--ink-ghost)',
            borderBottom: `2px solid ${tab === 'upload' ? 'var(--accent)' : 'transparent'}`,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Bestand uploaden
        </button>
      </div>
      <div style={{ padding: 22 }}>
        {tab === 'template' ? (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 6 }}>
                Documentnaam
              </label>
              <input
                type="text"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="Naam van het document…"
                style={{ width: '100%', border: '1px solid var(--edge)', background: 'var(--bg, #F9FAFE)', padding: '9px 12px', fontSize: 13, color: 'var(--ink)', outline: 'none', fontFamily: 'inherit' }}
              />
            </div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 6 }}>
              Kies een template
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
              {TEMPLATES.map(t => {
                const isSel = selectedTpl === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTpl(t.id)}
                    style={{
                      border: `1px solid ${isSel ? 'var(--accent)' : 'var(--edge)'}`,
                      background: isSel ? 'var(--accent-tint)' : 'white',
                      padding: 14, cursor: 'pointer', textAlign: 'left',
                      fontFamily: 'inherit',
                    }}
                  >
                    <div style={{ width: 36, height: 36, background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                      <FileText style={{ width: 18, height: 18, color: 'var(--ink-muted)' }} />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 2 }}>{t.desc}</div>
                  </button>
                )
              })}
            </div>
          </>
        ) : (
          <UploadArea />
        )}
      </div>
    </ModalShell>
  )
}

function FolderModal({ onClose }: Readonly<{ onClose: () => void }>) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(FOLDER_COLORS[0])
  return (
    <ModalShell
      title="Nieuwe map"
      onClose={onClose}
      maxWidth={420}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 22px', borderTop: '1px solid var(--edge)' }}>
          <button className="dx-btn dx-btn-outline" onClick={onClose}>Annuleren</button>
          <button className="dx-btn dx-btn-primary">Map aanmaken</button>
        </div>
      }
    >
      <div style={{ padding: 22 }}>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 6 }}>
            Mapnaam
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Naam van de map…"
            style={{ width: '100%', border: '1px solid var(--edge)', background: 'var(--bg, #F9FAFE)', padding: '9px 12px', fontSize: 13, color: 'var(--ink)', outline: 'none', fontFamily: 'inherit' }}
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 6 }}>
            Kleur
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            {FOLDER_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: c, cursor: 'pointer',
                  border: `2px solid ${color === c ? 'var(--ink)' : 'transparent'}`,
                  transform: color === c ? 'scale(1.15)' : 'scale(1)',
                  transition: 'transform 0.15s',
                }}
              />
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, background: 'var(--surface)', marginTop: 16 }}>
          <div style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: color, color: '#fff' }}>
            <Folder style={{ width: 22, height: 22 }} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{name || 'Nieuwe map'}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-ghost)' }}>0 items</div>
          </div>
        </div>
      </div>
    </ModalShell>
  )
}

function UploadModal({ onClose }: Readonly<{ onClose: () => void }>) {
  return (
    <ModalShell
      title="Bestanden uploaden"
      onClose={onClose}
      maxWidth={460}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 22px', borderTop: '1px solid var(--edge)' }}>
          <button className="dx-btn dx-btn-outline" onClick={onClose}>Annuleren</button>
        </div>
      }
    >
      <div style={{ padding: 22 }}>
        <UploadArea />
      </div>
    </ModalShell>
  )
}

function UploadArea() {
  return (
    <div
      style={{
        border: '1px dashed var(--edge)', padding: 36, textAlign: 'center',
        cursor: 'pointer', transition: 'background 0.15s, border-color 0.15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--ink-ghost)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--edge)' }}
    >
      <div style={{ color: 'var(--ink-ghost)', marginBottom: 10, display: 'flex', justifyContent: 'center' }}>
        <Upload style={{ width: 32, height: 32 }} />
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>Bestanden slepen of klikken</div>
      <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>PDF, DOCX, XLSX, PNG, JPG, MP4 — max 100 MB</div>
    </div>
  )
}
