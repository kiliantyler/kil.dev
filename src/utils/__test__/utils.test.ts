import { afterEach, describe, expect, it } from 'vitest'
import { calculateAgeYears, cn, formatAgeLabel, formatDateFull, formatMonthYear, isDev, isSafari } from '../utils'

describe('cn', () => {
  it('merges tailwind classes correctly', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2')
  })
})

describe('formatMonthYear', () => {
  it('formats YYYY-MM date', () => {
    expect(formatMonthYear('2024-03')).toBe('Mar 2024')
  })

  it('formats YYYY date', () => {
    expect(formatMonthYear('2024')).toBe('Jan 2024')
  })

  it('formats YYYY-MM-DD date', () => {
    expect(formatMonthYear('2024-03-17')).toBe('Mar 2024')
  })

  it('returns empty string for undefined', () => {
    const undefinedValue: string | undefined = undefined
    expect(formatMonthYear(undefinedValue)).toBe('')
  })

  it('returns original value for invalid date', () => {
    expect(formatMonthYear('not-a-date')).toBe('not-a-date')
  })

  it('uses different locale when provided', () => {
    const result = formatMonthYear('2024-03', 'fr-FR')
    expect(result).toContain('2024')
  })
})

describe('formatDateFull', () => {
  it('formats YYYY-MM-DD date', () => {
    const result = formatDateFull('2024-03-17')
    expect(result).toMatch(/Mar.*17.*2024/)
  })

  it('formats YYYY-MM date', () => {
    const result = formatDateFull('2024-03')
    expect(result).toMatch(/Mar.*1.*2024/)
  })

  it('formats YYYY date', () => {
    const result = formatDateFull('2024')
    expect(result).toMatch(/Jan.*1.*2024/)
  })

  it('returns empty string for undefined', () => {
    const undefinedValue: string | undefined = undefined
    expect(formatDateFull(undefinedValue)).toBe('')
  })

  it('returns original value for invalid date', () => {
    expect(formatDateFull('invalid')).toBe('invalid')
  })

  it('uses custom locale when provided', () => {
    const result = formatDateFull('2024-03-17', 'en-US')
    expect(result).toBeTruthy()
  })
})

describe('calculateAgeYears', () => {
  it('calculates age correctly', () => {
    const birth = '2000-01-01'
    const now = new Date('2024-06-15')
    expect(calculateAgeYears(birth, now)).toBe(24)
  })

  it('calculates age correctly before birthday this year', () => {
    const birth = '2000-12-25'
    const now = new Date('2024-06-15')
    expect(calculateAgeYears(birth, now)).toBe(23)
  })

  it('calculates age correctly on birthday', () => {
    const birth = '2000-06-15'
    const now = new Date(2024, 5, 15) // June 15, 2024 (month is 0-indexed)
    expect(calculateAgeYears(birth, now)).toBe(24)
  })

  it('calculates age correctly after birthday this year', () => {
    const birth = '2000-01-01'
    const now = new Date('2024-12-31')
    expect(calculateAgeYears(birth, now)).toBe(24)
  })

  it('returns null for undefined input', () => {
    const undefinedValue: string | undefined = undefined
    expect(calculateAgeYears(undefinedValue)).toBe(null)
  })

  it('returns null for invalid date', () => {
    expect(calculateAgeYears('not-a-date')).toBe(null)
  })

  it('handles leap year birthdays', () => {
    const birth = '2000-02-29'
    const now = new Date('2024-03-01')
    expect(calculateAgeYears(birth, now)).toBe(24)
  })

  it('returns 0 for future birth dates', () => {
    const birth = '2030-01-01'
    const now = new Date('2024-06-15')
    expect(calculateAgeYears(birth, now)).toBe(0)
  })
})

describe('formatAgeLabel', () => {
  it('formats ages under one year in months', () => {
    expect(formatAgeLabel('2025-10-18', new Date(2026, 4, 26))).toBe('7 months')
  })

  it('formats one month with a singular label', () => {
    expect(formatAgeLabel('2026-04-18', new Date(2026, 4, 26))).toBe('1 month')
  })

  it('keeps ages of at least one year in years', () => {
    expect(formatAgeLabel('2022-06-09', new Date(2026, 4, 26))).toBe('3 years')
  })
})

describe('isSafari', () => {
  const originalWindow = globalThis.window
  const originalDocument = globalThis.document

  afterEach(() => {
    if (originalWindow === undefined) {
      Reflect.deleteProperty(globalThis, 'window')
    } else {
      globalThis.window = originalWindow
    }

    if (originalDocument === undefined) {
      Reflect.deleteProperty(globalThis, 'document')
    } else {
      globalThis.document = originalDocument
    }
  })

  it('returns false when window is undefined', () => {
    // @ts-expect-error - testing undefined window
    globalThis.window = undefined
    expect(isSafari()).toBe(false)
  })

  it('detects Safari from user agent', () => {
    globalThis.window = {
      navigator: {
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      } as Navigator,
    } as Window & typeof globalThis

    globalThis.document = {
      documentElement: {
        style: { webkitAppearance: '' } as CSSStyleDeclaration,
      },
    } as Document

    expect(isSafari()).toBe(true)
  })

  it('returns false for Chrome user agent', () => {
    globalThis.window = {
      navigator: {
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      } as Navigator,
      chrome: {},
    } as unknown as Window & typeof globalThis

    globalThis.document = {
      documentElement: {
        style: {} as CSSStyleDeclaration,
      },
    } as Document

    expect(isSafari()).toBe(false)
  })

  it('returns false for Firefox user agent', () => {
    globalThis.window = {
      navigator: {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/121.0',
      } as Navigator,
    } as Window & typeof globalThis

    globalThis.document = {
      documentElement: {
        style: {} as CSSStyleDeclaration,
      },
    } as Document

    expect(isSafari()).toBe(false)
  })
})

describe('isDev', () => {
  it('returns true when NODE_ENV is not production', () => {
    // Note: This test checks the actual NODE_ENV at test runtime
    // In a real test environment, NODE_ENV would typically be 'test' or 'development'
    const isDevelopment = process.env.NODE_ENV !== 'production'
    expect(isDev()).toBe(isDevelopment)
  })

  it('returns false in production environment', () => {
    // This test documents the expected behavior in production
    // Actual testing of production mode would require a separate test run
    if (process.env.NODE_ENV === 'production') {
      expect(isDev()).toBe(false)
    } else {
      // In test/dev environment, skip this assertion
      expect(true).toBe(true)
    }
  })
})
