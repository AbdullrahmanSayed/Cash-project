'use client'

import { useAppStore } from '@/lib/store'
import AppSidebar from './app-sidebar'
import AppHeader from './app-header'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <AppSidebar />
      <div className="lg:mr-64">
        <AppHeader />
        <main className="p-3 sm:p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
