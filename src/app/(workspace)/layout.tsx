'use client'

import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { SidebarProvider, useSidebar } from '@/lib/sidebar-context'

function WorkspaceContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar()

  return (
    <div
      style={{
        paddingLeft: collapsed
          ? 'var(--sidebar-collapsed-w)'
          : 'var(--sidebar-w)',
        transition: 'padding-left 220ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      className="lg:block max-lg:pl-0"
    >
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
