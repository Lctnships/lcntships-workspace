'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { MfaManager } from '@/components/mfa/MfaManager'
import { EmailHealthCheck } from '@/components/email/EmailHealthCheck'
import { OutboxViewer } from '@/components/email/OutboxViewer'
import { Loader2, Shield, Lock } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TeamMember {
  id: string
  email: string
  full_name: string | null
  role: string
  created_at: string
  last_sign_in_at: string | null
  mfa_enabled?: boolean
  recovery_codes_remaining?: number
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

type SectionId = 'bedrijf' | 'account' | 'team' | 'auth' | 'notificaties' | 'integraties' | 'platform' | 'branding'

const NAV: { id: SectionId; label: string; icon: React.ReactNode }[] = [
  { id: 'bedrijf', label: 'Bedrijfsprofiel', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg> },
  { id: 'account', label: 'Mijn account', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg> },
  { id: 'team', label: 'Teamleden', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="7" r="3"/><path d="M3 21v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75M21 21v-2a4 4 0 0 0-3-3.85"/></svg> },
  { id: 'auth', label: 'Authenticatie', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> },
  { id: 'notificaties', label: 'Notificaties', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg> },
  { id: 'integraties', label: 'Integraties', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m8 6 4-4 4 4M12 2v10.3M4.93 10.93A10 10 0 1 0 19.07 10.93"/></svg> },
  { id: 'platform', label: 'Platform', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg> },
  { id: 'branding', label: 'Branding', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg> },
]

// ─── Small helpers ─────────────────────────────────────────────────────────────

function FLabel({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--ink-muted)] mb-[6px]">{children}</div>
}

function FInput({ value, onChange, placeholder, type = 'text', readOnly, defaultValue }: Readonly<{
  value?: string; onChange?: (v: string) => void; placeholder?: string
  type?: string; readOnly?: boolean; defaultValue?: string
}>) {
  return (
    <input
      type={type}
      value={value}
      defaultValue={defaultValue}
      onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
      className="w-full border border-[var(--edge)] bg-[var(--bg)] px-[11px] py-[9px] text-[12.5px] text-[var(--ink)] outline-none focus:border-[var(--accent)] placeholder:text-[var(--ink-ghost)] transition-colors"
    />
  )
}

function FTextarea({ value, defaultValue, onChange, placeholder, rows = 4 }: Readonly<{
  value?: string; defaultValue?: string; onChange?: (v: string) => void; placeholder?: string; rows?: number
}>) {
  return (
    <textarea
      value={value}
      onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full border border-[var(--edge)] bg-[var(--bg)] px-[11px] py-[9px] text-[12.5px] text-[var(--ink)] outline-none focus:border-[var(--accent)] placeholder:text-[var(--ink-ghost)] resize-y transition-colors"
    />
  )
}

function FSelect({ value, onChange, children }: Readonly<{ value?: string; onChange?: (v: string) => void; children: React.ReactNode }>) {
  return (
    <select
      value={value}
      onChange={e => onChange?.(e.target.value)}
      className="w-full border border-[var(--edge)] bg-[var(--bg)] px-[11px] py-[9px] text-[12.5px] text-[var(--ink)] outline-none focus:border-[var(--accent)] appearance-none transition-colors"
    >
      {children}
    </select>
  )
}

function Card({ children, className }: Readonly<{ children: React.ReactNode; className?: string }>) {
  return <div className={cn('bg-white border border-[var(--edge)] p-6 mb-4', className)}>{children}</div>
}

function CardTitle({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="text-[14px] font-bold text-[var(--ink)] mb-4">{children}</div>
}

function CardTitleRow({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="flex items-center justify-between mb-4">{children}</div>
}

function FormActions({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-[var(--edge-soft)]">{children}</div>
}

function BtnPrimary({ children, onClick, disabled, type = 'button' }: Readonly<{ children: React.ReactNode; onClick?: () => void; disabled?: boolean; type?: 'button' | 'submit' }>) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className="inline-flex items-center gap-[6px] px-4 py-[9px] text-[13px] font-semibold bg-[var(--accent)] text-white border border-[var(--accent)] transition-opacity hover:opacity-88 disabled:opacity-50">
      {children}
    </button>
  )
}

function BtnOutline({ children, onClick, danger }: Readonly<{ children: React.ReactNode; onClick?: () => void; danger?: boolean }>) {
  return (
    <button type="button" onClick={onClick}
      className={cn('inline-flex items-center gap-[6px] px-4 py-[9px] text-[13px] font-semibold bg-transparent border transition-colors',
        danger
          ? 'text-[var(--danger)] border-[oklch(0.88_0.05_27)] hover:bg-[var(--danger-tint)]'
          : 'text-[var(--ink)] border-[var(--edge)] hover:bg-[var(--surface)]'
      )}>
      {children}
    </button>
  )
}

function BtnSm({ children, onClick, danger }: Readonly<{ children: React.ReactNode; onClick?: () => void; danger?: boolean }>) {
  return (
    <button type="button" onClick={onClick}
      className={cn('inline-flex items-center gap-[5px] px-3 py-[6px] text-[12px] font-semibold border transition-colors',
        danger
          ? 'bg-[var(--danger-tint)] text-[var(--danger)] border-[oklch(0.88_0.05_27)] hover:bg-[oklch(0.93_0.05_27)]'
          : 'bg-transparent text-[var(--ink)] border-[var(--edge)] hover:bg-[var(--surface)]'
      )}>
      {children}
    </button>
  )
}

function Badge({ variant, children }: Readonly<{ variant: 'success' | 'warning' | 'danger' | 'muted'; children: React.ReactNode }>) {
  const cls = {
    success: 'bg-[var(--success-tint)] text-[var(--success)]',
    warning: 'bg-[var(--warning-tint)] text-[var(--warning-dark)]',
    danger: 'bg-[var(--danger-tint)] text-[var(--danger)]',
    muted: 'bg-[var(--surface)] text-[var(--ink-ghost)] border border-[var(--edge)]',
  }[variant]
  return <span className={cn('inline-flex items-center gap-1 px-2 py-[3px] text-[11px] font-bold uppercase tracking-[0.04em]', cls)}>{children}</span>
}

function ToggleRow({ label, desc, checked, onChange }: Readonly<{ label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }>) {
  return (
    <div className="flex items-center justify-between py-[14px] border-b border-[var(--edge-soft)] last:border-b-0 last:pb-0 first:pt-0">
      <div className="flex-1">
        <div className="text-[13px] font-semibold text-[var(--ink)]">{label}</div>
        {desc && <div className="text-[12px] text-[var(--ink-muted)] mt-[2px]">{desc}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn('relative w-9 h-5 rounded-full flex-shrink-0 transition-colors ml-4', checked ? 'bg-[var(--accent)]' : 'bg-[var(--edge)]')}
      >
        <span className="absolute top-[3px] w-[14px] h-[14px] rounded-full bg-white transition-transform"
          style={{ left: 3, transform: checked ? 'translateX(16px)' : 'translateX(0)' }} />
      </button>
    </div>
  )
}

const Grid2 = ({ children }: Readonly<{ children: React.ReactNode }>) => (
  <div className="grid grid-cols-2 gap-x-6 gap-y-4">{children}</div>
)

const Span2 = ({ children }: Readonly<{ children: React.ReactNode }>) => (
  <div className="col-span-2">{children}</div>
)

// ─── Integrations data ────────────────────────────────────────────────────────

const INTEGRATIONS = [
  { icon: '📅', bg: '#E8F0FE', name: 'Google Calendar', desc: 'Synchroniseer producties en shoot-datums automatisch', connected: true },
  { icon: '✉️', bg: '#FDE8F0', name: 'Mailchimp', desc: 'Exporteer leads naar e-mailcampagnes', connected: false },
  { icon: '⚡', bg: '#FFF3E0', name: 'Zapier', desc: 'Automatiseer workflows met 5000+ apps', connected: false },
  { icon: '💬', bg: '#F0E8FE', name: 'Slack', desc: 'Ontvang workspace-meldingen in je Slack-kanaal', connected: false },
  { icon: '💳', bg: '#E8FEF0', name: 'Stripe', desc: 'Verwerk betalingen en uitbetalingen aan studio-eigenaren', connected: true },
  { icon: '🗄', bg: '#E8F6FE', name: 'Supabase', desc: 'Database- en authenticatieverbinding', connected: true },
]

const COLOR_SWATCHES = ['#0E4F6D', '#1A73E8', '#2E7D32', '#6A1B9A', '#C62828', '#E65100', '#263238']

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [active, setActive] = useState<SectionId>('bedrijf')

  // Account state
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('')
  const [userInitials, setUserInitials] = useState('...')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const name = user.user_metadata?.full_name || user.email?.split('@')[0] || ''
        setUserEmail(user.email || '')
        setUserName(name)
        const parts = name.split(' ')
        setUserInitials(parts.length >= 2
          ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
          : name.substring(0, 2).toUpperCase())
      }
    }
    load()
  }, [])

  const saveProfile = async () => {
    setSavingProfile(true)
    try {
      const supabase = createClient()
      await supabase.auth.updateUser({ data: { full_name: userName } })
      const parts = userName.split(' ')
      setUserInitials(parts.length >= 2
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
        : userName.substring(0, 2).toUpperCase())
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 2000)
    } catch (err) {
      console.error(err)
    } finally {
      setSavingProfile(false)
    }
  }

  // Team state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loadingTeam, setLoadingTeam] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviting, setInviting] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [showInviteForm, setShowInviteForm] = useState(false)

  useState(() => {
    const load = async () => {
      setLoadingTeam(true)
      try {
        const res = await fetch('/api/team')
        if (res.ok) { const d = await res.json(); setTeamMembers(d.members || []) }
      } catch { /* silent */ } finally { setLoadingTeam(false) }
    }
    load()
  })

  const handleInvite = async () => {
    if (!inviteEmail) return
    setInviting(true); setInviteError(null); setInviteSuccess(null)
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, full_name: inviteName, role: inviteRole }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Uitnodiging mislukt')
      setInviteSuccess(`Uitnodiging verstuurd naar ${inviteEmail}`)
      setInviteEmail(''); setInviteName(''); setInviteRole('member'); setShowInviteForm(false)
      const teamRes = await fetch('/api/team')
      if (teamRes.ok) { const d = await teamRes.json(); setTeamMembers(d.members || []) }
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Onbekende fout')
    } finally { setInviting(false) }
  }

  // Notification state
  const [emailNotif, setEmailNotif] = useState({ newBooking: true, productionStarted: true, invoicePaid: true, weeklySummary: false })
  const [pushNotif, setPushNotif] = useState({ directMessages: true, actionItems: true, salesUpdates: false })

  // Auth toggles
  const [emailLoginEnabled, setEmailLoginEnabled] = useState(true)
  const [magicLinkEnabled, setMagicLinkEnabled] = useState(true)
  const [googleAuthEnabled, setGoogleAuthEnabled] = useState(false)

  // Branding
  const [activeColor, setActiveColor] = useState('#0E4F6D')

  return (
    <div className="flex bg-[var(--bg)]" style={{ margin: '-16px -16px 0', minHeight: 'calc(100vh - 64px)' }}>

      {/* Left nav */}
      <nav className="w-[200px] flex-shrink-0 border-r border-[var(--edge)] bg-[var(--bg)] sticky top-16 self-start h-[calc(100vh-64px)] overflow-y-auto py-6">
        <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--ink-ghost)] px-5 mb-3">Instellingen</div>
        {NAV.map(item => (
          <button key={item.id} type="button" onClick={() => setActive(item.id)}
            className={cn(
              'flex items-center gap-2 w-full px-5 py-2 text-[13px] font-medium text-left border-l-2 transition-all',
              active === item.id
                ? 'text-[var(--accent)] border-l-[var(--accent)] bg-[var(--accent-tint)] font-semibold'
                : 'text-[var(--ink-muted)] border-l-transparent hover:text-[var(--ink)] hover:bg-[var(--edge-soft)]'
            )}>
            <span className="flex-shrink-0">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* Main */}
      <main className="flex-1 overflow-y-auto px-12 py-10" style={{ maxWidth: 860 }}>

        {/* 1. Bedrijfsprofiel */}
        {active === 'bedrijf' && (
          <div>
            <div className="text-[20px] font-bold text-[var(--ink)] mb-1">Bedrijfsprofiel</div>
            <div className="text-[13px] text-[var(--ink-muted)] mb-8">Juridische en financiële gegevens van het bedrijf</div>

            <Card>
              <CardTitle>Bedrijfsgegevens</CardTitle>
              <Grid2>
                <div><FLabel>Bedrijfsnaam</FLabel><FInput defaultValue="Locationships B.V." /></div>
                <div><FLabel>KVK-nummer</FLabel><FInput defaultValue="87432219" /></div>
                <div><FLabel>BTW-nummer</FLabel><FInput defaultValue="NL004307841B01" /></div>
                <div><FLabel>IBAN</FLabel><FInput defaultValue="NL56 INGB 0007 9321 54" /></div>
                <Span2><FLabel>Straat + huisnummer</FLabel><FInput defaultValue="Keizersgracht 482" /></Span2>
                <div><FLabel>Postcode</FLabel><FInput defaultValue="1017 EG" /></div>
                <div><FLabel>Stad</FLabel><FInput defaultValue="Amsterdam" /></div>
              </Grid2>
              <FormActions>
                <BtnOutline>Annuleren</BtnOutline>
                <BtnPrimary>Opslaan</BtnPrimary>
              </FormActions>
            </Card>

            <Card>
              <CardTitle>Facturatiedefinities</CardTitle>
              <Grid2>
                <div><FLabel>Factuurnummer prefix</FLabel><FInput defaultValue="LTC-" /></div>
                <div><FLabel>Betalingstermijn (dagen)</FLabel><FInput type="number" defaultValue="14" /></div>
                <div><FLabel>Platformpercentage (%)</FLabel><FInput type="number" defaultValue="15" /></div>
                <div><FLabel>Standaard BTW (%)</FLabel><FInput type="number" defaultValue="21" /></div>
                <Span2>
                  <FLabel>Factuurvoetnoot</FLabel>
                  <FTextarea defaultValue="Bedankt voor uw boeking via Locationships. Betaling dient binnen 14 dagen te worden voldaan op bovenstaand IBAN onder vermelding van het factuurnummer." />
                </Span2>
              </Grid2>
              <FormActions>
                <BtnOutline>Annuleren</BtnOutline>
                <BtnPrimary>Opslaan</BtnPrimary>
              </FormActions>
            </Card>
          </div>
        )}

        {/* 2. Mijn account */}
        {active === 'account' && (
          <div>
            <div className="text-[20px] font-bold text-[var(--ink)] mb-1">Mijn account</div>
            <div className="text-[13px] text-[var(--ink-muted)] mb-8">Persoonlijke gegevens en wachtwoord</div>

            <Card>
              <CardTitle>Profielfoto</CardTitle>
              <div className="flex items-center gap-5">
                <div className="w-[72px] h-[72px] rounded-full bg-[var(--accent-tint)] border-2 border-[var(--accent)] flex items-center justify-center text-[22px] font-bold text-[var(--accent)] flex-shrink-0">
                  {userInitials}
                </div>
                <div className="flex flex-col gap-[6px]">
                  <BtnSm>Foto wijzigen</BtnSm>
                  <BtnSm danger>Verwijderen</BtnSm>
                </div>
              </div>
            </Card>

            <Card>
              <CardTitle>Persoonlijke gegevens</CardTitle>
              <Grid2>
                <div><FLabel>Voornaam</FLabel><FInput value={userName.split(' ')[0] || userName} onChange={v => setUserName(v + ' ' + userName.split(' ').slice(1).join(' '))} /></div>
                <div><FLabel>Achternaam</FLabel><FInput value={userName.split(' ').slice(1).join(' ')} onChange={v => setUserName(userName.split(' ')[0] + ' ' + v)} /></div>
                <Span2><FLabel>E-mailadres</FLabel><FInput value={userEmail} readOnly /></Span2>
                <Span2><FLabel>Functietitel</FLabel><FInput defaultValue="Production Lead" /></Span2>
              </Grid2>
              <FormActions>
                <BtnOutline>Annuleren</BtnOutline>
                <BtnPrimary onClick={saveProfile} disabled={savingProfile}>
                  {savingProfile ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  {profileSaved ? 'Opgeslagen!' : 'Opslaan'}
                </BtnPrimary>
              </FormActions>
            </Card>

            <Card>
              <CardTitle>Wachtwoord wijzigen</CardTitle>
              <div className="flex flex-col gap-4">
                <div><FLabel>Huidig wachtwoord</FLabel><FInput type="password" placeholder="••••••••" /></div>
                <div><FLabel>Nieuw wachtwoord</FLabel><FInput type="password" placeholder="••••••••" /></div>
                <div><FLabel>Herhaal nieuw wachtwoord</FLabel><FInput type="password" placeholder="••••••••" /></div>
              </div>
              <FormActions>
                <BtnPrimary>Wachtwoord bijwerken</BtnPrimary>
              </FormActions>
            </Card>
          </div>
        )}

        {/* 3. Teamleden */}
        {active === 'team' && (
          <div>
            <div className="text-[20px] font-bold text-[var(--ink)] mb-1">Teamleden</div>
            <div className="text-[13px] text-[var(--ink-muted)] mb-8">Beheer toegang en rollen voor je team</div>

            {inviteSuccess && (
              <div className="mb-4 p-3 bg-[var(--success-tint)] text-[var(--success)] text-[13px] font-medium">{inviteSuccess}</div>
            )}
            {inviteError && (
              <div className="mb-4 p-3 bg-[var(--danger-tint)] text-[var(--danger)] text-[13px]">{inviteError}</div>
            )}

            <Card>
              <CardTitleRow>
                <div className="text-[14px] font-bold text-[var(--ink)]">Actieve leden</div>
                <BtnSm onClick={() => setShowInviteForm(!showInviteForm)}>+ Uitnodigen</BtnSm>
              </CardTitleRow>

              {loadingTeam ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-4 w-4 animate-spin text-[var(--ink-ghost)]" />
                </div>
              ) : teamMembers.length > 0 ? (
                <div>
                  {teamMembers.map(m => (
                    <div key={m.id} className="flex items-center gap-3 py-3 border-b border-[var(--edge-soft)] last:border-b-0">
                      <div className="w-9 h-9 rounded-full bg-[var(--accent-tint)] flex items-center justify-center text-[13px] font-bold text-[var(--accent)] flex-shrink-0">
                        {(m.full_name || m.email).split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-[var(--ink)] truncate">{m.full_name || m.email}</div>
                        <div className="text-[12px] text-[var(--ink-muted)] truncate">{m.email}</div>
                      </div>
                      <span className={cn('inline-flex items-center gap-1 px-2 py-[3px] text-[11px] font-bold',
                        m.mfa_enabled ? 'bg-[var(--success-tint)] text-[var(--success)]' : 'bg-[var(--warning-tint)] text-[var(--warning-dark)]')}>
                        {m.mfa_enabled ? <Shield className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                        {m.mfa_enabled ? 'MFA' : 'Geen MFA'}
                      </span>
                      <select className="border border-[var(--edge)] bg-[var(--bg)] px-2 py-1 text-[12px] text-[var(--ink)] outline-none focus:border-[var(--accent)] min-w-[90px]">
                        <option value="admin" selected={m.role === 'admin'}>Admin</option>
                        <option value="member" selected={m.role === 'member'}>Member</option>
                        <option value="viewer" selected={m.role === 'viewer'}>Viewer</option>
                      </select>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-[12px] text-[var(--ink-ghost)]">Nog geen teamleden</div>
              )}
            </Card>

            {showInviteForm && (
              <Card>
                <CardTitle>Uitnodiging versturen</CardTitle>
                <Grid2>
                  <div><FLabel>E-mailadres</FLabel><FInput type="email" value={inviteEmail} onChange={setInviteEmail} placeholder="naam@bedrijf.nl" /></div>
                  <div>
                    <FLabel>Rol</FLabel>
                    <FSelect value={inviteRole} onChange={setInviteRole}>
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                      <option value="viewer">Viewer</option>
                    </FSelect>
                  </div>
                  <Span2><FLabel>Naam</FLabel><FInput value={inviteName} onChange={setInviteName} placeholder="Volledige naam" /></Span2>
                </Grid2>
                <FormActions>
                  <BtnOutline onClick={() => setShowInviteForm(false)}>Annuleren</BtnOutline>
                  <BtnPrimary onClick={handleInvite} disabled={inviting || !inviteEmail}>
                    {inviting ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                    {inviting ? 'Versturen...' : 'Uitnodiging sturen'}
                  </BtnPrimary>
                </FormActions>
              </Card>
            )}
          </div>
        )}

        {/* 4. Authenticatie */}
        {active === 'auth' && (
          <div>
            <div className="text-[20px] font-bold text-[var(--ink)] mb-1">Authenticatie</div>
            <div className="text-[13px] text-[var(--ink-muted)] mb-8">Twee-factor authenticatie en API-toegang</div>

            <Card>
              <CardTitle>Twee-factor authenticatie (MFA)</CardTitle>
              <MfaManager />
            </Card>

            <Card>
              <CardTitle>Inlogmethoden</CardTitle>
              <ToggleRow label="E-mail & wachtwoord" desc="Traditioneel e-mail en wachtwoord login" checked={emailLoginEnabled} onChange={setEmailLoginEnabled} />
              <ToggleRow label="Magic Link" desc="Wachtwoordloos inloggen via eenmalige link" checked={magicLinkEnabled} onChange={setMagicLinkEnabled} />
              <ToggleRow label="Google Sign-In" desc="Inloggen met Google-account" checked={googleAuthEnabled} onChange={setGoogleAuthEnabled} />
            </Card>

            <div className="mb-4">
              <EmailHealthCheck />
            </div>

            <div className="mb-4">
              <OutboxViewer />
            </div>
          </div>
        )}

        {/* 5. Notificaties */}
        {active === 'notificaties' && (
          <div>
            <div className="text-[20px] font-bold text-[var(--ink)] mb-1">Notificaties</div>
            <div className="text-[13px] text-[var(--ink-muted)] mb-8">Stel in wanneer en hoe je meldingen ontvangt</div>

            <Card>
              <CardTitle>E-mailmeldingen</CardTitle>
              <ToggleRow label="Nieuwe boekingsaanvraag" desc="Wanneer een studio een boeking aanvraagt" checked={emailNotif.newBooking} onChange={v => setEmailNotif({ ...emailNotif, newBooking: v })} />
              <ToggleRow label="Productie gestart" desc="Als een productie van start gaat" checked={emailNotif.productionStarted} onChange={v => setEmailNotif({ ...emailNotif, productionStarted: v })} />
              <ToggleRow label="Factuur betaald" desc="Bevestiging van ontvangen betalingen" checked={emailNotif.invoicePaid} onChange={v => setEmailNotif({ ...emailNotif, invoicePaid: v })} />
              <ToggleRow label="Wekelijkse samenvatting" desc="Maandagmorgen overzicht van de week" checked={emailNotif.weeklySummary} onChange={v => setEmailNotif({ ...emailNotif, weeklySummary: v })} />
            </Card>

            <Card>
              <CardTitle>Push-meldingen</CardTitle>
              <ToggleRow label="Directe berichten" desc="Inboxberichten en reacties" checked={pushNotif.directMessages} onChange={v => setPushNotif({ ...pushNotif, directMessages: v })} />
              <ToggleRow label="Actiepunten" desc="Taken die jouw aandacht vereisen" checked={pushNotif.actionItems} onChange={v => setPushNotif({ ...pushNotif, actionItems: v })} />
              <ToggleRow label="Salesupdates" desc="Leads, pijplijn en sluitingen" checked={pushNotif.salesUpdates} onChange={v => setPushNotif({ ...pushNotif, salesUpdates: v })} />
            </Card>
          </div>
        )}

        {/* 6. Integraties */}
        {active === 'integraties' && (
          <div>
            <div className="text-[20px] font-bold text-[var(--ink)] mb-1">Integraties</div>
            <div className="text-[13px] text-[var(--ink-muted)] mb-8">Koppel externe diensten aan de workspace</div>

            <div className="grid grid-cols-2 gap-3">
              {INTEGRATIONS.map(intg => (
                <div key={intg.name} className="bg-white border border-[var(--edge)] p-4 flex flex-col gap-[10px]">
                  <div className="flex items-center gap-[10px]">
                    <div className="w-9 h-9 rounded-[6px] flex items-center justify-center text-[18px] flex-shrink-0" style={{ background: intg.bg }}>
                      {intg.icon}
                    </div>
                    <div className="text-[13px] font-bold text-[var(--ink)]">{intg.name}</div>
                  </div>
                  <div className="text-[12px] text-[var(--ink-muted)] leading-[1.4] flex-1">{intg.desc}</div>
                  <div className="flex items-center justify-between">
                    <Badge variant={intg.connected ? 'success' : 'muted'}>{intg.connected ? 'Verbonden' : 'Niet verbonden'}</Badge>
                    <BtnSm>{intg.connected ? 'Beheren' : 'Verbinden'}</BtnSm>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 7. Platform */}
        {active === 'platform' && (
          <div>
            <div className="text-[20px] font-bold text-[var(--ink)] mb-1">Platforminstellingen</div>
            <div className="text-[13px] text-[var(--ink-muted)] mb-8">Boekingsregels en e-mailconfiguratie</div>

            <Card>
              <CardTitle>Boekingsregels</CardTitle>
              <Grid2>
                <div><FLabel>Minimale boekingsduur (uur)</FLabel><FInput type="number" defaultValue="4" /></div>
                <div><FLabel>Maximale boekingsdagen vooruit</FLabel><FInput type="number" defaultValue="90" /></div>
                <div><FLabel>Annuleringsperiode (uur)</FLabel><FInput type="number" defaultValue="48" /></div>
                <div><FLabel>Buffertijd tussen boekingen (min)</FLabel><FInput type="number" defaultValue="30" /></div>
              </Grid2>
              <div className="mt-4">
                <ToggleRow label="Automatisch goedkeuren" desc="Boekingen zonder handmatige review goedkeuren" checked={false} onChange={() => {}} />
                <ToggleRow label="Weekend-boekingen toestaan" desc="Studios zijn ook op za/zo beschikbaar" checked={true} onChange={() => {}} />
              </div>
              <FormActions>
                <BtnOutline>Annuleren</BtnOutline>
                <BtnPrimary>Opslaan</BtnPrimary>
              </FormActions>
            </Card>

            <Card>
              <CardTitle>E-mailconfiguratie</CardTitle>
              <Grid2>
                <div><FLabel>Afzendernaam</FLabel><FInput defaultValue="Locationships" /></div>
                <div><FLabel>Afzenderadres</FLabel><FInput type="email" defaultValue="hello@locationships.nl" /></div>
                <Span2><FLabel>Reply-to adres</FLabel><FInput type="email" defaultValue="support@locationships.nl" /></Span2>
              </Grid2>
              <div className="flex items-center justify-between mt-4 mb-3">
                <div className="text-[13px] font-semibold text-[var(--ink)]">E-mail gezondheid</div>
                <Badge variant="success">Operationeel</Badge>
              </div>
              <div className="flex gap-8 text-[12px] text-[var(--ink-muted)]">
                <div><span className="text-[var(--ink)] font-semibold">1.24k</span> verzonden deze maand</div>
                <div><span className="text-[var(--ink)] font-semibold">98.7%</span> afleverratio</div>
                <div><span className="text-[var(--ink)] font-semibold">0.3%</span> bounce rate</div>
              </div>
              <FormActions>
                <BtnOutline>Test e-mail sturen</BtnOutline>
                <BtnPrimary>Opslaan</BtnPrimary>
              </FormActions>
            </Card>
          </div>
        )}

        {/* 8. Branding */}
        {active === 'branding' && (
          <div>
            <div className="text-[20px] font-bold text-[var(--ink)] mb-1">Branding</div>
            <div className="text-[13px] text-[var(--ink-muted)] mb-8">Logo, kleuren en platformnaam</div>

            <Card>
              <CardTitle>Platformnaam</CardTitle>
              <div className="flex flex-col gap-4">
                <div><FLabel>Naam</FLabel><FInput defaultValue="Locationships" /></div>
                <div><FLabel>Tagline</FLabel><FInput defaultValue="Amsterdam's creative studio network" /></div>
              </div>
              <FormActions>
                <BtnOutline>Annuleren</BtnOutline>
                <BtnPrimary>Opslaan</BtnPrimary>
              </FormActions>
            </Card>

            <Card>
              <CardTitle>Logo</CardTitle>
              <div className="border border-dashed border-[var(--edge)] p-6 text-center cursor-pointer hover:bg-[var(--surface)] transition-colors">
                <div className="text-[var(--ink-ghost)] mb-2 flex justify-center">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                </div>
                <div className="text-[13px] text-[var(--ink-muted)]">Sleep een afbeelding of klik om te uploaden</div>
                <div className="text-[11px] text-[var(--ink-ghost)] mt-1">PNG, SVG — max 2MB</div>
              </div>
            </Card>

            <Card>
              <CardTitle>Accentkleur</CardTitle>
              <div className="text-[12px] text-[var(--ink-muted)] mb-3">Kies de primaire kleur van het platform</div>
              <div className="flex gap-2 flex-wrap mb-4">
                {COLOR_SWATCHES.map((c, i) => (
                  <button key={c} type="button" onClick={() => setActiveColor(c)}
                    className="w-8 h-8 rounded-full transition-transform hover:scale-110"
                    style={{ background: c, border: activeColor === c ? '2px solid var(--ink)' : '2px solid transparent', transform: activeColor === c ? 'scale(1.15)' : undefined }}
                    title={c}
                  />
                ))}
              </div>
              <div style={{ maxWidth: 200 }}><FLabel>Hex-waarde</FLabel><FInput value={activeColor} onChange={setActiveColor} /></div>
              <FormActions>
                <BtnPrimary>Toepassen</BtnPrimary>
              </FormActions>
            </Card>

            <div className="border border-[oklch(0.88_0.05_27)] p-5 bg-[var(--danger-tint)]">
              <div className="text-[13px] font-bold text-[var(--danger)] mb-[6px]">Gevaarlijke zone</div>
              <div className="text-[12px] text-[oklch(0.5_0.1_27)] mb-[14px]">Deze acties zijn onomkeerbaar. Ga zorgvuldig te werk.</div>
              <div className="flex gap-2 flex-wrap">
                <BtnSm danger>Alle studiodata resetten</BtnSm>
                <BtnSm danger>Workspace verwijderen</BtnSm>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
