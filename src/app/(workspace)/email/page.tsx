'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Mail,
  Inbox,
  Send,
  Archive,
  Trash2,
  Star,
  Search,
  RefreshCw,
  Plus,
  ChevronLeft,
  Paperclip,
  Reply,
  Forward,
  MoreVertical,
  X,
  Loader2,
  AlertCircle,
  Check,
  Settings,
  Filter,
  Download,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'
import { emailsApi, emailTemplatesApi, supabase } from '@/lib/supabase'

// Types
interface EmailMessage {
  id: string
  subject: string
  from: { name: string; email: string }
  to: { name: string; email: string }[]
  date: string
  body: string
  html?: string
  attachments?: { filename: string; size: number; contentType: string }[]
  isRead: boolean
  isStarred: boolean
  folder: 'inbox' | 'sent' | 'drafts' | 'trash' | 'spam'
  threadId?: string
}

interface EmailAccount {
  id: string
  email: string
  name: string
  provider: 'gmail' | 'outlook' | 'imap'
  isConnected: boolean
}

// For now we'll use localStorage as a fallback until IMAP is set up
  {
    id: '1',
    subject: 'Welkom bij je nieuwe Email Client!',
    from: { name: 'lcntships Team', email: 'team@lcntships.com' },
    to: [{ name: 'Jij', email: 'jij@bedrijf.nl' }],
    date: new Date().toISOString(),
    body: 'Hallo!\n\nWelkom bij de nieuwe Email Client van lcntships. Hier kun je al je zakelijke emails beheren.\n\nMet vriendelijke groet,\nHet lcntships Team',
    html: '<p>Hallo!</p><p>Welkom bij de nieuwe Email Client van lcntships.</p><p>Met vriendelijke groet,<br>Het lcntships Team</p>',
    isRead: false,
    isStarred: false,
    folder: 'inbox',
  },
  {
    id: '2',
    subject: 'Re: Samenwerking voorstel',
    from: { name: 'Jan Jansen', email: 'jan@studioamsterdam.nl' },
    to: [{ name: 'Jij', email: 'jij@bedrijf.nl' }],
    date: new Date(Date.now() - 86400000).toISOString(),
    body: 'Beste,\n\nBedankt voor je mail. Ik ben zeker geïnteresseerd in een samenwerking.\n\nGroeten,\nJan',
    isRead: true,
    isStarred: true,
    folder: 'inbox',
  },
]

// Email Compose Modal
interface ComposeModalProps {
  isOpen: boolean
  onClose: () => void
  replyTo?: EmailMessage
  templates?: EmailTemplate[]
}

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
}

