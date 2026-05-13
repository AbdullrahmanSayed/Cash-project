'use client'

import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { Store, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const { setUser } = useAppStore()
  const [users, setUsers] = useState<{id: string; name: string; role: string}[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [pin, setPin] = useState(['', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const pinRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    const init = async () => {
      // Seed database if empty
      await fetch('/api/seed')
      // Load users
      const res = await fetch('/api/users')
      const data = await res.json()
      setUsers(data)
      if (data.length > 0) setSelectedUserId(data[0].id)
    }
    init()
  }, [])

  const handlePinChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const newPin = [...pin]
    newPin[index] = value.slice(-1)
    setPin(newPin)
    setError('')
    if (value && index < 3) {
      pinRefs.current[index + 1]?.focus()
    }
  }

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      pinRefs.current[index - 1]?.focus()
    }
  }

  const handleLogin = async () => {
    if (!selectedUserId) {
      setError('اختر المستخدم')
      return
    }
    const pinStr = pin.join('')
    if (pinStr.length !== 4) {
      setError('أدخل رمز PIN كاملاً')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId, pin: pinStr })
      })
      const data = await res.json()
      if (res.ok) {
        setUser(data.user)
      } else {
        setError(data.error || 'خطأ في تسجيل الدخول')
        setPin(['', '', '', ''])
        pinRefs.current[0]?.focus()
      }
    } catch {
      setError('خطأ في الاتصال')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl gold-gradient mb-4 shadow-lg shadow-amber-500/20">
            <Store className="w-10 h-10 text-black" />
          </div>
          <h1 className="text-3xl font-bold gold-gradient-text">نظام إدارة المعرض</h1>
          <p className="text-muted-foreground mt-2">سجّل الدخول للمتابعة</p>
        </div>

        {/* Login Card */}
        <div className="bg-card rounded-2xl p-8 border border-border shadow-xl">
          {/* User Select */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-foreground mb-2">اختر المستخدم</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30 appearance-none cursor-pointer"
            >
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role === 'owner' ? 'صاحب المعرض' : 'موظف'})
                </option>
              ))}
            </select>
          </div>

          {/* PIN Input */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-foreground mb-2">رمز PIN</label>
            <div className="flex justify-center gap-3" dir="ltr">
              {pin.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { pinRefs.current[i] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handlePinChange(i, e.target.value)}
                  onKeyDown={(e) => handlePinKeyDown(i, e)}
                  className="pin-input w-14 h-14 text-center text-2xl font-bold bg-input border-2 border-border rounded-xl text-foreground focus:outline-none transition-all"
                />
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm mb-4 justify-center">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Button */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full gold-gradient text-black font-bold py-3 px-6 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg shadow-amber-500/20"
          >
            {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
          </button>

          <div className="mt-6 text-center text-xs text-muted-foreground">
            <p>تواصل مع صاحب المعرض للحصول على رمز PIN</p>
          </div>
        </div>
      </div>
    </div>
  )
}
