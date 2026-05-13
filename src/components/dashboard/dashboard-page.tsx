'use client'

import { useState, useEffect, useRef } from 'react'
import { useAppStore } from '@/lib/store'
import { useDebounce } from '@/hooks/use-debounce'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ShoppingCart, Package, TrendingUp, Clock, Search, User } from 'lucide-react'
import { toast } from 'sonner'

interface DashboardData {
  todaySalesAmount: number
  todaySalesCount: number
  monthSalesAmount: number
  monthSalesCount: number
  lowStock: Array<{ id: string; name: string; category: string; quantity: number }>
  staleProducts: Array<{ id: string; name: string; category: string; quantity: number }>
  recentSales: Array<{
    id: string; invoiceNumber: number; totalPrice: number; createdAt: string
    customer: { name: string }
    product: { name: string }
    employee: { name: string }
  }>
}

export default function DashboardPage() {
  const { setSelectedCustomerId } = useAppStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{id: string; name: string; phone: string}>>([])
  const [showSearch, setShowSearch] = useState(false)
  const cachedCustomers = useRef<Array<{id: string; name: string; phone: string}>>([])
  const debouncedSearch = useDebounce(searchQuery, 300)

  useEffect(() => {
    loadDashboard()
    const interval = setInterval(() => { loadDashboard() }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const loadDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard')
      if (!res.ok) throw new Error()
      setData(await res.json())
    } catch {
      toast.error('فشل تحميل لوحة التحكم')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (debouncedSearch.length < 2) { setSearchResults([]); setShowSearch(false); return }
    const search = async () => {
      if (!cachedCustomers.current.length) {
        const res = await fetch('/api/customers')
        if (!res.ok) return
        cachedCustomers.current = await res.json()
      }
      const filtered = cachedCustomers.current
        .filter(c => c.name.includes(debouncedSearch) || c.phone.includes(debouncedSearch))
        .slice(0, 5)
      setSearchResults(filtered)
      setShowSearch(filtered.length > 0)
    }
    search()
  }, [debouncedSearch])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-12 bg-[#151821] border border-[#1E2233] rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="bg-[#151821] border border-[#1E2233] rounded-2xl p-4 animate-pulse">
              <div className="w-9 h-9 bg-[#1E2233] rounded-xl mb-3" />
              <div className="h-3 bg-[#1E2233] rounded w-2/3 mb-2" />
              <div className="h-5 bg-[#1E2233] rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="بحث سريع عن عميل..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#151821] border border-[#1E2233] rounded-xl pr-10 pl-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          />
        </div>
        {showSearch && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[#151821] border border-[#1E2233] rounded-xl shadow-xl z-50 overflow-hidden">
            {searchResults.map(c => (
              <button
                key={c.id}
                onClick={() => { setSelectedCustomerId(c.id); setSearchQuery(''); setShowSearch(false) }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#1A1E2A] text-right transition-colors"
              >
                <User className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <div>
                  <p className="text-sm text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.phone}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<ShoppingCart className="w-5 h-5" />} label="مبيعات اليوم" value={formatCurrency(data.todaySalesAmount)} subtext={`${data.todaySalesCount} عملية`} color="gold" />
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="مبيعات الشهر" value={formatCurrency(data.monthSalesAmount)} subtext={`${data.monthSalesCount} عملية`} color="blue" />
        <StatCard icon={<Package className="w-5 h-5" />} label="مخزون منخفض" value={`${data.lowStock.length} منتج`} color="red" />
        <StatCard icon={<Clock className="w-5 h-5" />} label="مخزون راكد" value={`${data.staleProducts.length} منتج`} color="green" />
      </div>

      {/* Recent Sales */}
      {data.recentSales.length > 0 && (
        <div className="bg-[#151821] rounded-2xl border border-[#1E2233] overflow-hidden">
          <div className="p-4 border-b border-[#1E2233] flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-foreground">آخر المبيعات</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>العميل</th>
                  <th>المنتج</th>
                  <th>الإجمالي</th>
                  <th>التاريخ</th>
                  <th>الموظف</th>
                </tr>
              </thead>
              <tbody>
                {data.recentSales.map(s => (
                  <tr key={s.id}>
                    <td className="text-sm font-semibold text-amber-500">#{s.invoiceNumber}</td>
                    <td>
                      <button onClick={() => setSelectedCustomerId(s.customer.name)} className="text-amber-500 hover:underline text-sm">
                        {s.customer.name}
                      </button>
                    </td>
                    <td className="text-sm">{s.product.name}</td>
                    <td className="font-semibold">{formatCurrency(s.totalPrice)}</td>
                    <td className="text-sm text-muted-foreground">{formatDate(s.createdAt)}</td>
                    <td className="text-sm text-muted-foreground">{s.employee.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Low Stock & Stale */}
      <div className="grid md:grid-cols-2 gap-4">
        {data.lowStock.length > 0 && (
          <div className="bg-[#151821] rounded-2xl border border-[#1E2233] p-4">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-red-500" />
              <h2 className="text-lg font-bold text-foreground">مخزون منخفض</h2>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {data.lowStock.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-[#1A1E2A] rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.category}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-md text-xs font-semibold ${p.quantity === 0 ? 'badge-red' : 'badge-yellow'}`}>
                    {p.quantity === 0 ? 'نفذ' : `${p.quantity} قطعة`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {data.staleProducts.length > 0 && (
          <div className="bg-[#151821] rounded-2xl border border-[#1E2233] p-4">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-bold text-foreground">مخزون راكد</h2>
              <span className="text-xs text-muted-foreground">(60+ يوم بدون بيع)</span>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {data.staleProducts.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-[#1A1E2A] rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.category} • الكمية: {p.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, subtext, color }: {
  icon: React.ReactNode; label: string; value: string; subtext?: string; color: 'gold' | 'blue' | 'red' | 'green'
}) {
  const colorMap = {
    gold: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-500', iconBg: 'bg-amber-500/20' },
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-500', iconBg: 'bg-blue-500/20' },
    red: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-500', iconBg: 'bg-red-500/20' },
    green: { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-500', iconBg: 'bg-green-500/20' },
  }
  const c = colorMap[color]
  return (
    <div className={`${c.bg} border ${c.border} rounded-2xl p-4`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`${c.iconBg} p-2 rounded-xl`}>
          <div className={c.text}>{icon}</div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-lg font-bold ${c.text}`}>{value}</p>
      {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
    </div>
  )
}
