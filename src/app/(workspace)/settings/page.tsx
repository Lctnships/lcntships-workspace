'use client'

import { useState, useEffect, useRef } from 'react'
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

type SectionId = 'bedrijf' | 'account' | 'team' | 'auth' | 'notificaties' | 'integraties' | 'platform'

const NAV: { id: SectionId; label: string; icon: React.ReactNode }[] = [
  { id: 'bedrijf',      label: 'Bedrijfsprofiel', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg> },
  { id: 'account',      label: 'Mijn account',    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg> },
  { id: 'team',         label: 'Teamleden',        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="7" r="3"/><path d="M3 21v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75M21 21v-2a4 4 0 0 0-3-3.85"/></svg> },
  { id: 'auth',         label: 'Authenticatie',   icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> },
  { id: 'notificaties', label: 'Notificaties',    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg> },
  { id: 'integraties',  label: 'Integraties',     icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m8 6 4-4 4 4M12 2v10.3M4.93 10.93A10 10 0 1 0 19.07 10.93"/></svg> },
  { id: 'platform',     label: 'Platform',        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg> },
]

// ─── UI helpers ───────────────────────────────────────────────────────────────

function FLabel({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--ink-muted)] mb-[6px]">{children}</div>
}

function FInput({ value, onChange, placeholder, type = 'text', readOnly, defaultValue, disabled }: Readonly<{
  value?: string; onChange?: (v: string) => void; placeholder?: string
  type?: string; readOnly?: boolean; defaultValue?: string; disabled?: boolean
}>) {
  return (
    <input type={type} value={value} defaultValue={defaultValue} onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder} readOnly={readOnly} disabled={disabled}
      className="w-full border border-[var(--edge)] bg-[var(--bg)] px-[11px] py-[9px] text-[12.5px] text-[var(--ink)] outline-none focus:border-[var(--accent)] placeholder:text-[var(--ink-ghost)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors" />
  )
}

function FTextarea({ defaultValue, onChange, placeholder, rows = 4 }: Readonly<{
  defaultValue?: string; onChange?: (v: string) => void; placeholder?: string; rows?: number
}>) {
  return (
    <textarea defaultValue={defaultValue} onChange={e => onChange?.(e.target.value)} placeholder={placeholder} rows={rows}
      className="w-full border border-[var(--edge)] bg-[var(--bg)] px-[11px] py-[9px] text-[12.5px] text-[var(--ink)] outline-none focus:border-[var(--accent)] placeholder:text-[var(--ink-ghost)] resize-y transition-colors" />
  )
}

function FSelect({ value, onChange, children }: Readonly<{ value?: string; onChange?: (v: string) => void; children: React.ReactNode }>) {
  return (
    <select value={value} onChange={e => onChange?.(e.target.value)}
      className="w-full border border-[var(--edge)] bg-[var(--bg)] px-[11px] py-[9px] text-[12.5px] text-[var(--ink)] outline-none focus:border-[var(--accent)] appearance-none transition-colors">
      {children}
    </select>
  )
}

function Card({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="bg-white border border-[var(--edge)] p-6 mb-4">{children}</div>
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

function BtnPrimary({ children, onClick, disabled }: Readonly<{ children: React.ReactNode; onClick?: () => void; disabled?: boolean }>) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="inline-flex items-center gap-[6px] px-4 py-[9px] text-[13px] font-semibold bg-[var(--accent)] text-white border border-[var(--accent)] hover:opacity-90 disabled:opacity-50 transition-opacity">
      {children}
    </button>
  )
}

