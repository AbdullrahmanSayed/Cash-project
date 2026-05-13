'use client'

import { useEffect, useState } from 'react'
import { useAppStore, type Page } from '@/lib/store'
import LoginPage from '@/components/auth/login-page'
import AppLayout from '@/components/layout/app-layout'
import DashboardPage from '@/components/dashboard/dashboard-page'
import CustomersPage from '@/components/customers/customers-page'
import CustomerProfile from '@/components/customers/customer-profile'
import SalesPage from '@/components/sales/sales-page'
import ProductsPage from '@/components/products/products-page'
import SuppliersPage from '@/components/suppliers/suppliers-page'
import ReportsPage from '@/components/reports/reports-page'
import BackupPage from '@/components/backup/backup-page'
import UsersPage from '@/components/users/users-page'
import SettingsPage from '@/components/settings/settings-page'
import ExpensesPage from '@/components/expenses/expenses-page'
import SetupWizard from '@/components/auth/setup-wizard'

function PageRenderer({ page }: { page: Page }) {
  switch (page) {
    case 'dashboard': return <DashboardPage />
    case 'customers': return <CustomersPage />
    case 'customer-profile': return <CustomerProfile />
    case 'sales': return <SalesPage />
    case 'products': return <ProductsPage />
    case 'suppliers': return <SuppliersPage />
    case 'reports': return <ReportsPage />
    case 'backup': return <BackupPage />
    case 'users': return <UsersPage />
    case 'settings': return <SettingsPage />
    case 'expenses': return <ExpensesPage />
    default: return <DashboardPage />
  }
}

export default function Home() {
  const currentUser = useAppStore((s) => s.currentUser)
  const hydrated = useAppStore((s) => s.hydrated)
  const currentPage = useAppStore((s) => s.currentPage)
  const hydrate = useAppStore((s) => s.hydrate)
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null)

  useEffect(() => {
    hydrate()
    // Check if first run
    fetch('/api/setup')
      .then(r => r.json())
      .then(d => setNeedsSetup(d.needsSetup === true))
      .catch(() => setNeedsSetup(false))
  }, [hydrate])

  if (!hydrated || needsSetup === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // First run — show setup wizard
  if (needsSetup) {
    return <SetupWizard onComplete={() => { setNeedsSetup(false); window.location.reload() }} />
  }

  if (!currentUser) {
    return <LoginPage />
  }

  return (
    <AppLayout>
      <PageRenderer page={currentPage} />
    </AppLayout>
  )
}
