'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAppStore } from '@/lib/store'
import {
  Plus, Wallet, TrendingUp, Building2, Zap, Users, MoreHorizontal,
  Calendar, FileText, Filter
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

type Category = string

interface Expense {
  id: string
  category: Category
  amount: number
  date: string
  note?: string
  createdAt: string
}

type CategoryMeta = { icon: React.ElementType; color: string; bg: string }

const KNOWN_CATEGORY_META: Record<string, CategoryMeta> = {
  'إيجار': { icon: Building2, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  'كهرباء': { icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  'مرتبات': { icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  'أخرى': { icon: MoreHorizontal, color: 'text-purple-500', bg: 'bg-purple-500/10' },
}

const FALLBACK_META: CategoryMeta = { icon: MoreHorizontal, color: 'text-purple-500', bg: 'bg-purple-500/10' }

const getCategoryMeta = (cat: Category): CategoryMeta =>
  KNOWN_CATEGORY_META[cat] || FALLBACK_META

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 0 }).format(n) + ' ج.م'

const formatDate = (d: string) => {
  try {
    return new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch { return d }
}

export default function ExpensesPage() {
  const { currentUser } = useAppStore()
  const isOwner = currentUser?.role === 'owner'

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [expenseCategories, setExpenseCategories] = useState<string[]>(['إيجار', 'كهرباء', 'مرتبات', 'أخرى'])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterCat, setFilterCat] = useState<Category | 'all'>('all')
  const [formData, setFormData] = useState<{ category: Category; amount: string; date: string; note: string }>({
    category: 'إيجار',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    note: '',
  })

  useEffect(() => { loadExpenses() }, [])
  useEffect(() => { loadCategories() }, [])

  const loadCategories = async () => {
    try {
      const res = await fetch('/api/settings')
      if (!res.ok) return
      const data = await res.json()
      if (data.expense_categories) {
        try {
          const parsed = JSON.parse(data.expense_categories)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setExpenseCategories(parsed)
            setFormData(f => ({ ...f, category: parsed[0] }))
          }
        } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
  }

  const loadExpenses = async () => {
    try {
      const res = await fetch('/api/expenses')
      if (!res.ok) throw new Error()
      setExpenses(await res.json())
    } catch {
      toast.error('فشل تحميل المصروفات')
    } finally {
      setLoading(false)
    }
  }

  const openAdd = () => {
    setFormData({
      category: expenseCategories[0] || 'إيجار',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      note: '',
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    const amt = parseFloat(formData.amount)
    if (!formData.category) { toast.error('الفئة مطلوبة'); return }
    if (!amt || amt <= 0) { toast.error('المبلغ غير صحيح'); return }
    if (!formData.date) { toast.error('التاريخ مطلوب'); return }

    setSaving(true)
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: formData.category,
          amount: amt,
          date: formData.date,
          note: formData.note || undefined,
        }),
      })
      if (res.ok) {
        toast.success('تم إضافة المصروف')
        setShowForm(false)
        loadExpenses()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'فشل إضافة المصروف')
      }
    } catch {
      toast.error('فشل إضافة المصروف')
    } finally {
      setSaving(false)
    }
  }

  // Stats
  const { monthTotal, biggestCategory, monthCount } = useMemo(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth()
    const inMonth = expenses.filter(e => {
      const d = new Date(e.date)
      return d.getFullYear() === y && d.getMonth() === m
    })
    const total = inMonth.reduce((s, e) => s + Number(e.amount || 0), 0)
    const byCat: Record<string, number> = {}
    inMonth.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + Number(e.amount || 0) })
    let biggest: { cat: Category | null; amount: number } = { cat: null, amount: 0 }
    for (const [c, a] of Object.entries(byCat)) {
      if (a > biggest.amount) biggest = { cat: c as Category, amount: a }
    }
    return { monthTotal: total, biggestCategory: biggest, monthCount: inMonth.length }
  }, [expenses])

  const filtered = useMemo(() => {
    return filterCat === 'all' ? expenses : expenses.filter(e => e.category === filterCat)
  }, [expenses, filterCat])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const BiggestIcon = biggestCategory.cat ? getCategoryMeta(biggestCategory.cat).icon : TrendingUp

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">المصروفات</h1>
          <p className="text-sm text-muted-foreground mt-1">إدارة مصروفات المعرض الشهرية</p>
        </div>
        {isOwner && (
          <button
            onClick={openAdd}
            className="gold-gradient text-black font-bold py-2.5 px-5 rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2 text-sm shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" /> إضافة مصروف
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-[#151821] rounded-2xl border border-[#1E2233] p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">إجمالي المصروفات (الشهر الحالي)</span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-amber-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(monthTotal)}</p>
          <p className="text-xs text-muted-foreground mt-1">{monthCount} عملية</p>
        </div>

        <div className="bg-[#151821] rounded-2xl border border-[#1E2233] p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">أكبر فئة (الشهر الحالي)</span>
            <div className={`w-10 h-10 rounded-xl ${biggestCategory.cat ? getCategoryMeta(biggestCategory.cat).bg : 'bg-muted/10'} flex items-center justify-center`}>
              <BiggestIcon className={`w-5 h-5 ${biggestCategory.cat ? getCategoryMeta(biggestCategory.cat).color : 'text-muted-foreground'}`} />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">{biggestCategory.cat || '—'}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {biggestCategory.amount > 0 ? formatCurrency(biggestCategory.amount) : 'لا يوجد بيانات'}
          </p>
        </div>

        <div className="bg-[#151821] rounded-2xl border border-[#1E2233] p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">إجمالي السجلات</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">{expenses.length}</p>
          <p className="text-xs text-muted-foreground mt-1">جميع الفترات</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-[#151821] rounded-2xl border border-[#1E2233] p-3">
        <div className="flex items-center gap-2 mb-2 px-1">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">تصفية حسب الفئة</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterCat('all')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filterCat === 'all'
                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                : 'bg-[#1A1E2A] text-muted-foreground hover:text-foreground border border-transparent'
            }`}
          >
            الكل ({expenses.length})
          </button>
          {expenseCategories.map(cat => {
            const Icon = getCategoryMeta(cat).icon
            const count = expenses.filter(e => e.category === cat).length
            const active = filterCat === cat
            return (
              <button
                key={cat}
                onClick={() => setFilterCat(cat)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                  active
                    ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                    : 'bg-[#1A1E2A] text-muted-foreground hover:text-foreground border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4" />
                {cat} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#151821] rounded-2xl border border-[#1E2233] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#1A1E2A] border-b border-[#1E2233]">
              <tr className="text-right">
                <th className="px-4 py-3 font-semibold text-muted-foreground">الفئة</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">المبلغ</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">التاريخ</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    لا توجد مصروفات
                  </td>
                </tr>
              ) : (
                filtered.map(e => {
                  const meta = getCategoryMeta(e.category)
                  const Icon = meta.icon
                  return (
                    <tr key={e.id} className="border-b border-[#1E2233] last:border-0 hover:bg-[#1A1E2A]/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center`}>
                            <Icon className={`w-4 h-4 ${meta.color}`} />
                          </div>
                          <span className="text-foreground font-medium">{e.category}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold text-amber-500">{formatCurrency(Number(e.amount))}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(e.date)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                        {e.note ? (
                          <div className="flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{e.note}</span>
                          </div>
                        ) : '-'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot className="bg-[#1A1E2A] border-t border-[#1E2233]">
                <tr>
                  <td className="px-4 py-3 font-bold text-foreground">الإجمالي</td>
                  <td className="px-4 py-3 font-bold text-amber-500">
                    {formatCurrency(filtered.reduce((s, e) => s + Number(e.amount || 0), 0))}
                  </td>
                  <td colSpan={2} className="px-4 py-3 text-muted-foreground text-xs">
                    {filtered.length} سجل
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Add Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-[#151821] border-[#1E2233]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-foreground">إضافة مصروف جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-foreground text-sm">الفئة *</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {expenseCategories.map(cat => {
                  const Icon = getCategoryMeta(cat).icon
                  const active = formData.category === cat
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: cat })}
                      className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 justify-center border ${
                        active
                          ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                          : 'bg-[#1A1E2A] text-muted-foreground hover:text-foreground border-[#1E2233]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {cat}
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <Label className="text-foreground text-sm">المبلغ *</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={formData.amount}
                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                className="bg-[#1A1E2A] border-[#1E2233] text-foreground mt-1"
                placeholder="0"
              />
            </div>
            <div>
              <Label className="text-foreground text-sm">التاريخ *</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                className="bg-[#1A1E2A] border-[#1E2233] text-foreground mt-1"
              />
            </div>
            <div>
              <Label className="text-foreground text-sm">ملاحظات</Label>
              <Textarea
                value={formData.note}
                onChange={e => setFormData({ ...formData, note: e.target.value })}
                className="bg-[#1A1E2A] border-[#1E2233] text-foreground mt-1"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter className="flex-row gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowForm(false)}
              className="bg-[#1A1E2A] border-[#1E2233] text-foreground"
              disabled={saving}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSave}
              className="gold-gradient text-black hover:opacity-90"
              disabled={saving}
            >
              {saving ? 'جاري الحفظ...' : 'إضافة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
