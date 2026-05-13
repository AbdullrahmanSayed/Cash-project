import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const SetupSchema = z.object({
  showroomName: z.string().min(2, 'اسم المعرض مطلوب').max(100),
  showroomPhone: z.string().max(20).optional().default(''),
  ownerName: z.string().min(2, 'اسم المالك مطلوب').max(50),
  ownerPin: z.string().regex(/^\d{4}$/, 'PIN يجب أن يكون 4 أرقام'),
  employeeName: z.string().min(2).max(50).optional().default('موظف'),
  employeePin: z.string().regex(/^\d{4}$/).optional().default('5678'),
})

// GET: check if setup is needed
export async function GET() {
  try {
    const userCount = await db.user.count()
    return NextResponse.json({ needsSetup: userCount === 0 })
  } catch {
    return NextResponse.json({ needsSetup: false })
  }
}

// POST: run initial setup
export async function POST(request: NextRequest) {
  try {
    // Only allow if no users exist yet
    const userCount = await db.user.count()
    if (userCount > 0) {
      return NextResponse.json({ error: 'النظام مُعدَّ مسبقاً' }, { status: 400 })
    }

    const body = await request.json()
    const parsed = SetupSchema.safeParse(body)
    if (!parsed.success) {
      const msg = parsed.error.issues?.[0]?.message ?? 'بيانات غير صالحة'
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    const d = parsed.data
    const [ownerHash, employeeHash] = await Promise.all([
      bcrypt.hash(d.ownerPin, 10),
      bcrypt.hash(d.employeePin, 10),
    ])

    await db.$transaction(async (tx) => {
      // Create users
      await tx.user.create({ data: { name: d.ownerName, role: 'owner', pin: ownerHash } })
      await tx.user.create({ data: { name: d.employeeName, role: 'employee', pin: employeeHash } })

      // Save showroom settings
      const settingsToSave = [
        { key: 'showroom_name', value: d.showroomName },
        { key: 'showroom_phone', value: d.showroomPhone },
        { key: 'product_categories', value: JSON.stringify(['موبايل', 'أجهزة كهربائية', 'إكسسوار']) },
        { key: 'reminder_enabled', value: 'true' },
        { key: 'initial_capital', value: '0' },
        { key: 'whatsapp_template', value: 'مرحباً {name}، لديك قسط مستحق بقيمة {amount} بتاريخ {date}. برجاء التواصل مع {showroom}' },
      ]
      await Promise.all(settingsToSave.map(s =>
        tx.setting.upsert({ where: { key: s.key }, update: { value: s.value }, create: s })
      ))
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json({ error: 'فشل الإعداد' }, { status: 500 })
  }
}
