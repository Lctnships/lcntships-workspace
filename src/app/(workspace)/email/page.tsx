'use client'

import { useState } from 'react'
import {
  Mail,
  Inbox,
  Send,
  Star,
  Trash2,
  Archive,
  Search,
  Plus,
  Paperclip,
  MoreHorizontal,
  ChevronDown,
  RefreshCw,
  Settings,
  LogIn,
  Shield,
  Globe,
  ArrowLeft,
  Reply,
  Forward,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// Email provider options
const EMAIL_PROVIDERS = [
  { id: 'google', name: 'Google / Gmail', icon: '📧', color: 'bg-red-50 border-red-200 hover:bg-red-100' },
  { id: 'outlook', name: 'Microsoft Outlook', icon: '📬', color: 'bg-blue-50 border-blue-200 hover:bg-blue-100' },
  { id: 'imap', name: 'IMAP / SMTP (custom)', icon: '⚙️', color: 'bg-gray-50 border-gray-200 hover:bg-gray-100' },
]

type Folder = 'inbox' | 'sent' | 'starred' | 'drafts' | 'trash'

interface EmailMessage {
  id: string
  from: string
  fromEmail: string
  to: string
  subject: string
  preview: string
  body: string
  date: string
  read: boolean
  starred: boolean
  folder: Folder
  hasAttachment: boolean
}

// Login screen component
function EmailLogin({ onConnect }: { onConnect: (provider: string) => void }) {
  const [connecting, setConnecting] = useState<string | null>(null)
  const [imapForm, setImapForm] = useState(false)
  const [imapHost, setImapHost] = useState('')
  const [imapEmail, setImapEmail] = useState('')
  const [imapPassword, setImapPassword] = useState('')

  const handleConnect = async (providerId: string) => {
    if (providerId === 'imap') {
      setImapForm(true)
      return
    }
    setConnecting(providerId)
    // Simulate connection - in production this would do OAuth
    setTimeout(() => {
      onConnect(providerId)
    }, 1500)
  }

  const handleImapConnect = () => {
    if (!imapHost || !imapEmail || !imapPassword) return
    setConnecting('imap')
    setTimeout(() => {
      onConnect('imap')
    }, 1500)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh]">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Mail className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Email Client</h1>
          <p className="text-gray-500 mt-2">Verbind je email account om je inbox te bekijken en berichten te versturen</p>
        </div>

        {/* Provider buttons */}
        {!imapForm ? (
          <div className="space-y-3">
            {EMAIL_PROVIDERS.map((provider) => (
              <button
                key={provider.id}
                onClick={() => handleConnect(provider.id)}
                disabled={connecting !== null}
                className={cn(
                  'w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left',
                  provider.color,
                  connecting === provider.id && 'ring-2 ring-indigo-500',
                  connecting !== null && connecting !== provider.id && 'opacity-50'
                )}
              >
                <span className="text-2xl">{provider.icon}</span>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{provider.name}</p>
                  <p className="text-sm text-gray-500">
                    {provider.id === 'google' && 'Verbind via Google OAuth'}
                    {provider.id === 'outlook' && 'Verbind via Microsoft OAuth'}
                    {provider.id === 'imap' && 'Verbind met IMAP/SMTP instellingen'}
                  </p>
                </div>
                {connecting === provider.id ? (
                  <Loader2 className="h-5 w-5 text-indigo-600 animate-spin" />
                ) : (
                  <LogIn className="h-5 w-5 text-gray-400" />
                )}
              </button>
            ))}

            <div className="mt-6 p-4 bg-indigo-50 rounded-2xl">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-indigo-900">Veilige verbinding</p>
                  <p className="text-xs text-indigo-700 mt-1">
                    Je gegevens worden versleuteld en we slaan geen wachtwoorden op. OAuth wordt gebruikt voor Google en Microsoft.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <button onClick={() => setImapForm(false)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
              <ArrowLeft className="h-4 w-4" />
              Terug naar providers
            </button>

            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">IMAP / SMTP Instellingen</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IMAP Server</label>
                <input
                  type="text"
                  value={imapHost}
                  onChange={(e) => setImapHost(e.target.value)}
                  placeholder="imap.example.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Adres</label>
                <input
                  type="email"
                  value={imapEmail}
                  onChange={(e) => setImapEmail(e.target.value)}
                  placeholder="jouw@email.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Wachtwoord / App Password</label>
                <input
                  type="password"
                  value={imapPassword}
                  onChange={(e) => setImapPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <Button
                onClick={handleImapConnect}
                disabled={connecting !== null || !imapHost || !imapEmail || !imapPassword}
                className="w-full gap-2"
              >
                {connecting === 'imap' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                Verbinden
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Email Client component (after login)
function EmailClient({ provider, onDisconnect }: { provider: string; onDisconnect: () => void }) {
  const [activeFolder, setActiveFolder] = useState<Folder>('inbox')
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null)
  const [composing, setComposing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  // Compose state
  const [composeTo, setComposeTo] = useState('')
  const [composeSubject, setComposeSubject] = useState('')
  const [composeBody, setComposeBody] = useState('')

  // Demo emails - in production these come from the email API
  const [emails] = useState<EmailMessage[]>([
    {
      id: '1',
      from: 'Studio Yoga Amsterdam',
      fromEmail: 'info@yogaamsterdam.nl',
      to: 'rivaldo@lcntships.com',
      subject: 'Re: Samenwerking lcntships - interesse!',
      preview: 'Hey Rivaldo, bedankt voor je bericht. We zijn zeker geïnteresseerd in de samenwerking. Kunnen we volgende week een call inplannen?',
      body: `<p>Hey Rivaldo,</p><p>Bedankt voor je bericht. We zijn zeker geïnteresseerd in de samenwerking. Kunnen we volgende week een call inplannen?</p><p>We hebben 3 studio ruimtes en zoeken al een tijd naar een goed boekingsplatform.</p><p>Groetjes,<br/>Marieke<br/>Studio Yoga Amsterdam</p>`,
      date: '2026-03-03T10:30:00',
      read: false,
      starred: true,
      folder: 'inbox',
      hasAttachment: false,
    },
    {
      id: '2',
      from: 'CrossFit Den Haag',
      fromEmail: 'owner@crossfitdh.nl',
      to: 'rivaldo@lcntships.com',
      subject: 'Vraag over jullie platform',
      preview: 'Hallo, ik zag jullie website en ben benieuwd naar de mogelijkheden voor onze CrossFit box...',
      body: `<p>Hallo,</p><p>Ik zag jullie website en ben benieuwd naar de mogelijkheden voor onze CrossFit box. We hebben momenteel 200+ leden en zoeken naar een beter boekingssysteem.</p><p>Kunnen jullie ook group classes aan?</p><p>Mvg,<br/>Tom</p>`,
      date: '2026-03-03T09:15:00',
      read: false,
      starred: false,
      folder: 'inbox',
      hasAttachment: true,
    },
    {
      id: '3',
      from: 'Pilates Studio Utrecht',
      fromEmail: 'contact@pilatesutrecht.nl',
      to: 'rivaldo@lcntships.com',
      subject: 'Niet geïnteresseerd',
      preview: 'Bedankt voor het aanbod, maar we gebruiken momenteel al een ander systeem en zijn tevreden...',
      body: `<p>Bedankt voor het aanbod, maar we gebruiken momenteel al een ander systeem en zijn tevreden.</p><p>Groetjes</p>`,
      date: '2026-03-02T16:45:00',
      read: true,
      starred: false,
      folder: 'inbox',
      hasAttachment: false,
    },
    {
      id: '4',
      from: 'Rivaldo',
      fromEmail: 'rivaldo@lcntships.com',
      to: 'info@yogaamsterdam.nl',
      subject: 'Samenwerking lcntships - gratis studio profiel',
      preview: 'Hey, ik ben Rivaldo van lcntships. We bieden gratis studio profielen aan...',
      body: `<p>Hey,</p><p>Ik ben Rivaldo van lcntships. We bieden gratis studio profielen aan met professionele foto's en video's.</p><p>Zou dit interessant zijn voor jullie studio?</p>`,
      date: '2026-03-01T14:00:00',
      read: true,
      starred: false,
      folder: 'sent',
      hasAttachment: false,
    },
  ])

  const handleRefresh = () => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 1500)
  }

  const folderEmails = emails.filter(e => {
    if (activeFolder === 'starred') return e.starred
    return e.folder === activeFolder
  }).filter(e => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return e.from.toLowerCase().includes(q) || e.subject.toLowerCase().includes(q) || e.preview.toLowerCase().includes(q)
  })

  const unreadCount = emails.filter(e => !e.read && e.folder === 'inbox').length

  const folders: { id: Folder; label: string; icon: typeof Inbox; count?: number }[] = [
    { id: 'inbox', label: 'Inbox', icon: Inbox, count: unreadCount },
    { id: 'sent', label: 'Verzonden', icon: Send },
    { id: 'starred', label: 'Belangrijk', icon: Star },
    { id: 'drafts', label: 'Concepten', icon: Clock },
    { id: 'trash', label: 'Prullenbak', icon: Trash2 },
  ]

  const formatEmailDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    if (isToday) return date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
    return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
  }

  const providerName = provider === 'google' ? 'Gmail' : provider === 'outlook' ? 'Outlook' : 'IMAP'

  return (
    <div className="flex h-[calc(100vh-120px)] bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Sidebar */}
      <div className="w-56 border-r border-gray-100 flex flex-col">
        <div className="p-4">
          <Button onClick={() => setComposing(true)} className="w-full gap-2">
            <Plus className="h-4 w-4" />
            Nieuw Bericht
          </Button>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {folders.map((folder) => {
            const Icon = folder.icon
            const isActive = activeFolder === folder.id
            return (
              <button
                key={folder.id}
                onClick={() => { setActiveFolder(folder.id); setSelectedEmail(null) }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  isActive ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-50'
                )}
              >
                <Icon className={cn('h-4 w-4', isActive ? 'text-indigo-600' : 'text-gray-400')} />
                <span className="flex-1 text-left">{folder.label}</span>
                {folder.count && folder.count > 0 && (
                  <Badge className="bg-indigo-600 text-white text-xs px-1.5 py-0.5 min-w-[20px] text-center">{folder.count}</Badge>
                )}
              </button>
            )
          })}
        </nav>

        {/* Account info */}
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center">
              <Globe className="h-3.5 w-3.5 text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">{providerName}</p>
              <p className="text-xs text-gray-500 truncate">rivaldo@lcntships.com</p>
            </div>
            <button onClick={onDisconnect} className="p-1 hover:bg-gray-100 rounded-lg" title="Uitloggen">
              <Settings className="h-3.5 w-3.5 text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Email List */}
      <div className={cn('flex-1 flex flex-col border-r border-gray-100', selectedEmail && 'hidden md:flex md:w-80 md:flex-none')}>
        {/* Search bar */}
        <div className="p-3 border-b border-gray-100 flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Zoeken in emails..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <button onClick={handleRefresh} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Vernieuwen">
            <RefreshCw className={cn('h-4 w-4 text-gray-400', refreshing && 'animate-spin')} />
          </button>
        </div>

        {/* Email list */}
        <div className="flex-1 overflow-y-auto">
          {folderEmails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <Inbox className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">Geen berichten</p>
              <p className="text-sm text-gray-400 mt-1">
                {activeFolder === 'inbox' ? 'Je inbox is leeg' : `Geen berichten in ${folders.find(f => f.id === activeFolder)?.label}`}
              </p>
            </div>
          ) : (
            folderEmails.map((email) => (
              <button
                key={email.id}
                onClick={() => setSelectedEmail(email)}
                className={cn(
                  'w-full text-left p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors',
                  !email.read && 'bg-indigo-50/30',
                  selectedEmail?.id === email.id && 'bg-indigo-50'
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn('text-sm flex-1 truncate', !email.read ? 'font-semibold text-gray-900' : 'text-gray-600')}>
                    {email.from}
                  </span>
                  <span className="text-xs text-gray-400 flex-shrink-0">{formatEmailDate(email.date)}</span>
                </div>
                <p className={cn('text-sm truncate mb-1', !email.read ? 'font-medium text-gray-800' : 'text-gray-600')}>
                  {email.subject}
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-400 truncate flex-1">{email.preview}</p>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {email.hasAttachment && <Paperclip className="h-3 w-3 text-gray-400" />}
                    {email.starred && <Star className="h-3 w-3 text-amber-400 fill-amber-400" />}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Email Detail / Compose */}
      {selectedEmail ? (
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <button onClick={() => setSelectedEmail(null)} className="md:hidden p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h2 className="text-lg font-semibold text-gray-900 truncate flex-1 mx-3">{selectedEmail.subject}</h2>
            <div className="flex items-center gap-1">
              <button className="p-2 hover:bg-gray-100 rounded-lg" title="Beantwoorden"><Reply className="h-4 w-4 text-gray-400" /></button>
              <button className="p-2 hover:bg-gray-100 rounded-lg" title="Doorsturen"><Forward className="h-4 w-4 text-gray-400" /></button>
              <button className="p-2 hover:bg-gray-100 rounded-lg" title="Archiveren"><Archive className="h-4 w-4 text-gray-400" /></button>
              <button className="p-2 hover:bg-gray-100 rounded-lg" title="Verwijderen"><Trash2 className="h-4 w-4 text-gray-400" /></button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                <span className="text-sm font-semibold text-indigo-600">{selectedEmail.from.charAt(0)}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{selectedEmail.from}</span>
                  <span className="text-xs text-gray-400">&lt;{selectedEmail.fromEmail}&gt;</span>
                </div>
                <p className="text-xs text-gray-500">Aan: {selectedEmail.to}</p>
              </div>
              <span className="text-sm text-gray-400">
                {new Date(selectedEmail.date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: selectedEmail.body }} />
          </div>

          {/* Quick reply */}
          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Snel antwoorden..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <Button size="sm" className="gap-2">
                <Send className="h-3.5 w-3.5" />
                Verstuur
              </Button>
            </div>
          </div>
        </div>
      ) : composing ? (
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Nieuw Bericht</h2>
            <button onClick={() => setComposing(false)} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>

          <div className="flex-1 p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Aan</label>
              <input
                type="email"
                value={composeTo}
                onChange={(e) => setComposeTo(e.target.value)}
                placeholder="email@voorbeeld.com"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Onderwerp</label>
              <input
                type="text"
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                placeholder="Onderwerp..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex-1">
              <textarea
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                placeholder="Schrijf je bericht..."
                className="w-full h-64 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>
          </div>

          <div className="p-4 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-gray-100 rounded-lg" title="Bijlage toevoegen">
                <Paperclip className="h-4 w-4 text-gray-400" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setComposing(false)}>Annuleren</Button>
              <Button className="gap-2">
                <Send className="h-4 w-4" />
                Verstuur
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
          <Mail className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">Selecteer een email om te lezen</p>
          <p className="text-sm text-gray-400 mt-1">Of klik &quot;Nieuw Bericht&quot; om een email te versturen</p>
        </div>
      )}
    </div>
  )
}

export default function EmailPage() {
  const [connected, setConnected] = useState(false)
  const [provider, setProvider] = useState<string>('')

  const handleConnect = (selectedProvider: string) => {
    setProvider(selectedProvider)
    setConnected(true)
  }

  const handleDisconnect = () => {
    setConnected(false)
    setProvider('')
  }

  if (!connected) {
    return <EmailLogin onConnect={handleConnect} />
  }

  return <EmailClient provider={provider} onDisconnect={handleDisconnect} />
}
