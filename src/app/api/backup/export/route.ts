import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireOwner, isAuthError } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  const ownerError = requireOwner(auth)
  if (ownerError) return ownerError

  try {
    const [users, suppliers, products, customers, sales, installments, contactLogs, expenses] =
      await Promise.all([
        db.user.findMany({ select: { id: true, name: true, role: true, createdAt: true, updatedAt: true } }),
        db.supplier.findMany(),
        db.product.findMany(),
        db.customer.findMany(),
        db.sale.findMany(),
        db.installment.findMany(),
        db.contactLog.findMany(),
        db.expense.findMany(),
      ])

    return NextResponse.json({
      version: '1.0',
      exportDate: new Date().toISOString(),
      users,      // PINs excluded
      suppliers,
      products,
      customers,
      sales,
      installments,
      contactLogs,
      expenses,
    })
  } catch (error) {
    console.error('Backup export error:', error)
    return NextResponse.json({ error: 'فشل تصدير البيانات' }, { status: 500 })
  }
}
