'use client'

import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { Database, Download, Upload, Printer, Trash2, AlertTriangle, RotateCcw, User, Package } from 'lucide-react'
import ConfirmDialog from '@/components/shared/confirm-dialog'
import { toast } from 'sonner'

interface TrashItem { id: string; name: string; deletedAt: string; phone?: string; category?: string; quantity?: number }
interface TrashData { customers: TrashItem[]; products: TrashItem[] }

export default function BackupPage() {
  const { currentUser } = useAppStore()
  const [showDeleteAll, setShowDeleteAll] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [trash, setTrash] = useState<TrashData>({ customers: [], products: [] })
  const [trashLoading, setTrashLoading] = useState(true)

  useEffect(() => { loadTrash() }, [])

  const loadTrash = async () => {
    try {
      const res = await fetch('/api/trash')
      if (res.ok) setTrash(await res.json())
    } catch {} finally { setTrashLoading(false) }
  }

  const handleRestore = async (type: 'customer' | 'product', id: string, name: string) => {
    try {
      const res = await fetch('/api/trash', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id }),
      })
      if (res.ok) {
        toast.success(`تم استرجاع "${name}" بنجاح`)
        loadTrash()
      } else {
        toast.error('فشل الاسترجاع')
      }
    } catch { toast.error('فشل الاسترجاع') }
  }

  const handlePermanentDelete = async (type: 'customer' | 'product', id: string, name: string) => {
    if (!confirm(`حذف "${name}" نهائياً؟ لا يمكن التراجع.`)) return
    try {
      const res = await fetch(`/api/trash?type=${type}&id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) { toast.success('تم الحذف النهائي'); loadTrash() }
      else toast.error(data.error || 'فشل الحذف')
    } catch { toast.error('فشل الحذف') }
  }

  if (currentUser?.role !== 'owner') {
    return <div className="text-center text-muted-foreground py-8">هذه الصفحة متاحة فقط لصاحب المعرض</div>
  }

  const handleExport = async () => {
    try {
      const res = await fetch('/api/backup/export')
      const data = await res.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `showroom-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('تم تصدير النسخة الاحتياطية')
    } catch {
      toast.error('فشل تصدير النسخة الاحتياطية')
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      const res = await fetch('/api/backup/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (res.ok) {
        toast.success('تم استيراد البيانات بنجاح')
      } else {
        toast.error('فشل استيراد البيانات')
      }
    } catch {
      toast.error('ملف غير صالح')
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handlePrintOverdue = async () => {
    try {
      const res = await fetch('/api/installments?overdue=true')
      const installments = await res.json()
      const printWindow = window.open('', '_blank')
      if (!printWindow) return
      printWindow.document.write(`
        <html dir="rtl">
        <head><title>قائمة الأقساط المتأخرة</title>
        <style>body{font-family:Arial,sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:right}th{background:#f5f5f5}</style>
        </head><body>
        <h2>قائمة الأقساط المتأخرة - ${new Date().toLocaleDateString('ar-EG')}</h2>
        <table><thead><tr><th>العميل</th><th>المنتج</th><th>المبلغ</th><th>تاريخ الاستحقاق</th><th>أيام التأخير</th><th>الهاتف</th></tr></thead>
        <tbody>${installments.map((i: { sale: { customer: { name: string; phone: string }; product: { name: string } }; amount: number; dueDate: string; daysOverdue: number }) => 
          `<tr><td>${i.sale.customer.name}</td><td>${i.sale.product.name}</td><td>${i.amount} ج.م</td><td>${i.dueDate}</td><td>${i.daysOverdue}</td><td>${i.sale.customer.phone}</td></tr>`
        ).join('')}</tbody></table>
        </body></html>
      `)
      printWindow.document.close()
      printWindow.print()
    } catch {
      toast.error('فشل طباعة القائمة')
    }
  }

  const handleDeleteAll = async () => {
    try {
      // Delete all data via the import with empty arrays
      await fetch('/api/backup/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          users: [], suppliers: [], products: [], customers: [],
          sales: [], installments: [], contactLogs: [], expenses: []
        })
      })
      toast.success('تم حذف جميع البيانات')
    } catch {
      toast.error('فشل حذف البيانات')
    }
    setShowDeleteAll(false)
  }

  return (
    <div className="space-y-6">
      <div className="bg-[#151821] rounded-2xl border border-[#1E2233] p-6">
        <div className="flex items-center gap-2 mb-6">
          <Database className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-bold text-foreground">إدارة النسخ الاحتياطي</h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* Export */}
          <button onClick={handleExport}
            className="flex items-center gap-3 p-4 bg-[#1A1E2A] rounded-xl border border-[#1E2233] hover:border-amber-500/30 transition-colors text-right">
            <Download className="w-8 h-8 text-amber-500" />
            <div>
              <p className="font-bold text-foreground">تصدير البيانات</p>
              <p className="text-xs text-muted-foreground">تحميل نسخة احتياطية JSON</p>
            </div>
          </button>

          {/* Import */}
          <button onClick={() => fileInputRef.current?.click()} disabled={importing}
            className="flex items-center gap-3 p-4 bg-[#1A1E2A] rounded-xl border border-[#1E2233] hover:border-blue-500/30 transition-colors text-right disabled:opacity-50">
            <Upload className="w-8 h-8 text-blue-500" />
            <div>
              <p className="font-bold text-foreground">استيراد البيانات</p>
              <p className="text-xs text-muted-foreground">استعادة من ملف JSON</p>
            </div>
          </button>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />

          {/* Print */}
          <button onClick={handlePrintOverdue}
            className="flex items-center gap-3 p-4 bg-[#1A1E2A] rounded-xl border border-[#1E2233] hover:border-green-500/30 transition-colors text-right">
            <Printer className="w-8 h-8 text-green-500" />
            <div>
              <p className="font-bold text-foreground">طباعة المتأخرات</p>
              <p className="text-xs text-muted-foreground">طباعة قائمة الأقساط المتأخرة</p>
            </div>
          </button>
        </div>
      </div>

      {/* Trash — Soft Deleted Items */}
      <div className="bg-[#151821] rounded-2xl border border-[#1E2233] overflow-hidden">
        <div className="p-4 border-b border-[#1E2233] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-amber-500" />
            <h2 className="font-bold text-foreground">سلة المحذوفات</h2>
            {(trash.customers.length + trash.products.length) > 0 && (
              <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs px-2 py-0.5 rounded-full">
                {trash.customers.length + trash.products.length}
              </span>
            )}
          </div>
        </div>

        {trashLoading ? (
          <div className="flex items-center justify-center h-20">
            <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (trash.customers.length + trash.products.length) === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-sm">✅ سلة المحذوفات فارغة</div>
        ) : (
          <div className="divide-y divide-[#1E2233]">
            {trash.customers.map(c => (
              <div key={c.id} className="flex items-center justify-between p-4 hover:bg-[#1A1E2A]/40">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#1A1E2A] flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      عميل · {c.phone} · حُذف {new Date(c.deletedAt).toLocaleDateString('ar-EG')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleRestore('customer', c.id, c.name)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-green-400 hover:bg-green-500/10 rounded-lg border border-green-500/20 transition-colors">
                    <RotateCcw className="w-3.5 h-3.5" /> استرجاع
                  </button>
                  <button onClick={() => handlePermanentDelete('customer', c.id, c.name)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-lg border border-red-500/20 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" /> نهائي
                  </button>
                </div>
              </div>
            ))}
            {trash.products.map(p => (
              <div key={p.id} className="flex items-center justify-between p-4 hover:bg-[#1A1E2A]/40">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#1A1E2A] flex items-center justify-center flex-shrink-0">
                    <Package className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      منتج · {p.category} · حُذف {new Date(p.deletedAt).toLocaleDateString('ar-EG')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleRestore('product', p.id, p.name)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-green-400 hover:bg-green-500/10 rounded-lg border border-green-500/20 transition-colors">
                    <RotateCcw className="w-3.5 h-3.5" /> استرجاع
                  </button>
                  <button onClick={() => handlePermanentDelete('product', p.id, p.name)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-lg border border-red-500/20 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" /> نهائي
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="bg-[#151821] rounded-2xl border border-destructive/30 p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          <h2 className="text-lg font-bold text-destructive">منطقة الخطر</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">حذف جميع البيانات نهائياً. لا يمكن التراجع عن هذا الإجراء!</p>
        <button onClick={() => setShowDeleteAll(true)}
          className="flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive border border-destructive/30 rounded-xl hover:bg-destructive/20 transition-colors text-sm font-bold">
          <Trash2 className="w-4 h-4" />
          حذف جميع البيانات
        </button>
      </div>

      <ConfirmDialog
        open={showDeleteAll}
        onOpenChange={setShowDeleteAll}
        title="حذف جميع البيانات"
        description="هل أنت متأكد؟ سيتم حذف جميع البيانات نهائياً ولن يمكنك استرجاعها!"
        onConfirm={handleDeleteAll}
        confirmText="حذف الكل"
      />
    </div>
  )
}
