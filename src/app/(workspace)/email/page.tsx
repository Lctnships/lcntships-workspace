'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Mail,
  Inbox,
  Send,
  Trash2,
  Star,
  Search,
  RefreshCw,
  Plus,
  ChevronLeft,
  Paperclip,
  Reply,
  Forward,
  X,
  Loader2,
  AlertCircle,
  Check,
  Settings,
  Filter,
  Download,
  Eye,
  EyeOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import DOMPurify from 'dompurify'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

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
  uid?: number
}

interface ImapAccount {
  id: string
  name: string
  user: string
  password: string
  imapHost: string
  imapPort: number
  smtpHost: string
  smtpPort: number
  tls: boolean
}

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
  // selectedTemplate managed inline
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
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm hover:border-gray-900 hover:text-gray-900 transition-colors"
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
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
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
function EmailSettingsModal({
  isOpen,
  onClose,
  accounts,
  onAccountsChange,
}: {
  isOpen: boolean
  onClose: () => void
  accounts: ImapAccount[]
  onAccountsChange: (accounts: ImapAccount[]) => void
}) {
  const [activeTab, setActiveTab] = useState<'accounts' | 'templates'>('accounts')
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [newTemplateName, setNewTemplateName] = useState('')
  const [newTemplateSubject, setNewTemplateSubject] = useState('')
  const [newTemplateBody, setNewTemplateBody] = useState('')
  const [showAddTemplate, setShowAddTemplate] = useState(false)
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<Record<string, 'ok' | 'error'>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '', user: '', password: '', imapHost: '', imapPort: '993', smtpHost: '', smtpPort: '587', tls: true,
  })

  useEffect(() => {
    const saved = sessionStorage.getItem('emailTemplates')
    if (saved) setTemplates(JSON.parse(saved))
  }, [isOpen])

  const saveAccount = () => {
    if (!form.name || !form.user || !form.password || !form.imapHost || !form.smtpHost) return
    const newAccount: ImapAccount = {
      id: Date.now().toString(),
      name: form.name.trim(), user: form.user.trim(), password: form.password.trim(),
      imapHost: form.imapHost.trim(), imapPort: Number(form.imapPort),
      smtpHost: form.smtpHost.trim(), smtpPort: Number(form.smtpPort), tls: form.tls,
    }
    const updated = [...accounts, newAccount]
    onAccountsChange(updated)
    sessionStorage.setItem('imapAccounts', JSON.stringify(updated))
    setForm({ name: '', user: '', password: '', imapHost: '', imapPort: '993', smtpHost: '', smtpPort: '587', tls: true })
    setShowAddAccount(false)
  }

  const deleteAccount = (id: string) => {
    const updated = accounts.filter(a => a.id !== id)
    onAccountsChange(updated)
    sessionStorage.setItem('imapAccounts', JSON.stringify(updated))
  }

  const editAccount = (account: ImapAccount) => {
    setEditingId(account.id)
    setForm({
      name: account.name, user: account.user, password: account.password,
      imapHost: account.imapHost, imapPort: String(account.imapPort),
      smtpHost: account.smtpHost, smtpPort: String(account.smtpPort), tls: account.tls,
    })
    setShowAddAccount(false)
  }

  const updateAccount = () => {
    if (!editingId || !form.name || !form.user || !form.password || !form.imapHost || !form.smtpHost) return
    const updated = accounts.map(a => a.id === editingId ? {
      ...a, name: form.name, user: form.user, password: form.password,
      imapHost: form.imapHost, imapPort: Number(form.imapPort),
      smtpHost: form.smtpHost, smtpPort: Number(form.smtpPort), tls: form.tls,
    } : a)
    onAccountsChange(updated)
    sessionStorage.setItem('imapAccounts', JSON.stringify(updated))
    setEditingId(null)
    setForm({ name: '', user: '', password: '', imapHost: '', imapPort: '993', smtpHost: '', smtpPort: '587', tls: true })
  }

  const testAccount = async (account: ImapAccount) => {
    setTestingId(account.id)
    try {
      const res = await fetch('/api/email/imap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: account.imapHost, port: account.imapPort, user: account.user, password: account.password, tls: account.tls, limit: 1 }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        console.error('[IMAP Test Error]', data.error)
        alert(`IMAP verbinding mislukt:\n${data.error || 'Onbekende fout'}\n\nHost: ${account.imapHost}`)
      }
      setTestResult(prev => ({ ...prev, [account.id]: res.ok ? 'ok' : 'error' }))
    } catch {
      setTestResult(prev => ({ ...prev, [account.id]: 'error' }))
    } finally {
      setTestingId(null)
    }
  }

  const saveTemplate = () => {
    if (!newTemplateName || !newTemplateSubject) return
    const newTemplate: EmailTemplate = { id: Date.now().toString(), name: newTemplateName, subject: newTemplateSubject, body: newTemplateBody }
    const updated = [...templates, newTemplate]
    setTemplates(updated)
    sessionStorage.setItem('emailTemplates', JSON.stringify(updated))
    setNewTemplateName(''); setNewTemplateSubject(''); setNewTemplateBody(''); setShowAddTemplate(false)
  }

  const deleteTemplate = (id: string) => {
    const updated = templates.filter(t => t.id !== id)
    setTemplates(updated)
    sessionStorage.setItem('emailTemplates', JSON.stringify(updated))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl m-4 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">Email Instellingen</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="flex border-b border-gray-100">
          {([{ id: 'accounts', label: 'Accounts', icon: Mail }, { id: 'templates', label: 'Templates', icon: Filter }] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'accounts' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Email Accounts</h3>
                <Button size="sm" onClick={() => setShowAddAccount(!showAddAccount)} className="gap-2">
                  <Plus className="h-4 w-4" /> Account toevoegen
                </Button>
              </div>

              {showAddAccount && (
                <div className="bg-gray-50 rounded-xl p-5 space-y-4 border border-gray-200">
                  <h4 className="font-medium text-gray-900">IMAP / SMTP Account</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Weergavenaam</label>
                      <Input placeholder="bijv. info@lcntships.com" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Email adres</label>
                      <Input placeholder="jij@jouwdomein.nl" value={form.user} onChange={e => setForm(f => ({ ...f, user: e.target.value }))} />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Wachtwoord</label>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Wachtwoord of app-wachtwoord"
                          value={form.password}
                          onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                          className="pr-10"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">IMAP Server</label>
                      <Input placeholder="imap.jouwdomein.nl" value={form.imapHost} onChange={e => setForm(f => ({ ...f, imapHost: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">IMAP Poort</label>
                      <Input placeholder="993" value={form.imapPort} onChange={e => setForm(f => ({ ...f, imapPort: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">SMTP Server</label>
                      <Input placeholder="smtp.jouwdomein.nl" value={form.smtpHost} onChange={e => setForm(f => ({ ...f, smtpHost: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">SMTP Poort</label>
                      <Input placeholder="587" value={form.smtpPort} onChange={e => setForm(f => ({ ...f, smtpPort: e.target.value }))} />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" onClick={saveAccount} disabled={!form.name || !form.user || !form.password || !form.imapHost || !form.smtpHost}>Opslaan</Button>
                    <Button size="sm" variant="outline" onClick={() => setShowAddAccount(false)}>Annuleren</Button>
                  </div>
                </div>
              )}

              {accounts.length === 0 && !showAddAccount ? (
                <div className="bg-gray-50 rounded-xl p-8 text-center text-gray-500">
                  <Mail className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>Nog geen email accounts</p>
                  <p className="text-sm mt-1">Voeg je IMAP account toe om emails te lezen</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {accounts.map(account => (
                    <div key={account.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                      <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-900 font-semibold">
                            {account.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{account.name}</p>
                            <p className="text-sm text-gray-500">{account.user} · {account.imapHost}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {testResult[account.id] === 'ok' && <span className="text-xs text-green-600 font-medium flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Verbonden</span>}
                          {testResult[account.id] === 'error' && <span className="text-xs text-red-500 font-medium flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" /> Mislukt</span>}
                          <Button size="sm" variant="outline" onClick={() => testAccount(account)} disabled={testingId === account.id}>
                            {testingId === account.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Test'}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => editingId === account.id ? setEditingId(null) : editAccount(account)}>
                            Bewerken
                          </Button>
                          <button onClick={() => deleteAccount(account.id)} className="p-2 hover:bg-red-50 text-red-500 rounded-lg">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      {editingId === account.id && (
                        <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Naam</label>
                              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                              <Input value={form.user} onChange={e => setForm(f => ({ ...f, user: e.target.value }))} />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Wachtwoord</label>
                              <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">IMAP Server</label>
                              <Input value={form.imapHost} onChange={e => setForm(f => ({ ...f, imapHost: e.target.value }))} />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">IMAP Poort</label>
                              <Input value={form.imapPort} onChange={e => setForm(f => ({ ...f, imapPort: e.target.value }))} />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">SMTP Server</label>
                              <Input value={form.smtpHost} onChange={e => setForm(f => ({ ...f, smtpHost: e.target.value }))} />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">SMTP Poort</label>
                              <Input value={form.smtpPort} onChange={e => setForm(f => ({ ...f, smtpPort: e.target.value }))} />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={updateAccount}>Opslaan</Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Annuleren</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Email Templates</h3>
                <Button size="sm" onClick={() => setShowAddTemplate(true)} className="gap-2">
                  <Plus className="h-4 w-4" /> Template toevoegen
                </Button>
              </div>
              {showAddTemplate && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                  <Input placeholder="Template naam" value={newTemplateName} onChange={e => setNewTemplateName(e.target.value)} />
                  <Input placeholder="Standaard onderwerp" value={newTemplateSubject} onChange={e => setNewTemplateSubject(e.target.value)} />
                  <textarea placeholder="Template inhoud..." value={newTemplateBody} onChange={e => setNewTemplateBody(e.target.value)} rows={4} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveTemplate}>Opslaan</Button>
                    <Button size="sm" variant="outline" onClick={() => setShowAddTemplate(false)}>Annuleren</Button>
                  </div>
                </div>
              )}
              {templates.length === 0 ? (
                <div className="bg-gray-50 rounded-xl p-8 text-center text-gray-500">
                  <Filter className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>Nog geen templates</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {templates.map(template => (
                    <div key={template.id} className="bg-white border border-gray-200 rounded-xl p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{template.name}</h4>
                          <p className="text-sm text-gray-500 mt-1">{template.subject}</p>
                        </div>
                        <button onClick={() => deleteTemplate(template.id)} className="p-2 hover:bg-red-50 text-red-500 rounded-lg">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Main Email Page
export default function EmailPage() {
  const [emails, setEmails] = useState<EmailMessage[]>([])
  const [accounts, setAccounts] = useState<ImapAccount[]>([])
  const [activeAccount, setActiveAccount] = useState<ImapAccount | null>(null)
  const [selectedFolder, setSelectedFolder] = useState<'inbox' | 'sent' | 'drafts' | 'trash' | 'spam'>('inbox')
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isComposeOpen, setIsComposeOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [templates, setTemplates] = useState<EmailTemplate[]>([])

  // Load accounts + templates from localStorage
  useEffect(() => {
    const savedAccounts = sessionStorage.getItem('imapAccounts')
    if (savedAccounts) {
      const parsed: ImapAccount[] = JSON.parse(savedAccounts)
      setAccounts(parsed)
      if (parsed.length > 0 && !activeAccount) setActiveAccount(parsed[0])
    }
    const savedTemplates = sessionStorage.getItem('emailTemplates')
    if (savedTemplates) setTemplates(JSON.parse(savedTemplates))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSettingsOpen])

  // Auto-load emails when activeAccount or folder changes
  useEffect(() => {
    if (activeAccount) refreshInbox(selectedFolder)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAccount?.id, selectedFolder])

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
    const email = emails.find(e => e.id === emailId)
    if (!email || email.isRead) return
    setEmails(prev => prev.map(e => e.id === emailId ? { ...e, isRead: true } : e))
    if (activeAccount && email.uid) {
      fetch('/api/email/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: activeAccount.imapHost,
          port: activeAccount.imapPort,
          user: activeAccount.user,
          password: activeAccount.password,
          tls: activeAccount.tls,
          uid: email.uid,
        }),
      }).catch(console.error)
    }
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

  const folderImapMap: Record<string, string> = {
    inbox: 'INBOX',
    sent: 'Sent',
    drafts: 'Drafts',
    spam: 'Junk',
    trash: 'Trash',
  }

  const refreshInbox = useCallback(async (folder = selectedFolder) => {
    if (!activeAccount && folder !== 'sent') return
    setLoading(true)
    try {
      let data: { emails?: EmailMessage[] }

      if (folder === 'sent') {
        const res = await fetch('/api/email/sent')
        data = await res.json()
      } else {
        const res = await fetch('/api/email/imap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            host: activeAccount!.imapHost,
            port: activeAccount!.imapPort,
            user: activeAccount!.user,
            password: activeAccount!.password,
            tls: activeAccount!.tls,
            folder: folderImapMap[folder] || 'INBOX',
          }),
        })
        data = await res.json()
      }

      if (data.emails) {
        const mapped = data.emails.map((e: EmailMessage) => ({ ...e, folder }))
        setEmails(prev => {
          const filtered = prev.filter(e => e.folder !== folder)
          return [...filtered, ...mapped]
        })
      }
    } catch (err) {
      console.error('fetch failed:', err)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAccount, selectedFolder])

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
            className="w-full gap-2 shadow-lg shadow-gray-300"
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
                  ? 'bg-gray-200 text-black'
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
                    ? 'bg-gray-300 text-gray-800'
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
              onClick={() => refreshInbox()}
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
                {!activeAccount ? 'Geen account verbonden' : searchQuery ? 'Geen emails gevonden' : loading ? 'Emails laden...' : 'Inbox is leeg'}
              </p>
              <p className="text-sm mt-1">
                {!activeAccount ? 'Ga naar Instellingen om een IMAP account toe te voegen' : searchQuery ? 'Probeer een andere zoekterm' : 'Nieuwe emails verschijnen hier'}
              </p>
              {!activeAccount && (
                <Button className="mt-4 gap-2" onClick={() => setIsSettingsOpen(true)}>
                  <Settings className="h-4 w-4" />
                  Account toevoegen
                </Button>
              )}
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
                    !email.isRead && 'bg-gray-100/30',
                    selectedEmail?.id === email.id && 'bg-gray-100'
                  )}
                >
                  <span
                    role="button"
                    onClick={(e) => toggleStar(e as unknown as React.MouseEvent, email.id)}
                    className="mt-0.5 cursor-pointer"
                  >
                    <Star
                      className={cn(
                        'h-4 w-4 transition-colors',
                        email.isStarred
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-gray-300 hover:text-gray-400'
                      )}
                    />
                  </span>
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
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-900 font-semibold">
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
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedEmail.html) }}
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
        accounts={accounts}
        onAccountsChange={(updated) => {
          setAccounts(updated)
          if (updated.length > 0 && !activeAccount) setActiveAccount(updated[0])
          else if (updated.length === 0) setActiveAccount(null)
        }}
      />
    </div>
  )
}
