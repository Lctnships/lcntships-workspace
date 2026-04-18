'use client'

import { useState, useEffect } from 'react'
import {
  Briefcase,
  User,
  Bell,
  Puzzle,
  Settings,
  Palette,
  MoreHorizontal,
  Check,
  ArrowRight,
  Mail,
  Smartphone,
  Image,
  Trash2,
  Key,
  Shield,
  Globe,
  Lock,
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

import { Users, UserPlus, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { MfaManager } from '@/components/mfa/MfaManager'

const navItems = [
  { id: 'business-profile', label: 'Business Profile', icon: Briefcase },
  { id: 'my-account', label: 'My Account', icon: User },
  { id: 'team-members', label: 'Team Members', icon: Users },
  { id: 'authentication', label: 'Authentication', icon: Key },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'integrations', label: 'Integrations', icon: Puzzle },
  { id: 'platform-settings', label: 'Platform Settings', icon: Settings },
  { id: 'branding', label: 'Branding', icon: Palette },
]

interface TeamMember {
  id: string
  email: string
  full_name: string | null
  role: string
  created_at: string
  last_sign_in_at: string | null
}

// Mock data
const integrations = [
  { id: '1', name: 'Google Calendar', description: 'Sync bookings directly to your calendar to avoid double bookings.', connected: true, logo: 'gcal' },
  { id: '2', name: 'Mailchimp', description: 'Automatically add new customers to your newsletter audiences.', connected: false, logo: 'mailchimp' },
  { id: '3', name: 'Zapier', description: 'Connect with 3,000+ apps to automate your workflows.', connected: true, logo: 'zapier' },
  { id: '4', name: 'Slack', description: 'Receive notifications and updates directly in your team channels.', connected: false, logo: 'slack' },
]

// Toggle Switch Component
function Toggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        'relative w-11 h-6 rounded-full transition-colors',
        checked ? 'bg-gray-900' : 'bg-gray-200'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  )
}

