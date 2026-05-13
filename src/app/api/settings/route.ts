import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireOwner, isAuthError } from '@/lib/auth'

// Default settings
const DEFAULTS: Record<string, string> = {
  showroom_name: 'المعرض',
  showroom_phone: '',
  showroom_address: '',
  owner_email: '',
  reminder_enabled: 'true',
  whatsapp_template: 'مرحباً {name}، لديك قسط مستحق بقيمة {amount} بتاريخ {date}. برجاء التواصل مع {showroom}',
  product_categories: JSON.stringify(['موبايل', 'أجهزة كهربائية', 'إكسسوار']),
  expense_categories: JSON.stringify(['إيجار', 'كهرباء', 'مرتبات', 'أخرى']),
  initial_capital: '0',
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  try {
    const rows = await db.setting.findMany()
    const settings: Record<string, string> = { ...DEFAULTS }
    for (const row of rows) {
      settings[row.key] = row.value
    }
    return NextResponse.json(settings)
  } catch (error) {
    console.error('Settings GET error:', error)
    return NextResponse.json({ error: 'فشل تحميل الإعدادات' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  const ownerErr = requireOwner(auth)
  if (ownerErr) return ownerErr

  try {
    const body = await request.json() as Record<string, string>

    await Promise.all(
      Object.entries(body).map(([key, value]) =>
        db.setting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        })
      )
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Settings PUT error:', error)
    return NextResponse.json({ error: 'فشل حفظ الإعدادات' }, { status: 500 })
  }
}
