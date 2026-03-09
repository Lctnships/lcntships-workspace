'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  CloudUpload,
  X,
  FileText,
  ChevronDown,
  Plus,
  Upload,
  Info,
  Folder,
  Clock,
  Check,
  File,
  Image,
  FileSpreadsheet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Mock data
const folders = [
  { id: 'contracts', name: 'Contracts', icon: '📁' },
  { id: 'internal', name: 'Internal Docs', icon: '📁' },
  { id: 'invoices', name: 'Invoices', icon: '📁' },
  { id: 'legal', name: 'Legal Archive', icon: '📁' },
  { id: 'marketing', name: 'Marketing', icon: '📁' },
  { id: 'templates', name: 'Templates', icon: '📁' },
]

const recentActivity = [
  {
    id: '1',
    name: 'Service_Agreement_v2.pdf',
    type: 'pdf',
    uploadedAt: '2m ago',
    icon: FileText,
  },
  {
    id: '2',
    name: 'Invoice_Dec_2024.xlsx',
    type: 'spreadsheet',
    uploadedAt: '15m ago',
    icon: FileSpreadsheet,
  },
  {
    id: '3',
    name: 'Studio_Photos.jpg',
    type: 'image',
    uploadedAt: '1h ago',
    icon: Image,
  },
]

interface StagedFile {
  id: string
  name: string
  size: string
  type: string
  progress: number
  status: 'pending' | 'uploading' | 'complete' | 'error'
}

