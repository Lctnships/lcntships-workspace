'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useEffect, useRef } from 'react'
import { useSidebar } from '@/lib/sidebar-context'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// ─── Nav structure ────────────────────────────────────────────────────────────

type NavItem = {
  href: string
  label: string
  icon: React.ReactNode
  badge?: string
  badgeVariant?: 'accent' | 'neutral'
  sub?: NavItem[]
}

type NavGroup = {
  label?: string
  items: NavItem[]
}

function IconDashboard() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/>
      <rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/>
    </svg>
  )
}
function IconCalendar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2"/>
      <path d="M16 3v4M8 3v4M3 9h18"/>
    </svg>
  )
}
function IconInbox() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2"/>
      <path d="M2 7l10 7 10-7"/>
    </svg>
  )
}
function IconPipeline() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 5h18M7 10h10M11 15h2M12 20v-5"/>
    </svg>
  )
}
function IconScraper() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <circle cx="12" cy="12" r="7.5"/>
      <path d="M12 4.5V3M12 21v-1.5M4.5 12H3M21 12h-1.5"/>
    </svg>
  )
}
function IconPhone() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A17 17 0 0 1 4 5a1 1 0 0 1 1-1"/>
    </svg>
  )
}
function IconReview() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
      <rect x="9" y="3" width="6" height="4" rx="1"/>
      <path d="M9 12l2 2 4-4"/>
    </svg>
  )
}
function IconProducies() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2"/>
      <path d="M7 6V4M17 6V4M7 18v2M17 18v2M2 10h20M2 14h20"/>
    </svg>
  )
}
function IconBuilding() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18M5 21V8l7-5 7 5v13M10 21v-5h4v5"/>
    </svg>
  )
}
function IconPartners() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="7" r="3"/><circle cx="16" cy="7" r="3"/>
      <path d="M2 21v-1a6 6 0 0 1 6-6h8a6 6 0 0 1 6 6v1"/>
    </svg>
  )
}
function IconFinance() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18M3 10h18M5 6l7-3 7 3M6 10v11M12 10v11M18 10v11"/>
    </svg>
  )
}
function IconAnalytics() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 20h18M7 20V10M12 20V4M17 20v-7"/>
    </svg>
  )
}
function IconSettings() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 2v2.2M12 19.8V22M4.22 4.22l1.56 1.56M18.22 18.22l1.56 1.56M2 12h2.2M19.8 12H22M4.22 19.78l1.56-1.56M18.22 5.78l1.56-1.56"/>
    </svg>
  )
}
function IconLogoMark() {
  return (
    <svg viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 15, height: 15 }}>
      <path d="M7.5 2V11" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M7.5 3L12.5 10H7.5V3Z" fill="white" fillOpacity="0.9"/>
      <path d="M2 13H13" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}
function IconChevronLeft() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 6l-6 6 6 6"/>
    </svg>
  )
}
function IconChevronRight() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6l6 6-6 6"/>
    </svg>
  )
}
function IconDots() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
    </svg>
  )
}

// ─── Groups ───────────────────────────────────────────────────────────────────

const navGroups: NavGroup[] = [
  {
    label: 'Kern',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: <IconDashboard /> },
      { href: '/bookings', label: 'Agenda', icon: <IconCalendar /> },
      { href: '/email', label: 'Inbox', icon: <IconInbox /> },
    ],
  },
  {
    label: 'Sales',
    items: [
      {
        href: '/sales',
        label: 'Pipeline',
        icon: <IconPipeline />,
        sub: [
          { href: '/scraper', label: 'Lead scraper', icon: <IconScraper /> },
          { href: '/sales/call-log', label: 'Belsamenvatting', icon: <IconPhone /> },
          { href: '/sales/review', label: 'Wekelijkse review', icon: <IconReview /> },
        ],
      },
    ],
  },
  {
    label: 'Producties',
    items: [
      { href: '/marketing/agenda', label: 'Overzicht', icon: <IconProducies /> },
    ],
  },
  {
    label: 'Overig',
    items: [
      { href: '/studios', label: 'Studios', icon: <IconBuilding /> },
      { href: '/partners', label: 'Partners', icon: <IconPartners /> },
      { href: '/finance', label: 'Finance', icon: <IconFinance /> },
      { href: '/analytics', label: 'Analytics', icon: <IconAnalytics /> },
    ],
  },
]