function BtnOutline({ children, onClick }: Readonly<{ children: React.ReactNode; onClick?: () => void }>) {
  return (
    <button type="button" onClick={onClick}
      className="inline-flex items-center gap-[6px] px-4 py-[9px] text-[13px] font-semibold bg-transparent border border-[var(--edge)] text-[var(--ink)] hover:bg-[var(--surface)] transition-colors">
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

function ToggleRow({ label, desc, checked, onChange }: Readonly<{ label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }>) {
  return (
    <div className="flex items-center justify-between py-[14px] border-b border-[var(--edge-soft)] last:border-b-0 last:pb-0 first:pt-0">
      <div className="flex-1">
        <div className="text-[13px] font-semibold text-[var(--ink)]">{label}</div>
        {desc && <div className="text-[12px] text-[var(--ink-muted)] mt-[2px]">{desc}</div>}
      </div>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={cn('relative w-9 h-5 rounded-full flex-shrink-0 transition-colors ml-4', checked ? 'bg-[var(--accent)]' : 'bg-[var(--edge)]')}>
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

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [active, setActive] = useState<SectionId>('bedrijf')

  // ── Account state ──────────────────────────────────────────────────────────
  const [userEmail, setUserEmail]     = useState('')
  const [userName, setUserName]       = useState('')
  const [userRole, setUserRole]       = useState('')
  const [userInitials, setUserInitials] = useState('...')
  const [avatarUrl, setAvatarUrl]     = useState<string | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSaved, setProfileSaved]   = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // password change
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw]         = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [savingPw, setSavingPw]   = useState(false)
  const [pwMsg, setPwMsg]         = useState<{ ok: boolean; text: string } | null>(null)

  const isAdmin = userRole === 'admin' || userRole === 'Admin'

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const name = user.user_metadata?.full_name || user.email?.split('@')[0] || ''
        setUserEmail(user.email || '')
        setUserName(name)
        setUserRole(user.user_metadata?.role || 'Admin')
        setAvatarUrl(user.user_metadata?.avatar_url || null)
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
    } catch (err) { console.error(err) }
    finally { setSavingProfile(false) }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const path = `avatars/${user.id}/${Date.now()}-${file.name}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (error) { alert('Upload mislukt: ' + error.message); return }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    await supabase.auth.updateUser({ data: { avatar_url: publicUrl } })
    setAvatarUrl(publicUrl)
  }

  const handleAvatarRemove = async () => {
    const supabase = createClient()
    await supabase.auth.updateUser({ data: { avatar_url: null } })
    setAvatarUrl(null)
  }

  const changePassword = async () => {
    if (!newPw || newPw !== confirmPw) {
      setPwMsg({ ok: false, text: 'Wachtwoorden komen niet overeen' }); return
    }
    if (newPw.length < 8) {
      setPwMsg({ ok: false, text: 'Minimaal 8 tekens' }); return
    }
    setSavingPw(true); setPwMsg(null)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: newPw })
      if (error) throw error
      setPwMsg({ ok: true, text: 'Wachtwoord bijgewerkt' })
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
    } catch (err) {
      setPwMsg({ ok: false, text: err instanceof Error ? err.message : 'Onbekende fout' })
    } finally { setSavingPw(false) }
  }

  // ── Team state ─────────────────────────────────────────────────────────────
  const [teamMembers, setTeamMembers]   = useState<TeamMember[]>([])
  const [loadingTeam, setLoadingTeam]   = useState(false)
  const [inviteEmail, setInviteEmail]   = useState('')
  const [inviteName, setInviteName]     = useState('')
  const [inviteRole, setInviteRole]     = useState('member')
  const [inviting, setInviting]         = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)
  const [inviteError, setInviteError]   = useState<string | null>(null)
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

  // ── Notification state ─────────────────────────────────────────────────────
  const [emailNotif, setEmailNotif] = useState({ newBooking: true, productionStarted: true, invoicePaid: true, weeklySummary: false })
  const [pushNotif, setPushNotif]   = useState({ directMessages: true, actionItems: true, salesUpdates: false })

  // ── Auth toggles ───────────────────────────────────────────────────────────
  const [emailLoginEnabled, setEmailLoginEnabled] = useState(true)
  const [magicLinkEnabled, setMagicLinkEnabled]   = useState(true)

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

        {/* 1. Bedrijfsprofiel — admin only */}
        {active === 'bedrijf' && (
          <div>
            <div className="text-[20px] font-bold text-[var(--ink)] mb-1">Bedrijfsprofiel</div>
            <div className="text-[13px] text-[var(--ink-muted)] mb-8">Juridische en financiële gegevens van het bedrijf</div>

            {!isAdmin && (
              <div className="mb-6 p-4 bg-[var(--warning-tint)] border border-[var(--edge)] text-[12px] text-[var(--warning-dark)] font-semibold">
                Alleen admins kunnen bedrijfsgegevens bewerken.
              </div>
            )}

            <Card>
              <CardTitle>Bedrijfsgegevens</CardTitle>
              <Grid2>
                <div><FLabel>Bedrijfsnaam</FLabel><FInput defaultValue="Locationships B.V." disabled={!isAdmin} /></div>
                <div><FLabel>KVK-nummer</FLabel><FInput defaultValue="87432219" disabled={!isAdmin} /></div>
                <div><FLabel>BTW-nummer</FLabel><FInput defaultValue="NL004307841B01" disabled={!isAdmin} /></div>
                <div><FLabel>IBAN</FLabel><FInput defaultValue="NL56 INGB 0007 9321 54" disabled={!isAdmin} /></div>
                <Span2><FLabel>Straat + huisnummer</FLabel><FInput defaultValue="Keizersgracht 482" disabled={!isAdmin} /></Span2>
                <div><FLabel>Postcode</FLabel><FInput defaultValue="1017 EG" disabled={!isAdmin} /></div>
                <div><FLabel>Stad</FLabel><FInput defaultValue="Amsterdam" disabled={!isAdmin} /></div>
              </Grid2>
              {isAdmin && (
                <FormActions>
                  <BtnOutline>Annuleren</BtnOutline>
                  <BtnPrimary>Opslaan</BtnPrimary>
                </FormActions>
              )}
            </Card>

            <Card>
              <CardTitle>Facturatiedefinities</CardTitle>
              <Grid2>
                <div><FLabel>Factuurnummer prefix</FLabel><FInput defaultValue="LTC-" disabled={!isAdmin} /></div>
                <div><FLabel>Betalingstermijn (dagen)</FLabel><FInput type="number" defaultValue="14" disabled={!isAdmin} /></div>
                <div><FLabel>Platformpercentage (%)</FLabel><FInput type="number" defaultValue="15" disabled={!isAdmin} /></div>
                <div><FLabel>Standaard BTW (%)</FLabel><FInput type="number" defaultValue="21" disabled={!isAdmin} /></div>
                <Span2>
                  <FLabel>Factuurvoetnoot</FLabel>
                  <FTextarea defaultValue="Bedankt voor uw boeking via Locationships. Betaling dient binnen 14 dagen te worden voldaan op bovenstaand IBAN onder vermelding van het factuurnummer." />
                </Span2>
              </Grid2>
              {isAdmin && (
                <FormActions>
                  <BtnOutline>Annuleren</BtnOutline>
                  <BtnPrimary>Opslaan</BtnPrimary>
                </FormActions>
              )}
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
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              <div className="flex items-center gap-5">
                <div className="w-[72px] h-[72px] rounded-full bg-[var(--accent-tint)] border-2 border-[var(--accent)] flex items-center justify-center overflow-hidden flex-shrink-0">
                  {avatarUrl
                    ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                    : <span className="text-[22px] font-bold text-[var(--accent)]">{userInitials}</span>
                  }
                </div>
                <div className="flex flex-col gap-[6px]">
                  <BtnSm onClick={() => fileInputRef.current?.click()}>Foto uploaden</BtnSm>
                  {avatarUrl && <BtnSm danger onClick={handleAvatarRemove}>Verwijderen</BtnSm>}
                </div>
              </div>
            </Card>

            <Card>
              <CardTitle>Persoonlijke gegevens</CardTitle>
              <Grid2>
                <div><FLabel>Voornaam</FLabel><FInput value={userName.split(' ')[0] || ''} onChange={v => setUserName(v + ' ' + userName.split(' ').slice(1).join(' '))} /></div>
                <div><FLabel>Achternaam</FLabel><FInput value={userName.split(' ').slice(1).join(' ')} onChange={v => setUserName((userName.split(' ')[0] || '') + (v ? ' ' + v : ''))} /></div>
                <Span2><FLabel>E-mailadres</FLabel><FInput value={userEmail} readOnly /></Span2>
                <Span2><FLabel>Functietitel</FLabel><FInput defaultValue="Production Lead" /></Span2>
              </Grid2>
              <FormActions>
                <BtnOutline>Annuleren</BtnOutline>
                <BtnPrimary onClick={saveProfile} disabled={savingProfile}>
                  {savingProfile && <Loader2 className="h-3 w-3 animate-spin" />}
                  {profileSaved ? 'Opgeslagen!' : 'Opslaan'}
                </BtnPrimary>
              </FormActions>
            </Card>

            <Card>
              <CardTitle>Wachtwoord wijzigen</CardTitle>
              <div className="flex flex-col gap-4">
                <div><FLabel>Huidig wachtwoord</FLabel><FInput type="password" value={currentPw} onChange={setCurrentPw} placeholder="••••••••" /></div>
                <div><FLabel>Nieuw wachtwoord</FLabel><FInput type="password" value={newPw} onChange={setNewPw} placeholder="Minimaal 8 tekens" /></div>
                <div><FLabel>Herhaal nieuw wachtwoord</FLabel><FInput type="password" value={confirmPw} onChange={setConfirmPw} placeholder="••••••••" /></div>
              </div>
              {pwMsg && (
                <div className={cn('mt-4 p-3 text-[12px] font-semibold', pwMsg.ok ? 'bg-[var(--success-tint)] text-[var(--success)]' : 'bg-[var(--danger-tint)] text-[var(--danger)]')}>
                  {pwMsg.text}
                </div>
              )}
              <FormActions>
                <BtnPrimary onClick={changePassword} disabled={savingPw}>
                  {savingPw && <Loader2 className="h-3 w-3 animate-spin" />}
                  Wachtwoord bijwerken
                </BtnPrimary>
              </FormActions>
            </Card>
          </div>
        )}

        {/* 3. Teamleden */}
        {active === 'team' && (
          <div>
            <div className="text-[20px] font-bold text-[var(--ink)] mb-1">Teamleden</div>
            <div className="text-[13px] text-[var(--ink-muted)] mb-8">Bekijk wie toegang heeft tot de workspace</div>

            {inviteSuccess && <div className="mb-4 p-3 bg-[var(--success-tint)] text-[var(--success)] text-[13px] font-medium">{inviteSuccess}</div>}
            {inviteError   && <div className="mb-4 p-3 bg-[var(--danger-tint)] text-[var(--danger)] text-[13px]">{inviteError}</div>}

            <Card>
              <CardTitleRow>
                <div className="text-[14px] font-bold text-[var(--ink)]">Actieve leden</div>
                {isAdmin && <BtnSm onClick={() => setShowInviteForm(!showInviteForm)}>+ Uitnodigen</BtnSm>}
              </CardTitleRow>

              {loadingTeam ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="h-4 w-4 animate-spin text-[var(--ink-ghost)]" /></div>
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
                      <span className="text-[11px] font-semibold text-[var(--ink-muted)] capitalize px-2 py-1 bg-[var(--surface)] border border-[var(--edge)]">
                        {m.role}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-[12px] text-[var(--ink-ghost)]">Nog geen teamleden</div>
              )}
            </Card>

            {showInviteForm && isAdmin && (
              <Card>
                <CardTitle>Uitnodiging versturen</CardTitle>
                <Grid2>
                  <div><FLabel>E-mailadres</FLabel><FInput type="email" value={inviteEmail} onChange={setInviteEmail} placeholder="naam@bedrijf.nl" /></div>
                  <div><FLabel>Rol</FLabel><FSelect value={inviteRole} onChange={setInviteRole}><option value="admin">Admin</option><option value="member">Member</option><option value="viewer">Viewer</option></FSelect></div>
                  <Span2><FLabel>Naam</FLabel><FInput value={inviteName} onChange={setInviteName} placeholder="Volledige naam" /></Span2>
                </Grid2>
                <FormActions>
                  <BtnOutline onClick={() => setShowInviteForm(false)}>Annuleren</BtnOutline>
                  <BtnPrimary onClick={handleInvite} disabled={inviting || !inviteEmail}>
                    {inviting && <Loader2 className="h-3 w-3 animate-spin" />}
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
            <div className="text-[13px] text-[var(--ink-muted)] mb-8">Twee-factor authenticatie en inlogmethoden</div>

            <Card>
              <CardTitle>Twee-factor authenticatie (MFA)</CardTitle>
              <MfaManager />
            </Card>

            <Card>
              <CardTitle>Inlogmethoden</CardTitle>
              <ToggleRow label="E-mail & wachtwoord" desc="Traditioneel e-mail en wachtwoord login" checked={emailLoginEnabled} onChange={setEmailLoginEnabled} />
              <ToggleRow label="Magic Link" desc="Wachtwoordloos inloggen via eenmalige link" checked={magicLinkEnabled} onChange={setMagicLinkEnabled} />
            </Card>
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

        {/* 6. Integraties — alleen Stripe */}
        {active === 'integraties' && (
          <div>
            <div className="text-[20px] font-bold text-[var(--ink)] mb-1">Integraties</div>
            <div className="text-[13px] text-[var(--ink-muted)] mb-8">Externe diensten gekoppeld aan de workspace</div>

            <div className="bg-white border border-[var(--edge)] p-4 flex flex-col gap-[10px]" style={{ maxWidth: 400 }}>
              <div className="flex items-center gap-[10px]">
                <div className="w-9 h-9 rounded-[6px] flex items-center justify-center text-[18px] flex-shrink-0" style={{ background: '#E8FEF0' }}>
                  💳
                </div>
                <div className="text-[13px] font-bold text-[var(--ink)]">Stripe</div>
              </div>
              <div className="text-[12px] text-[var(--ink-muted)] leading-[1.4]">Verwerk betalingen en uitbetalingen aan studio-eigenaren</div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center px-2 py-[3px] text-[10px] font-bold uppercase tracking-[0.04em] bg-[var(--success-tint)] text-[var(--success)]">Verbonden</span>
                <BtnSm>Beheren</BtnSm>
              </div>
            </div>
          </div>
        )}

        {/* 7. Platform — alleen e-mailconfig + pipeline test + outbox */}
        {active === 'platform' && (
          <div>
            <div className="text-[20px] font-bold text-[var(--ink)] mb-1">Platform</div>
            <div className="text-[13px] text-[var(--ink-muted)] mb-8">E-mailconfiguratie en pipeline</div>

            <Card>
              <CardTitle>E-mailconfiguratie</CardTitle>
              <Grid2>
                <div><FLabel>Afzendernaam</FLabel><FInput defaultValue="Locationships" /></div>
                <div><FLabel>Afzenderadres</FLabel><FInput type="email" defaultValue="hello@locationships.nl" /></div>
                <Span2><FLabel>Reply-to adres</FLabel><FInput type="email" defaultValue="support@locationships.nl" /></Span2>
              </Grid2>
              <div className="flex items-center justify-between mt-4 mb-3">
                <div className="text-[13px] font-semibold text-[var(--ink)]">E-mail gezondheid</div>
                <span className="inline-flex items-center px-2 py-[3px] text-[10px] font-bold uppercase tracking-[0.04em] bg-[var(--success-tint)] text-[var(--success)]">Operationeel</span>
              </div>
              <div className="flex gap-8 text-[12px] text-[var(--ink-muted)]">
                <div><span className="text-[var(--ink)] font-semibold">1.24k</span> verzonden deze maand</div>
                <div><span className="text-[var(--ink)] font-semibold">98.7%</span> afleverratio</div>
                <div><span className="text-[var(--ink)] font-semibold">0.3%</span> bounce rate</div>
              </div>
              <FormActions>
                <BtnOutline>Annuleren</BtnOutline>
                <BtnPrimary>Opslaan</BtnPrimary>
              </FormActions>
            </Card>

            <EmailHealthCheck />
            <OutboxViewer />
          </div>
        )}

      </main>
    </div>
  )
}
