import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, isAuthError } from '@/lib/auth'
import { z } from 'zod'

const CustomerSchema = z.object({
  name: z.string().min(2, 'الاسم مطلوب').max(100),
  phone: z.string().min(10, 'رقم الهاتف غير صحيح').max(20),
  nationalId: z.string().max(14).optional().default(''),
  address: z.string().max(200).optional().default(''),
})

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  try {
    const customers = await db.customer.findMany({
      where: { deletedAt: null },
      include: {
        sales: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const customersWithStats = customers.map(customer => {
      const salesCount = customer.sales.length
      const totalPurchases = customer.sales.reduce((sum, s) => sum + s.totalPrice, 0)

      return {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        nationalId: customer.nationalId,
        address: customer.address,
        createdAt: customer.createdAt,
        salesCount,
        totalPurchases,
        totalPaid: totalPurchases,
        totalDue: 0,
        latePayments: 0,
      }
    })

    return NextResponse.json(customersWithStats)
  } catch (error) {
    console.error('Customers GET error:', error)
    return NextResponse.json({ error: 'فشل تحميل العملاء' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  try {
    const body = await request.json()
    const parsed = CustomerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'بيانات غير صالحة', details: parsed.error.flatten() }, { status: 400 })
    }

    const existing = await db.customer.findFirst({
      where: { phone: parsed.data.phone, deletedAt: null },
    })
    if (existing) {
      return NextResponse.json({ error: 'رقم الهاتف مستخدم بالفعل لعميل آخر' }, { status: 400 })
    }

    const customer = await db.customer.create({ data: parsed.data })
    return NextResponse.json(customer)
  } catch (error) {
    console.error('Customers POST error:', error)
    return NextResponse.json({ error: 'فشل إضافة العميل' }, { status: 500 })
  }
}
