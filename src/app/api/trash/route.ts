import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireOwner, isAuthError } from '@/lib/auth'
import { z } from 'zod'

// GET: list all soft-deleted items
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  const ownerErr = requireOwner(auth)
  if (ownerErr) return ownerErr

  try {
    const [customers, products] = await Promise.all([
      db.customer.findMany({
        where: { deletedAt: { not: null } },
        select: { id: true, name: true, phone: true, deletedAt: true },
        orderBy: { deletedAt: 'desc' },
      }),
      db.product.findMany({
        where: { deletedAt: { not: null } },
        select: { id: true, name: true, category: true, quantity: true, deletedAt: true },
        orderBy: { deletedAt: 'desc' },
      }),
    ])

    return NextResponse.json({ customers, products })
  } catch (error) {
    console.error('Trash GET error:', error)
    return NextResponse.json({ error: 'فشل تحميل المحذوفات' }, { status: 500 })
  }
}

// PUT: restore an item
const RestoreSchema = z.object({
  type: z.enum(['customer', 'product']),
  id: z.string(),
})

export async function PUT(request: NextRequest) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  const ownerErr = requireOwner(auth)
  if (ownerErr) return ownerErr

  try {
    const body = await request.json()
    const parsed = RestoreSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 })
    }

    const { type, id } = parsed.data

    if (type === 'customer') {
      await db.customer.update({ where: { id }, data: { deletedAt: null } })
    } else {
      await db.product.update({ where: { id }, data: { deletedAt: null } })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Trash PUT error:', error)
    return NextResponse.json({ error: 'فشل الاسترجاع' }, { status: 500 })
  }
}

// DELETE: permanent delete (empty trash)
export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  const ownerErr = requireOwner(auth)
  if (ownerErr) return ownerErr

  try {
    const url = new URL(request.url)
    const type = url.searchParams.get('type')
    const id = url.searchParams.get('id')

    if (!type || !id) {
      return NextResponse.json({ error: 'type و id مطلوبان' }, { status: 400 })
    }

    if (type === 'customer') {
      // Hard delete customer and all their data
      await db.$transaction(async (tx) => {
        const sales = await tx.sale.findMany({ where: { customerId: id }, select: { id: true } })
        for (const sale of sales) {
          await tx.installment.deleteMany({ where: { saleId: sale.id } })
        }
        await tx.contactLog.deleteMany({ where: { customerId: id } })
        await tx.sale.deleteMany({ where: { customerId: id } })
        await tx.customer.delete({ where: { id } })
      })
    } else if (type === 'product') {
      // Only hard delete if no sales
      const salesCount = await db.sale.count({ where: { productId: id } })
      if (salesCount > 0) {
        return NextResponse.json({ error: 'لا يمكن حذف منتج عليه مبيعات نهائياً' }, { status: 400 })
      }
      await db.product.delete({ where: { id } })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Trash DELETE error:', error)
    return NextResponse.json({ error: 'فشل الحذف النهائي' }, { status: 500 })
  }
}
