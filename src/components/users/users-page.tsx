'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { Edit2, KeyRound, ShieldCheck, User } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface UserItem {
  id: string
  name: string
  role: string
}

export default function UsersPage() {
  const { currentUser, setUser } = useAppStore()
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)

  // Edit name dialog
  const [nameDialog, setNameDialog] = useState(false)
  const [editUser, setEditUser] = useState<UserItem | null>(null)
  const [newName, setNewName] = useState('')

  // Change PIN dialog
  const [pinDialog, setPinDialog] = useState(false)
  const [pinUser, setPinUser] = useState<UserItem | null>(null)
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')

  useEffect(() => { loadUsers() }, [])

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/users')
      if (!res.ok) throw new Error()
      setUsers(await res.json())
    } catch {
      toast.error('فشل تحميل المستخدمين')
    } finally {
      setLoading(false)
    }
  }

  const openEditName = (u: UserItem) => {
    setEditUser(u)
    setNewName(u.name)
    setNameDialog(true)
  }

  const openEditPin = (u: UserItem) => {
    setPinUser(u)
    setNewPin('')
    setConfirmPin('')
    setPinDialog(true)
  }

  const handleSaveName = async () => {
    if (!editUser || !newName.trim()) return
    if (newName.trim().length < 2) { toast.error('الاسم يجب أن يكون حرفين على الأقل'); return }
    try {
      const res = await fetch(`/api/users/${editUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'فشل تحديث الاسم'); return }
      toast.success('تم تحديث الاسم بنجاح')
      setNameDialog(false)
      // Update local state in store if editing current user
      if (currentUser?.id === editUser.id) {
        setUser({ ...currentUser, name: newName.trim() })
      }
      loadUsers()
    } catch {
      toast.error('فشل تحديث الاسم')
    }
  }

  const handleSavePin = async () => {
    if (!pinUser) return
    if (!/^\d{4}$/.test(newPin)) { toast.error('الرمز يجب أن يكون 4 أرقام'); return }
    if (newPin !== confirmPin) { toast.error('الرمزان غير متطابقان'); return }
    try {
      const res = await fetch(`/api/users/${pinUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: newPin }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'فشل تحديث الرمز'); return }
      toast.success('تم تغيير رمز PIN بنجاح')
      setPinDialog(false)
    } catch {
      toast.error('فشل تحديث الرمز')
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
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#151821] rounded-2xl border border-[#1E2233] overflow-hidden">
        <div className="p-4 border-b border-[#1E2233]">
          <h2 className="font-bold text-foreground">مستخدمو النظام</h2>
          <p className="text-xs text-muted-foreground mt-1">يمكنك تغيير أسماء المستخدمين ورموز PIN الخاصة بهم</p>
        </div>
        <div className="divide-y divide-[#1E2233]">
          {users.map(u => (
            <div key={u.id} className="flex items-center justify-between p-4 hover:bg-[#1A1E2A]/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#1A1E2A] flex items-center justify-center flex-shrink-0">
                  <span className="text-amber-500 font-bold">{u.name.charAt(0)}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground">{u.name}</p>
                    {u.id === currentUser?.id && (
                      <span className="text-xs bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full">أنت</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {u.role === 'owner' ? 'صاحب المعرض' : 'موظف'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEditName(u)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors border border-amber-500/20"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">تغيير الاسم</span>
                </button>
                <button
                  onClick={() => openEditPin(u)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors border border-blue-500/20"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">تغيير PIN</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security note */}
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
        <div className="flex gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-500">ملاحظة أمنية</p>
            <p className="text-xs text-muted-foreground mt-1">
              رموز PIN مشفرة ولا يمكن استعادتها — فقط تغييرها. احتفظ برموز الدخول في مكان آمن.
            </p>
          </div>
        </div>
      </div>

      {/* Edit Name Dialog */}
      <Dialog open={nameDialog} onOpenChange={setNameDialog}>
        <DialogContent className="bg-[#151821] border-[#1E2233] sm:max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <User className="w-5 h-5 text-amber-500" />
              تغيير الاسم
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label className="text-muted-foreground text-sm">الاسم الجديد</Label>
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="bg-[#1A1E2A] border-[#1E2233] text-foreground mt-2"
              placeholder="أدخل الاسم الجديد"
              onKeyDown={e => e.key === 'Enter' && handleSaveName()}
            />
          </div>
          <DialogFooter className="flex-row gap-2 justify-end">
            <Button variant="outline" onClick={() => setNameDialog(false)} className="bg-[#1A1E2A] border-[#1E2233] text-foreground">إلغاء</Button>
            <Button onClick={handleSaveName} className="gold-gradient text-black hover:opacity-90">حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change PIN Dialog */}
      <Dialog open={pinDialog} onOpenChange={setPinDialog}>
        <DialogContent className="bg-[#151821] border-[#1E2233] sm:max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-blue-400" />
              تغيير رمز PIN لـ {pinUser?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-muted-foreground text-sm">الرمز الجديد (4 أرقام)</Label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={newPin}
                onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="bg-[#1A1E2A] border-[#1E2233] text-foreground mt-2 text-center text-xl tracking-[0.5em]"
                placeholder="••••"
                dir="ltr"
              />
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">تأكيد الرمز</Label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={confirmPin}
                onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="bg-[#1A1E2A] border-[#1E2233] text-foreground mt-2 text-center text-xl tracking-[0.5em]"
                placeholder="••••"
                dir="ltr"
                onKeyDown={e => e.key === 'Enter' && handleSavePin()}
              />
            </div>
            {newPin && confirmPin && newPin !== confirmPin && (
              <p className="text-xs text-destructive">الرمزان غير متطابقان</p>
            )}
          </div>
          <DialogFooter className="flex-row gap-2 justify-end">
            <Button variant="outline" onClick={() => setPinDialog(false)} className="bg-[#1A1E2A] border-[#1E2233] text-foreground">إلغاء</Button>
            <Button onClick={handleSavePin} className="bg-blue-600 hover:bg-blue-700 text-white">تغيير الرمز</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
