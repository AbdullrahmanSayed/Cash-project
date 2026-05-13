import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, isAuthError } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  const user = await db.user.findUnique({
    where: { id: auth.id },
    select: { id: true, name: true, role: true },
  })

  if (!user) {
    const res = NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 })
    res.cookies.delete('showroom_uid')
    return res
  }

  return NextResponse.json(user)
}
