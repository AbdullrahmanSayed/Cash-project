import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireOwner, isAuthError } from '@/lib/auth'
import { z } from 'zod'

const UpdateSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().min(10).max(20),
  nationalId: z.string().max(14).optional().default(''),
  address: z.string().max(200).optional().default(''),
})

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  try {
    const { id } = await params
    const customer = await db.customer.findUnique({
      where: { id },
      include: {
        sales: {
          include: {
            product: true,
            employee: { select: { id: true, name: true, role: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!customer) {
      return NextResponse.json({ error: 'العميل غير موجود' }, { status: 404 })
    }

    const totalPurchases = customer.sales.reduce((sum, s) => sum + s.totalPrice, 0)

    return NextResponse.json({
      ...customer,
      totalPurchases,
      totalPaid: totalPurchases,
      totalDue: 0,
      latePayments: 0,
      salesCount: customer.sales.length,
    })
  } catch (error) {
    console.error('Customer GET error:', error)
    return NextResponse.json({ error: 'فشل تحميل العميل' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  try {
    const { id } = await params
    const body = await request.json()
    const parsed = UpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'بيانات غير صالحة', details: parsed.error.flatten() }, { status: 400 })
    }

    if (parsed.data.phone) {
      const existing = await db.customer.findFirst({
        where: { phone: parsed.data.phone, deletedAt: null, id: { not: id } }
      })
      if (existing) {
        return NextResponse.json({ error: 'رقم الهاتف مستخدم بالفعل لعميل آخر' }, { status: 400 })
      }
    }

    const customer = await db.customer.update({ where: { id }, data: parsed.data })
    return NextResponse.json(customer)
  } catch (error) {
    console.error('Customer PUT error:', error)
    return NextResponse.json({ error: 'فشل تعديل العميل' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  const ownerError = requireOwner(auth)
  if (ownerError) return ownerError

  try {
    const { id } = await params
    await db.customer.update({ where: { id }, data: { deletedAt: new Date() } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Customer DELETE error:', error)
    return NextResponse.json({ error: 'فشل حذف العميل' }, { status: 500 })
  }
}
