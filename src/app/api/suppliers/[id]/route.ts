import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireOwner, isAuthError } from '@/lib/auth'
import { z } from 'zod'

const UpdateSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().max(20).optional().default(''),
  notes: z.string().max(300).optional().default(''),
})

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

    const supplier = await db.supplier.update({ where: { id }, data: parsed.data })
    return NextResponse.json(supplier)
  } catch (error) {
    console.error('Supplier PUT error:', error)
    return NextResponse.json({ error: 'فشل تعديل المورد' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  const ownerError = requireOwner(auth)
  if (ownerError) return ownerError

  try {
    const { id } = await params
    const productsCount = await db.product.count({ where: { supplierId: id } })
    if (productsCount > 0) {
      return NextResponse.json({ error: 'لا يمكن حذف مورد عليه منتجات' }, { status: 400 })
    }
    await db.supplier.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Supplier DELETE error:', error)
    return NextResponse.json({ error: 'فشل حذف المورد' }, { status: 500 })
  }
}
