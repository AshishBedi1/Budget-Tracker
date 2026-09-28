export type Category = {
  id: string
  name: string
  emoji: string
  color: string
  monthlyBudget: number
}

export type Expense = {
  id: string
  amount: number
  categoryId: string
  note: string
  date: string
  createdAt: number
}

export const EMOJIS = [
  '🛒',
  '☕',
  '💄',
  '🍜',
  '🚌',
  '🛍️',
  '🎀',
  '💅',
  '🎬',
  '🌸',
  '🐱',
  '💊',
  '🏠',
  '📚',
  '🎁',
  '🍕',
]

export const COLORS = [
  '#f4a7b9',
  '#e8b86d',
  '#d7b4f3',
  '#f3a07a',
  '#8ecae6',
  '#b7e4c7',
  '#f6c1d4',
  '#c9b6ff',
]

export function todayISO() {
  return toISO(new Date())
}

export function toISO(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function shiftISO(iso: string, days: number) {
  const date = new Date(`${iso}T12:00:00`)
  date.setDate(date.getDate() + days)
  return toISO(date)
}

export function formatDay(iso: string) {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${iso}T12:00:00`))
}

export function formatMoney(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount)
}

export function monthLeft(budget: number, spent: number) {
  const left = Math.round((budget - spent) * 100) / 100
  if (left < 0) return `${formatMoney(Math.abs(left))} over`
  return `${formatMoney(left)} left`
}
