import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { requireAuth, requireOwner, isAuthError } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  const ownerError = requireOwner(auth)
  if (ownerError) return ownerError

  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'غير متاح في بيئة الإنتاج' }, { status: 403 })
  }

  try {
    const userCount = await db.user.count()
    if (userCount > 0) {
      return NextResponse.json({ message: 'Database already seeded', seeded: false })
    }

    const [ownerPin, employeePin] = await Promise.all([
      bcrypt.hash('1234', 10),
      bcrypt.hash('5678', 10),
    ])

    // Create users
    const owner = await db.user.create({
      data: { name: 'أحمد المنصوري', role: 'owner', pin: ownerPin }
    })
    const employee = await db.user.create({
      data: { name: 'محمد شريف', role: 'employee', pin: employeePin }
    })

    // Create suppliers
    const supplier1 = await db.supplier.create({
      data: { name: 'شركة النور للإلكترونيات', phone: '01012345678', notes: 'مورد رئيسي للموبايلات' }
    })
    const supplier2 = await db.supplier.create({
      data: { name: 'مؤسسة الأمان', phone: '01198765432', notes: 'أجهزة كهربائية' }
    })
    const supplier3 = await db.supplier.create({
      data: { name: 'تجارة الجملة', phone: '01234567890', notes: 'إكسسورات' }
    })

    // Create products
    const products = await Promise.all([
      db.product.create({ data: { name: 'iPhone 15 Pro Max', category: 'موبايل', quantity: 5, costPrice: 45000, sellPrice: 52000, supplierId: supplier1.id } }),
      db.product.create({ data: { name: 'Samsung Galaxy S24', category: 'موبايل', quantity: 3, costPrice: 28000, sellPrice: 33000, supplierId: supplier1.id } }),
      db.product.create({ data: { name: 'Xiaomi Redmi Note 13', category: 'موبايل', quantity: 8, costPrice: 8000, sellPrice: 10500, supplierId: supplier1.id } }),
      db.product.create({ data: { name: 'OPPO Reno 11', category: 'موبايل', quantity: 2, costPrice: 12000, sellPrice: 15500, supplierId: supplier1.id } }),
      db.product.create({ data: { name: 'تلفزيون سامسونج 55 بوصة', category: 'أجهزة كهربائية', quantity: 2, costPrice: 18000, sellPrice: 22000, supplierId: supplier2.id } }),
      db.product.create({ data: { name: 'ثلاجة ال جي 18 قدم', category: 'أجهزة كهربائية', quantity: 1, costPrice: 15000, sellPrice: 19000, supplierId: supplier2.id } }),
      db.product.create({ data: { name: 'غسالة أوتوماتيك 8 كجم', category: 'أجهزة كهربائية', quantity: 3, costPrice: 10000, sellPrice: 13000, supplierId: supplier2.id } }),
      db.product.create({ data: { name: 'كفر حماية iPhone', category: 'إكسسوار', quantity: 25, costPrice: 50, sellPrice: 150, supplierId: supplier3.id } }),
      db.product.create({ data: { name: 'سماعات بلوتوث', category: 'إكسسوار', quantity: 12, costPrice: 300, sellPrice: 750, supplierId: supplier3.id } }),
      db.product.create({ data: { name: 'شاحن سريع 65 وات', category: 'إكسسوار', quantity: 15, costPrice: 200, sellPrice: 500, supplierId: supplier3.id } }),
    ])

    // Create customers
    const customers = await Promise.all([
      db.customer.create({ data: { name: 'أحمد حسن محمود', phone: '01055551234', nationalId: '29901011234567', address: 'القاهرة - المعادي' } }),
      db.customer.create({ data: { name: 'فاطمة علي عبدالله', phone: '01166667890', nationalId: '30005231234567', address: 'الجيزة - الدقي' } }),
      db.customer.create({ data: { name: 'محمد سعيد إبراهيم', phone: '01277774567', nationalId: '29811071234567', address: 'القاهرة - مدينة نصر' } }),
      db.customer.create({ data: { name: 'نورا خالد أحمد', phone: '01088885678', nationalId: '30106151234567', address: 'القاهرة - مصر الجديدة' } }),
      db.customer.create({ data: { name: 'حسن عبدالرحمن يوسف', phone: '01199996789', nationalId: '29503031234567', address: 'الجيزة - 6 أكتوبر' } }),
    ])

    const today = new Date()
    const formatStr = (d: Date) => d.toISOString().split('T')[0]

    // Create cash sales
    await db.sale.create({
      data: {
        customerId: customers[0].id,
        productId: products[7].id,
        employeeId: owner.id,
        saleType: 'cash',
        totalPrice: 150,
        downPayment: 150,
        installmentCount: 0,
        monthlyAmount: 0,
        startDate: formatStr(today),
      }
    })

    await db.sale.create({
      data: {
        customerId: customers[1].id,
        productId: products[0].id,
        employeeId: owner.id,
        saleType: 'cash',
        totalPrice: 52000,
        downPayment: 52000,
        installmentCount: 0,
        monthlyAmount: 0,
        startDate: formatStr(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)),
      }
    })

    await db.sale.create({
      data: {
        customerId: customers[2].id,
        productId: products[1].id,
        employeeId: employee.id,
        saleType: 'cash',
        totalPrice: 33000,
        downPayment: 33000,
        installmentCount: 0,
        monthlyAmount: 0,
        startDate: formatStr(new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000)),
      }
    })

    await db.sale.create({
      data: {
        customerId: customers[3].id,
        productId: products[2].id,
        employeeId: owner.id,
        saleType: 'cash',
        totalPrice: 10500,
        downPayment: 10500,
        installmentCount: 0,
        monthlyAmount: 0,
        startDate: formatStr(new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000)),
      }
    })

    await db.sale.create({
      data: {
        customerId: customers[4].id,
        productId: products[4].id,
        employeeId: employee.id,
        saleType: 'cash',
        totalPrice: 22000,
        downPayment: 22000,
        installmentCount: 0,
        monthlyAmount: 0,
        startDate: formatStr(new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)),
      }
    })

    // Create expenses
    await Promise.all([
      db.expense.create({ data: { category: 'إيجار', amount: 5000, date: formatStr(today), note: 'إيجار المحل' } }),
      db.expense.create({ data: { category: 'كهرباء', amount: 1200, date: formatStr(today), note: 'فاتورة الكهرباء' } }),
      db.expense.create({ data: { category: 'مرتبات', amount: 8000, date: formatStr(today), note: 'مرتب موظفين' } }),
    ])

    // Update product quantities
    await db.product.update({ where: { id: products[7].id }, data: { quantity: { decrement: 1 } } })
    await db.product.update({ where: { id: products[0].id }, data: { quantity: { decrement: 1 } } })
    await db.product.update({ where: { id: products[1].id }, data: { quantity: { decrement: 1 } } })
    await db.product.update({ where: { id: products[2].id }, data: { quantity: { decrement: 1 } } })
    await db.product.update({ where: { id: products[4].id }, data: { quantity: { decrement: 1 } } })

    return NextResponse.json({ message: 'Database seeded successfully', seeded: true })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: 'Failed to seed database' }, { status: 500 })
  }
}
