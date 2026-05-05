'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Search,
  Upload,
  FolderPlus,
  FilePlus,
  Pin,
  Clock,
  Grid3X3,
  List,
  MoreHorizontal,
  FileText,
  Image,
  FileSpreadsheet,
  Video,
  Music,
  File,
  Folder,
  Star,
  Download,
  Trash2,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Inbox,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { workspaceClient } from '@/lib/workspace-client'

// Helper to get icon info based on document type
function getDocTypeIcon(type?: string): { icon: any; iconBg: string; iconColor: string } {
  switch (type?.toLowerCase()) {
    case 'pdf':
      return { icon: FileText, iconBg: 'bg-orange-100', iconColor: 'text-orange-600' }
    case 'image':
    case 'png':
    case 'jpg':
    case 'jpeg':
      return { icon: Image, iconBg: 'bg-blue-100', iconColor: 'text-blue-600' }
    case 'spreadsheet':
    case 'xlsx':
    case 'csv':
      return { icon: FileSpreadsheet, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' }
    case 'video':
    case 'mp4':
      return { icon: Video, iconBg: 'bg-pink-100', iconColor: 'text-pink-600' }
    case 'audio':
    case 'mp3':
      return { icon: Music, iconBg: 'bg-gray-200', iconColor: 'text-gray-900' }
    default:
      return { icon: File, iconBg: 'bg-purple-100', iconColor: 'text-purple-600' }
  }
}

function formatDate(dateString?: string): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}

const documentTemplates = [
  { id: 't1', name: 'Blank Document', icon: FileText, description: 'Start from scratch' },
  { id: 't2', name: 'Contract Template', icon: FileText, description: 'Partner agreement' },
  { id: 't3', name: 'Invoice Template', icon: FileSpreadsheet, description: 'Billing document' },
  { id: 't4', name: 'Proposal Template', icon: FileText, description: 'Business proposal' },
]

const folderColors = [
  { id: 'blue', color: 'bg-blue-500' },
  { id: 'emerald', color: 'bg-emerald-500' },
  { id: 'purple', color: 'bg-purple-500' },
  { id: 'orange', color: 'bg-orange-500' },
  { id: 'pink', color: 'bg-pink-500' },
  { id: 'dark', color: 'bg-gray-900' },
]

