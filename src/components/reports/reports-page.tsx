'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { formatCurrency } from '@/lib/utils'
import { getWhatsAppLink } from '@/lib/utils'
import { BarChart3, TrendingUp, DollarSign, Users, MessageCircle, Download } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { toast } from 'sonner'

interface ReportData {
  monthlyCollection: { collectedAmount: number; expectedAmount: number; collectionRate: number }
  salesProfit: Array<{ id: string; name: string; costPrice: number; sellPrice: number; profitPerUnit: number; salesCount: number }>
  expenses: { total: number; items: Array<{ id: string; category: string; amount: number; date: string; note: string }> }
  revenue: number
  netProfit: number
  employeePerformance: Array<{ id: string; name: string; salesCount: number; salesAmount: number; collectionCount: number; collectionAmount: number }>
  priorityCollection: Array<{ id: string; name: string; phone: string; totalOverdue: number; overdueCount: number }>
}

function exportCSV(data: ReportData) {
  const BOM = '﻿'
  const rows = [
    ['تقرير أرباح المبيعات — ' + new Date().toLocaleDateString('ar-EG')],
    [],
    ['المنتج', 'سعر التكلفة', 'سعر البيع', 'الربح/وحدة', 'عدد المبيعات', 'إجمالي الربح'],
    ...data.salesProfit.filter(p => p.salesCount > 0).map(p => [
      p.name, p.costPrice, p.sellPrice, p.profitPerUnit, p.salesCount, p.profitPerUnit * p.salesCount
    ]),
    [],
    ['ملخص مالي'],
    ['الإيرادات', data.revenue],
    ['المصروفات', data.expenses.total],
    ['صافي الربح', data.netProfit],
    [],
    ['المصروفات التفصيلية'],
    ['الفئة', 'المبلغ', 'التاريخ', 'ملاحظة'],
    ...data.expenses.items.map(e => [e.category, e.amount, e.date, e.note]),
  ]
  const csv = BOM + rows.map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `تقرير_المعرض_${new Date().toLocaleDateString('ar-EG').replace(/\//g, '-')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function ReportsPage() {
  const { currentUser } = useAppStore()
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [capital, setCapital] = useState(0)

  useEffect(() => { loadReports() }, [])

  const loadReports = async () => {
    try {
      const [repRes, settingsRes] = await Promise.all([fetch('/api/reports'), fetch('/api/settings')])
      setData(await repRes.json())
      const settings = await settingsRes.json()
      if (settings.initial_capital) setCapital(Number(settings.initial_capital) || 0)
    } catch { toast.error('فشل تحميل التقارير') }
    finally { setLoading(false) }
  }

  if (currentUser?.role !== 'owner') {
    return <div className="text-center text-muted-foreground py-8">هذه الصفحة متاحة فقط لصاحب المعرض</div>
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  if (!data) return null

  // Chart data for top products
  const chartData = data.salesProfit
    .filter(p => p.salesCount > 0)
    .sort((a, b) => (b.profitPerUnit * b.salesCount) - (a.profitPerUnit * a.salesCount))
    .slice(0, 8)
    .map(p => ({ name: p.name.length > 12 ? p.name.slice(0, 12) + '…' : p.name, ربح: p.profitPerUnit * p.salesCount }))

  return (
    <div className="space-y-6">
      {/* Export button */}
      <div className="flex justify-end">
        <button
          onClick={() => exportCSV(data)}
          className="flex items-center gap-2 px-4 py-2 bg-[#151821] border border-[#1E2233] text-sm text-foreground rounded-xl hover:border-amber-500/50 transition-colors"
        >
          <Download className="w-4 h-4 text-amber-500" />
          تصدير Excel
        </button>
      </div>

      {/* Profit Chart */}
      {chartData.length > 0 && (
        <div className="bg-[#151821] rounded-2xl border border-[#1E2233] p-5">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-foreground">أعلى المنتجات ربحاً</h2>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2233" />
              <XAxis dataKey="name" tick={{ fill: '#7B829A', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#7B829A', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => (v / 1000) + 'k'} />
              <Tooltip
                contentStyle={{ background: '#151821', border: '1px solid #1E2233', borderRadius: 8, color: '#e8eaed' }}
                formatter={(v: number) => [v.toLocaleString('ar-EG') + ' ج.م', 'الربح']}
              />
              <Bar dataKey="ربح" radius={[6, 6, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? '#F59E0B' : i === 1 ? '#D97706' : '#1A1E2A'} stroke={i < 2 ? '#F59E0B40' : '#1E2233'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Monthly Collection */}
      <div className="bg-[#151821] rounded-2xl border border-[#1E2233] p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-bold text-foreground">تحصيل الشهر</h2>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">المحصل</p>
            <p className="text-lg font-bold text-green-500">{formatCurrency(data.monthlyCollection.collectedAmount)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">المتوقع</p>
            <p className="text-lg font-bold text-blue-500">{formatCurrency(data.monthlyCollection.expectedAmount)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">نسبة التحصيل</p>
            <p className="text-lg font-bold text-amber-500">{data.monthlyCollection.collectionRate}%</p>
          </div>
        </div>
        <Progress value={data.monthlyCollection.collectionRate} className="h-3 bg-[#1A1E2A]" />
      </div>

      {/* Capital ROI Card */}
      {capital > 0 && (
        <div className="bg-[#151821] rounded-2xl border border-[#1E2233] p-5">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-green-400" />
            <h2 className="text-lg font-bold text-foreground">رأس المال والعائد</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-[#1A1E2A] rounded-xl">
              <p className="text-xs text-muted-foreground mb-1">رأس المال</p>
              <p className="text-base font-bold text-blue-400">{formatCurrency(capital)}</p>
            </div>
            <div className="text-center p-3 bg-[#1A1E2A] rounded-xl">
              <p className="text-xs text-muted-foreground mb-1">الإيرادات</p>
              <p className="text-base font-bold text-green-400">{formatCurrency(data.revenue)}</p>
            </div>
            <div className="text-center p-3 bg-[#1A1E2A] rounded-xl">
              <p className="text-xs text-muted-foreground mb-1">صافي الربح</p>
              <p className={`text-base font-bold ${data.netProfit >= 0 ? 'text-amber-400' : 'text-red-400'}`}>{formatCurrency(data.netProfit)}</p>
            </div>
            <div className="text-center p-3 bg-[#1A1E2A] rounded-xl">
              <p className="text-xs text-muted-foreground mb-1">العائد على رأس المال</p>
              <p className={`text-base font-bold ${data.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {capital > 0 ? ((data.netProfit / capital) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Revenue & Profit */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-[#151821] rounded-2xl border border-[#1E2233] p-6 text-center">
          <DollarSign className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-1">الإيرادات</p>
          <p className="text-xl font-bold text-foreground">{formatCurrency(data.revenue)}</p>
        </div>
        <div className="bg-[#151821] rounded-2xl border border-[#1E2233] p-6 text-center">
          <DollarSign className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-1">المصروفات</p>
          <p className="text-xl font-bold text-foreground">{formatCurrency(data.expenses.total)}</p>
        </div>
        <div className="bg-[#151821] rounded-2xl border border-[#1E2233] p-6 text-center">
          <DollarSign className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-1">صافي الربح</p>
          <p className={`text-xl font-bold ${data.netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>{formatCurrency(data.netProfit)}</p>
        </div>
      </div>

      {/* Sales Profit Table */}
      <div className="bg-[#151821] rounded-2xl border border-[#1E2233] overflow-hidden">
        <div className="p-4 border-b border-[#1E2233] flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-bold text-foreground">أرباح المبيعات</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead>
              <tr>
                <th>المنتج</th>
                <th>سعر التكلفة</th>
                <th>سعر البيع</th>
                <th>الربح/وحدة</th>
                <th>عدد المبيعات</th>
                <th>إجمالي الربح</th>
              </tr>
            </thead>
            <tbody>
              {data.salesProfit.filter(p => p.salesCount > 0).map(p => (
                <tr key={p.id}>
                  <td className="font-medium">{p.name}</td>
                  <td>{formatCurrency(p.costPrice)}</td>
                  <td>{formatCurrency(p.sellPrice)}</td>
                  <td className="text-green-500 font-semibold">{formatCurrency(p.profitPerUnit)}</td>
                  <td>{p.salesCount}</td>
                  <td className="text-green-500 font-bold">{formatCurrency(p.profitPerUnit * p.salesCount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Employee Performance */}
      <div className="bg-[#151821] rounded-2xl border border-[#1E2233] overflow-hidden">
        <div className="p-4 border-b border-[#1E2233] flex items-center gap-2">
          <Users className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-bold text-foreground">أداء الموظفين</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead>
              <tr>
                <th>الموظف</th>
                <th>عدد المبيعات</th>
                <th>قيمة المبيعات</th>
                <th>عدد التحصيلات</th>
                <th>قيمة التحصيلات</th>
              </tr>
            </thead>
            <tbody>
              {data.employeePerformance.map(e => (
                <tr key={e.id}>
                  <td className="font-medium">{e.name}</td>
                  <td>{e.salesCount}</td>
                  <td className="font-semibold">{formatCurrency(e.salesAmount)}</td>
                  <td>{e.collectionCount}</td>
                  <td className="font-semibold text-green-500">{formatCurrency(e.collectionAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Priority Collection */}
      <div className="bg-[#151821] rounded-2xl border border-[#1E2233] overflow-hidden">
        <div className="p-4 border-b border-[#1E2233] flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-red-500" />
          <h2 className="text-lg font-bold text-foreground">قائمة الأولوية للتحصيل</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>العميل</th>
                <th>عدد الأقساط المتأخرة</th>
                <th>إجمالي المتأخر</th>
                <th>واتساب</th>
              </tr>
            </thead>
            <tbody>
              {data.priorityCollection.map((c, i) => (
                <tr key={c.id}>
                  <td className="text-muted-foreground">{i + 1}</td>
                  <td className="font-medium">{c.name}</td>
                  <td><span className="badge-red px-2 py-1 rounded-md text-xs font-semibold">{c.overdueCount}</span></td>
                  <td className="font-bold text-red-500">{formatCurrency(c.totalOverdue)}</td>
                  <td>
                    <a href={getWhatsAppLink(c.phone, `مرحباً ${c.name}، لديك ${c.overdueCount} أقساط متأخرة بإجمالي ${formatCurrency(c.totalOverdue)}`)}
                      target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-green-500 hover:text-green-400 text-sm">
                      <MessageCircle className="w-4 h-4" /> واتساب
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expenses */}
      <div className="bg-[#151821] rounded-2xl border border-[#1E2233] overflow-hidden">
        <div className="p-4 border-b border-[#1E2233] flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-red-500" />
          <h2 className="text-lg font-bold text-foreground">المصروفات</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead>
              <tr>
                <th>الفئة</th>
                <th>المبلغ</th>
                <th>التاريخ</th>
                <th>ملاحظة</th>
              </tr>
            </thead>
            <tbody>
              {data.expenses.items.map(e => (
                <tr key={e.id}>
                  <td className="font-medium">{e.category}</td>
                  <td className="text-red-500 font-semibold">{formatCurrency(e.amount)}</td>
                  <td className="text-sm text-muted-foreground">{e.date}</td>
                  <td className="text-sm text-muted-foreground">{e.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
