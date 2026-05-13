import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, isAuthError } from '@/lib/auth'

const LOW_STOCK_THRESHOLD = 2

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

    const staleDate = new Date()
    staleDate.setDate(staleDate.getDate() - 60)
    const staleDateStr = staleDate.toISOString().split('T')[0]

    const [
      todayAgg,
      monthAgg,
      lowStock,
      staleProducts,
      recentSales,
    ] = await Promise.all([
      // Today sales
      db.sale.aggregate({
        where: { createdAt: { gte: today } },
        _sum: { totalPrice: true },
        _count: { _all: true },
      }),

      // Month sales
      db.sale.aggregate({
        where: { createdAt: { gte: monthStart } },
        _sum: { totalPrice: true },
        _count: { _all: true },
      }),

      // Low stock
      db.product.findMany({
        where: { quantity: { lte: LOW_STOCK_THRESHOLD }, deletedAt: null },
        select: { id: true, name: true, category: true, quantity: true },
      }),

      // Stale products
      db.$queryRaw<Array<{ id: string; name: string; category: string; quantity: number }>>`
        SELECT p.id, p.name, p.category, p.quantity
        FROM "Product" p
        LEFT JOIN (
          SELECT "productId", MAX("createdAt") as last_sale
          FROM "Sale"
          GROUP BY "productId"
        ) s ON s."productId" = p.id
        WHERE p."deletedAt" IS NULL
          AND p.quantity > 0
          AND (s.last_sale IS NULL OR s.last_sale < ${staleDateStr}::date)
        LIMIT 20
      `,

      // Recent 10 sales
      db.sale.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          invoiceNumber: true,
          totalPrice: true,
          createdAt: true,
          customer: { select: { name: true } },
          product: { select: { name: true } },
          employee: { select: { name: true } },
        },
      }),
    ])

    return NextResponse.json({
      todaySalesAmount: todayAgg._sum.totalPrice ?? 0,
      todaySalesCount: todayAgg._count._all,
      monthSalesAmount: monthAgg._sum.totalPrice ?? 0,
      monthSalesCount: monthAgg._count._all,
      lowStock,
      staleProducts,
      recentSales,
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json({ error: 'فشل تحميل لوحة التحكم' }, { status: 500 })
  }
}
