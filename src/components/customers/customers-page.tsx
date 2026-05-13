'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { formatCurrency, getComplianceBadge } from '@/lib/utils'
import { Plus, Search, Edit, Trash2, Eye, Phone, UserCheck } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import ConfirmDialog from '@/components/shared/confirm-dialog'
import { toast } from 'sonner'

interface Customer {
  id: string; name: string; phone: string; nationalId: string; address: string
  salesCount: number; totalPurchases: number; totalPaid: number; totalDue: number; latePayments: number
}

export default function CustomersPage() {
  const { currentUser, setSelectedCustomerId } = useAppStore()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', phone: '', nationalId: '', address: '' })
  const [page, setPage] = useState(1)
  const pageSize = 20

  useEffect(() => { loadCustomers() }, [])
  useEffect(() => { setPage(1) }, [search])

  const loadCustomers = async () => {
    try {
      const res = await fetch('/api/customers')
      const data = await res.json()
      setCustomers(data)
    } catch {
      toast.error('فشل تحميل العملاء')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!formData.name || !formData.phone) {
      toast.error('الاسم والهاتف مطلوبان')
      return
    }
    try {
      if (editCustomer) {
        const res = await fetch(`/api/customers/${editCustomer.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })
        const data = await res.json()
        if (!res.ok) { toast.error(data.error || 'فشل تحديث العميل'); return }
        toast.success('تم تحديث العميل')
      } else {
        const res = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })
        const data = await res.json()
        if (!res.ok) { toast.error(data.error || 'فشل إضافة العميل'); return }
        toast.success('تم إضافة العميل')
      }
      setShowForm(false)
      setEditCustomer(null)
      setFormData({ name: '', phone: '', nationalId: '', address: '' })
      loadCustomers()
    } catch {
      toast.error('فشل حفظ العميل')
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/customers/${deleteId}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        toast.success('تم حذف العميل')
        loadCustomers()
      } else {
        toast.error(data.error || 'فشل حذف العميل')
      }
    } catch {
      toast.error('فشل حذف العميل')
    }
    setDeleteId(null)
  }

  const openEdit = (c: Customer) => {
    setEditCustomer(c)
    setFormData({ name: c.name, phone: c.phone, nationalId: c.nationalId, address: c.address })
    setShowForm(true)
  }

  const openAdd = () => {
    setEditCustomer(null)
    setFormData({ name: '', phone: '', nationalId: '', address: '' })
    setShowForm(true)
  }

  const filtered = customers.filter(c =>
    c.name.includes(search) || c.phone.includes(search)
  )
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="بحث بالاسم أو الهاتف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#151821] border border-[#1E2233] rounded-xl pr-10 pl-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-amber-500 focus:outline-none"
          />
        </div>
        <button onClick={openAdd} className="gold-gradient text-black font-bold py-2.5 px-5 rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2 text-sm shadow-lg shadow-amber-500/20">
          <Plus className="w-4 h-4" />
          إضافة عميل
        </button>
      </div>

      {/* Table */}
      <div className="bg-[#151821] rounded-2xl border border-[#1E2233] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead>
              <tr>
                <th>الاسم</th>
                <th>الهاتف</th>
                <th>الالتزام</th>
                <th>المشتريات</th>
                <th>المستحق</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(c => {
                const badge = getComplianceBadge(c.latePayments)
                return (
                  <tr key={c.id}>
                    <td>
                      <button onClick={() => setSelectedCustomerId(c.id)} className="text-amber-500 hover:underline font-medium">
                        {c.name}
                      </button>
                    </td>
                    <td dir="ltr" className="text-sm">{c.phone}</td>
                    <td>
                      <span className={`${badge.color} px-2 py-1 rounded-md text-xs font-semibold whitespace-nowrap`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="text-sm">{c.salesCount}</td>
                    <td className="font-semibold text-sm">{formatCurrency(c.totalDue)}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setSelectedCustomerId(c.id)} className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded-lg" title="عرض">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEdit(c)} className="p-1.5 text-amber-500 hover:bg-amber-500/10 rounded-lg" title="تعديل">
                          <Edit className="w-4 h-4" />
                        </button>
                        {currentUser?.role === 'owner' && (
                          <button onClick={() => setDeleteId(c.id)} className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg" title="حذف">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">لا يوجد عملاء</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1">
        <div className="text-sm text-muted-foreground">
          إجمالي: {filtered.length} عميل
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="bg-[#1A1E2A] border-[#1E2233] text-foreground"
          >
            السابق
          </Button>
          <span className="text-sm text-muted-foreground px-2">
            صفحة {currentPage} من {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="bg-[#1A1E2A] border-[#1E2233] text-foreground"
          >
            التالي
          </Button>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-[#151821] border-[#1E2233]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editCustomer ? 'تعديل العميل' : 'إضافة عميل جديد'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-foreground text-sm">الاسم *</Label>
              <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="bg-[#1A1E2A] border-[#1E2233] text-foreground mt-1" placeholder="اسم العميل" />
            </div>
            <div>
              <Label className="text-foreground text-sm">الهاتف *</Label>
              <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="bg-[#1A1E2A] border-[#1E2233] text-foreground mt-1" placeholder="رقم الهاتف" dir="ltr" />
            </div>
            <div>
              <Label className="text-foreground text-sm">الرقم القومي</Label>
              <Input value={formData.nationalId} onChange={(e) => setFormData({...formData, nationalId: e.target.value})} className="bg-[#1A1E2A] border-[#1E2233] text-foreground mt-1" placeholder="الرقم القومي" dir="ltr" />
            </div>
            <div>
              <Label className="text-foreground text-sm">العنوان</Label>
              <Textarea value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="bg-[#1A1E2A] border-[#1E2233] text-foreground mt-1" placeholder="العنوان" rows={2} />
            </div>
          </div>
          <DialogFooter className="flex-row gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowForm(false)} className="bg-[#1A1E2A] border-[#1E2233] text-foreground">إلغاء</Button>
            <Button onClick={handleSave} className="gold-gradient text-black hover:opacity-90">{editCustomer ? 'تحديث' : 'إضافة'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="حذف العميل"
        description="سيتم نقل العميل إلى سلة المحذوفات ويمكن استرجاعه لاحقاً من صفحة النسخ الاحتياطي."
        onConfirm={handleDelete}
      />
    </div>
  )
}
