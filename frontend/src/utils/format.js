import dayjs from 'dayjs'

export function formatCurrency(amount, currency = 'INR') {
  const value = Number(amount)
  if (Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value)
}

export function maskAccountNumber(accountNumber) {
  if (!accountNumber) return '—'
  const s = String(accountNumber)
  if (s.length <= 4) return s
  return `${'•'.repeat(Math.max(0, s.length - 4))}${s.slice(-4)}`
}

export function formatDateTime(value) {
  if (!value) return '—'
  return dayjs(value).format('DD MMM YYYY, HH:mm')
}

export function formatDate(value) {
  if (!value) return '—'
  return dayjs(value).format('DD MMM YYYY')
}