function TagBadge({ tag, onRemove }: { tag: string; onRemove: () => void }) {
  return (
    <div className="flex h-8 items-center gap-2 rounded-full bg-gray-200 border border-gray-300 px-3">
      <span className="text-gray-900 text-xs font-semibold">{tag}</span>
      <button onClick={onRemove} className="text-gray-700 hover:text-gray-900 transition-colors">
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

export default function UploadPage() {
  const [selectedFolder, setSelectedFolder] = useState('contracts')
  const [tags, setTags] = useState<string[]>(['Contract', 'Urgent'])
  const [isPrivate, setIsPrivate] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([])
  const [newTag, setNewTag] = useState('')
  const [showTagInput, setShowTagInput] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    // Handle file drop - in a real app, you'd process the files here
    const files = Array.from(e.dataTransfer.files)
    const newStagedFiles: StagedFile[] = files.map((file, index) => ({
      id: `file-${Date.now()}-${index}`,
      name: file.name,
      size: formatFileSize(file.size),
      type: file.type,
      progress: 0,
      status: 'pending',
    }))
    setStagedFiles([...stagedFiles, ...newStagedFiles])
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag('')
      setShowTagInput(false)
    }
  }

  const removeFile = (fileId: string) => {
    setStagedFiles(stagedFiles.filter((file) => file.id !== fileId))
  }

  const canUpload = stagedFiles.length > 0

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4 bg-white">
        <div className="flex items-center gap-4">
          <div className="w-6 h-6 text-gray-900">
            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 4H17.3334V17.3334H30.6666V30.6666H44V44H4V4Z" fill="currentColor" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900">lcntships Workspace</h2>
        </div>
        <Link
          href="/documents"
          className="flex w-10 h-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
        >
          <X className="h-5 w-5" />
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row p-6 gap-6 max-w-[1600px] mx-auto w-full">
        {/* Left Section: Drag and Drop Area */}
        <div className="flex-1 flex flex-col">
          {/* Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              'flex-1 flex flex-col items-center justify-center rounded-[40px] border-2 border-dashed p-12 text-center transition-all min-h-[400px]',
              isDragging
                ? 'border-gray-900 bg-gray-100'
                : 'border-gray-300 bg-white hover:border-gray-700 hover:bg-gray-100/50'
            )}
          >
            <div className="flex flex-col items-center gap-8 max-w-[520px]">
              {/* Large Cloud Upload Icon */}
              <div
                className={cn(
                  'flex items-center justify-center w-28 h-28 rounded-full transition-colors',
                  isDragging ? 'bg-gray-300 text-gray-900' : 'bg-gray-200 text-gray-900'
                )}
              >
                <CloudUpload className="h-14 w-14" />
              </div>

              <div className="flex flex-col gap-3">
                <h1 className="text-gray-900 text-3xl font-bold tracking-tight">
                  {isDragging ? 'Drop your files here' : 'Drag and drop your files here'}
                </h1>
                <p className="text-gray-500 text-lg">
                  Supporting PDF, DOCX, XLSX, and Images up to 50MB
                </p>
              </div>

              <Button
                className="min-w-[180px] h-14 px-8 rounded-full text-base font-bold shadow-lg shadow-gray-300"
                onClick={() => {
                  // Trigger file input click
                  document.getElementById('file-input')?.click()
                }}
              >
                Browse Files
              </Button>
              <input
                id="file-input"
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || [])
                  const newStagedFiles: StagedFile[] = files.map((file, index) => ({
                    id: `file-${Date.now()}-${index}`,
                    name: file.name,
                    size: formatFileSize(file.size),
                    type: file.type,
                    progress: 0,
                    status: 'pending',
                  }))
                  setStagedFiles([...stagedFiles, ...newStagedFiles])
                }}
              />
            </div>
          </div>

          {/* Staged Files */}
          {stagedFiles.length > 0 && (
            <div className="mt-6 flex flex-col gap-3">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider px-2">
                Staged Files ({stagedFiles.length})
              </p>
              <div className="space-y-2">
                {stagedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center">
                        <File className="h-5 w-5 text-gray-900" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{file.name}</p>
                        <p className="text-xs text-gray-400">{file.size}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(file.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Activity */}
          <div className="mt-6 flex flex-col gap-3 px-2">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Recent Activity</p>
            <div className="space-y-2">
              {recentActivity.map((item) => {
                const Icon = item.icon
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-gray-900" />
                      <span className="text-sm font-medium text-gray-900">{item.name}</span>
                    </div>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Uploaded {item.uploadedAt}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Section: Settings Panel */}
        <aside className="w-full lg:w-[380px] flex flex-col gap-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col gap-6 shadow-sm">
            {/* Section Header */}
            <div>
              <h2 className="text-gray-900 text-xl font-bold tracking-tight">Upload Settings</h2>
              <p className="text-sm text-gray-500 mt-1">Configure metadata for new files</p>
            </div>

            {/* Destination Folder */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-900">Destination Folder</label>
              <div className="relative">
                <select
                  value={selectedFolder}
                  onChange={(e) => setSelectedFolder(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 p-4 text-base focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none transition-all pr-12"
                >
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.icon} {folder.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-900 pointer-events-none" />
              </div>
            </div>

            {/* Tags Section */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-900">Initial Tags</label>
              <div className="flex gap-2 flex-wrap bg-gray-50 p-3 rounded-xl border border-gray-200 min-h-[100px] content-start">
                {tags.map((tag) => (
                  <TagBadge key={tag} tag={tag} onRemove={() => removeTag(tag)} />
                ))}

                {showTagInput ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') addTag()
                        if (e.key === 'Escape') {
                          setShowTagInput(false)
                          setNewTag('')
                        }
                      }}
                      placeholder="Tag name..."
                      className="h-8 px-3 text-xs rounded-full border border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
                      autoFocus
                    />
                    <button
                      onClick={addTag}
                      className="h-8 w-8 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-black transition-colors"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowTagInput(true)}
                    className="flex h-8 items-center gap-2 rounded-full border border-dashed border-gray-300 px-3 text-gray-500 hover:bg-white hover:border-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="text-xs">Add tag</span>
                  </button>
                )}
              </div>
            </div>

            {/* Privacy/Visibility */}
            <div className="flex flex-col gap-4 py-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-900">Private Upload</span>
                  <span className="text-xs text-gray-500">Only you can see these files</span>
                </div>
                <button
                  onClick={() => setIsPrivate(!isPrivate)}
                  className={cn(
                    'relative w-11 h-6 rounded-full transition-colors',
                    isPrivate ? 'bg-gray-900' : 'bg-gray-200'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                      isPrivate ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </button>
              </div>
            </div>

            {/* Action Button */}
            <Button
              className={cn(
                'w-full h-14 rounded-full text-base font-bold transition-all',
                canUpload
                  ? 'bg-gray-900 text-white hover:bg-black shadow-lg shadow-gray-300'
                  : 'bg-gray-200 text-gray-700 border border-gray-300 cursor-not-allowed'
              )}
              disabled={!canUpload}
            >
              <Upload className="h-5 w-5 mr-2" />
              Start Upload
            </Button>
          </div>

          {/* Quick Help */}
          <div className="p-5 rounded-xl bg-gray-100 border border-gray-200 flex gap-4">
            <Info className="h-5 w-5 text-gray-900 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-600 leading-relaxed">
              Files uploaded to <strong className="text-gray-900">Contracts</strong> will automatically be
              shared with the legal team and encrypted by default.
            </p>
          </div>
        </aside>
      </main>

      {/* Background Decoration */}
      <div className="fixed top-0 right-0 -z-10 w-1/3 h-1/3 bg-gray-900/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-0 left-0 -z-10 w-1/4 h-1/4 bg-gray-900/10 blur-[100px] rounded-full pointer-events-none" />
    </div>
  )
}
