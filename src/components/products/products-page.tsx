'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { formatCurrency, getQuantityBadgeColor } from '@/lib/utils'
import { Plus, Search, Edit, Trash2, Package, AlertTriangle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import ConfirmDialog from '@/components/shared/confirm-dialog'
import { toast } from 'sonner'

interface Product {
  id: string; name: string; category: string; quantity: number; costPrice: number; sellPrice: number; supplierId: string | null; isStale: boolean
  supplier: { id: string; name: string } | null
}

export default function ProductsPage() {
  const { currentUser } = useAppStore()
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Array<{id: string; name: string}>>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', category: 'موبايل', quantity: 0, costPrice: 0, sellPrice: 0, supplierId: '' })

  const [categories, setCategories] = useState(['موبايل', 'أجهزة كهربائية', 'إكسسوار'])

  useEffect(() => { loadProducts() }, [])

  const loadProducts = async () => {
    try {
      const [pRes, sRes, settingsRes] = await Promise.all([
        fetch('/api/products'), fetch('/api/suppliers'), fetch('/api/settings')
      ])
      setProducts(await pRes.json())
      setSuppliers(await sRes.json())
      const settings = await settingsRes.json()
      if (settings.product_categories) {
        try { setCategories(JSON.parse(settings.product_categories)) } catch {}
      }
    } catch { toast.error('فشل تحميل المنتجات') }
    finally { setLoading(false) }
  }

  const openAdd = () => {
    setEditProduct(null)
    setFormData({ name: '', category: 'موبايل', quantity: 0, costPrice: 0, sellPrice: 0, supplierId: '' })
    setShowForm(true)
  }

  const openEdit = (p: Product) => {
    setEditProduct(p)
    setFormData({
      name: p.name, category: p.category, quantity: p.quantity,
      costPrice: p.costPrice, sellPrice: p.sellPrice, supplierId: p.supplierId || ''
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!formData.name || !formData.sellPrice) {
      toast.error('الاسم وسعر البيع مطلوبان')
      return
    }
    try {
      const body = { ...formData, supplierId: formData.supplierId || null }
      if (editProduct) {
        const res = await fetch(`/api/products/${editProduct.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        })
        const data = await res.json()
        if (!res.ok) { toast.error(data.error || 'فشل تحديث المنتج'); return }
        toast.success('تم تحديث المنتج')
      } else {
        const res = await fetch('/api/products', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        })
        const data = await res.json()
        if (!res.ok) { toast.error(data.error || 'فشل إضافة المنتج'); return }
        toast.success('تم إضافة المنتج')
      }
      setShowForm(false)
      loadProducts()
    } catch { toast.error('فشل حفظ المنتج') }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/products/${deleteId}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) { toast.success('تم حذف المنتج'); loadProducts() }
      else { toast.error(data.error || 'فشل حذف المنتج') }
    } catch { toast.error('فشل حذف المنتج') }
    setDeleteId(null)
  }

  const filtered = products.filter(p =>
    (p.name.includes(search) || p.category.includes(search)) &&
    (!categoryFilter || p.category === categoryFilter)
  )

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-1 w-full sm:w-auto gap-2">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-[#151821] border border-[#1E2233] rounded-xl pr-10 pl-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-amber-500 focus:outline-none" />
          </div>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
            className="bg-[#151821] border border-[#1E2233] rounded-xl px-3 py-2.5 text-sm text-foreground focus:border-amber-500 focus:outline-none">
            <option value="">كل الفئات</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button onClick={openAdd} className="gold-gradient text-black font-bold py-2.5 px-5 rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2 text-sm shadow-lg shadow-amber-500/20">
          <Plus className="w-4 h-4" /> إضافة منتج
        </button>
      </div>

      <div className="bg-[#151821] rounded-2xl border border-[#1E2233] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead>
              <tr>
                <th>المنتج</th>
                <th>الفئة</th>
                <th>الكمية</th>
                {currentUser?.role === 'owner' && <th>سعر التكلفة</th>}
                <th>سعر البيع</th>
                <th>المورد</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td className="font-medium">
                    <div className="flex items-center gap-2">
                      {p.isStale && <span title="مخزون راكد"><AlertTriangle className="w-4 h-4 text-amber-500" /></span>}
                      {p.name}
                    </div>
                  </td>
                  <td><span className="badge-blue px-2 py-1 rounded-md text-xs font-semibold">{p.category}</span></td>
                  <td><span className={`${getQuantityBadgeColor(p.quantity)} px-2 py-1 rounded-md text-xs font-semibold`}>{p.quantity}</span></td>
                  {currentUser?.role === 'owner' && <td className="text-sm">{formatCurrency(p.costPrice)}</td>}
                  <td className="font-semibold">{formatCurrency(p.sellPrice)}</td>
                  <td className="text-sm text-muted-foreground">{p.supplier?.name || '-'}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(p)} className="p-1.5 text-amber-500 hover:bg-amber-500/10 rounded-lg"><Edit className="w-4 h-4" /></button>
                      {currentUser?.role === 'owner' && (
                        <button onClick={() => setDeleteId(p.id)} className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">لا توجد منتجات</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-[#151821] border-[#1E2233]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editProduct ? 'تعديل المنتج' : 'إضافة منتج جديد'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label className="text-foreground text-sm">الاسم *</Label><Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-[#1A1E2A] border-[#1E2233] text-foreground mt-1" /></div>
            <div>
              <Label className="text-foreground text-sm">الفئة</Label>
              <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}
                className="w-full bg-[#1A1E2A] border border-[#1E2233] rounded-xl px-4 py-2.5 text-foreground mt-1 focus:border-amber-500 focus:outline-none">
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><Label className="text-foreground text-sm">الكمية</Label><Input type="number" value={formData.quantity} onChange={e => setFormData({...formData, quantity: Number(e.target.value)})} className="bg-[#1A1E2A] border-[#1E2233] text-foreground mt-1" /></div>
            {currentUser?.role === 'owner' && (
              <div><Label className="text-foreground text-sm">سعر التكلفة</Label><Input type="number" value={formData.costPrice} onChange={e => setFormData({...formData, costPrice: Number(e.target.value)})} className="bg-[#1A1E2A] border-[#1E2233] text-foreground mt-1" /></div>
            )}
            <div><Label className="text-foreground text-sm">سعر البيع *</Label><Input type="number" value={formData.sellPrice} onChange={e => setFormData({...formData, sellPrice: Number(e.target.value)})} className="bg-[#1A1E2A] border-[#1E2233] text-foreground mt-1" /></div>
            <div>
              <Label className="text-foreground text-sm">المورد</Label>
              <select value={formData.supplierId} onChange={e => setFormData({...formData, supplierId: e.target.value})}
                className="w-full bg-[#1A1E2A] border border-[#1E2233] rounded-xl px-4 py-2.5 text-foreground mt-1 focus:border-amber-500 focus:outline-none">
                <option value="">بدون مورد</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter className="flex-row gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowForm(false)} className="bg-[#1A1E2A] border-[#1E2233] text-foreground">إلغاء</Button>
            <Button onClick={handleSave} className="gold-gradient text-black hover:opacity-90">{editProduct ? 'تحديث' : 'إضافة'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="حذف المنتج" description="هل أنت متأكد من حذف هذا المنتج؟" onConfirm={handleDelete} />
    </div>
  )
}
