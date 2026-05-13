'use client'

import { useState } from 'react'
import { Store, User, KeyRound, Phone, ChevronLeft, CheckCircle2, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface Props { onComplete: () => void }

export default function SetupWizard({ onComplete }: Props) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    showroomName: '',
    showroomPhone: '',
    ownerName: '',
    ownerPin: '',
    ownerPinConfirm: '',
    employeeName: '',
    employeePin: '',
  })

  const f = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleFinish = async () => {
    if (form.ownerPin !== form.ownerPinConfirm) { toast.error('رمز PIN غير متطابق'); return }
    if (!/^\d{4}$/.test(form.ownerPin)) { toast.error('PIN يجب أن يكون 4 أرقام'); return }
    if (form.employeePin && !/^\d{4}$/.test(form.employeePin)) { toast.error('PIN الموظف يجب أن يكون 4 أرقام'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          showroomName: form.showroomName,
          showroomPhone: form.showroomPhone,
          ownerName: form.ownerName,
          ownerPin: form.ownerPin,
          employeeName: form.employeeName || 'موظف',
          employeePin: form.employeePin || '5678',
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'فشل الإعداد'); return }
      setStep(4)
      setTimeout(onComplete, 2000)
    } catch {
      toast.error('حدث خطأ، حاول مرة أخرى')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl gold-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/30">
            <Store className="w-8 h-8 text-black" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">إعداد نظام المعرض</h1>
          <p className="text-muted-foreground text-sm mt-1">سيتم إعداد النظام لمرة واحدة فقط</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map(n => (
            <div key={n} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step > n ? 'bg-green-500 text-white' :
                step === n ? 'bg-amber-500 text-black' :
                'bg-[#1A1E2A] text-muted-foreground'
              }`}>
                {step > n ? <CheckCircle2 className="w-4 h-4" /> : n}
              </div>
              {n < 3 && <div className={`w-12 h-0.5 ${step > n ? 'bg-green-500' : 'bg-[#1E2233]'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-[#151821] rounded-2xl border border-[#1E2233] p-6">

          {/* Step 1 — Showroom Info */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 mb-4">
                <Store className="w-5 h-5 text-amber-500" />
                <h2 className="font-bold text-foreground text-lg">بيانات المعرض</h2>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">اسم المعرض *</Label>
                <Input
                  value={form.showroomName}
                  onChange={e => f('showroomName', e.target.value)}
                  className="bg-[#1A1E2A] border-[#1E2233] text-foreground mt-1.5 text-base"
                  placeholder="مثال: معرض النور للأجهزة"
                  autoFocus
                />
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">رقم تلفون المعرض</Label>
                <Input
                  value={form.showroomPhone}
                  onChange={e => f('showroomPhone', e.target.value)}
                  className="bg-[#1A1E2A] border-[#1E2233] text-foreground mt-1.5"
                  placeholder="01xxxxxxxxx"
                  dir="ltr"
                />
              </div>
              <button
                onClick={() => { if (!form.showroomName.trim()) { toast.error('اسم المعرض مطلوب'); return } setStep(2) }}
                className="w-full gold-gradient text-black font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
              >
                التالي ←
              </button>
            </div>
          )}

          {/* Step 2 — Owner */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-amber-500" />
                <h2 className="font-bold text-foreground text-lg">بيانات صاحب المعرض</h2>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">الاسم *</Label>
                <Input
                  value={form.ownerName}
                  onChange={e => f('ownerName', e.target.value)}
                  className="bg-[#1A1E2A] border-[#1E2233] text-foreground mt-1.5"
                  placeholder="اسمك الكامل"
                />
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">رمز PIN (4 أرقام) *</Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={form.ownerPin}
                  onChange={e => f('ownerPin', e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="bg-[#1A1E2A] border-[#1E2233] text-foreground mt-1.5 text-center text-2xl tracking-[0.5em]"
                  placeholder="••••"
                  dir="ltr"
                />
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">تأكيد PIN *</Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={form.ownerPinConfirm}
                  onChange={e => f('ownerPinConfirm', e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="bg-[#1A1E2A] border-[#1E2233] text-foreground mt-1.5 text-center text-2xl tracking-[0.5em]"
                  placeholder="••••"
                  dir="ltr"
                />
                {form.ownerPin && form.ownerPinConfirm && form.ownerPin !== form.ownerPinConfirm && (
                  <p className="text-xs text-destructive mt-1">الرمزان غير متطابقان</p>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl bg-[#1A1E2A] border border-[#1E2233] text-foreground text-sm hover:border-amber-500/30 transition-colors">
                  ← رجوع
                </button>
                <button
                  onClick={() => {
                    if (!form.ownerName.trim()) { toast.error('الاسم مطلوب'); return }
                    if (!/^\d{4}$/.test(form.ownerPin)) { toast.error('PIN يجب أن يكون 4 أرقام'); return }
                    if (form.ownerPin !== form.ownerPinConfirm) { toast.error('الرمزان غير متطابقان'); return }
                    setStep(3)
                  }}
                  className="flex-2 flex-1 gold-gradient text-black font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
                >
                  التالي ←
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Employee */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-blue-400" />
                <h2 className="font-bold text-foreground text-lg">بيانات الموظف</h2>
                <span className="text-xs text-muted-foreground">(اختياري)</span>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">اسم الموظف</Label>
                <Input
                  value={form.employeeName}
                  onChange={e => f('employeeName', e.target.value)}
                  className="bg-[#1A1E2A] border-[#1E2233] text-foreground mt-1.5"
                  placeholder="اسم الموظف"
                />
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">PIN الموظف (4 أرقام)</Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={form.employeePin}
                  onChange={e => f('employeePin', e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="bg-[#1A1E2A] border-[#1E2233] text-foreground mt-1.5 text-center text-2xl tracking-[0.5em]"
                  placeholder="••••"
                  dir="ltr"
                />
              </div>
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                <p className="text-xs text-amber-400">💡 تقدر تضيف موظفين أكتر لاحقاً من صفحة المستخدمين</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 py-3 rounded-xl bg-[#1A1E2A] border border-[#1E2233] text-foreground text-sm hover:border-amber-500/30 transition-colors">
                  ← رجوع
                </button>
                <button
                  onClick={handleFinish}
                  disabled={loading}
                  className="flex-1 gold-gradient text-black font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الإعداد...</> : '🚀 إنهاء الإعداد'}
                </button>
              </div>
            </div>
          )}

          {/* Step 4 — Done */}
          {step === 4 && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-foreground">تم الإعداد بنجاح! 🎉</h2>
              <p className="text-muted-foreground text-sm">جاري تحميل النظام...</p>
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          نظام إدارة المعرض · جميع البيانات محفوظة بأمان
        </p>
      </div>
    </div>
  )
}
