import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireOwner, isAuthError } from '@/lib/auth'
import { z } from 'zod'

const UpdateSchema = z.object({
  name: z.string().min(2).max(100),
  category: z.string().min(1).max(50),
  quantity: z.number().int().min(0),
  costPrice: z.number().int().min(0),
  sellPrice: z.number().int().min(0),
  supplierId: z.string().nullable().optional(),
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

    const product = await db.product.update({
      where: { id },
      data: { ...parsed.data, supplierId: parsed.data.supplierId ?? null },
      include: { supplier: true },
    })
    return NextResponse.json(product)
  } catch (error) {
    console.error('Product PUT error:', error)
    return NextResponse.json({ error: 'فشل تعديل المنتج' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  const ownerError = requireOwner(auth)
  if (ownerError) return ownerError

  try {
    const { id } = await params
    // Soft delete — preserve product history in sales
    await db.product.update({ where: { id }, data: { deletedAt: new Date() } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Product DELETE error:', error)
    return NextResponse.json({ error: 'فشل حذف المنتج' }, { status: 500 })
  }
}
