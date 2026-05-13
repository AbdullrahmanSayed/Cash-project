import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, isAuthError } from '@/lib/auth'

export async function GET(request: NextRequest) {
  // users list is public (needed for login page to show user selection)
  // but excludes PINs always
  try {
    const users = await db.user.findMany({
      select: { id: true, name: true, role: true },
    })
    return NextResponse.json(users)
  } catch (error) {
    console.error('Users GET error:', error)
    return NextResponse.json({ error: 'فشل تحميل المستخدمين' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  // Only owner can create users - handled in component, enforced here
  if (auth.role !== 'owner') {
    return NextResponse.json({ error: 'للمالك فقط' }, { status: 403 })
  }

  try {
    const body = await request.json()
    // Future: add user creation with hashed PIN
    return NextResponse.json({ error: 'غير مدعوم حالياً' }, { status: 501 })
  } catch (error) {
    console.error('Users POST error:', error)
    return NextResponse.json({ error: 'خطأ' }, { status: 500 })
  }
}
