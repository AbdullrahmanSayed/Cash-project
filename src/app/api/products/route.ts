import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, isAuthError } from '@/lib/auth'
import { z } from 'zod'

const ProductSchema = z.object({
  name: z.string().min(2, 'اسم المنتج مطلوب').max(100),
  category: z.string().min(1, 'الفئة مطلوبة').max(50),
  quantity: z.number().int().min(0).default(0),
  costPrice: z.number().int().min(0).default(0),
  sellPrice: z.number().int().min(0),
  supplierId: z.string().nullable().optional(),
})

const STALE_DAYS = 60

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  try {
    const staleDate = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000)

    const products = await db.product.findMany({
      where: { deletedAt: null },
      include: { supplier: true, sales: { select: { createdAt: true }, orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { createdAt: 'desc' },
    })

    const productsWithStale = products.map(p => {
      const lastSale = p.sales[0]?.createdAt
      return {
        ...p,
        sales: undefined,
        isStale: !lastSale || lastSale < staleDate,
      }
    })

    return NextResponse.json(productsWithStale)
  } catch (error) {
    console.error('Products GET error:', error)
    return NextResponse.json({ error: 'فشل تحميل المنتجات' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  try {
    const body = await request.json()
    const parsed = ProductSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'بيانات غير صالحة', details: parsed.error.flatten() }, { status: 400 })
    }

    const product = await db.product.create({
      data: { ...parsed.data, supplierId: parsed.data.supplierId ?? null },
      include: { supplier: true },
    })
    return NextResponse.json(product)
  } catch (error) {
    console.error('Products POST error:', error)
    return NextResponse.json({ error: 'فشل إضافة المنتج' }, { status: 500 })
  }
}
