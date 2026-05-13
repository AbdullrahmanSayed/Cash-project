import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireOwner, isAuthError } from '@/lib/auth'
import { z } from 'zod'

const UserImport = z.object({ id: z.string(), name: z.string(), role: z.enum(['owner', 'employee']), pin: z.string(), createdAt: z.string(), updatedAt: z.string() })
const CustomerImport = z.object({ id: z.string(), name: z.string(), phone: z.string(), nationalId: z.string().optional().default(''), address: z.string().optional().default(''), createdAt: z.string(), updatedAt: z.string(), deletedAt: z.string().nullable().optional() })
const ProductImport = z.object({ id: z.string(), name: z.string(), category: z.string(), quantity: z.number().int(), costPrice: z.number().int(), sellPrice: z.number().int(), supplierId: z.string().nullable().optional(), createdAt: z.string(), updatedAt: z.string(), deletedAt: z.string().nullable().optional() })
const SaleImport = z.object({ id: z.string(), customerId: z.string(), productId: z.string(), employeeId: z.string(), saleType: z.enum(['cash', 'installment']), totalPrice: z.number().int(), downPayment: z.number().int(), installmentCount: z.number().int(), monthlyAmount: z.number().int(), startDate: z.string(), invoiceNumber: z.number().int().nullable().optional(), createdAt: z.string(), updatedAt: z.string() })
const SupplierImport = z.object({ id: z.string(), name: z.string(), phone: z.string().optional().default(''), notes: z.string().optional().default(''), createdAt: z.string(), updatedAt: z.string() })

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  const ownerError = requireOwner(auth)
  if (ownerError) return ownerError

  try {
    const data = await request.json()

    if (!data || typeof data !== 'object') {
      return NextResponse.json({ error: 'ملف الاستيراد غير صالح' }, { status: 400 })
    }

    const usersResult = z.array(UserImport).safeParse(data.users ?? [])
    const customersResult = z.array(CustomerImport).safeParse(data.customers ?? [])
    const productsResult = z.array(ProductImport).safeParse(data.products ?? [])
    const salesResult = z.array(SaleImport).safeParse(data.sales ?? [])
    const suppliersResult = z.array(SupplierImport).safeParse(data.suppliers ?? [])

    if (
      !usersResult.success ||
      !customersResult.success ||
      !productsResult.success ||
      !salesResult.success ||
      !suppliersResult.success
    ) {
      return NextResponse.json({ error: 'بيانات النسخة الاحتياطية غير صالحة' }, { status: 400 })
    }

    await db.$transaction(async (tx) => {
      await tx.sale.deleteMany()
      await tx.expense.deleteMany()
      await tx.product.deleteMany()
      await tx.supplier.deleteMany()
      await tx.customer.deleteMany()

      if (suppliersResult.data.length) await tx.supplier.createMany({ data: suppliersResult.data })
      if (customersResult.data.length) await tx.customer.createMany({ data: customersResult.data })
      if (productsResult.data.length) await tx.product.createMany({ data: productsResult.data })
      if (salesResult.data.length) await tx.sale.createMany({ data: salesResult.data })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const expenses = Array.isArray(data.expenses) ? data.expenses : []
      if (expenses.length) await tx.expense.createMany({ data: expenses })
    })

    return NextResponse.json({ message: 'تم استيراد البيانات بنجاح' })
  } catch (error) {
    console.error('Backup import error:', error)
    return NextResponse.json({ error: 'فشل استيراد البيانات' }, { status: 500 })
  }
}
