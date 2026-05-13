// Print utilities for sales invoices, installment receipts, and customer statements
// All documents render in Arabic RTL with a clean, professional layout

type Installment = {
  id: string
  dueDate: string
  amount: number
  status: string
  paidAt?: string | null
}

type SaleForInvoice = {
  id: string
  saleType: string
  totalPrice: number
  downPayment: number
  installmentCount: number
  monthlyAmount: number
  createdAt: string
  customer: { name: string; phone: string; nationalId?: string }
  product: { name: string; category?: string }
  employee: { name: string }
  installments: Installment[]
}

type InstallmentForReceipt = {
  id: string
  amount: number
  dueDate: string
  paidAt?: string | null
  sale: {
    customer: { name: string }
    product: { name: string }
  }
  receiver?: { name: string } | null
}

type SaleForStatement = {
  id: string
  saleType: string
  totalPrice: number
  downPayment: number
  installmentCount: number
  monthlyAmount: number
  createdAt: string
  product: { name: string }
  installments: Installment[]
}

type CustomerForStatement = {
  id: string
  name: string
  phone: string
  nationalId: string
  address: string
  totalPurchases: number
  totalPaid: number
  totalDue: number
  sales: SaleForStatement[]
}

const fmtCurrency = (amount: number): string =>
  new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)

const fmtDate = (date: string | Date): string =>
  new Date(date).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