// ─── NavItem component ─────────────────────────────────────────────────────────

function NavItemRow({
  item,
  collapsed,
  pathname,
  depth = 0,
}: Readonly<{
  item: NavItem
  collapsed: boolean
  pathname: string
  depth?: number
}>) {
  const isActive = pathname === item.href || (item.href !== '/sales' && pathname.startsWith(item.href + '/')) || (item.href === '/sales' && (pathname === '/sales' || (pathname.startsWith('/sales/') && !pathname.startsWith('/sales/call-log') && !pathname.startsWith('/sales/review') && !pathname.startsWith('/sales/agenda'))))

  const linkEl = (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={cn(
        'flex items-center gap-[9px] rounded-[5px] text-[11.5px] font-semibold transition-all duration-100 relative select-none whitespace-nowrap overflow-hidden',
        collapsed
          ? 'justify-center py-[7px] px-0 mx-[4px]'
          : depth === 0
            ? 'px-3 py-[6px] mx-[5px] pl-[14px]'
            : 'px-3 py-[5px] mx-[5px] pl-[10px] text-[11px] font-medium',
        isActive
          ? 'bg-[var(--accent-tint)] text-[var(--accent)]'
          : depth === 0
            ? 'text-[var(--ink-muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]'
            : 'text-[var(--ink-faint)] hover:bg-[var(--surface)] hover:text-[var(--ink)]',
      )}
    >
      {/* Active indicator bar */}
      {isActive && !collapsed && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[2.5px] h-[17px] bg-[var(--accent)] rounded-r-[2px]"
          aria-hidden
        />
      )}

      <span className="flex-shrink-0 text-current">{item.icon}</span>

      {!collapsed && (
        <>
          <span className="flex-1 leading-[1.2]">{item.label}</span>
          {item.badge && (
            <span
              className={cn(
                'text-[8.5px] font-bold px-[5px] py-[1px] rounded-full font-mono',
                item.badgeVariant === 'neutral'
                  ? 'bg-[var(--surface)] text-[var(--ink-ghost)] border border-[var(--edge)]'
                  : 'bg-[var(--accent)] text-white',
              )}
            >
              {item.badge}
            </span>
          )}
        </>
      )}
    </Link>
  )

  if (collapsed) {
    return (
      <Tooltip key={item.href} delayDuration={0}>
        <TooltipTrigger asChild>{linkEl}</TooltipTrigger>
        <TooltipContent side="right" className="font-semibold text-xs">
          {item.label}
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <div>
      {linkEl}
      {item.sub && !collapsed && (
        <div className="pl-6">
          {item.sub.map((sub) => (
            <NavItemRow key={sub.href} item={sub} collapsed={false} pathname={pathname} depth={1} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname()
  const { collapsed, setCollapsed, mobileOpen, setMobileOpen } = useSidebar()
  const isCollapsed = collapsed && !mobileOpen

  // Persist collapse state in localStorage
  const didMount = useRef(false)
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true
      try {
        const stored = localStorage.getItem('lctnships-sidebar-collapsed')
        if (stored === '1') setCollapsed(true)
      } catch { /* ignore */ }
      return
    }
    try {
      localStorage.setItem('lctnships-sidebar-collapsed', collapsed ? '1' : '0')
    } catch { /* ignore */ }
  }, [collapsed, setCollapsed])

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname, setMobileOpen])

  // Lock body scroll when mobile sidebar open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  return (
    <TooltipProvider>
      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Sidebar sluiten"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden w-full cursor-default"
          style={{ border: 'none' }}
          onClick={() => setMobileOpen(false)}
          onKeyDown={(e) => { if (e.key === 'Escape') setMobileOpen(false) }}
        />
      )}

      <aside
        style={{
          width: isCollapsed ? 'var(--sidebar-collapsed-w)' : 'var(--sidebar-w)',
          transition: 'width 220ms cubic-bezier(0.4, 0, 0.2, 1)',
          background: 'var(--bg)',
        }}
        className={cn(
          'fixed left-0 top-0 z-50 h-screen border-r flex flex-col overflow-hidden',
          'border-[var(--edge)]',
          'max-lg:translate-x-[-100%] lg:translate-x-0',
          mobileOpen && 'max-lg:translate-x-0 max-lg:shadow-2xl',
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            'h-14 flex items-center flex-shrink-0 border-b border-[var(--edge)] overflow-hidden gap-[9px]',
            isCollapsed ? 'justify-center px-0' : 'px-4',
          )}
        >
          <div
            className="w-[26px] h-[26px] min-w-[26px] rounded-[5px] flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--accent)' }}
          >
            <IconLogoMark />
          </div>
          {!isCollapsed && (
            <>
              <span className="text-[12.5px] font-extrabold tracking-[-0.01em] text-[var(--ink)] whitespace-nowrap">
                Lctnships
              </span>
              <span
                className="ml-auto text-[7.5px] font-bold uppercase tracking-[0.14em] text-[var(--ink-ghost)] whitespace-nowrap px-[6px] py-[2px] rounded-[3px] border border-[var(--edge)]"
                style={{ background: 'var(--surface)' }}
              >
                Workspace
              </span>
            </>
          )}
        </div>

        {/* User */}
        <div
          className={cn(
            'flex items-center gap-2 flex-shrink-0 border-b border-[var(--edge)] overflow-hidden',
            isCollapsed ? 'justify-center py-[9px] px-0' : 'py-[9px] px-3',
          )}
        >
          <div
            className="w-[27px] h-[27px] min-w-[27px] rounded-full flex items-center justify-center text-[9.5px] font-black text-white flex-shrink-0"
            style={{ background: 'var(--accent)' }}
          >
            R
          </div>
          {!isCollapsed && (
            <>
              <div className="min-w-0">
                <div className="text-[11.5px] font-bold text-[var(--ink)] whitespace-nowrap">Rivaldo</div>
                <div className="text-[9.5px] text-[var(--ink-ghost)] whitespace-nowrap">Admin</div>
              </div>
              <button
                className="ml-auto w-[22px] h-[22px] min-w-[22px] flex items-center justify-center rounded-[3px] text-[var(--ink-ghost)] transition-all duration-110 hover:text-[var(--ink-muted)] flex-shrink-0"
                style={{ border: 'none', background: 'none' }}
                aria-label="Gebruikersmenu"
              >
                <IconDots />
              </button>
            </>
          )}
        </div>

        {/* Nav */}
        <nav
          className="flex-1 overflow-y-auto overflow-x-hidden py-2"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--edge) transparent' }}
        >
          {navGroups.map((group, gi) => (
            <div key={gi}>
              {gi > 0 && (
                <div
                  className="h-px my-[5px]"
                  style={{
                    background: 'var(--edge-soft)',
                    margin: '5px 12px',
                  }}
                />
              )}

              {group.label && !isCollapsed && (
                <span className="block px-4 pt-2 pb-1 text-[7.5px] font-bold uppercase tracking-[0.22em] text-[var(--ink-ghost)] whitespace-nowrap">
                  {group.label}
                </span>
              )}

              {group.items.map((item) => (
                <NavItemRow
                  key={item.href}
                  item={item}
                  collapsed={isCollapsed}
                  pathname={pathname}
                />
              ))}
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div className="flex-shrink-0 border-t border-[var(--edge)] p-[5px]">
          <NavItemRow
            item={{ href: '/settings', label: 'Instellingen', icon: <IconSettings /> }}
            collapsed={isCollapsed}
            pathname={pathname}
          />
          <div
            className="h-px my-[5px]"
            style={{ background: 'var(--edge-soft)', margin: '5px 12px' }}
          />
          <button
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Uitklappen' : 'Inklappen'}
            className={cn(
              'hidden lg:flex items-center gap-[9px] rounded-[5px] text-[11.5px] font-semibold transition-all duration-100 w-full whitespace-nowrap text-[var(--ink-ghost)] hover:text-[var(--ink-muted)] cursor-pointer',
              isCollapsed
                ? 'justify-center py-[7px] px-0'
                : 'px-3 py-[6px] pl-[14px]',
            )}
            style={{ border: 'none', background: 'none' }}
          >
            {isCollapsed ? <IconChevronRight /> : <IconChevronLeft />}
            {!isCollapsed && <span className="flex-1 text-left">Inklappen</span>}
          </button>
        </div>
      </aside>
    </TooltipProvider>
  )
}
