import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireOwner, isAuthError } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  const ownerError = requireOwner(auth)
  if (ownerError) return ownerError

  try {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const [
      products,
      salesByProduct,
      expenseAgg,
      recentExpenses,
      salesThisMonth,
      users,
      salesByEmployee,
    ] = await Promise.all([
      db.product.findMany({
        select: { id: true, name: true, category: true, costPrice: true, sellPrice: true },
      }),

      db.sale.groupBy({
        by: ['productId'],
        _count: { _all: true },
        _sum: { totalPrice: true },
      }),

      db.expense.aggregate({ _sum: { amount: true } }),

      db.expense.findMany({ orderBy: { date: 'desc' }, take: 50 }),

      db.sale.aggregate({
        where: { createdAt: { gte: startOfMonth } },
        _sum: { totalPrice: true },
        _count: { _all: true },
      }),

      db.user.findMany({ select: { id: true, name: true, role: true } }),

      db.sale.groupBy({ by: ['employeeId'], _count: { _all: true }, _sum: { totalPrice: true } }),
    ])

    const totalExpenses = expenseAgg._sum.amount ?? 0
    const monthRevenue = salesThisMonth._sum.totalPrice ?? 0
    const netProfit = monthRevenue - totalExpenses

    // Sales profit per product
    const salesMap = new Map(salesByProduct.map(s => [s.productId, s]))
    const salesProfit = products.map(p => {
      const s = salesMap.get(p.id)
      return {
        id: p.id,
        name: p.name,
        costPrice: p.costPrice,
        sellPrice: p.sellPrice,
        profitPerUnit: p.sellPrice - p.costPrice,
        salesCount: s?._count._all ?? 0,
        salesTotal: s?._sum.totalPrice ?? 0,
      }
    })

    // Employee performance
    const salesEmpMap = new Map(salesByEmployee.map(s => [s.employeeId, s]))
    const employeePerformance = users.map(u => ({
      id: u.id,
      name: u.name,
      salesCount: salesEmpMap.get(u.id)?._count._all ?? 0,
      salesAmount: salesEmpMap.get(u.id)?._sum.totalPrice ?? 0,
    }))

    return NextResponse.json({
      monthlyCollection: {
        collectedAmount: monthRevenue,
        expectedAmount: monthRevenue,
        collectionRate: 100,
      },
      salesProfit,
      expenses: { total: totalExpenses, items: recentExpenses },
      revenue: monthRevenue,
      netProfit,
      employeePerformance,
      priorityCollection: [],
    })
  } catch (error) {
    console.error('Reports GET error:', error)
    return NextResponse.json({ error: 'فشل تحميل التقارير' }, { status: 500 })
  }
}