// Small Toggle for notifications
function SmallToggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        'relative w-9 h-5 rounded-full transition-colors',
        checked ? 'bg-gray-900' : 'bg-gray-200'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0'
        )}
      />
    </button>
  )
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('business-profile')
  const [showApiKey, setShowApiKey] = useState(false)

  // User profile state
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('')
  const [userInitials, setUserInitials] = useState('...')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)

  useEffect(() => {
    const loadUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const name = user.user_metadata?.full_name || user.email?.split('@')[0] || ''
        setUserEmail(user.email || '')
        setUserName(name)
        const parts = name.split(' ')
        setUserInitials(parts.length >= 2
          ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
          : name.substring(0, 2).toUpperCase()
        )
      }
    }
    loadUser()
  }, [])

  const saveProfile = async () => {
    setSavingProfile(true)
    setProfileSaved(false)
    try {
      const supabase = createClient()
      await supabase.auth.updateUser({
        data: { full_name: userName },
      })
      const parts = userName.split(' ')
      setUserInitials(parts.length >= 2
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
        : userName.substring(0, 2).toUpperCase()
      )
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 2000)
    } catch (err) {
      console.error('Error saving profile:', err)
    } finally {
      setSavingProfile(false)
    }
  }

  // Team members state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loadingTeam, setLoadingTeam] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviting, setInviting] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [showInviteForm, setShowInviteForm] = useState(false)

  // Load team members
  useState(() => {
    const loadTeam = async () => {
      setLoadingTeam(true)
      try {
        const res = await fetch('/api/team')
        if (res.ok) {
          const data = await res.json()
          setTeamMembers(data.members || [])
        }
      } catch {
        // Silently fail
      } finally {
        setLoadingTeam(false)
      }
    }
    loadTeam()
  })

  const handleInvite = async () => {
    if (!inviteEmail) return
    setInviting(true)
    setInviteError(null)
    setInviteSuccess(null)
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, full_name: inviteName, role: inviteRole }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Uitnodiging mislukt')
      setInviteSuccess(`Uitnodiging verstuurd naar ${inviteEmail}`)
      setInviteEmail('')
      setInviteName('')
      setInviteRole('member')
      setShowInviteForm(false)
      // Refresh team list
      const teamRes = await fetch('/api/team')
      if (teamRes.ok) {
        const teamData = await teamRes.json()
        setTeamMembers(teamData.members || [])
      }
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Onbekende fout')
    } finally {
      setInviting(false)
    }
  }

  // Auth settings states
  const [emailLoginEnabled, setEmailLoginEnabled] = useState(true)
  const [magicLinkEnabled, setMagicLinkEnabled] = useState(true)
  const [googleAuthEnabled, setGoogleAuthEnabled] = useState(false)

  // Notification states
  const [emailNotifications, setEmailNotifications] = useState({
    newBooking: true,
    bookingCancelled: true,
    weeklySummary: false,
  })
  const [pushNotifications, setPushNotifications] = useState({
    realTimeBookings: true,
    urgentIssues: true,
    marketingUpdates: false,
  })

  const scrollToSection = (id: string) => {
    setActiveSection(id)
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Mock API key (would come from Supabase in production)
  const mockApiKey = '••••••••••••••••••••••••••••••'

  return (
    <div className="flex min-h-screen">
      {/* Sidebar Navigation */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-gray-200 bg-gray-50 py-6 pl-6 pr-4 sticky top-0 h-screen overflow-y-auto">
        <div className="mb-6 px-2">
          <h1 className="text-xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500">Manage workspace</p>
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.id
            return (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all',
                  isActive
                    ? 'bg-gray-200 text-gray-900'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className={cn('text-sm', isActive ? 'font-semibold' : 'font-medium')}>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 px-6 py-8 md:px-12 lg:px-16 overflow-x-hidden">
        <div className="max-w-[900px] mx-auto flex flex-col gap-10">
          {/* Business Profile Section */}
          <section id="business-profile" className="scroll-mt-8">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Business Profile</h2>
              <p className="text-gray-500 text-sm">Manage your company details and public profile information.</p>
            </div>
            <div className="flex flex-col gap-6">
              {/* Company Info Card */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold mb-4 border-b border-gray-100 pb-2">Company Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium text-gray-900 mb-1.5">Legal Name</label>
                    <Input className="h-12 rounded-xl bg-gray-50" defaultValue="lctnships" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1.5">KVK Number</label>
                    <Input className="h-12 rounded-xl bg-gray-50" placeholder="12345678" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1.5">BTW Number</label>
                    <Input className="h-12 rounded-xl bg-gray-50" placeholder="NL85..." />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium text-gray-900 mb-1.5">Address</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Input className="md:col-span-3 h-12 rounded-xl bg-gray-50" placeholder="Street Address" />
                      <Input className="h-12 rounded-xl bg-gray-50" placeholder="City" />
                      <Input className="h-12 rounded-xl bg-gray-50" placeholder="Postal Code" />
                      <select className="h-12 rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900">
                        <option>Netherlands</option>
                        <option>Belgium</option>
                        <option>Germany</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Info Card */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold mb-4 border-b border-gray-100 pb-2">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1.5">Business Email</label>
                    <Input className="h-12 rounded-xl bg-gray-50" type="email" placeholder="hello@lctnships.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1.5">Business Phone</label>
                    <Input className="h-12 rounded-xl bg-gray-50" type="tel" placeholder="+31 6 12345678" />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium text-gray-900 mb-1.5">Support Email</label>
                    <Input className="h-12 rounded-xl bg-gray-50" type="email" placeholder="support@lctnships.com" />
                  </div>
                </div>
                <div className="mt-8 flex justify-end">
                  <Button className="rounded-xl shadow-md shadow-gray-300">
                    Save Changes
                    <Check className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* My Account Section */}
          <section id="my-account" className="scroll-mt-8">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Mijn Profiel</h2>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white text-2xl font-bold">
                    {userInitials}
                  </div>
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1.5">Volledige naam</label>
                    <Input
                      className="h-12 rounded-xl bg-gray-50"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1.5">Rol</label>
                    <div className="h-12 rounded-xl border border-gray-200 bg-gray-100 px-4 flex items-center text-gray-500 text-sm cursor-not-allowed">
                      Admin
                    </div>
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium text-gray-900 mb-1.5">Email</label>
                    <div className="h-12 rounded-xl border border-gray-200 bg-gray-100 px-4 flex items-center text-gray-500 text-sm cursor-not-allowed">
                      {userEmail}
                    </div>
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <Button
                      onClick={saveProfile}
                      disabled={savingProfile}
                      className="rounded-xl gap-2"
                    >
                      {savingProfile ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : profileSaved ? (
                        <Check className="h-4 w-4" />
                      ) : null}
                      {profileSaved ? 'Opgeslagen!' : 'Profiel opslaan'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Security */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold mb-4">Twee-factor authenticatie</h3>
              <MfaManager />

              <div className="border-t border-gray-100 pt-6 mt-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-4">Wachtwoord wijzigen</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Huidig wachtwoord</label>
                    <Input className="h-10 rounded-xl bg-gray-50" type="password" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Nieuw wachtwoord</label>
                    <Input className="h-10 rounded-xl bg-gray-50" type="password" />
                  </div>
                  <Button variant="outline" className="h-10 rounded-xl">
                    Bijwerken
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* Team Members Section */}
          <section id="team-members" className="scroll-mt-8">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Team Members</h2>
              <p className="text-gray-500 text-sm">Beheer wie toegang heeft tot het workspace dashboard.</p>
            </div>

            {/* Invite Success/Error */}
            {inviteSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 text-emerald-700 text-sm flex items-center gap-2">
                <Check className="h-4 w-4" />
                {inviteSuccess}
              </div>
            )}
            {inviteError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm">
                {inviteError}
              </div>
            )}

            {/* Team List */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Teamleden</h3>
                <Button onClick={() => setShowInviteForm(!showInviteForm)} className="rounded-xl">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Uitnodigen
                </Button>
              </div>

              {/* Invite Form */}
              {showInviteForm && (
                <div className="p-6 border-b border-gray-100 bg-gray-50">
                  <h4 className="text-sm font-semibold text-gray-900 mb-4">Nieuw teamlid uitnodigen</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Email *</label>
                      <Input
                        className="h-10 rounded-xl bg-white"
                        type="email"
                        placeholder="naam@bedrijf.nl"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Naam</label>
                      <Input
                        className="h-10 rounded-xl bg-white"
                        placeholder="Volledige naam"
                        value={inviteName}
                        onChange={(e) => setInviteName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Rol</label>
                      <select
                        className="w-full h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm focus:ring-2 focus:ring-gray-900"
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                      >
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </div>
                    <Button onClick={handleInvite} disabled={inviting || !inviteEmail} className="h-10 rounded-xl">
                      {inviting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
                      {inviting ? 'Versturen...' : 'Verstuur uitnodiging'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Members List */}
              <div className="divide-y divide-gray-100">
                {loadingTeam ? (
                  <div className="p-8 text-center text-gray-400">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Laden...
                  </div>
                ) : teamMembers.length > 0 ? (
                  teamMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 px-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                          {(member.full_name || member.email).split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{member.full_name || member.email}</div>
                          <div className="text-sm text-gray-500">{member.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          'px-2.5 py-1 rounded-full text-xs font-medium capitalize',
                          member.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                          member.role === 'viewer' ? 'bg-gray-100 text-gray-600' :
                          'bg-blue-100 text-blue-700'
                        )}>
                          {member.role}
                        </span>
                        {member.last_sign_in_at && (
                          <span className="text-xs text-gray-400">
                            Laatst actief: {new Date(member.last_sign_in_at).toLocaleDateString('nl-NL')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Nog geen teamleden. Nodig iemand uit om te beginnen.</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Authentication Section - NEW */}
          <section id="authentication" className="scroll-mt-8">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Authentication</h2>
              <p className="text-gray-500 text-sm">Configure how users can sign in to your platform.</p>
            </div>

            {/* Login Methods */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gray-200 flex items-center justify-center">
                  <Lock className="h-5 w-5 text-gray-900" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Login Methods</h3>
                  <p className="text-sm text-gray-500">Choose which authentication methods users can use.</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Email & Password */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                      <Mail className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900">Email & Password</h4>
                      <p className="text-xs text-gray-500">Traditional email and password login.</p>
                    </div>
                  </div>
                  <Toggle checked={emailLoginEnabled} onChange={setEmailLoginEnabled} />
                </div>

                {/* Magic Link */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                      <Key className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900">Magic Link</h4>
                      <p className="text-xs text-gray-500">Passwordless email login with one-time links.</p>
                    </div>
                  </div>
                  <Toggle checked={magicLinkEnabled} onChange={setMagicLinkEnabled} />
                </div>

                {/* Google OAuth */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                      <Globe className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900">Google Sign-In</h4>
                      <p className="text-xs text-gray-500">Allow users to sign in with Google.</p>
                    </div>
                  </div>
                  <Toggle checked={googleAuthEnabled} onChange={setGoogleAuthEnabled} />
                </div>
              </div>
            </div>

            {/* Email Configuration */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Email Configuration</h3>
                  <p className="text-sm text-gray-500">Configure email settings for authentication.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1.5">From Email</label>
                  <Input className="h-12 rounded-xl bg-gray-50" type="email" placeholder="noreply@lctnships.com" />
                  <p className="text-xs text-gray-500 mt-1">Email address used for sending auth emails.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1.5">From Name</label>
                  <Input className="h-12 rounded-xl bg-gray-50" placeholder="lcntships" />
                  <p className="text-xs text-gray-500 mt-1">Display name shown in email clients.</p>
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-900 mb-1.5">Redirect URL after login</label>
                  <Input className="h-12 rounded-xl bg-gray-50" placeholder="https://app.lcntships.com/dashboard" />
                  <p className="text-xs text-gray-500 mt-1">Where users are redirected after successful login.</p>
                </div>
              </div>
            </div>

            {/* Supabase Connection */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Supabase Auth</h3>
                  <p className="text-sm text-gray-500">Powered by Supabase authentication.</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-emerald-50 text-emerald-700 px-4 py-3 rounded-xl border border-emerald-100 mb-6">
                <Check className="h-5 w-5" />
                <span className="text-sm font-bold">Supabase Auth Connected</span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1.5">Project URL</label>
                  <div className="relative">
                    <Input
                      className="h-12 rounded-xl bg-gray-50 pr-10 font-mono text-sm"
                      value="https://xyzcompany.supabase.co"
                      readOnly
                    />
                    <button className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600">
                      <Copy className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1.5">Anon Key</label>
                  <div className="relative">
                    <Input
                      className="h-12 rounded-xl bg-gray-50 pr-24 font-mono text-sm"
                      type={showApiKey ? 'text' : 'password'}
                      value={mockApiKey}
                      readOnly
                    />
                    <div className="absolute right-3 top-3 flex items-center gap-2">
                      <button
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {showApiKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                      <button className="text-gray-400 hover:text-gray-600">
                        <Copy className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <Button variant="outline" className="rounded-xl">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate Keys
                </Button>
              </div>
            </div>
          </section>

          {/* Notifications Section */}
          <section id="notifications" className="scroll-mt-8">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Email Column */}
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                    <Mail className="h-4 w-4" /> Email
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">New booking received</span>
                      <SmallToggle
                        checked={emailNotifications.newBooking}
                        onChange={(checked) => setEmailNotifications({ ...emailNotifications, newBooking: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">Booking cancelled</span>
                      <SmallToggle
                        checked={emailNotifications.bookingCancelled}
                        onChange={(checked) => setEmailNotifications({ ...emailNotifications, bookingCancelled: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">Weekly summary</span>
                      <SmallToggle
                        checked={emailNotifications.weeklySummary}
                        onChange={(checked) => setEmailNotifications({ ...emailNotifications, weeklySummary: checked })}
                      />
                    </div>
                  </div>
                </div>
                {/* Push Column */}
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                    <Smartphone className="h-4 w-4" /> Push
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">Real-time bookings</span>
                      <SmallToggle
                        checked={pushNotifications.realTimeBookings}
                        onChange={(checked) => setPushNotifications({ ...pushNotifications, realTimeBookings: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">Urgent issues</span>
                      <SmallToggle
                        checked={pushNotifications.urgentIssues}
                        onChange={(checked) => setPushNotifications({ ...pushNotifications, urgentIssues: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">Marketing updates</span>
                      <SmallToggle
                        checked={pushNotifications.marketingUpdates}
                        onChange={(checked) => setPushNotifications({ ...pushNotifications, marketingUpdates: checked })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Integrations Section */}
          <section id="integrations" className="scroll-mt-8">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Integrations</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {integrations.map((integration) => (
                <div key={integration.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-3">
                    <div className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xs',
                      integration.logo === 'gcal' && 'bg-white border border-gray-100 shadow-sm',
                      integration.logo === 'mailchimp' && 'bg-yellow-400',
                      integration.logo === 'zapier' && 'bg-orange-500',
                      integration.logo === 'slack' && 'bg-white border border-gray-100 shadow-sm'
                    )}>
                      {integration.logo === 'gcal' && '📅'}
                      {integration.logo === 'mailchimp' && 'MC'}
                      {integration.logo === 'zapier' && 'Z'}
                      {integration.logo === 'slack' && '💬'}
                    </div>
                    <span className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide',
                      integration.connected
                        ? 'bg-green-50 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    )}>
                      {integration.connected ? 'Connected' : 'Not Connected'}
                    </span>
                  </div>
                  <h4 className="font-bold text-gray-900">{integration.name}</h4>
                  <p className="text-xs text-gray-500 mt-1 flex-1">{integration.description}</p>
                  <button className={cn(
                    'mt-4 w-full py-2 rounded-lg text-xs font-semibold transition-colors',
                    integration.connected
                      ? 'border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-300 hover:bg-red-50'
                      : 'bg-gray-50 text-gray-900 hover:bg-gray-100'
                  )}>
                    {integration.connected ? 'Disconnect' : 'Connect'}
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Platform Settings Section */}
          <section id="platform-settings" className="scroll-mt-8">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Platform Settings</h2>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1.5">Min Booking Duration</label>
                  <select className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm">
                    <option>1 hour</option>
                    <option>2 hours</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1.5">Max Booking Duration</label>
                  <select className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm">
                    <option>12 hours</option>
                    <option>24 hours</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1.5">Advance Notice</label>
                  <select className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm">
                    <option>24 hours</option>
                    <option>48 hours</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1.5">Cancellation Window</label>
                  <select className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm">
                    <option>48 hours</option>
                    <option>72 hours</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Branding Section */}
          <section id="branding" className="scroll-mt-8">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Branding</h2>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex flex-col gap-8">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Logo</h3>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl border border-dashed border-gray-300 flex items-center justify-center bg-gray-50 text-gray-400">
                      <Image className="h-6 w-6" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button variant="outline" size="sm" className="rounded-lg">
                        Upload new
                      </Button>
                      <p className="text-[10px] text-gray-500">Recommended size 400x400px</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Brand Colors</h3>
                    <div className="flex gap-4">
                      <div className="flex flex-col gap-1">
                        <div className="w-10 h-10 rounded-lg bg-gray-900 border border-gray-200 shadow-sm cursor-pointer" />
                        <span className="text-xs text-gray-500 text-center">Primary</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="w-10 h-10 rounded-lg bg-gray-900 border border-gray-200 shadow-sm cursor-pointer" />
                        <span className="text-xs text-gray-500 text-center">Secondary</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-1.5">Platform Name</label>
                    <Input className="h-10 rounded-xl bg-gray-50" defaultValue="lcntships" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Danger Zone */}
          <div className="mt-8 border border-red-100 bg-red-50/50 rounded-2xl p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-red-700">Danger Zone</h3>
                <p className="text-sm text-red-600/80 mt-1">This will permanently delete your workspace and all associated data.</p>
              </div>
              <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 rounded-xl">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Workspace
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
