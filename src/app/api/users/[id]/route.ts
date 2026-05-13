import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, isAuthError } from '@/lib/auth'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const UpdateUserSchema = z.object({
  name: z.string().min(2, 'الاسم مطلوب').max(50).optional(),
  pin: z.string().regex(/^\d{4}$/, 'الرمز يجب أن يكون 4 أرقام').optional(),
}).refine(d => d.name || d.pin, { message: 'يجب تحديد الاسم أو الرمز' })

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  if (auth.role !== 'owner') {
    return NextResponse.json({ error: 'هذه العملية للمالك فقط' }, { status: 403 })
  }

  const { id } = await params

  try {
    const body = await request.json()
    const parsed = UpdateUserSchema.safeParse(body)
    if (!parsed.success) {
      const msg = parsed.error.issues?.[0]?.message ?? parsed.error.message ?? 'بيانات غير صالحة'
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    const target = await db.user.findUnique({ where: { id } })
    if (!target) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 })
    }

    const updateData: { name?: string; pin?: string } = {}
    if (parsed.data.name) updateData.name = parsed.data.name
    if (parsed.data.pin) updateData.pin = await bcrypt.hash(parsed.data.pin, 10)

    const updated = await db.user.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, role: true },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('User PUT error:', error)
    return NextResponse.json({ error: 'فشل تحديث المستخدم' }, { status: 500 })
  }
}
