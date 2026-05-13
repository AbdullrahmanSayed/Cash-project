import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ar-EG', { 
    style: 'currency', 
    currency: 'EGP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('ar-EG', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  })
}

export function formatDateShort(date: string | Date): string {
  return new Date(date).toLocaleDateString('ar-EG', { 
    month: 'short', 
    day: 'numeric' 
  })
}

export function getWhatsAppLink(phone: string, message?: string): string {
  const cleanPhone = phone.replace(/^0/, '20').replace(/\s/g, '')
  const encodedMsg = message ? encodeURIComponent(message) : ''
  return `https://wa.me/${cleanPhone}${encodedMsg ? `?text=${encodedMsg}` : ''}`
}

export function getComplianceBadge(lateCount: number): { label: string; color: string } {
  if (lateCount === 0) return { label: 'ملتزم', color: 'badge-green' }
  if (lateCount <= 2) return { label: 'متأخر أحياناً', color: 'badge-yellow' }
  return { label: 'متأخر دائماً', color: 'badge-red' }
}

export function getInstallmentStatus(dueDate: string, status: string): { label: string; color: string } {
  if (status === 'paid') return { label: 'مدفوع', color: 'badge-green' }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  if (due < today) return { label: 'متأخر', color: 'badge-red' }
  if (due.getTime() === today.getTime()) return { label: 'اليوم', color: 'badge-yellow' }
  return { label: 'قادم', color: 'badge-blue' }
}

export function daysOverdue(dueDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  const diff = today.getTime() - due.getTime()
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

export function getTodayString(): string {
  return new Date().toISOString().split('T')[0]
}

export function getQuantityBadgeColor(qty: number): string {
  if (qty === 0) return 'badge-red'
  if (qty <= 2) return 'badge-yellow'
  return 'badge-green'
}
