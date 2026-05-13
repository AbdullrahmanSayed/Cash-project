import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireOwner, isAuthError } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  const ownerError = requireOwner(auth)
  if (ownerError) return ownerError

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const startOfMonthStr = startOfMonth.toISOString().split('T')[0]

    const [
      paidThisMonth,
      unpaidThisMonth,
      products,
      salesByProduct,
      expenseAgg,
      recentExpenses,
      salesThisMonth,
      users,
      salesByEmployee,
      installmentsByEmployee,
      overdueInstallments,
    ] = await Promise.all([
      db.installment.findMany({ where: { status: 'paid', paidAt: { gte: startOfMonthStr } } }),
      db.installment.findMany({ where: { status: 'unpaid', dueDate: { gte: startOfMonthStr, lte: todayStr } } }),

      // Products without N+1: just the fields we need for profit calc
      db.product.findMany({
        select: { id: true, name: true, category: true, costPrice: true, sellPrice: true },
      }),

      // Sales grouped by product — replaces include: { sales: ... }
      db.sale.groupBy({
        by: ['productId'],
        _count: { _all: true },
        _sum: { totalPrice: true },
      }),

      // Expense aggregate for total
      db.expense.aggregate({ _sum: { amount: true } }),

      // Recent expenses (capped for performance)
      db.expense.findMany({ orderBy: { date: 'desc' }, take: 50 }),

      db.sale.findMany({ where: { createdAt: { gte: startOfMonth } }, select: { downPayment: true } }),

      // Users without N+1 includes
      db.user.findMany({ select: { id: true, name: true, role: true } }),

      // Sales grouped by employee
      db.sale.groupBy({ by: ['employeeId'], _count: { _all: true }, _sum: { totalPrice: true } }),

      // Paid installments grouped by receiver
      db.installment.groupBy({
        by: ['receivedBy'],
        where: { status: 'paid', paidAt: { gte: startOfMonthStr } },
        _count: { _all: true },
        _sum: { amount: true },
      }),

      // Overdue installments with customer join — targeted: only dueDate < today
      db.installment.findMany({
        where: { status: 'unpaid', dueDate: { lt: todayStr } },
        include: { sale: { include: { customer: { select: { id: true, name: true, phone: true } } } } },
      }),
    ])

    // Monthly collection stats
    const collectedAmount = paidThisMonth.reduce((s, i) => s + i.amount, 0)
    const expectedAmount = collectedAmount + unpaidThisMonth.reduce((s, i) => s + i.amount, 0)
    const collectionRate = expectedAmount > 0 ? Math.round((collectedAmount / expectedAmount) * 100) : 0

    // Revenue & profit
    const totalExpenses = expenseAgg._sum.amount ?? 0
    const downPaymentsThisMonth = salesThisMonth.reduce((s, sale) => s + sale.downPayment, 0)
    const totalRevenue = collectedAmount + downPaymentsThisMonth
    const netProfit = totalRevenue - totalExpenses

    // Sales profit per product (replaces N+1 include)
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
      }
    })

    // Employee performance (replaces N+1 includes)
    const salesEmpMap = new Map(salesByEmployee.map(s => [s.employeeId, s]))
    const instEmpMap = new Map(installmentsByEmployee.map(i => [i.receivedBy, i]))
    const employeePerformance = users.map(u => ({
      id: u.id,
      name: u.name,
      salesCount: salesEmpMap.get(u.id)?._count._all ?? 0,
      salesAmount: salesEmpMap.get(u.id)?._sum.totalPrice ?? 0,
      collectionCount: instEmpMap.get(u.id)?._count._all ?? 0,
      collectionAmount: instEmpMap.get(u.id)?._sum.amount ?? 0,
    }))

    // Priority collection — overdue customers grouped by customer, sorted by total overdue
    const customerOverdue = new Map<string, { name: string; phone: string; totalOverdue: number; overdueCount: number }>()
    for (const inst of overdueInstallments) {
      const c = inst.sale.customer
      const existing = customerOverdue.get(c.id) ?? { name: c.name, phone: c.phone, totalOverdue: 0, overdueCount: 0 }
      existing.totalOverdue += inst.amount
      existing.overdueCount += 1
      customerOverdue.set(c.id, existing)
    }
    const priorityCollection = Array.from(customerOverdue.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.totalOverdue - a.totalOverdue)

    return NextResponse.json({
      monthlyCollection: { collectedAmount, expectedAmount, collectionRate },
      salesProfit,
      expenses: { total: totalExpenses, items: recentExpenses },
      revenue: totalRevenue,
      netProfit,
      employeePerformance,
      priorityCollection,
    })
  } catch (error) {
    console.error('Reports GET error:', error)
    return NextResponse.json({ error: 'فشل تحميل التقارير' }, { status: 500 })
  }
}