// Modal Components
function CreateDocumentModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'template' | 'upload'>('template')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [documentName, setDocumentName] = useState('')

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Create New Document</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('template')}
            className={cn(
              'flex-1 py-4 text-sm font-bold transition-colors',
              activeTab === 'template'
                ? 'text-gray-900 border-b-2 border-gray-900'
                : 'text-gray-400 hover:text-gray-600'
            )}
          >
            Choose Template
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={cn(
              'flex-1 py-4 text-sm font-bold transition-colors',
              activeTab === 'upload'
                ? 'text-gray-900 border-b-2 border-gray-900'
                : 'text-gray-400 hover:text-gray-600'
            )}
          >
            Upload File
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'template' ? (
            <div className="space-y-6">
              {/* Document Name */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Document Name</label>
                <Input
                  placeholder="Enter document name..."
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>

              {/* Templates Grid */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Select Template</label>
                <div className="grid grid-cols-2 gap-4">
                  {documentTemplates.map((template) => {
                    const Icon = template.icon
                    return (
                      <button
                        key={template.id}
                        onClick={() => setSelectedTemplate(template.id)}
                        className={cn(
                          'p-4 rounded-2xl border-2 text-left transition-all',
                          selectedTemplate === template.id
                            ? 'border-gray-900 bg-gray-100'
                            : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'
                        )}
                      >
                        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
                          <Icon className="h-6 w-6 text-gray-600" />
                        </div>
                        <p className="font-bold text-gray-900">{template.name}</p>
                        <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Upload Area */}
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center hover:border-gray-700 hover:bg-gray-100/50 transition-colors cursor-pointer">
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-4">
                  <Upload className="h-8 w-8 text-gray-900" />
                </div>
                <p className="text-lg font-bold text-gray-900 mb-2">Drop files here or click to upload</p>
                <p className="text-sm text-gray-500">
                  Support for PDF, DOCX, XLSX, PNG, JPG, MP4 up to 100MB
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
          <Button variant="outline" onClick={onClose} className="rounded-xl h-11 px-6">
            Cancel
          </Button>
          <Button className="rounded-xl h-11 px-6">
            {activeTab === 'template' ? 'Create Document' : 'Upload'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function NewFolderModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [folderName, setFolderName] = useState('')
  const [selectedColor, setSelectedColor] = useState('blue')

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">New Folder</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Folder Name */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Folder Name</label>
            <Input
              placeholder="Enter folder name..."
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              className="h-12 rounded-xl"
            />
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">Folder Color</label>
            <div className="flex gap-3">
              {folderColors.map((color) => (
                <button
                  key={color.id}
                  onClick={() => setSelectedColor(color.id)}
                  className={cn(
                    'w-10 h-10 rounded-full transition-all flex items-center justify-center',
                    color.color,
                    selectedColor === color.id ? 'ring-4 ring-offset-2 ring-gray-300' : ''
                  )}
                >
                  {selectedColor === color.id && <Check className="h-5 w-5 text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">Preview</label>
            <div className="bg-gray-50 rounded-2xl p-6 flex items-center gap-4">
              <div className={cn('w-14 h-14 rounded-xl flex items-center justify-center', folderColors.find(c => c.id === selectedColor)?.color)}>
                <Folder className="h-7 w-7 text-white" />
              </div>
              <div>
                <p className="font-bold text-gray-900">{folderName || 'Untitled Folder'}</p>
                <p className="text-sm text-gray-500">0 items</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
          <Button variant="outline" onClick={onClose} className="rounded-xl h-11 px-6">
            Cancel
          </Button>
          <Button className="rounded-xl h-11 px-6" disabled={!folderName}>
            Create Folder
          </Button>
        </div>
      </div>
    </div>
  )
}

function UploadProgressOverlay({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [uploadProgress, setUploadProgress] = useState(65)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Uploading Files</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* File 1 - Completed */}
          <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-2xl">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Check className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900">Contract_Studio_A.pdf</p>
              <p className="text-sm text-emerald-600">Completed</p>
            </div>
            <span className="text-sm font-bold text-emerald-600">2.4 MB</span>
          </div>

          {/* File 2 - In Progress */}
          <div className="p-4 bg-gray-50 rounded-2xl">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 rounded-xl bg-gray-200 flex items-center justify-center">
                <FileText className="h-6 w-6 text-gray-900" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900">Invoice_Dec_2024.pdf</p>
                <p className="text-sm text-gray-500">{uploadProgress}% uploaded</p>
              </div>
              <span className="text-sm font-bold text-gray-500">1.8 MB</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gray-900 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>

          {/* File 3 - Queued */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl opacity-60">
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
              <Image className="h-6 w-6 text-gray-400" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900">Studio_Photos.zip</p>
              <p className="text-sm text-gray-400">Queued</p>
            </div>
            <span className="text-sm font-bold text-gray-400">45 MB</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-100">
          <p className="text-sm text-gray-500">2 of 3 files uploaded</p>
          <Button variant="outline" onClick={onClose} className="rounded-xl h-11 px-6">
            Cancel All
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function DocumentsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [typeFilter, setTypeFilter] = useState('All Types')
  const [folderFilter, setFolderFilter] = useState('All Folders')
  const [showCreateDocModal, setShowCreateDocModal] = useState(false)
  const [showNewFolderModal, setShowNewFolderModal] = useState(false)
  const [showUploadProgress, setShowUploadProgress] = useState(false)
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDeleteDoc = async (id: string, name: string) => {
    if (!confirm(`Weet je zeker dat je "${name}" wilt verwijderen?`)) return
    setDeletingId(id)
    const { error } = await workspaceClient
      .from('workspace_documents')
      .delete()
      .eq('id', id)
    if (error) {
      alert(`Kon niet verwijderen: ${error.message}`)
    } else {
      setDocuments((prev) => prev.filter((d) => d.id !== id))
    }
    setDeletingId(null)
  }

  useEffect(() => {
    async function loadDocuments() {
      // Laad rich text workspace_documents (Plate)
      const { data, error } = await workspaceClient
        .from<Array<{ id: string; title: string; updated_at: string; created_at: string }>>('workspace_documents')
        .select('id, title, updated_at, created_at')
        .order('updated_at', { ascending: false })
        .limit(200)
      if (error) {
        console.warn('workspace_documents load:', error.message)
        setDocuments([])
      } else {
        setDocuments(
          (data ?? []).map((d) => ({
            id: d.id,
            name: d.title || 'Naamloos document',
            type: 'doc',
            updated_at: d.updated_at,
            created_at: d.created_at,
            href: `/documents/${d.id}`,
          })),
        )
      }
      setLoading(false)
    }
    loadDocuments()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-900" />
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="space-y-8 animate-fade-in">
        {/* Page Header */}
        <div className="flex flex-wrap justify-between items-end gap-4">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">Documents</h1>
            <p className="text-gray-500 mt-1">Manage and organize all your files and documents.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/upload">
              <Button variant="outline" className="rounded-xl h-11 px-5">
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
            </Link>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-6">
            <Inbox className="h-10 w-10 text-gray-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Nog geen documenten</h2>
          <p className="text-gray-500 mb-6">Maak een nieuw document of upload een bestand</p>
          <div className="flex gap-3">
            <Link href="/documents/new">
              <Button className="rounded-xl h-11 px-6 shadow-lg shadow-gray-300">
                <FilePlus className="h-4 w-4 mr-2" />
                Nieuw document
              </Button>
            </Link>
            <Link href="/upload">
              <Button variant="outline" className="rounded-xl h-11 px-6">
                <Upload className="h-4 w-4 mr-2" />
                Uploaden
              </Button>
            </Link>
          </div>
        </div>

        {/* Modals */}
        <CreateDocumentModal isOpen={showCreateDocModal} onClose={() => setShowCreateDocModal(false)} />
        <NewFolderModal isOpen={showNewFolderModal} onClose={() => setShowNewFolderModal(false)} />
        <UploadProgressOverlay isOpen={showUploadProgress} onClose={() => setShowUploadProgress(false)} />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Documents</h1>
          <p className="text-gray-500 mt-1">Manage and organize all your files and documents.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/upload">
            <Button
              variant="outline"
              className="rounded-xl h-11 px-5"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
          </Link>
          <Button
            variant="outline"
            className="rounded-xl h-11 px-5"
            onClick={() => setShowNewFolderModal(true)}
          >
            <FolderPlus className="h-4 w-4 mr-2" />
            New Folder
          </Button>
          <Link href="/documents/new">
            <Button className="rounded-xl h-11 px-5 shadow-lg shadow-gray-300">
              <FilePlus className="h-4 w-4 mr-2" />
              Nieuw document
            </Button>
          </Link>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search documents, folders..."
              className="pl-12 h-12 rounded-xl border-gray-200 bg-gray-50 focus:bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-12 px-4 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option>All Types</option>
              <option>PDF</option>
              <option>Spreadsheet</option>
              <option>Image</option>
              <option>Video</option>
              <option>Audio</option>
            </select>
            <select
              value={folderFilter}
              onChange={(e) => setFolderFilter(e.target.value)}
              className="h-12 px-4 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option>All Folders</option>
              <option>Contracts</option>
              <option>Invoices</option>
              <option>Templates</option>
              <option>Marketing</option>
            </select>

            {/* View Toggle */}
            <div className="flex bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-2.5 rounded-lg transition-colors',
                  viewMode === 'grid' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'
                )}
              >
                <Grid3X3 className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-2.5 rounded-lg transition-colors',
                  viewMode === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'
                )}
              >
                <List className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pinned Section - skipped when no pinned documents */}

      {/* Recent Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-bold text-gray-900">Recent</h2>
          </div>
          <div className="flex gap-2">
            <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2">
          {documents.slice(0, 5).map((doc) => {
            const { icon: Icon, iconBg, iconColor } = getDocTypeIcon(doc.type)
            return (
              <div
                key={doc.id}
                className="flex-shrink-0 w-48 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-300 transition-all cursor-pointer group overflow-hidden"
              >
                {/* Thumbnail */}
                <div className="h-28 bg-gray-100 flex items-center justify-center overflow-hidden">
                  <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', iconBg)}>
                    <Icon className={cn('h-6 w-6', iconColor)} />
                  </div>
                </div>
                <div className="p-3">
                  <p className="font-bold text-gray-900 text-sm truncate">{doc.name}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatDate(doc.created_at)}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* All Documents Section */}
      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-4">All Documents</h2>

        {/* Files Grid */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {documents.map((doc) => {
              const { icon: Icon, iconBg, iconColor } = getDocTypeIcon(doc.type)
              const card = (
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-300 transition-all cursor-pointer group h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', iconBg)}>
                      <Icon className={cn('h-6 w-6', iconColor)} />
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleDeleteDoc(doc.id, doc.name)
                      }}
                      disabled={deletingId === doc.id}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg p-1.5 transition-all disabled:opacity-50"
                      title="Verwijderen"
                    >
                      {deletingId === doc.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <p className="font-bold text-gray-900 text-sm truncate mb-1">{doc.name}</p>
                  <p className="text-xs text-gray-400">
                    {doc.partner?.company_name ? `${doc.partner.company_name} • ` : ''}
                    {formatDate(doc.updated_at ?? doc.created_at)}
                  </p>
                </div>
              )
              return doc.href ? (
                <Link key={doc.id} href={doc.href}>{card}</Link>
              ) : (
                <div key={doc.id}>{card}</div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left py-3 px-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="text-left py-3 px-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Partner</th>
                  <th className="text-left py-3 px-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => {
                  const { icon: Icon, iconBg, iconColor } = getDocTypeIcon(doc.type)
                  const row = (
                    <>
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', iconBg)}>
                            <Icon className={cn('h-5 w-5', iconColor)} />
                          </div>
                          <span className="font-medium text-gray-900">{doc.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-sm text-gray-500">{doc.partner?.company_name || '-'}</td>
                      <td className="py-4 px-5 text-sm text-gray-500">{formatDate(doc.updated_at ?? doc.created_at)}</td>
                      <td className="py-4 px-5 text-right">
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleDeleteDoc(doc.id, doc.name)
                          }}
                          disabled={deletingId === doc.id}
                          className="text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg p-1.5 transition-colors disabled:opacity-50"
                          title="Verwijderen"
                        >
                          {deletingId === doc.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                    </>
                  )
                  return doc.href ? (
                    <tr
                      key={doc.id}
                      onClick={() => { window.location.href = doc.href }}
                      className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer"
                    >
                      {row}
                    </tr>
                  ) : (
                    <tr key={doc.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      {row}
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </section>

      {/* Modals */}
      <CreateDocumentModal isOpen={showCreateDocModal} onClose={() => setShowCreateDocModal(false)} />
      <NewFolderModal isOpen={showNewFolderModal} onClose={() => setShowNewFolderModal(false)} />
      <UploadProgressOverlay isOpen={showUploadProgress} onClose={() => setShowUploadProgress(false)} />
    </div>
  )
}
