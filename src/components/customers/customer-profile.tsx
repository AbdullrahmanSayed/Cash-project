'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { formatCurrency, formatDate, getWhatsAppLink, getComplianceBadge, getInstallmentStatus } from '@/lib/utils'
import { ArrowRight, Edit, MessageCircle, Plus, Phone, MapPin, CreditCard, ShoppingBag, Printer } from 'lucide-react'
import { printCustomerStatement } from '@/lib/print'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

interface CustomerProfile {
  id: string; name: string; phone: string; nationalId: string; address: string
  salesCount: number; totalPurchases: number; totalPaid: number; totalDue: number; latePayments: number
  sales: Array<{
    id: string; saleType: string; totalPrice: number; downPayment: number; installmentCount: number; monthlyAmount: number; startDate: string; createdAt: string
    product: { name: string }; employee: { name: string }
    installments: Array<{ id: string; dueDate: string; amount: number; status: string; paidAt: string | null }>
  }>
  contactLogs: Array<{ id: string; note: string; createdAt: string; employee: { name: string } }>
}

export default function CustomerProfile() {
  const { selectedCustomerId, setPage, currentUser } = useAppStore()
  const [customer, setCustomer] = useState<CustomerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [showContactForm, setShowContactForm] = useState(false)
  const [contactNote, setContactNote] = useState('')
  const [editData, setEditData] = useState({ name: '', phone: '', nationalId: '', address: '' })
  const [showroomName, setShowroomName] = useState('المعرض')
  const [invoiceFooter, setInvoiceFooter] = useState('شكراً لتعاملكم معنا')
  const [invoiceNote, setInvoiceNote] = useState('')

  useEffect(() => {
    if (selectedCustomerId) loadCustomer()
  }, [selectedCustomerId])

  useEffect(() => {
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
    loadShowroomName()
  }, [])

  const handlePrintStatement = () => {
    if (!customer) return
    printCustomerStatement(customer, showroomName, invoiceFooter, invoiceNote)
  }

  const loadCustomer = async () => {
    if (!selectedCustomerId) return
    try {
      const res = await fetch(`/api/customers/${selectedCustomerId}`)
      const data = await res.json()
      setCustomer(data)
      setEditData({ name: data.name, phone: data.phone, nationalId: data.nationalId, address: data.address })
    } catch {
      toast.error('فشل تحميل بيانات العميل')
    } finally {
      setLoading(false)
    }
  }

  const handleEditSave = async () => {
    if (!customer) return
    try {
      await fetch(`/api/customers/${customer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData)
      })
      toast.success('تم تحديث بيانات العميل')
      setShowEdit(false)
      loadCustomer()
    } catch {
      toast.error('فشل تحديث البيانات')
    }
  }

  const handleAddContact = async () => {
    if (!customer || !contactNote.trim()) return
    try {
      await fetch('/api/contact-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: customer.id, employeeId: currentUser?.id, note: contactNote })
      })
      toast.success('تم إضافة ملاحظة')
      setContactNote('')
      setShowContactForm(false)
      loadCustomer()
    } catch {
      toast.error('فشل إضافة الملاحظة')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!customer) return <div className="text-center text-muted-foreground py-8">العميل غير موجود</div>

  const badge = getComplianceBadge(customer.latePayments)

  return (
    <div className="space-y-4">
      {/* Back */}
      <button onClick={() => setPage('customers')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm">
        <ArrowRight className="w-4 h-4" />
        العودة للعملاء
      </button>

      {/* Customer Info Card */}
      <div className="bg-[#151821] rounded-2xl border border-[#1E2233] p-6">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <span className="text-amber-500 text-2xl font-bold">{customer.name.charAt(0)}</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-foreground">{customer.name}</h2>
                <span className={`${badge.color} px-2 py-0.5 rounded-md text-xs font-semibold whitespace-nowrap`}>{badge.label}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{customer.phone}</span>
                {customer.address && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{customer.address}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href={getWhatsAppLink(customer.phone)} target="_blank" rel="noopener noreferrer" className="p-2 text-green-500 hover:bg-green-500/10 rounded-xl" title="واتساب">
              <MessageCircle className="w-5 h-5" />
            </a>
            <button onClick={handlePrintStatement} className="px-3 py-2 text-amber-500 hover:bg-amber-500/10 rounded-xl flex items-center gap-2 text-sm font-semibold border border-amber-500/30" title="طباعة كشف الحساب">
              <Printer className="w-4 h-4" />
              طباعة كشف الحساب
            </button>
            <button onClick={() => setShowEdit(true)} className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-xl" title="تعديل">
              <Edit className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <div className="bg-[#1A1E2A] rounded-xl p-3 text-center">
            <ShoppingBag className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{customer.salesCount}</p>
            <p className="text-xs text-muted-foreground">المشتريات</p>
          </div>
          <div className="bg-[#1A1E2A] rounded-xl p-3 text-center">
            <CreditCard className="w-5 h-5 text-blue-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{formatCurrency(customer.totalPurchases)}</p>
            <p className="text-xs text-muted-foreground">إجمالي المشتريات</p>
          </div>
          <div className="bg-[#1A1E2A] rounded-xl p-3 text-center">
            <CreditCard className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{formatCurrency(customer.totalPaid)}</p>
            <p className="text-xs text-muted-foreground">المدفوع</p>
          </div>
          <div className="bg-[#1A1E2A] rounded-xl p-3 text-center">
            <CreditCard className="w-5 h-5 text-red-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{formatCurrency(customer.totalDue)}</p>
            <p className="text-xs text-muted-foreground">المستحق</p>
          </div>
        </div>
      </div>

      {/* Sales & Installments */}
      <div className="bg-[#151821] rounded-2xl border border-[#1E2233] overflow-hidden">
        <div className="p-4 border-b border-[#1E2233]">
          <h3 className="text-lg font-bold text-foreground">المبيعات والأقساط</h3>
        </div>
        <div className="space-y-4 p-4 max-h-96 overflow-y-auto">
          {customer.sales.map(sale => (
            <div key={sale.id} className="bg-[#1A1E2A] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-foreground">{sale.product.name}</p>
                  <p className="text-xs text-muted-foreground">البائع: {sale.employee.name} • {formatDate(sale.createdAt)}</p>
                </div>
                <div className="text-left">
                  <span className={`px-2 py-1 rounded-md text-xs font-semibold ${sale.saleType === 'cash' ? 'badge-green' : 'badge-blue'}`}>
                    {sale.saleType === 'cash' ? 'نقدي' : 'تقسيط'}
                  </span>
                  <p className="text-sm font-bold text-foreground mt-1">{formatCurrency(sale.totalPrice)}</p>
                </div>
              </div>
              {sale.saleType === 'installment' && sale.installments.length > 0 && (
                <div className="border-t border-[#2E3447] pt-2 mt-2">
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                    {sale.installments.map(inst => {
                      const status = getInstallmentStatus(inst.dueDate, inst.status)
                      return (
                        <div key={inst.id} className="bg-[#151821] rounded-lg p-2 text-center">
                          <p className="text-xs text-muted-foreground">{formatDate(inst.dueDate)}</p>
                          <p className="text-xs font-semibold text-foreground">{formatCurrency(inst.amount)}</p>
                          <span className={`${status.color} px-1.5 py-0.5 rounded text-[10px] font-semibold`}>
                            {status.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
          {customer.sales.length === 0 && <p className="text-center text-muted-foreground py-4">لا توجد مبيعات</p>}
        </div>
      </div>

      {/* Contact Logs */}
      <div className="bg-[#151821] rounded-2xl border border-[#1E2233] overflow-hidden">
        <div className="p-4 border-b border-[#1E2233] flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">سجل التواصل</h3>
          <button onClick={() => setShowContactForm(true)} className="text-amber-500 hover:text-amber-400 text-sm flex items-center gap-1">
            <Plus className="w-4 h-4" />
            إضافة ملاحظة
          </button>
        </div>
        <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
          {customer.contactLogs.map(log => (
            <div key={log.id} className="bg-[#1A1E2A] rounded-xl p-3">
              <p className="text-sm text-foreground">{log.note}</p>
              <p className="text-xs text-muted-foreground mt-1">{log.employee.name} • {formatDate(log.createdAt)}</p>
            </div>
          ))}
          {customer.contactLogs.length === 0 && <p className="text-center text-muted-foreground py-4">لا توجد ملاحظات</p>}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="bg-[#151821] border-[#1E2233]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-foreground">تعديل بيانات العميل</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label className="text-foreground text-sm">الاسم</Label><Input value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} className="bg-[#1A1E2A] border-[#1E2233] text-foreground mt-1" /></div>
            <div><Label className="text-foreground text-sm">الهاتف</Label><Input value={editData.phone} onChange={e => setEditData({...editData, phone: e.target.value})} className="bg-[#1A1E2A] border-[#1E2233] text-foreground mt-1" dir="ltr" /></div>
            <div><Label className="text-foreground text-sm">الرقم القومي</Label><Input value={editData.nationalId} onChange={e => setEditData({...editData, nationalId: e.target.value})} className="bg-[#1A1E2A] border-[#1E2233] text-foreground mt-1" dir="ltr" /></div>
            <div><Label className="text-foreground text-sm">العنوان</Label><Textarea value={editData.address} onChange={e => setEditData({...editData, address: e.target.value})} className="bg-[#1A1E2A] border-[#1E2233] text-foreground mt-1" rows={2} /></div>
          </div>
          <DialogFooter className="flex-row gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowEdit(false)} className="bg-[#1A1E2A] border-[#1E2233] text-foreground">إلغاء</Button>
            <Button onClick={handleEditSave} className="gold-gradient text-black hover:opacity-90">تحديث</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contact Log Dialog */}
      <Dialog open={showContactForm} onOpenChange={setShowContactForm}>
        <DialogContent className="bg-[#151821] border-[#1E2233]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-foreground">إضافة ملاحظة تواصل</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea value={contactNote} onChange={e => setContactNote(e.target.value)} className="bg-[#1A1E2A] border-[#1E2233] text-foreground" placeholder="أدخل ملاحظة التواصل..." rows={3} />
          </div>
          <DialogFooter className="flex-row gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowContactForm(false)} className="bg-[#1A1E2A] border-[#1E2233] text-foreground">إلغاء</Button>
            <Button onClick={handleAddContact} className="gold-gradient text-black hover:opacity-90">إضافة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
