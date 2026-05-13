import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, isAuthError } from '@/lib/auth'
import { z } from 'zod'

const SaleSchema = z.object({
  customerId: z.string().min(1),
  productId: z.string().min(1),
  totalPrice: z.number().int().positive('السعر يجب أن يكون أكبر من صفر'),
})

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  try {
    const sales = await db.sale.findMany({
      include: {
        customer: true,
        product: true,
        employee: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(sales)
  } catch (error) {
    console.error('Sales GET error:', error)
    return NextResponse.json({ error: 'فشل تحميل المبيعات' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  try {
    const body = await request.json()
    const parsed = SaleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'بيانات غير صالحة', details: parsed.error.flatten() }, { status: 400 })
    }

    const data = parsed.data

    const sale = await db.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: data.productId } })
      if (!product) throw new Error('PRODUCT_NOT_FOUND')
      if (product.quantity < 1) throw new Error('OUT_OF_STOCK')

      const maxInvoice = await tx.sale.aggregate({ _max: { invoiceNumber: true } })
      const invoiceNumber = (maxInvoice._max.invoiceNumber ?? 0) + 1

      const created = await tx.sale.create({
        data: {
          customerId: data.customerId,
          productId: data.productId,
          employeeId: auth.id,
          saleType: 'cash',
          totalPrice: data.totalPrice,
          downPayment: data.totalPrice,
          installmentCount: 0,
          monthlyAmount: 0,
          startDate: new Date().toISOString().split('T')[0],
          invoiceNumber,
        },
        include: {
          customer: true,
          product: true,
          employee: { select: { id: true, name: true, role: true } },
        },
      })

      await tx.product.update({
        where: { id: data.productId },
        data: { quantity: { decrement: 1 } },
      })

      return created
    })

    return NextResponse.json(sale)
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'PRODUCT_NOT_FOUND') return NextResponse.json({ error: 'المنتج غير موجود' }, { status: 404 })
      if (error.message === 'OUT_OF_STOCK') return NextResponse.json({ error: 'الكمية غير كافية في المخزون' }, { status: 400 })
    }
    console.error('Sales POST error:', error)
    return NextResponse.json({ error: 'فشل إضافة البيع' }, { status: 500 })
  }
}
