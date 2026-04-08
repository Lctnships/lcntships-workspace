'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Building2,
  Calendar,
  Users,
  UserCircle,
  DollarSign,
  BarChart3,
  Rocket,
  Megaphone,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Mail,
  Sparkles,
  Zap,
  Menu,
  X,
  PhoneCall,
  ClipboardCheck,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useSidebar } from '@/lib/sidebar-context'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'

const mainNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/studios', label: 'Studios', icon: Building2 },
  { href: '/bookings', label: 'Bookings', icon: Calendar },
  { href: '/partners', label: 'Partners', icon: Users },
  { href: '/customers', label: 'Customers', icon: UserCircle },
  { href: '/email', label: 'Email', icon: Mail },
]

const businessNavItems = [
  { href: '/finance', label: 'Finance', icon: DollarSign },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
]

const growthNavItems = [
  { href: '/sales', label: 'Sales Pipeline', icon: Rocket },
  { href: '/sales/call-log', label: 'Bel Samenvatting', icon: PhoneCall },
  { href: '/sales/agenda', label: 'Agenda', icon: Calendar },
  { href: '/sales/review', label: 'Wekelijkse Review', icon: ClipboardCheck },
  { href: '/scraper', label: 'Lead Scraper', icon: Zap },
  { href: '/enrichment', label: 'Lead Enrichment', icon: Sparkles },
  { href: '/marketing', label: 'Marketing', icon: Megaphone },
  { href: '/marketing/analytics', label: 'Email Analytics', icon: Mail },
]

const systemNavItems = [
  { href: '/documents', label: 'Documents', icon: FileText },
  { href: '/settings', label: 'Settings', icon: Settings },
]

interface NavSectionProps {
  title?: string
  items: typeof mainNavItems
  collapsed: boolean
  pathname: string
}

function NavSection({ title, items, collapsed, pathname }: NavSectionProps) {
  return (
    <div className="space-y-1">
      {title && !collapsed && (
        <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {title}
        </p>
      )}
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
        const Icon = item.icon

        const linkContent = (
          <Link
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
              isActive
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}
          >
            <Icon className={cn('h-5 w-5 flex-shrink-0', isActive ? 'text-gray-900' : 'text-gray-400')} />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        )

        if (collapsed) {
          return (
            <Tooltip key={item.href} delayDuration={0}>
              <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
              <TooltipContent side="right" className="font-medium">
                {item.label}
              </TooltipContent>
            </Tooltip>
          )
        }

        return <div key={item.href}>{linkContent}</div>
      })}
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const { collapsed, setCollapsed } = useSidebar()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  return (
    <TooltipProvider>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 xl:hidden bg-white rounded-xl p-2 shadow-md border border-gray-100"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5 text-gray-700" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 xl:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-screen bg-white border-r border-gray-100 transition-all duration-300 flex flex-col',
          // Desktop: normal sidebar
          'max-xl:translate-x-[-100%] xl:translate-x-0',
          collapsed ? 'xl:w-[72px]' : 'xl:w-64',
          // Mobile/tablet: overlay sidebar (always full width when open)
          mobileOpen && 'max-xl:translate-x-0 max-xl:w-72 max-xl:shadow-2xl'
        )}
      >
        {/* Logo */}
        <div className={cn('flex items-center h-16 px-4 border-b border-gray-100', collapsed && !mobileOpen ? 'justify-center' : 'justify-between')}>
          <div className="flex items-center gap-3">
            <img
              src="/lcntships-logo.png"
              alt="lcntships"
              className="w-9 h-9 object-contain"
            />
            {(!collapsed || mobileOpen) && (
              <div className="flex flex-col">
                <span className="font-bold text-gray-900">lcntships</span>
                <span className="text-xs text-gray-500">Workspace</span>
              </div>
            )}
          </div>
          {mobileOpen && (
            <button onClick={() => setMobileOpen(false)} className="xl:hidden p-1" aria-label="Close menu">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-6">
          <NavSection items={mainNavItems} collapsed={collapsed && !mobileOpen} pathname={pathname} />

          {(!collapsed || mobileOpen) && <Separator className="my-3" />}

          <NavSection title="Business" items={businessNavItems} collapsed={collapsed && !mobileOpen} pathname={pathname} />

          {(!collapsed || mobileOpen) && <Separator className="my-3" />}

          <NavSection title="Growth" items={growthNavItems} collapsed={collapsed && !mobileOpen} pathname={pathname} />

          {(!collapsed || mobileOpen) && <Separator className="my-3" />}

          <NavSection items={systemNavItems} collapsed={collapsed && !mobileOpen} pathname={pathname} />
        </nav>

        {/* Collapse Toggle - desktop only */}
        <div className="hidden xl:block p-3 border-t border-gray-100">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className={cn('w-full', collapsed ? 'justify-center' : 'justify-start')}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span className="ml-2">Collapse</span>
              </>
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  )
}
