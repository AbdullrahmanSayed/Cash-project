import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireOwner, isAuthError } from '@/lib/auth'
import { z } from 'zod'

const UpdateSaleSchema = z.object({
  totalPrice: z.number().int().positive('السعر يجب أن يكون أكبر من صفر'),
  downPayment: z.number().int().min(0),
  installmentCount: z.number().int().min(0).max(60),
  monthlyAmount: z.number().int().min(0),
  note: z.string().optional(),
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

    const sale = await db.sale.findUnique({
      where: { id },
      include: { installments: true },
    })

    if (!sale) {
      return NextResponse.json({ error: 'البيعة غير موجودة' }, { status: 404 })
    }

    const hasPaid = sale.installments.some(inst => inst.status === 'paid')
    if (hasPaid) {
      return NextResponse.json(
        { error: 'لا يمكن تعديل بيعة تم دفع أقساط منها' },
        { status: 400 }
      )
    }

    const data = parsed.data

    const updated = await db.$transaction(async (tx) => {
      // Remove existing (unpaid) installments and regenerate from new figures
      await tx.installment.deleteMany({ where: { saleId: id } })

      await tx.sale.update({
        where: { id },
        data: {
          totalPrice: data.totalPrice,
          downPayment: data.downPayment,
          installmentCount: data.installmentCount,
          monthlyAmount: data.monthlyAmount,
        },
      })

      if (sale.saleType === 'installment' && data.installmentCount > 0) {
        const startDate = new Date(sale.startDate || new Date().toISOString().split('T')[0])
        const remaining = data.totalPrice - data.downPayment
        const base = Math.floor(remaining / data.installmentCount)
        const remainder = remaining - base * data.installmentCount

        const installments = Array.from({ length: data.installmentCount }, (_, i) => {
          const due = new Date(startDate)
          due.setMonth(due.getMonth() + i + 1)
          return {
            saleId: id,
            dueDate: due.toISOString().split('T')[0],
            amount: i === data.installmentCount - 1 ? base + remainder : base,
            status: 'unpaid',
          }
        })
        await tx.installment.createMany({ data: installments })
      }

      return tx.sale.findUnique({
        where: { id },
        include: {
          customer: true,
          product: true,
          employee: { select: { id: true, name: true, role: true } },
          installments: { orderBy: { dueDate: 'asc' } },
        },
      })
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

    const sale = await db.sale.findUnique({
      where: { id },
      include: { installments: true },
    })

    if (!sale) {
      return NextResponse.json({ error: 'البيعة غير موجودة' }, { status: 404 })
    }

    const hasPaid = sale.installments.some(inst => inst.status === 'paid')
    if (hasPaid) {
      return NextResponse.json(
        { error: 'لا يمكن إلغاء بيعة تم دفع أقساط منها' },
        { status: 400 }
      )
    }

    await db.$transaction([
      db.installment.deleteMany({ where: { saleId: id } }),
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
