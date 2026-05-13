import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000

type LockoutRecord = { count: number; resetAt: string }

function lockoutKey(userId: string) {
  return `lockout_${userId}`
}

async function getLockout(userId: string): Promise<LockoutRecord | null> {
  const row = await db.setting.findUnique({ where: { key: lockoutKey(userId) } })
  if (!row || !row.value) return null
  try {
    const parsed = JSON.parse(row.value) as LockoutRecord
    if (typeof parsed.count !== 'number' || typeof parsed.resetAt !== 'string') return null
    return parsed
  } catch {
    return null
  }
}

async function setLockout(userId: string, record: LockoutRecord) {
  const key = lockoutKey(userId)
  const value = JSON.stringify(record)
  await db.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  })
}

async function clearLockout(userId: string) {
  try {
    await db.setting.delete({ where: { key: lockoutKey(userId) } })
  } catch {
    // already absent — ignore
  }
}

async function recordFailure(userId: string): Promise<number> {
  const now = Date.now()
  const existing = await getLockout(userId)
  if (!existing || now >= new Date(existing.resetAt).getTime()) {
    const fresh: LockoutRecord = { count: 1, resetAt: new Date(now + WINDOW_MS).toISOString() }
    await setLockout(userId, fresh)
    return fresh.count
  }
  const updated: LockoutRecord = { count: existing.count + 1, resetAt: existing.resetAt }
  await setLockout(userId, updated)
  return updated.count
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, pin } = body

    if (!userId || typeof pin !== 'string' || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 })
    }

    // DB-based rate limit check
    const now = Date.now()
    const lockout = await getLockout(userId)
    if (lockout) {
      if (now < new Date(lockout.resetAt).getTime() && lockout.count >= MAX_ATTEMPTS) {
        return NextResponse.json(
          { error: 'تم تجاوز الحد المسموح، حاول بعد 15 دقيقة' },
          { status: 429 }
        )
      }
      if (now >= new Date(lockout.resetAt).getTime()) {
        await clearLockout(userId)
      }
    }

    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) {
      // Run a dummy compare so timing is identical whether user exists or not
      await bcrypt.compare(pin, '$2b$10$invalidhashfortimingequalizer000000000000000000000')
      return NextResponse.json({ error: 'رمز PIN غير صحيح' }, { status: 401 })
    }

    // Support both hashed and plain PINs during migration
    const isHashed = user.pin.startsWith('$2')
    const valid = isHashed
      ? await bcrypt.compare(pin, user.pin)
      : user.pin === pin

    if (!valid) {
      const count = await recordFailure(userId)
      if (count >= MAX_ATTEMPTS) {
        return NextResponse.json(
          { error: 'تم تجاوز الحد المسموح، حاول بعد 15 دقيقة' },
          { status: 429 }
        )
      }
      return NextResponse.json({ error: 'رمز PIN غير صحيح' }, { status: 401 })
    }

    // Auto-upgrade plain PIN to hashed on successful login
    if (!isHashed) {
      const hashed = await bcrypt.hash(pin, 10)
      await db.user.update({ where: { id: user.id }, data: { pin: hashed } })
    }

    await clearLockout(userId)

    const response = NextResponse.json({
      user: { id: user.id, name: user.name, role: user.role },
    })

    response.cookies.set('showroom_uid', user.id, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    })

    return response
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json({ error: 'خطأ في تسجيل الدخول' }, { status: 500 })
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.delete('showroom_uid')
  return response
}
