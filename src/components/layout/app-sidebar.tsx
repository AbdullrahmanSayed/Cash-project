'use client'

import { useAppStore, type Page } from '@/lib/store'
import {
  LayoutDashboard, Users, ShoppingCart,
  Package, Truck, BarChart3, Database, LogOut, X, Store, UserCog, SlidersHorizontal, Receipt
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems: { page: Page; label: string; icon: React.ElementType; ownerOnly?: boolean }[] = [
  { page: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { page: 'customers', label: 'العملاء', icon: Users },
  { page: 'sales', label: 'المبيعات', icon: ShoppingCart },
  { page: 'expenses', label: 'المصروفات', icon: Receipt, ownerOnly: true },
  { page: 'products', label: 'المخزون', icon: Package },
  { page: 'suppliers', label: 'الموردون', icon: Truck },
  { page: 'reports', label: 'التقارير', icon: BarChart3, ownerOnly: true },
  { page: 'backup', label: 'النسخ الاحتياطي', icon: Database, ownerOnly: true },
  { page: 'users', label: 'المستخدمون', icon: UserCog, ownerOnly: true },
  { page: 'settings', label: 'الإعدادات', icon: SlidersHorizontal, ownerOnly: true },
]

export default function AppSidebar() {
  const { currentUser, currentPage, setPage, sidebarOpen, setSidebarOpen, logout } = useAppStore()

  const filteredNav = navItems.filter(item => !item.ownerOnly || currentUser?.role === 'owner')

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 right-0 h-full w-64 bg-[#0F1119] border-l border-[#1E2233] z-50 transition-transform duration-300 flex flex-col",
        sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#1E2233]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center shadow-md shadow-amber-500/20">
              <Store className="w-5 h-5 text-black" />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-lg leading-tight">المعرض</h2>
              <p className="text-xs text-muted-foreground">نظام الإدارة</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {filteredNav.map(item => {
            const Icon = item.icon
            const isActive = currentPage === item.page
            return (
              <button
                key={item.page}
                onClick={() => setPage(item.page)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                  isActive 
                    ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" 
                    : "text-muted-foreground hover:text-foreground hover:bg-[#1A1E2A]"
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-[#1E2233]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-[#1A1E2A] flex items-center justify-center">
              <span className="text-amber-500 font-bold text-sm">
                {currentUser?.name?.charAt(0)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{currentUser?.name}</p>
              <p className="text-xs text-muted-foreground">
                {currentUser?.role === 'owner' ? 'صاحب المعرض' : 'موظف'}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>
    </>
  )
}
