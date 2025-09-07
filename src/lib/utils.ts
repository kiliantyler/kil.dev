import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Parse YYYY, YYYY-MM, or YYYY-MM-DD strings as a local date to avoid timezone shifts
export function parseLocalDateYmd(value: string | undefined): Date | null {
  if (!value) return null
  const match = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(value)
  if (!match) {
    const d = new Date(value)
    return isNaN(d.getTime()) ? null : d
  }
  const year = Number(match[1])
  const month = match[2] ? Math.max(0, Math.min(11, Number(match[2]) - 1)) : 0
  const day = match[3] ? Math.max(1, Math.min(31, Number(match[3]))) : 1
  const d = new Date(year, month, day)
  return isNaN(d.getTime()) ? null : d
}

export function formatMonthYear(value: string | undefined, locale = 'en-US'): string {
  const d = parseLocalDateYmd(value)
  if (!d) return value ?? ''
  return d.toLocaleString(locale, { month: 'short', year: 'numeric' })
}

export function formatDateFull(value: string | undefined, locale?: string): string {
  const d = parseLocalDateYmd(value)
  if (!d) return value ?? ''
  return d.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function calculateAgeYears(value: string | undefined, now: Date = new Date()): number | null {
  const birth = parseLocalDateYmd(value)
  if (!birth) return null
  let years = now.getFullYear() - birth.getFullYear()
  const beforeBirthdayThisYear =
    now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
  if (beforeBirthdayThisYear) years--
  return Math.max(0, years)
}
