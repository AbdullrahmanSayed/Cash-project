import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, isAuthError } from '@/lib/auth'
import { z } from 'zod'

const SupplierSchema = z.object({
  name: z.string().min(2, 'اسم المورد مطلوب').max(100),
  phone: z.string().max(20).optional().default(''),
  notes: z.string().max(300).optional().default(''),
})

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  try {
    const suppliers = await db.supplier.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(suppliers.map(s => ({ ...s, productCount: s._count.products, _count: undefined })))
  } catch (error) {
    console.error('Suppliers GET error:', error)
    return NextResponse.json({ error: 'فشل تحميل الموردين' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  try {
    const body = await request.json()
    const parsed = SupplierSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'بيانات غير صالحة', details: parsed.error.flatten() }, { status: 400 })
    }

    const supplier = await db.supplier.create({ data: parsed.data })
    return NextResponse.json(supplier)
  } catch (error) {
    console.error('Suppliers POST error:', error)
    return NextResponse.json({ error: 'فشل إضافة المورد' }, { status: 500 })
  }
}
