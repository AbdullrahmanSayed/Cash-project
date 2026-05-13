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
            installments: { orderBy: { dueDate: 'asc' } },
          },
          orderBy: { createdAt: 'desc' },
        },
        contactLogs: {
          include: { employee: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!customer) {
      return NextResponse.json({ error: 'العميل غير موجود' }, { status: 404 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const totalPurchases = customer.sales.reduce((sum, s) => sum + s.totalPrice, 0)
    const totalPaid = customer.sales.reduce((sum, s) => {
      if (s.saleType === 'cash') return sum + s.totalPrice // cash = fully paid
      return sum + s.downPayment + s.installments.filter(i => i.status === 'paid').reduce((s2, i) => s2 + i.amount, 0)
    }, 0)
    const latePayments = customer.sales.reduce((count, s) => {
      return count + s.installments.filter(i => i.status === 'unpaid' && new Date(i.dueDate) < today).length
    }, 0)

    return NextResponse.json({
      ...customer,
      totalPurchases,
      totalPaid,
      totalDue: totalPurchases - totalPaid,
      latePayments,
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
    // Soft delete — preserve all data for recovery
    await db.customer.update({ where: { id }, data: { deletedAt: new Date() } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Customer DELETE error:', error)
    return NextResponse.json({ error: 'فشل حذف العميل' }, { status: 500 })
  }
}