const escapeHtml = (s: string | undefined | null): string => {
  if (s === undefined || s === null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const baseStyles = `
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: Arial, "Segoe UI", Tahoma, sans-serif;
      direction: rtl;
      margin: 0;
      padding: 24px;
      color: #1a1a1a;
      background: #fff;
      font-size: 13px;
      line-height: 1.5;
    }
    .doc {
      max-width: 800px;
      margin: 0 auto;
      border: 1px solid #d4d4d4;
      border-radius: 6px;
      padding: 24px;
    }
    .doc-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #1a1a1a;
      padding-bottom: 12px;
      margin-bottom: 18px;
    }
    .showroom-name {
      font-size: 22px;
      font-weight: bold;
      margin: 0;
    }
    .doc-type {
      font-size: 16px;
      color: #555;
      margin-top: 4px;
    }
    .print-date {
      text-align: left;
      font-size: 12px;
      color: #555;
    }
    .section {
      margin-bottom: 16px;
    }
    .section-title {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 8px;
      border-right: 3px solid #1a1a1a;
      padding-right: 8px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px 16px;
    }
    .info-row {
      display: flex;
      gap: 6px;
    }
    .info-label {
      font-weight: bold;
      min-width: 110px;
      color: #444;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }
    th, td {
      border: 1px solid #d4d4d4;
      padding: 8px;
      text-align: right;
      font-size: 12px;
    }
    th {
      background: #f3f3f3;
      font-weight: bold;
    }
    tr.paid td { background: #f4fbf4; }
    tr.overdue td { background: #fdf3f3; }
    .totals {
      display: flex;
      justify-content: flex-start;
      gap: 24px;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px dashed #bbb;
      flex-wrap: wrap;
    }
    .total-box {
      padding: 8px 14px;
      border: 1px solid #d4d4d4;
      border-radius: 4px;
      min-width: 160px;
    }
    .total-box .label { font-size: 11px; color: #555; }
    .total-box .value { font-size: 16px; font-weight: bold; margin-top: 2px; }
    .footer {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px solid #d4d4d4;
      text-align: center;
      font-size: 13px;
      color: #555;
    }
    .sale-block {
      page-break-inside: avoid;
      border: 1px solid #d4d4d4;
      border-radius: 4px;
      padding: 12px;
      margin-bottom: 12px;
    }
    .sale-block h4 {
      margin: 0 0 8px 0;
      font-size: 14px;
    }
    .amount-big {
      font-size: 28px;
      font-weight: bold;
      text-align: center;
      padding: 16px;
      border: 2px dashed #1a1a1a;
      border-radius: 6px;
      margin: 12px 0;
    }
    @media print {
      body { padding: 0; }
      .doc { border: none; }
      @page { margin: 12mm; }
    }
  </style>
`

function openPrintWindow(title: string, bodyHtml: string): void {
  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) return
  win.document.open()
  win.document.write(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(title)}</title>
${baseStyles}
<style>
  @media screen { body { visibility: hidden; } }
  @media print  { body { visibility: visible; } }
</style>
</head>
<body>
${bodyHtml}
<script>
  window.onload = function() {
    window.onafterprint = function() { window.close(); };
    window.print();
  };
</script>
</body>
</html>`)
  win.document.close()
}

function headerBlock(showroomName: string, docType: string): string {
  const today = fmtDate(new Date())
  return `
    <div class="doc-header">
      <div>
        <h1 class="showroom-name">${escapeHtml(showroomName)}</h1>
        <div class="doc-type">${escapeHtml(docType)}</div>
      </div>
      <div class="print-date">
        <div><strong>تاريخ الطباعة:</strong></div>
        <div>${escapeHtml(today)}</div>
      </div>
    </div>
  `
}

function footerBlock(footerText?: string, noteText?: string): string {
  return `<div class="footer">
    ${noteText ? `<p style="font-size:12px;color:#444;margin-bottom:8px;">${escapeHtml(noteText)}</p>` : ''}
    ${escapeHtml(footerText || 'شكراً لتعاملكم معنا')}
  </div>`
}

function installmentStatusLabel(inst: Installment): { label: string; cls: string } {
  if (inst.status === 'paid') return { label: 'مدفوع', cls: 'paid' }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(inst.dueDate)
  due.setHours(0, 0, 0, 0)
  if (due.getTime() < today.getTime()) return { label: 'متأخر', cls: 'overdue' }
  if (due.getTime() === today.getTime()) return { label: 'اليوم', cls: '' }
  return { label: 'قادم', cls: '' }
}

export function printSaleInvoice(sale: SaleForInvoice, showroomName: string, invoiceFooter?: string, invoiceNote?: string): void {
  const isInstallment = sale.saleType === 'installment'
  const remaining = isInstallment ? sale.totalPrice - sale.downPayment : 0

  const installmentsHtml = isInstallment && sale.installments.length > 0 ? `
    <div class="section">
      <div class="section-title">جدول الأقساط</div>
      <table>
        <thead>
          <tr>
            <th>رقم</th>
            <th>تاريخ الاستحقاق</th>
            <th>المبلغ</th>
            <th>الحالة</th>
          </tr>
        </thead>
        <tbody>
          ${sale.installments.map((inst, i) => {
            const st = installmentStatusLabel(inst)
            return `<tr class="${st.cls}">
              <td>${i + 1}</td>
              <td>${escapeHtml(fmtDate(inst.dueDate))}</td>
              <td>${escapeHtml(fmtCurrency(inst.amount))}</td>
              <td>${escapeHtml(st.label)}</td>
            </tr>`
          }).join('')}
        </tbody>
      </table>
    </div>
  ` : ''

  const body = `
    <div class="doc">
      ${headerBlock(showroomName, 'فاتورة بيع')}

      <div class="section">
        <div class="section-title">بيانات العميل</div>
        <div class="info-grid">
          <div class="info-row"><span class="info-label">الاسم:</span><span>${escapeHtml(sale.customer.name)}</span></div>
          <div class="info-row"><span class="info-label">الهاتف:</span><span>${escapeHtml(sale.customer.phone)}</span></div>
          <div class="info-row"><span class="info-label">الرقم القومي:</span><span>${escapeHtml(sale.customer.nationalId || '-')}</span></div>
          <div class="info-row"><span class="info-label">تاريخ البيع:</span><span>${escapeHtml(fmtDate(sale.createdAt))}</span></div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">بيانات المنتج</div>
        <div class="info-grid">
          <div class="info-row"><span class="info-label">المنتج:</span><span>${escapeHtml(sale.product.name)}</span></div>
          <div class="info-row"><span class="info-label">الفئة:</span><span>${escapeHtml(sale.product.category || '-')}</span></div>
          <div class="info-row"><span class="info-label">نوع البيع:</span><span>${isInstallment ? 'تقسيط' : 'نقدي'}</span></div>
          <div class="info-row"><span class="info-label">البائع:</span><span>${escapeHtml(sale.employee.name)}</span></div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">التفاصيل المالية</div>
        <div class="totals">
          <div class="total-box">
            <div class="label">السعر الكلي</div>
            <div class="value">${escapeHtml(fmtCurrency(sale.totalPrice))}</div>
          </div>
          ${isInstallment ? `
            <div class="total-box">
              <div class="label">الدفعة المقدمة</div>
              <div class="value">${escapeHtml(fmtCurrency(sale.downPayment))}</div>
            </div>
            <div class="total-box">
              <div class="label">المتبقي</div>
              <div class="value">${escapeHtml(fmtCurrency(remaining))}</div>
            </div>
            <div class="total-box">
              <div class="label">عدد الأقساط</div>
              <div class="value">${sale.installmentCount}</div>
            </div>
            <div class="total-box">
              <div class="label">القسط الشهري</div>
              <div class="value">${escapeHtml(fmtCurrency(sale.monthlyAmount))}</div>
            </div>
          ` : ''}
        </div>
      </div>

      ${installmentsHtml}

      ${footerBlock(invoiceFooter, invoiceNote)}
    </div>
  `
  openPrintWindow('فاتورة بيع', body)
}

export function printInstallmentReceipt(installment: InstallmentForReceipt, showroomName: string, invoiceFooter?: string, invoiceNote?: string): void {
  const paidAt = installment.paidAt ? fmtDate(installment.paidAt) : fmtDate(new Date())
  const body = `
    <div class="doc">
      ${headerBlock(showroomName, 'إيصال دفع قسط')}

      <div class="section">
        <div class="info-grid">
          <div class="info-row"><span class="info-label">العميل:</span><span>${escapeHtml(installment.sale.customer.name)}</span></div>
          <div class="info-row"><span class="info-label">المنتج:</span><span>${escapeHtml(installment.sale.product.name)}</span></div>
          <div class="info-row"><span class="info-label">تاريخ الاستحقاق:</span><span>${escapeHtml(fmtDate(installment.dueDate))}</span></div>
          <div class="info-row"><span class="info-label">تاريخ الدفع:</span><span>${escapeHtml(paidAt)}</span></div>
          <div class="info-row"><span class="info-label">المستلم:</span><span>${escapeHtml(installment.receiver?.name || '-')}</span></div>
        </div>
      </div>

      <div class="amount-big">
        المبلغ المدفوع: ${escapeHtml(fmtCurrency(installment.amount))}
      </div>

      ${footerBlock(invoiceFooter, invoiceNote)}
    </div>
  `
  openPrintWindow('إيصال دفع قسط', body)
}

export function printCustomerStatement(customer: CustomerForStatement, showroomName: string, invoiceFooter?: string, invoiceNote?: string): void {
  const salesHtml = customer.sales.map(sale => {
    const isInstallment = sale.saleType === 'installment'
    const instTable = isInstallment && sale.installments.length > 0 ? `
      <table>
        <thead>
          <tr>
            <th>رقم</th>
            <th>تاريخ الاستحقاق</th>
            <th>المبلغ</th>
            <th>الحالة</th>
            <th>تاريخ الدفع</th>
          </tr>
        </thead>
        <tbody>
          ${sale.installments.map((inst, i) => {
            const st = installmentStatusLabel(inst)
            return `<tr class="${st.cls}">
              <td>${i + 1}</td>
              <td>${escapeHtml(fmtDate(inst.dueDate))}</td>
              <td>${escapeHtml(fmtCurrency(inst.amount))}</td>
              <td>${escapeHtml(st.label)}</td>
              <td>${inst.paidAt ? escapeHtml(fmtDate(inst.paidAt)) : '-'}</td>
            </tr>`
          }).join('')}
        </tbody>
      </table>
    ` : ''
    return `
      <div class="sale-block">
        <h4>${escapeHtml(sale.product.name)} — ${isInstallment ? 'تقسيط' : 'نقدي'}</h4>
        <div class="info-grid">
          <div class="info-row"><span class="info-label">تاريخ البيع:</span><span>${escapeHtml(fmtDate(sale.createdAt))}</span></div>
          <div class="info-row"><span class="info-label">السعر الكلي:</span><span>${escapeHtml(fmtCurrency(sale.totalPrice))}</span></div>
          ${isInstallment ? `
            <div class="info-row"><span class="info-label">الدفعة المقدمة:</span><span>${escapeHtml(fmtCurrency(sale.downPayment))}</span></div>
            <div class="info-row"><span class="info-label">عدد الأقساط:</span><span>${sale.installmentCount}</span></div>
            <div class="info-row"><span class="info-label">القسط الشهري:</span><span>${escapeHtml(fmtCurrency(sale.monthlyAmount))}</span></div>
          ` : ''}
        </div>
        ${instTable}
      </div>
    `
  }).join('')

  const body = `
    <div class="doc">
      ${headerBlock(showroomName, 'كشف حساب عميل')}

      <div class="section">
        <div class="section-title">بيانات العميل</div>
        <div class="info-grid">
          <div class="info-row"><span class="info-label">الاسم:</span><span>${escapeHtml(customer.name)}</span></div>
          <div class="info-row"><span class="info-label">الهاتف:</span><span>${escapeHtml(customer.phone)}</span></div>
          <div class="info-row"><span class="info-label">الرقم القومي:</span><span>${escapeHtml(customer.nationalId || '-')}</span></div>
          <div class="info-row"><span class="info-label">العنوان:</span><span>${escapeHtml(customer.address || '-')}</span></div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">الملخص</div>
        <div class="totals">
          <div class="total-box">
            <div class="label">إجمالي المشتريات</div>
            <div class="value">${escapeHtml(fmtCurrency(customer.totalPurchases))}</div>
          </div>
          <div class="total-box">
            <div class="label">إجمالي المدفوع</div>
            <div class="value">${escapeHtml(fmtCurrency(customer.totalPaid))}</div>
          </div>
          <div class="total-box">
            <div class="label">إجمالي المستحق</div>
            <div class="value">${escapeHtml(fmtCurrency(customer.totalDue))}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">تفاصيل المبيعات والأقساط</div>
        ${salesHtml || '<p style="text-align:center;color:#888;">لا توجد مبيعات</p>'}
      </div>

      ${footerBlock(invoiceFooter, invoiceNote)}
    </div>
  `
  openPrintWindow('كشف حساب عميل', body)
}
