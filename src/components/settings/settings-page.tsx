'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { Settings, Store, Phone, Mail, Bell, BellOff, ShieldCheck, ExternalLink, Plus, X, Package, DollarSign, Trash2, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface SettingsData {
  showroom_name: string
  showroom_phone: string
  showroom_address: string
  owner_email: string
  reminder_enabled: string
  whatsapp_template: string
  product_categories: string
  expense_categories: string
  initial_capital: string
  invoice_footer: string
  invoice_note: string
}

export default function SettingsPage() {
  const { currentUser } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<SettingsData>({
    showroom_name: '',
    showroom_phone: '',
    showroom_address: '',
    owner_email: '',
    reminder_enabled: 'true',
    whatsapp_template: '',
    product_categories: '["موبايل","أجهزة كهربائية","إكسسوار"]',
    expense_categories: '["إيجار","كهرباء","مرتبات","أخرى"]',
    initial_capital: '0',
    invoice_footer: 'شكراً لتعاملكم معنا',
    invoice_note: '',
  })
  const [newCategory, setNewCategory] = useState('')
  const [newExpenseCategory, setNewExpenseCategory] = useState('')

  const categories: string[] = (() => {
    try { return JSON.parse(form.product_categories) } catch { return [] }
  })()

  const expenseCategories: string[] = (() => {
    try { return JSON.parse(form.expense_categories) } catch { return [] }
  })()

  const addCategory = () => {
    const cat = newCategory.trim()
    if (!cat || categories.includes(cat)) return
    setForm(f => ({ ...f, product_categories: JSON.stringify([...categories, cat]) }))
    setNewCategory('')
  }

  const removeCategory = (cat: string) => {
    setForm(f => ({ ...f, product_categories: JSON.stringify(categories.filter(c => c !== cat)) }))
  }

  const addExpenseCategory = () => {
    const cat = newExpenseCategory.trim()
    if (!cat || expenseCategories.includes(cat)) return
    setForm(f => ({ ...f, expense_categories: JSON.stringify([...expenseCategories, cat]) }))
    setNewExpenseCategory('')
  }

  const removeExpenseCategory = (cat: string) => {
    setForm(f => ({ ...f, expense_categories: JSON.stringify(expenseCategories.filter(c => c !== cat)) }))
  }

  useEffect(() => { loadSettings() }, [])

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setForm({
        showroom_name: data.showroom_name || '',
        showroom_phone: data.showroom_phone || '',
        showroom_address: data.showroom_address || '',
        owner_email: data.owner_email || '',
        reminder_enabled: data.reminder_enabled ?? 'true',
        whatsapp_template: data.whatsapp_template || '',
        product_categories: data.product_categories || '["موبايل","أجهزة كهربائية","إكسسوار"]',
        expense_categories: data.expense_categories || '["إيجار","كهرباء","مرتبات","أخرى"]',
        initial_capital: data.initial_capital || '0',
        invoice_footer: data.invoice_footer || 'شكراً لتعاملكم معنا',
        invoice_note: data.invoice_note || '',
      })
    } catch {
      toast.error('فشل تحميل الإعدادات')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!form.showroom_name.trim()) { toast.error('اسم المعرض مطلوب'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) { toast.error('فشل حفظ الإعدادات'); return }
      toast.success('تم حفظ الإعدادات بنجاح ✓')
    } catch {
      toast.error('فشل حفظ الإعدادات')
    } finally {
      setSaving(false)
    }
  }

  if (currentUser?.role !== 'owner') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <ShieldCheck className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground">هذه الصفحة للمالك فقط</p>
      </div>
    )
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  const reminderOn = form.reminder_enabled === 'true'

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Showroom Info */}
      <div className="bg-[#151821] rounded-2xl border border-[#1E2233] overflow-hidden">
        <div className="p-4 border-b border-[#1E2233] flex items-center gap-2">
          <Store className="w-5 h-5 text-amber-500" />
          <h2 className="font-bold text-foreground">بيانات المعرض</h2>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <Label className="text-muted-foreground text-sm">اسم المعرض *</Label>
            <Input
              value={form.showroom_name}
              onChange={e => setForm(f => ({ ...f, showroom_name: e.target.value }))}
              className="bg-[#1A1E2A] border-[#1E2233] text-foreground mt-1.5"
              placeholder="مثال: معرض النور"
            />
          </div>
          <div>
            <Label className="text-muted-foreground text-sm">رقم تلفون المعرض (واتساب)</Label>
            <Input
              value={form.showroom_phone}
              onChange={e => setForm(f => ({ ...f, showroom_phone: e.target.value }))}
              className="bg-[#1A1E2A] border-[#1E2233] text-foreground mt-1.5"
              placeholder="01xxxxxxxxx"
              dir="ltr"
            />
            <p className="text-xs text-muted-foreground mt-1">يُستخدم في رسائل التذكير للعملاء</p>
          </div>
          <div>
            <Label className="text-muted-foreground text-sm">عنوان المعرض</Label>
            <Input
              value={form.showroom_address}
              onChange={e => setForm(f => ({ ...f, showroom_address: e.target.value }))}
              className="bg-[#1A1E2A] border-[#1E2233] text-foreground mt-1.5"
              placeholder="العنوان التفصيلي"
            />
          </div>
        </div>
      </div>

      {/* Daily Reminder Email */}
      <div className="bg-[#151821] rounded-2xl border border-[#1E2233] overflow-hidden">
        <div className="p-4 border-b border-[#1E2233] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-400" />
            <h2 className="font-bold text-foreground">إيميل التذكير اليومي</h2>
          </div>
          <button
            onClick={() => setForm(f => ({ ...f, reminder_enabled: reminderOn ? 'false' : 'true' }))}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              reminderOn
                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                : 'bg-[#1A1E2A] text-muted-foreground border border-[#1E2233]'
            }`}
          >
            {reminderOn ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
            {reminderOn ? 'مفعّل' : 'معطّل'}
          </button>
        </div>
        <div className={`p-5 space-y-4 ${!reminderOn ? 'opacity-50 pointer-events-none' : ''}`}>
          <div>
            <Label className="text-muted-foreground text-sm">إيميل صاحب المعرض</Label>
            <Input
              type="email"
              value={form.owner_email}
              onChange={e => setForm(f => ({ ...f, owner_email: e.target.value }))}
              className="bg-[#1A1E2A] border-[#1E2233] text-foreground mt-1.5"
              placeholder="your@email.com"
              dir="ltr"
            />
            <p className="text-xs text-muted-foreground mt-1">يصلك كل صبح قائمة بالأقساط المستحقة + روابط واتساب جاهزة</p>
          </div>

          {/* Setup guide */}
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 space-y-2">
            <p className="text-sm font-medium text-blue-400">🔑 إعداد الإيميل (مرة واحدة فقط)</p>
            <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
              <li>
                اشتر حساب مجاني على{' '}
                <a href="https://resend.com" target="_blank" rel="noopener noreferrer"
                  className="text-blue-400 hover:underline inline-flex items-center gap-0.5">
                  resend.com <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>اعمل API Key جديد من لوحة تحكم Resend</li>
              <li>
                في{' '}
                <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer"
                  className="text-blue-400 hover:underline inline-flex items-center gap-0.5">
                  Vercel Dashboard <ExternalLink className="w-3 h-3" />
                </a>
                {' '}→ مشروعك → Settings → Environment Variables
              </li>
              <li>أضف: <code className="bg-[#1A1E2A] px-1.5 py-0.5 rounded text-amber-400">RESEND_API_KEY</code> = مفتاحك</li>
              <li>أضف: <code className="bg-[#1A1E2A] px-1.5 py-0.5 rounded text-amber-400">CRON_SECRET</code> = كلمة سر عشوائية</li>
              <li>الإيميل يُرسل تلقائياً كل يوم الساعة 9 صباحاً ✅</li>
            </ol>
          </div>
        </div>
      </div>

      {/* WhatsApp Template */}
      <div className="bg-[#151821] rounded-2xl border border-[#1E2233] overflow-hidden">
        <div className="p-4 border-b border-[#1E2233] flex items-center gap-2">
          <Phone className="w-5 h-5 text-green-400" />
          <h2 className="font-bold text-foreground">قالب رسالة واتساب</h2>
        </div>
        <div className="p-5">
          <Label className="text-muted-foreground text-sm">نص الرسالة</Label>
          <textarea
            value={form.whatsapp_template}
            onChange={e => setForm(f => ({ ...f, whatsapp_template: e.target.value }))}
            className="w-full bg-[#1A1E2A] border border-[#1E2233] rounded-xl px-4 py-3 text-foreground text-sm mt-1.5 focus:border-amber-500 focus:outline-none resize-none"
            rows={3}
            placeholder="مرحباً {name}، لديك قسط مستحق بقيمة {amount} بتاريخ {date}. برجاء التواصل مع {showroom}"
          />
          <p className="text-xs text-muted-foreground mt-2">
            المتغيرات: <code className="text-amber-400">{'{name}'}</code> اسم العميل ·{' '}
            <code className="text-amber-400">{'{amount}'}</code> المبلغ ·{' '}
            <code className="text-amber-400">{'{date}'}</code> التاريخ ·{' '}
            <code className="text-amber-400">{'{showroom}'}</code> اسم المعرض
          </p>
        </div>
      </div>

      {/* Product Categories */}
      <div className="bg-[#151821] rounded-2xl border border-[#1E2233] overflow-hidden">
        <div className="p-4 border-b border-[#1E2233] flex items-center gap-2">
          <Package className="w-5 h-5 text-amber-500" />
          <h2 className="font-bold text-foreground">فئات المنتجات</h2>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <span key={cat} className="flex items-center gap-1.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1.5 rounded-xl text-sm">
                {cat}
                <button onClick={() => removeCategory(cat)} className="hover:text-red-400 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCategory()}
              className="bg-[#1A1E2A] border-[#1E2233] text-foreground flex-1"
              placeholder="اسم الفئة الجديدة..."
            />
            <Button onClick={addCategory} className="gold-gradient text-black hover:opacity-90 px-4">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">اضغط Enter أو زر + لإضافة فئة. اضغط × لحذف فئة.</p>
        </div>
      </div>

      {/* Expense Categories */}
      <div className="bg-[#151821] rounded-2xl border border-[#1E2233] overflow-hidden">
        <div className="p-4 border-b border-[#1E2233] flex items-center gap-2">
          <Package className="w-5 h-5 text-emerald-500" />
          <h2 className="font-bold text-foreground">فئات المصروفات</h2>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            {expenseCategories.map(cat => (
              <span key={cat} className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-sm">
                {cat}
                <button onClick={() => removeExpenseCategory(cat)} className="hover:text-red-400 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newExpenseCategory}
              onChange={e => setNewExpenseCategory(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addExpenseCategory()}
              className="bg-[#1A1E2A] border-[#1E2233] text-foreground flex-1"
              placeholder="اسم فئة المصروف الجديدة..."
            />
            <Button onClick={addExpenseCategory} className="gold-gradient text-black hover:opacity-90 px-4">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">اضغط Enter أو زر + لإضافة فئة. اضغط × لحذف فئة.</p>
        </div>
      </div>

      {/* Capital */}
      <div className="bg-[#151821] rounded-2xl border border-[#1E2233] overflow-hidden">
        <div className="p-4 border-b border-[#1E2233] flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-400" />
          <h2 className="font-bold text-foreground">رأس المال</h2>
        </div>
        <div className="p-5">
          <Label className="text-muted-foreground text-sm">رأس المال الأساسي (جنيه)</Label>
          <Input
            type="number"
            value={form.initial_capital}
            onChange={e => setForm(f => ({ ...f, initial_capital: e.target.value }))}
            className="bg-[#1A1E2A] border-[#1E2233] text-foreground mt-1.5"
            placeholder="0"
            dir="ltr"
          />
          <p className="text-xs text-muted-foreground mt-1">يُستخدم في حساب صافي الأرباح والعائد على رأس المال في التقارير</p>
        </div>
      </div>

      {/* Invoice Settings */}
      <div className="bg-[#151821] rounded-2xl border border-[#1E2233] overflow-hidden">
        <div className="p-4 border-b border-[#1E2233] flex items-center gap-2">
          <FileText className="w-5 h-5 text-amber-500" />
          <h2 className="font-bold text-foreground">إعدادات الفاتورة</h2>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <Label className="text-muted-foreground text-sm">نص التذييل (أسفل كل فاتورة)</Label>
            <Input
              value={form.invoice_footer}
              onChange={e => setForm(f => ({ ...f, invoice_footer: e.target.value }))}
              className="bg-[#1A1E2A] border-[#1E2233] text-foreground mt-1.5"
              placeholder="شكراً لتعاملكم معنا"
            />
            <p className="text-xs text-muted-foreground mt-1">يظهر في أسفل فاتورة البيع وإيصال الدفع وكشف الحساب</p>
          </div>
          <div>
            <Label className="text-muted-foreground text-sm">ملاحظة إضافية (اختياري)</Label>
            <textarea
              value={form.invoice_note}
              onChange={e => setForm(f => ({ ...f, invoice_note: e.target.value }))}
              className="w-full bg-[#1A1E2A] border border-[#1E2233] rounded-xl px-4 py-3 text-foreground text-sm mt-1.5 focus:border-amber-500 focus:outline-none resize-none"
              rows={2}
              placeholder="مثال: الضمان سنة — لا يُسترد المبيع — يُرجى الاحتفاظ بالفاتورة"
            />
            <p className="text-xs text-muted-foreground mt-1">تظهر في الفاتورة قبل التذييل مباشرة</p>
          </div>
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
            <p className="text-xs text-amber-400">👁️ معاينة التذييل:</p>
            <p className="text-sm text-foreground mt-1 text-center border-t border-dashed border-[#1E2233] pt-2">
              {form.invoice_note && <span className="block text-muted-foreground text-xs mb-1">{form.invoice_note}</span>}
              {form.invoice_footer || 'شكراً لتعاملكم معنا'}
            </p>
          </div>
        </div>
      </div>

      {/* Trash / Deleted items info */}
      <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
        <div className="flex gap-3">
          <Trash2 className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-400">سلة المحذوفات</p>
            <p className="text-xs text-muted-foreground mt-1">
              العملاء والمنتجات المحذوفة تُحفظ تلقائياً ويمكن استرجاعها من صفحة{' '}
              <span className="text-amber-400">النسخ الاحتياطي → سلة المحذوفات</span>
            </p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="gold-gradient text-black font-bold hover:opacity-90 px-8"
        >
          <Settings className="w-4 h-4 ml-2" />
          {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </Button>
      </div>
    </div>
  )
}