function ComposeModal({ isOpen, onClose, replyTo, templates }: ComposeModalProps) {
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (replyTo) {
        setTo(replyTo.from.email)
        setSubject(`Re: ${replyTo.subject}`)
        setBody(`\n\n---\nOp ${format(new Date(replyTo.date), 'PPp', { locale: nl })} schreef ${replyTo.from.name} <${replyTo.from.email}>:\n\n${replyTo.body}`)
      } else {
        setTo('')
        setSubject('')
        setBody('')
      }
    }
  }, [isOpen, replyTo])

  const applyTemplate = (templateId: string) => {
    const template = templates?.find(t => t.id === templateId)
    if (template) {
      setSubject(template.subject)
      setBody(template.body)
      setSelectedTemplate(templateId)
      setShowTemplates(false)
    }
  }

  const handleSend = async () => {
    if (!to || !subject || !body) return
    
    setSending(true)
    try {
      // API call would go here
      await new Promise(resolve => setTimeout(resolve, 1000))
      onClose()
    } catch (error) {
      console.error('Failed to send email:', error)
    } finally {
      setSending(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl m-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">
            {replyTo ? 'Beantwoorden' : 'Nieuwe Email'}
          </h2>
          <div className="flex items-center gap-2">
            {templates && templates.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTemplates(!showTemplates)}
              >
                Templates
              </Button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Template Selector */}
        {showTemplates && templates && (
          <div className="bg-gray-50 border-b border-gray-100 p-3">
            <div className="flex gap-2 flex-wrap">
              {templates.map(template => (
                <button
                  key={template.id}
                  onClick={() => applyTemplate(template.id)}
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm hover:border-indigo-500 hover:text-indigo-600 transition-colors"
                >
                  {template.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Form */}
        <div className="p-4 space-y-4 flex-1 overflow-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Aan</label>
            <Input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="email@voorbeeld.nl"
              className="rounded-xl"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Onderwerp</label>
            <Input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Onderwerp van je email"
              className="rounded-xl"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Bericht</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Schrijf je bericht hier..."
              rows={12}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-100">
          <Button variant="outline" onClick={onClose}>
            Annuleren
          </Button>
          <Button
            onClick={handleSend}
            disabled={!to || !subject || !body || sending}
            className="gap-2"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Versturen...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Versturen
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

// Email Settings Modal
function EmailSettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'accounts' | 'templates' | 'signatures'>('accounts')
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [newTemplateName, setNewTemplateName] = useState('')
  const [newTemplateSubject, setNewTemplateSubject] = useState('')
  const [newTemplateBody, setNewTemplateBody] = useState('')
  const [showAddTemplate, setShowAddTemplate] = useState(false)

  // Load templates from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('emailTemplates')
    if (saved) {
      setTemplates(JSON.parse(saved))
    }
  }, [isOpen])

  const saveTemplate = () => {
    if (!newTemplateName || !newTemplateSubject) return
    
    const newTemplate: EmailTemplate = {
      id: Date.now().toString(),
      name: newTemplateName,
      subject: newTemplateSubject,
      body: newTemplateBody,
    }
    
    const updated = [...templates, newTemplate]
    setTemplates(updated)
    localStorage.setItem('emailTemplates', JSON.stringify(updated))
    
    setNewTemplateName('')
    setNewTemplateSubject('')
    setNewTemplateBody('')
    setShowAddTemplate(false)
  }

  const deleteTemplate = (id: string) => {
    const updated = templates.filter(t => t.id !== id)
    setTemplates(updated)
    localStorage.setItem('emailTemplates', JSON.stringify(updated))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl m-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">Email Instellingen</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {[
            { id: 'accounts', label: 'Accounts', icon: Mail },
            { id: 'templates', label: 'Templates', icon: Filter },
            { id: 'signatures', label: 'Handtekeningen', icon: Check },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'accounts' && (
            <div className="space-y-6">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-amber-900">Email integratie binnenkort beschikbaar</h3>
                    <p className="text-sm text-amber-700 mt-1">
                      We werken aan een volledige IMAP/SMTP integratie zodat je alle je bedrijfsmails hier kunt beheren.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Verbonden Accounts</h3>
                <div className="bg-gray-50 rounded-xl p-6 text-center text-gray-500">
                  <Mail className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>Nog geen email accounts verbonden</p>
                  <Button className="mt-4" disabled>
                    Account toevoegen (binnenkort)
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Email Templates</h3>
                <Button
                  size="sm"
                  onClick={() => setShowAddTemplate(true)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Template toevoegen
                </Button>
              </div>

              {showAddTemplate && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                  <Input
                    placeholder="Template naam (bijv. Welkomstmail)"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                  />
                  <Input
                    placeholder="Standaard onderwerp"
                    value={newTemplateSubject}
                    onChange={(e) => setNewTemplateSubject(e.target.value)}
                  />
                  <textarea
                    placeholder="Template inhoud..."
                    value={newTemplateBody}
                    onChange={(e) => setNewTemplateBody(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveTemplate}>Opslaan</Button>
                    <Button size="sm" variant="outline" onClick={() => setShowAddTemplate(false)}>
                      Annuleren
                    </Button>
                  </div>
                </div>
              )}

              {templates.length === 0 ? (
                <div className="bg-gray-50 rounded-xl p-8 text-center text-gray-500">
                  <Filter className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>Nog geen templates</p>
                  <p className="text-sm mt-1">Maak templates om sneller emails te schrijven</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {templates.map(template => (
                    <div
                      key={template.id}
                      className="bg-white border border-gray-200 rounded-xl p-4 hover:border-indigo-300 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{template.name}</h4>
                          <p className="text-sm text-gray-500 mt-1">{template.subject}</p>
                          {template.body && (
                            <p className="text-sm text-gray-400 mt-2 line-clamp-2">{template.body}</p>
                          )}
                        </div>
                        <button
                          onClick={() => deleteTemplate(template.id)}
                          className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'signatures' && (
            <div className="space-y-6">
              <h3 className="font-semibold text-gray-900">Email Handtekeningen</h3>
              <div className="bg-gray-50 rounded-xl p-8 text-center text-gray-500">
                <Check className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Handtekeningen binnenkort beschikbaar</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Main Email Page
export default function EmailPage() {
  const [emails, setEmails] = useState<EmailMessage[]>(mockEmails)
  const [selectedFolder, setSelectedFolder] = useState<'inbox' | 'sent' | 'drafts' | 'trash' | 'spam'>('inbox')
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isComposeOpen, setIsComposeOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [templates, setTemplates] = useState<EmailTemplate[]>([])

  // Load templates
  useEffect(() => {
    const saved = localStorage.getItem('emailTemplates')
    if (saved) {
      setTemplates(JSON.parse(saved))
    }
  }, [isSettingsOpen])

  // Filter emails by folder and search
  const filteredEmails = emails.filter(email => {
    const matchesFolder = email.folder === selectedFolder
    const matchesSearch = 
      searchQuery === '' ||
      email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.from.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.from.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.body.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFolder && matchesSearch
  })

  // Sort by date (newest first)
  const sortedEmails = [...filteredEmails].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  // Stats
  const unreadCount = emails.filter(e => e.folder === 'inbox' && !e.isRead).length
  const starredCount = emails.filter(e => e.isStarred).length

  // Actions
  const toggleStar = (e: React.MouseEvent, emailId: string) => {
    e.stopPropagation()
    setEmails(emails.map(email =>
      email.id === emailId ? { ...email, isStarred: !email.isStarred } : email
    ))
  }

  const markAsRead = (emailId: string) => {
    setEmails(emails.map(email =>
      email.id === emailId ? { ...email, isRead: true } : email
    ))
  }

  const deleteEmail = (e: React.MouseEvent, emailId: string) => {
    e.stopPropagation()
    setEmails(emails.map(email =>
      email.id === emailId ? { ...email, folder: 'trash' as const } : email
    ))
    if (selectedEmail?.id === emailId) {
      setSelectedEmail(null)
    }
  }

  const refreshInbox = useCallback(async () => {
    setLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setLoading(false)
  }, [])

  // Folder config
  const folders = [
    { id: 'inbox', label: 'Inbox', icon: Inbox, count: unreadCount },
    { id: 'sent', label: 'Verzonden', icon: Send, count: undefined },
    { id: 'drafts', label: 'Concepten', icon: Mail, count: undefined },
    { id: 'spam', label: 'Spam', icon: AlertCircle, count: undefined },
    { id: 'trash', label: 'Prullenbak', icon: Trash2, count: undefined },
  ] as const

  return (
    <div className="h-[calc(100vh-64px)] -m-6 flex animate-fade-in">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <Button 
            onClick={() => setIsComposeOpen(true)}
            className="w-full gap-2 shadow-lg shadow-indigo-200"
          >
            <Plus className="h-4 w-4" />
            Nieuw bericht
          </Button>
        </div>

        {/* Folders */}
        <nav className="flex-1 p-3 space-y-1">
          {folders.map(folder => (
            <button
              key={folder.id}
              onClick={() => {
                setSelectedFolder(folder.id)
                setSelectedEmail(null)
              }}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                selectedFolder === folder.id
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <div className="flex items-center gap-3">
                <folder.icon className="h-4 w-4" />
                {folder.label}
              </div>
              {folder.count ? (
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded-full',
                  selectedFolder === folder.id
                    ? 'bg-indigo-200 text-indigo-800'
                    : 'bg-gray-200 text-gray-600'
                )}>
                  {folder.count}
                </span>
              ) : null}
            </button>
          ))}
        </nav>

        {/* Starred section */}
        <div className="p-3 border-t border-gray-200">
          <button
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-all"
          >
            <div className="flex items-center gap-3">
              <Star className="h-4 w-4" />
              Met ster
            </div>
            {starredCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                {starredCount}
              </span>
            )}
          </button>
        </div>

        {/* Settings */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-all"
          >
            <Settings className="h-4 w-4" />
            Instellingen
          </button>
        </div>
      </aside>

      {/* Email List */}
      <div className={cn(
        'flex-1 flex flex-col border-r border-gray-200',
        selectedEmail ? 'hidden lg:flex' : 'flex'
      )}>
        {/* Toolbar */}
        <div className="h-16 border-b border-gray-200 flex items-center justify-between px-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Zoeken in emails..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-xl bg-gray-50 border-0"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refreshInbox}
              disabled={loading}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn('h-4 w-4 text-gray-600', loading && 'animate-spin')} />
            </button>
          </div>
        </div>

        {/* Email List */}
        <div className="flex-1 overflow-auto">
          {sortedEmails.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <Inbox className="h-16 w-16 mb-4 text-gray-200" />
              <p className="text-lg font-medium text-gray-600">
                {searchQuery ? 'Geen emails gevonden' : 'Inbox is leeg'}
              </p>
              <p className="text-sm mt-1">
                {searchQuery ? 'Probeer een andere zoekterm' : 'Nieuwe emails verschijnen hier'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {sortedEmails.map(email => (
                <button
                  key={email.id}
                  onClick={() => {
                    setSelectedEmail(email)
                    markAsRead(email.id)
                  }}
                  className={cn(
                    'w-full flex items-start gap-3 p-4 text-left hover:bg-gray-50 transition-colors',
                    !email.isRead && 'bg-indigo-50/30',
                    selectedEmail?.id === email.id && 'bg-indigo-50'
                  )}
                >
                  <button
                    onClick={(e) => toggleStar(e, email.id)}
                    className="mt-0.5"
                  >
                    <Star
                      className={cn(
                        'h-4 w-4 transition-colors',
                        email.isStarred
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-gray-300 hover:text-gray-400'
                      )}
                    />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn(
                        'font-medium truncate',
                        !email.isRead && 'text-gray-900'
                      )}>
                        {email.from.name}
                      </span>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {format(new Date(email.date), 'd MMM', { locale: nl })}
                      </span>
                    </div>
                    <p className={cn(
                      'text-sm truncate',
                      !email.isRead ? 'font-medium text-gray-900' : 'text-gray-600'
                    )}>
                      {email.subject}
                    </p>
                    <p className="text-sm text-gray-400 truncate mt-0.5">
                      {email.body.slice(0, 100)}...
                    </p>
                  </div>
                  {email.attachments && email.attachments.length > 0 && (
                    <Paperclip className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Email Detail */}
      {selectedEmail && (
        <div className="flex-1 flex flex-col bg-white lg:flex">
          {/* Toolbar */}
          <div className="h-16 border-b border-gray-200 flex items-center justify-between px-4">
            <button
              onClick={() => setSelectedEmail(null)}
              className="lg:hidden flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="h-5 w-5" />
              Terug
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsComposeOpen(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Beantwoorden"
              >
                <Reply className="h-4 w-4 text-gray-600" />
              </button>
              <button
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Doorsturen"
              >
                <Forward className="h-4 w-4 text-gray-600" />
              </button>
              <button
                onClick={(e) => deleteEmail(e, selectedEmail.id)}
                className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                title="Verwijderen"
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </button>
            </div>
          </div>

          {/* Email Content */}
          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-3xl mx-auto">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                {selectedEmail.subject}
              </h1>
              
              <div className="flex items-start justify-between mb-6 pb-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold">
                    {selectedEmail.from.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{selectedEmail.from.name}</p>
                    <p className="text-sm text-gray-500">{selectedEmail.from.email}</p>
                  </div>
                </div>
                <span className="text-sm text-gray-400">
                  {format(new Date(selectedEmail.date), 'PPp', { locale: nl })}
                </span>
              </div>

              {selectedEmail.html ? (
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.html }}
                />
              ) : (
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {selectedEmail.body}
                </div>
              )}

              {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">
                    Bijlagen ({selectedEmail.attachments.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedEmail.attachments.map((att, i) => (
                      <button
                        key={i}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <Download className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-700">{att.filename}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Reply */}
          <div className="border-t border-gray-200 p-4">
            <Button
              onClick={() => setIsComposeOpen(true)}
              variant="outline"
              className="w-full gap-2"
            >
              <Reply className="h-4 w-4" />
              Beantwoorden
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        replyTo={selectedEmail || undefined}
        templates={templates}
      />

      <EmailSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  )
}
