'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Bell, Search, Plus, LogOut, User, Settings, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { useSidebar } from '@/lib/sidebar-context'

interface UserProfile {
  email: string
  fullName: string
  initials: string
}

export function Header() {
  const router = useRouter()
  const { setMobileOpen } = useSidebar()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    const loadProfile = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
        const parts = fullName.split(' ')
        const initials = parts.length >= 2
          ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
          : fullName.substring(0, 2).toUpperCase()
        setProfile({
          email: user.email || '',
          fullName,
          initials,
        })
      }
    }
    loadProfile()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const displayName = profile?.fullName || 'Laden...'
  const initials = profile?.initials || '...'

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-gray-100 flex items-center justify-between px-3 sm:px-6 gap-2">
      {/* Left: hamburger (mobile/tablet) + search */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <button
          onClick={() => setMobileOpen(true)}
          className="lg:hidden flex items-center justify-center h-10 w-10 rounded-xl text-gray-600 hover:bg-gray-100"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Search: visible on sm+, icon-only on mobile */}
        <div className="hidden sm:block flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Zoek studio's, bookings, partners..."
              className="pl-10 bg-gray-50 border-gray-200 focus:bg-white"
            />
          </div>
        </div>

        {/* Mobile search icon */}
        <button
          onClick={() => setSearchOpen((v) => !v)}
          className="sm:hidden flex items-center justify-center h-10 w-10 rounded-xl text-gray-600 hover:bg-gray-100"
          aria-label="Zoeken"
        >
          <Search className="h-5 w-5" />
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 sm:gap-3">
        {/* Quick Add */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="gap-2 h-9 px-2 sm:px-3">
              <Plus className="h-4 w-4" />
              <span className="hidden md:inline">Quick Add</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>New Studio</DropdownMenuItem>
            <DropdownMenuItem>New Booking</DropdownMenuItem>
            <DropdownMenuItem>New Partner</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>New Sales Lead</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative h-9 w-9 hidden sm:inline-flex">
          <Bell className="h-5 w-5 text-gray-500" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 pl-1 sm:pl-2 h-9">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-gray-900 text-white text-sm font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden lg:inline text-sm font-medium text-gray-700">{displayName}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="font-semibold">{displayName}</span>
                <span className="text-xs text-gray-500 font-normal">{profile?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <Link href="/settings">
              <DropdownMenuItem className="cursor-pointer gap-2">
                <User className="h-4 w-4" />
                Profiel
              </DropdownMenuItem>
            </Link>
            <Link href="/settings">
              <DropdownMenuItem className="cursor-pointer gap-2">
                <Settings className="h-4 w-4" />
                Instellingen
              </DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 cursor-pointer gap-2"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Uitloggen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile search row (toggle) */}
      {searchOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border-b border-gray-100 px-3 py-2 sm:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              autoFocus
              placeholder="Zoek studio's, bookings..."
              className="pl-10 bg-gray-50 border-gray-200"
            />
          </div>
        </div>
      )}
    </header>
  )
}
