'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, Search, ShoppingCart, Printer, X } from 'lucide-react'
import { printSaleInvoice } from '@/lib/print'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface Sale {
  id: string; saleType: string; totalPrice: number; downPayment: number; installmentCount: number; monthlyAmount: number; createdAt: string
  invoiceNumber?: number
  customer: { id: string; name: string; phone: string; nationalId?: string }
  product: { id: string; name: string; sellPrice: number; category?: string }
  employee: { name: string }
  installments: Array<{ id: string; dueDate: string; amount: number; status: string }>
}

const PAGE_SIZE = 20

export default function SalesPage() {
  const { currentUser } = useAppStore()
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showroomName, setShowroomName] = useState('المعرض')
  const [invoiceFooter, setInvoiceFooter] = useState('شكراً لتعاملكم معنا')
  const [invoiceNote, setInvoiceNote] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(1)
  const [customers, setCustomers] = useState<Array<{id: string; name: string; phone: string}>>([])
  const [products, setProducts] = useState<Array<{id: string; name: string; sellPrice: number; quantity: number; category: string}>>([])
  const [formData, setFormData] = useState({
    customerId: '', productId: '', totalPrice: 0
  })

  useEffect(() => {
    loadSales()
    loadShowroomName()
  }, [])

  useEffect(() => { setPage(1) }, [search])

  const loadShowroomName = async () => {
    try {
      const res = await fetch('/api/settings')
      if (!res.ok) return
      const data = await res.json()
      if (data?.showroom_name) setShowroomName(data.showroom_name)
      if (data?.invoice_footer) setInvoiceFooter(data.invoice_footer)
      if (data?.invoice_note !== undefined) setInvoiceNote(data.invoice_note)
    } catch {}
  }

  const handlePrint = (sale: Sale) => {
    printSaleInvoice(sale, showroomName, invoiceFooter, invoiceNote)
  }

  const handleCancel = async (sale: Sale) => {
    if (!confirm(`هل أنت متأكد من إلغاء بيع "${sale.product.name}" للعميل ${sale.customer.name}؟`)) return
    try {
      const res = await fetch(`/api/sales/${sale.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('تم إلغاء البيع بنجاح')
        loadSales()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data?.error || 'فشل إلغاء البيع')
      }
    } catch {
      toast.error('فشل إلغاء البيع')
    }
  }

  const loadSales = async () => {
    try {
      const res = await fetch('/api/sales')
      setSales(await res.json())
    } catch { toast.error('فشل تحميل المبيعات') }
    finally { setLoading(false) }
  }

  const loadFormDeps = async () => {
    const [cRes, pRes] = await Promise.all([fetch('/api/customers'), fetch('/api/products')])
    if (!cRes.ok || !pRes.ok) { toast.error('فشل تحميل البيانات'); return }
    const cData = await cRes.json()
    const pData = await pRes.json()
    const available = pData.filter((p: {quantity: number}) => p.quantity > 0)
    setCustomers(cData)
    setProducts(available)
    setFormData(prev => ({
      ...prev,
      customerId: cData.length > 0 ? cData[0].id : '',
      productId: available.length > 0 ? available[0].id : '',
      totalPrice: available.length > 0 ? available[0].sellPrice : 0,
    }))
  }

  const openForm = () => {
    setFormData({ customerId: '', productId: '', totalPrice: 0 })
    setShowForm(true)
    loadFormDeps()
  }

  const handleProductChange = (productId: string) => {
    const product = products.find(p => p.id === productId)
    if (product) {
      setFormData(prev => ({...prev, productId, totalPrice: product.sellPrice}))
    }
  }

  const handleSave = async () => {
    if (!formData.customerId || !formData.productId) {
      toast.error('اختر العميل والمنتج')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          saleType: 'cash',
          downPayment: formData.totalPrice,
          installmentCount: 0,
          monthlyAmount: 0,
          startDate: new Date().toISOString().split('T')[0],
          employeeId: currentUser?.id,
        })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('تم إضافة البيع بنجاح')
        setShowForm(false)
        loadSales()
      } else {
        toast.error(data.error || 'فشل إضافة البيع')
      }
    } catch {
      toast.error('فشل إضافة البيع')
    } finally {
      setSaving(false)
    }
  }

  const filtered = sales.filter(s =>
    s.customer.name.includes(search) || s.product.name.includes(search)
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pagedSales = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#151821] border border-[#1E2233] rounded-xl pr-10 pl-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-amber-500 focus:outline-none" />
        </div>
        <button onClick={openForm} className="gold-gradient text-black font-bold py-2.5 px-5 rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2 text-sm shadow-lg shadow-amber-500/20">
          <Plus className="w-4 h-4" /> بيع جديد
        </button>
      </div>

      <div className="bg-[#151821] rounded-2xl border border-[#1E2233] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>التاريخ</th>
                <th>العميل</th>
                <th>المنتج</th>
                <th>الإجمالي</th>
                <th>الموظف</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {pagedSales.map(s => (
                <tr key={s.id}>
                  <td className="text-sm font-semibold text-amber-500">{s.invoiceNumber != null ? `#${s.invoiceNumber}` : '-'}</td>
                  <td className="text-sm text-muted-foreground">{formatDate(s.createdAt)}</td>
                  <td className="font-medium">{s.customer.name}</td>
                  <td>{s.product.name}</td>
                  <td className="font-semibold">{formatCurrency(s.totalPrice)}</td>
                  <td className="text-sm text-muted-foreground">{s.employee.name}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handlePrint(s)} className="p-1.5 text-amber-500 hover:bg-amber-500/10 rounded-lg" title="طباعة الفاتورة">
                        <Printer className="w-4 h-4" />
                      </button>
                      {currentUser?.role === 'owner' && (
                        <button onClick={() => handleCancel(s)} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg" title="إلغاء البيع">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {pagedSales.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">لا توجد مبيعات</td></tr>}
            </tbody>
          </table>
        </div>

        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-[#1E2233]">
            <span className="text-xs text-muted-foreground">
              صفحة {safePage} من {totalPages} ({filtered.length} عملية بيع)
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                className="bg-[#1A1E2A] border border-[#1E2233] text-foreground px-3 py-1.5 rounded-lg text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:border-amber-500/30">
                السابق
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}
                className="bg-[#1A1E2A] border border-[#1E2233] text-foreground px-3 py-1.5 rounded-lg text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:border-amber-500/30">
                التالي
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New Sale Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-[#151821] border-[#1E2233] max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-amber-500" />
              بيع كاش جديد
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-foreground text-sm">العميل *</Label>
              <select value={formData.customerId} onChange={e => setFormData({...formData, customerId: e.target.value})}
                className="w-full bg-[#1A1E2A] border border-[#1E2233] rounded-xl px-4 py-2.5 text-foreground mt-1 focus:border-amber-500 focus:outline-none">
                <option value="">اختر العميل</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-foreground text-sm">المنتج *</Label>
              <select value={formData.productId} onChange={e => handleProductChange(e.target.value)}
                className="w-full bg-[#1A1E2A] border border-[#1E2233] rounded-xl px-4 py-2.5 text-foreground mt-1 focus:border-amber-500 focus:outline-none">
                <option value="">اختر المنتج</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} - {formatCurrency(p.sellPrice)} (متاح: {p.quantity})</option>)}
              </select>
            </div>
            <div>
              <Label className="text-foreground text-sm">السعر الكلي</Label>
              <Input type="number" value={formData.totalPrice} onChange={e => setFormData({...formData, totalPrice: Number(e.target.value)})}
                className="bg-[#1A1E2A] border-[#1E2233] text-foreground mt-1" />
            </div>
          </div>
          <DialogFooter className="flex-row gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowForm(false)} className="bg-[#1A1E2A] border-[#1E2233] text-foreground">إلغاء</Button>
            <Button onClick={handleSave} disabled={saving} className="gold-gradient text-black hover:opacity-90">
              {saving ? 'جاري الحفظ...' : 'تأكيد البيع'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
