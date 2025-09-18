import { themes, type Theme, type ThemeEntry, type ThemeName } from '@/lib/themes'
import type { MonthDay } from '@/types/themes'
import { THEME_RUNTIME_BUNDLE } from './theme-bundle'

// Helper function to check if achievement is unlocked
// Checks CSS data attribute first (SSR/hydration safe), then localStorage
function hasThemeTapdanceAchievement(): boolean {
  if (typeof document !== 'undefined') {
    // Check for SSR-hydrated CSS data attribute
    const root = document.documentElement
    if (root.hasAttribute('data-has-theme-tapdance')) {
      return true
    }
  }

  if (typeof window === 'undefined') return false
  try {
    const stored = localStorage.getItem('kil.dev/achievements/v1')
    if (!stored) return false
    const unlocked = JSON.parse(stored) as Record<string, unknown>
    return Boolean(unlocked.THEME_TAPDANCE)
  } catch {
    return false
  }
}

export type SeasonalThemeConfig = {
  theme: ThemeName
  start: MonthDay // inclusive
  end: MonthDay // exclusive
}

function hasTimeRange(entry: ThemeEntry): entry is ThemeEntry & { timeRange: { start: MonthDay; end: MonthDay } } {
  return Object.prototype.hasOwnProperty.call(entry, 'timeRange')
}

export const SEASONAL_THEMES: SeasonalThemeConfig[] = themes
  .filter(hasTimeRange)
  .map(t => ({ theme: t.name, start: t.timeRange.start, end: t.timeRange.end }))

const BASE_CSS_THEMES: ThemeName[] = themes.filter(t => !('timeRange' in t)).map(t => t.name)

function compareMonthDay(a: MonthDay, b: MonthDay): number {
  if (a.month !== b.month) return a.month < b.month ? -1 : 1
  if (a.day !== b.day) return a.day < b.day ? -1 : 1
  return 0
}

function isDateInRecurringRange(date: Date, start: MonthDay, end: MonthDay): boolean {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()

  const crossesYear = compareMonthDay(end, start) <= 0

  const isOnOrAfterStartThisYear = month > start.month || (month === start.month && day >= start.day)
  const startYear = crossesYear ? (isOnOrAfterStartThisYear ? year : year - 1) : year
  const endYear = crossesYear ? startYear + 1 : startYear

  // Handle leap year edge case - if Feb 29 doesn't exist, use Feb 28
  const getValidDate = (y: number, m: number, d: number): Date => {
    const date = new Date(y, m - 1, d)
    // Check if the date rolled over to next month (invalid day)
    if (date.getMonth() !== m - 1) {
      // Use last valid day of the month
      return new Date(y, m, 0)
    }
    return date
  }
  const startDate = getValidDate(startYear, start.month, start.day)
  const endDate = getValidDate(endYear, end.month, end.day)
  return date >= startDate && date < endDate
}

export function getActiveSeasonalThemes(date: Date = new Date()): SeasonalThemeConfig[] {
  return SEASONAL_THEMES.filter(cfg => isDateInRecurringRange(date, cfg.start, cfg.end))
}

export function getAvailableThemes(date: Date = new Date(), overrideDateRestrictions = false): Theme[] {
  // Check if we should bypass date restrictions
  if (overrideDateRestrictions || hasThemeTapdanceAchievement()) {
    // Return all themes when achievement is unlocked
    return ['system', ...BASE_CSS_THEMES, ...SEASONAL_THEMES.map(st => st.theme)]
  }

  // Normal date-based filtering
  const active = getActiveSeasonalThemes(date)
  const seasonalNames = active.map(a => a.theme)
  return ['system', ...BASE_CSS_THEMES, ...seasonalNames]
}

export function getCssThemesForNow(date: Date = new Date()): ThemeName[] {
  const active = getActiveSeasonalThemes(date)
  return [...BASE_CSS_THEMES, ...active.map(a => a.theme)]
}

export function getDefaultThemeForNow(date: Date = new Date()): Theme {
  const active = getActiveSeasonalThemes(date)
  const preferred = active[0]?.theme
  return preferred ?? 'system'
}

export function buildThemeScript(): string {
  const seasonal = SEASONAL_THEMES.map(s => ({
    theme: s.theme,
    start: { m: s.start.month, d: s.start.day },
    end: { m: s.end.month, d: s.end.day },
  }))
  const base = BASE_CSS_THEMES
  const cfg = { base, seasonal }

  // Load the generated and minified browser runtime bundle
  // The bundle is an IIFE that assigns `window.ThemeRuntime` with `initTheme` function.
  // We embed the bundle as a string and then append a call to initTheme with serialized config.
  // This avoids manual string concatenation of logic, and ensures the logic is minified by the build pipeline.
  // Safe serialization of config
  const serializedCfg = JSON.stringify(cfg)
  const invoke = ';try{window.ThemeRuntime&&window.ThemeRuntime.initTheme(' + serializedCfg + ')}catch(e){}'
  return THEME_RUNTIME_BUNDLE + invoke
}
