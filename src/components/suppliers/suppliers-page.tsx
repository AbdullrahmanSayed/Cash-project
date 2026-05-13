'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { Plus, Search, Edit, Trash2, Truck, Phone, FileText } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import ConfirmDialog from '@/components/shared/confirm-dialog'
import { toast } from 'sonner'

interface Supplier {
  id: string; name: string; phone: string; notes: string; productCount: number
}

export default function SuppliersPage() {
  const { currentUser } = useAppStore()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', phone: '', notes: '' })

  useEffect(() => { loadSuppliers() }, [])

  const loadSuppliers = async () => {
    try {
      const res = await fetch('/api/suppliers')
      setSuppliers(await res.json())
    } catch { toast.error('فشل تحميل الموردين') }
    finally { setLoading(false) }
  }

  const openAdd = () => {
    setEditSupplier(null)
    setFormData({ name: '', phone: '', notes: '' })
    setShowForm(true)
  }

  const openEdit = (s: Supplier) => {
    setEditSupplier(s)
    setFormData({ name: s.name, phone: s.phone, notes: s.notes })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!formData.name) { toast.error('اسم المورد مطلوب'); return }
    try {
      if (editSupplier) {
        await fetch(`/api/suppliers/${editSupplier.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData)
        })
        toast.success('تم تحديث المورد')
      } else {
        await fetch('/api/suppliers', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData)
        })
        toast.success('تم إضافة المورد')
      }
      setShowForm(false)
      loadSuppliers()
    } catch { toast.error('فشل حفظ المورد') }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/suppliers/${deleteId}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) { toast.success('تم حذف المورد'); loadSuppliers() }
      else { toast.error(data.error || 'فشل حذف المورد') }
    } catch { toast.error('فشل حذف المورد') }
    setDeleteId(null)
  }

  const filtered = suppliers.filter(s => s.name.includes(search) || s.phone.includes(search))

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
        <button onClick={openAdd} className="gold-gradient text-black font-bold py-2.5 px-5 rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2 text-sm shadow-lg shadow-amber-500/20">
          <Plus className="w-4 h-4" /> إضافة مورد
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(s => (
          <div key={s.id} className="bg-[#151821] rounded-2xl border border-[#1E2233] p-5 hover:border-[#2E3447] transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Truck className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">{s.name}</h3>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <Phone className="w-3.5 h-3.5" />
                    <span dir="ltr">{s.phone || '-'}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(s)} className="p-1.5 text-amber-500 hover:bg-amber-500/10 rounded-lg"><Edit className="w-4 h-4" /></button>
                {currentUser?.role === 'owner' && (
                  <button onClick={() => setDeleteId(s.id)} className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                )}
              </div>
            </div>
            {s.notes && (
              <div className="flex items-start gap-1 text-sm text-muted-foreground mb-2">
                <FileText className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>{s.notes}</span>
              </div>
            )}
            <div className="bg-[#1A1E2A] rounded-xl px-3 py-2 text-center">
              <span className="text-xs text-muted-foreground">المنتجات: </span>
              <span className="font-bold text-foreground">{s.productCount}</span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="col-span-full text-center py-8 text-muted-foreground">لا يوجد موردين</div>}
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-[#151821] border-[#1E2233]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editSupplier ? 'تعديل المورد' : 'إضافة مورد جديد'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label className="text-foreground text-sm">الاسم *</Label><Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-[#1A1E2A] border-[#1E2233] text-foreground mt-1" /></div>
            <div><Label className="text-foreground text-sm">الهاتف</Label><Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="bg-[#1A1E2A] border-[#1E2233] text-foreground mt-1" dir="ltr" /></div>
            <div><Label className="text-foreground text-sm">ملاحظات</Label><Textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="bg-[#1A1E2A] border-[#1E2233] text-foreground mt-1" rows={2} /></div>
          </div>
          <DialogFooter className="flex-row gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowForm(false)} className="bg-[#1A1E2A] border-[#1E2233] text-foreground">إلغاء</Button>
            <Button onClick={handleSave} className="gold-gradient text-black hover:opacity-90">{editSupplier ? 'تحديث' : 'إضافة'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="حذف المورد" description="هل أنت متأكد من حذف هذا المورد؟" onConfirm={handleDelete} />
    </div>
  )
}
