'use client'

import { useEffect, useRef, useState } from 'react'
import { useAppStore, type Page } from '@/lib/store'
import { AlertTriangle, Bell, Menu, Package } from 'lucide-react'

const pageTitles: Record<Page, string> = {
  dashboard: 'لوحة التحكم',
  customers: 'العملاء',
  'customer-profile': 'ملف العميل',
  sales: 'المبيعات',
  installments: 'الأقساط',
  products: 'المخزون',
  suppliers: 'الموردون',
  reports: 'التقارير',
  backup: 'النسخ الاحتياطي',
  users: 'إدارة المستخدمين',
  settings: 'الإعدادات',
  expenses: 'المصروفات',
}

interface NotificationCounts {
  overdueCount: number
  lowStockCount: number
}

export default function AppHeader() {
  const { currentPage, setSidebarOpen, setPage } = useAppStore()
  const [counts, setCounts] = useState<NotificationCounts>({ overdueCount: 0, lowStockCount: 0 })
  const [open, setOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/dashboard')
        if (!res.ok) return
        const d = await res.json()
        setCounts({
          overdueCount: Number(d.overdueCount ?? 0),
          lowStockCount: Array.isArray(d.lowStock) ? d.lowStock.length : 0,
        })
      } catch {
        // silent fail — header notifications are non-critical
      }
    }
    load()
    const interval = setInterval(load, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const total = counts.overdueCount + counts.lowStockCount

  return (
    <header className="sticky top-0 z-30 bg-[#0B0D13]/80 backdrop-blur-md border-b border-[#1E2233] px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-muted-foreground hover:text-foreground p-1"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold text-foreground">{pageTitles[currentPage]}</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative" ref={popoverRef}>
            <button
              onClick={() => setOpen(o => !o)}
              className="relative p-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="الإشعارات"
            >
              <Bell className="w-5 h-5" />
              {total > 0 && (
                <span className="absolute -top-0.5 -left-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full">
                  {total > 99 ? '99+' : total}
                </span>
              )}
            </button>
            {open && (
              <div className="absolute left-0 mt-2 w-72 bg-[#151821] border border-[#1E2233] rounded-xl shadow-2xl overflow-hidden z-50" dir="rtl">
                <div className="px-4 py-3 border-b border-[#1E2233]">
                  <p className="text-sm font-semibold text-foreground">الإشعارات</p>
                </div>
                <div className="py-1">
                  {total === 0 && (
                    <p className="px-4 py-6 text-center text-xs text-muted-foreground">لا توجد إشعارات جديدة</p>
                  )}
                  {counts.overdueCount > 0 && (
                    <button
                      onClick={() => { setPage('installments'); setOpen(false) }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#1A1E2A] text-right transition-colors"
                    >
                      <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <span className="text-sm text-red-400">{counts.overdueCount} قسط متأخر</span>
                    </button>
                  )}
                  {counts.lowStockCount > 0 && (
                    <button
                      onClick={() => { setPage('products'); setOpen(false) }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#1A1E2A] text-right transition-colors"
                    >
                      <Package className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                      <span className="text-sm text-yellow-400">{counts.lowStockCount} منتج مخزونه منخفض</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          {currentPage !== 'dashboard' && (
            <button
              onClick={() => setPage('dashboard')}
              className="text-xs text-amber-500 hover:text-amber-400 transition-colors"
            >
              الرئيسية
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
