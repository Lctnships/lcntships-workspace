'use client'

import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { SidebarProvider, useSidebar } from '@/lib/sidebar-context'
import { cn } from '@/lib/utils'

function WorkspaceContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar()

  return (
    <div className={cn(
      'transition-all duration-300',
      collapsed ? 'lg:pl-[72px]' : 'lg:pl-64'
    )}>
      <Header />
      <main className="p-4 sm:p-6">{children}</main>
    </div>
  )
}

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-[#FAFBFC]">
        <Sidebar />
        <WorkspaceContent>{children}</WorkspaceContent>
      </div>
    </SidebarProvider>
  )
}
