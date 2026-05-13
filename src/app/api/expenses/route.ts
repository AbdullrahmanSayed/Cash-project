import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireOwner, isAuthError } from '@/lib/auth'
import { z } from 'zod'

const ExpenseSchema = z.object({
  category: z.enum(['إيجار', 'كهرباء', 'مرتبات', 'أخرى']),
  amount: z.number().int().positive('المبلغ يجب أن يكون أكبر من صفر'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(200).optional().default(''),
})

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  try {
    const expenses = await db.expense.findMany({ orderBy: { date: 'desc' } })
    return NextResponse.json(expenses)
  } catch (error) {
    console.error('Expenses GET error:', error)
    return NextResponse.json({ error: 'فشل تحميل المصروفات' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  const ownerError = requireOwner(auth)
  if (ownerError) return ownerError

  try {
    const body = await request.json()
    const parsed = ExpenseSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'بيانات غير صالحة', details: parsed.error.flatten() }, { status: 400 })
    }

    const expense = await db.expense.create({ data: parsed.data })
    return NextResponse.json(expense)
  } catch (error) {
    console.error('Expenses POST error:', error)
    return NextResponse.json({ error: 'فشل إضافة المصروف' }, { status: 500 })
  }
}
