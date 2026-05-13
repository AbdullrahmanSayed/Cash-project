export interface User {
  id: string
  name: string
  role: 'owner' | 'employee'
}

export interface Supplier {
  id: string
  name: string
  phone: string
  notes: string
  createdAt: string
  updatedAt: string
  productCount?: number
}

export interface Product {
  id: string
  name: string
  category: 'موبايل' | 'أجهزة كهربائية' | 'إكسسوار'
  quantity: number
  costPrice: number
  sellPrice: number
  supplierId: string | null
  createdAt: string
  updatedAt: string
  supplier?: Supplier | null
  isStale?: boolean
}

export interface Customer {
  id: string
  name: string
  phone: string
  nationalId: string
  address: string
  createdAt: string
  salesCount?: number
  totalPurchases?: number
  totalPaid?: number
  totalDue?: number
  latePayments?: number
}

export interface Installment {
  id: string
  saleId: string
  dueDate: string
  amount: number
  paidAt: string | null
  receivedBy: string | null
  status: 'paid' | 'unpaid'
  computedStatus?: 'paid' | 'overdue' | 'today' | 'upcoming'
  daysOverdue?: number
  sale?: Sale
  receiver?: User | null
}

export interface Sale {
  id: string
  customerId: string
  productId: string
  employeeId: string
  saleType: 'cash' | 'installment'
  totalPrice: number
  downPayment: number
  installmentCount: number
  monthlyAmount: number
  startDate: string
  createdAt: string
  customer?: Customer
  product?: Product
  employee?: User
  installments?: Installment[]
}

export interface Expense {
  id: string
  category: 'إيجار' | 'كهرباء' | 'مرتبات' | 'أخرى'
  amount: number
  date: string
  note: string
  createdAt: string
}

export interface ContactLog {
  id: string
  customerId: string
  employeeId: string
  note: string
  createdAt: string
  customer?: Customer
  employee?: User
}

export interface DashboardData {
  totalReceivables: number
  todayDueAmount: number
  todayDueCount: number
  overdueAmount: number
  overdueCount: number
  lowStock: Product[]
  staleProducts: Product[]
  overdueWithDetails: Array<{
    id: string
    amount: number
    dueDate: string
    customerName: string
    customerPhone: string
    customerId: string
    productName: string
    daysOverdue: number
  }>
  todayDueWithDetails: Array<{
    id: string
    amount: number
    dueDate: string
    customerName: string
    customerPhone: string
    customerId: string
    productName: string
  }>
}
