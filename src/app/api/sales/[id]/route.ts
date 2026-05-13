import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireOwner, isAuthError } from '@/lib/auth'
import { z } from 'zod'

const UpdateSaleSchema = z.object({
  totalPrice: z.number().int().positive('السعر يجب أن يكون أكبر من صفر'),
})

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  const ownerError = requireOwner(auth)
  if (ownerError) return ownerError

  try {
    const { id } = await context.params
    const body = await request.json()
    const parsed = UpdateSaleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'بيانات غير صالحة', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const sale = await db.sale.findUnique({ where: { id } })
    if (!sale) {
      return NextResponse.json({ error: 'البيعة غير موجودة' }, { status: 404 })
    }

    const updated = await db.sale.update({
      where: { id },
      data: {
        totalPrice: parsed.data.totalPrice,
        downPayment: parsed.data.totalPrice,
      },
      include: {
        customer: true,
        product: true,
        employee: { select: { id: true, name: true, role: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Edit sale error:', error)
    return NextResponse.json({ error: 'فشل تعديل البيعة' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  const ownerError = requireOwner(auth)
  if (ownerError) return ownerError

  try {
    const { id } = await context.params

    const sale = await db.sale.findUnique({ where: { id } })
    if (!sale) {
      return NextResponse.json({ error: 'البيعة غير موجودة' }, { status: 404 })
    }

    await db.$transaction([
      db.product.update({
        where: { id: sale.productId },
        data: { quantity: { increment: 1 } },
      }),
      db.sale.delete({ where: { id } }),
    ])

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Cancel sale error:', error)
    return NextResponse.json({ error: 'فشل إلغاء البيعة' }, { status: 500 })
  }
}
