import { describe, expect, it } from 'vitest'
import { formatCurrency, maskAccountNumber } from './format'

describe('formatCurrency', () => {
  it('formats INR amounts', () => {
    expect(formatCurrency(1500)).toContain('1,500')
  })

  it('handles invalid values', () => {
    expect(formatCurrency('abc')).toBe('—')
  })
})

describe('maskAccountNumber', () => {
  it('masks all but last four digits', () => {
    expect(maskAccountNumber('4201100123456789')).toMatch(/6789$/)
    expect(maskAccountNumber('4201100123456789')).not.toContain('4201')
  })
})
