import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export interface AuthUser {
  id: string
  name: string
  role: string
}

export async function requireAuth(request: NextRequest): Promise<AuthUser | NextResponse> {
  const userId = request.cookies.get('showroom_uid')?.value
  if (!userId) {
    return NextResponse.json({ error: 'غير مصرح بالوصول' }, { status: 401 })
  }
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, role: true },
  })
  if (!user) {
    return NextResponse.json({ error: 'الجلسة غير صالحة' }, { status: 401 })
  }
  return user
}

export function requireOwner(user: AuthUser): NextResponse | null {
  if (user.role !== 'owner') {
    return NextResponse.json({ error: 'هذه العملية للمالك فقط' }, { status: 403 })
  }
  return null
}

export function isAuthError(result: AuthUser | NextResponse): result is NextResponse {
  return result instanceof NextResponse
}
