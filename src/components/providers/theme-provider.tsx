'use client'

import { getAvailableThemes, getDefaultThemeForNow, SEASONAL_THEMES } from '@/lib/theme-runtime'
import { themes, type Theme, type ThemeName } from '@/lib/themes'
import * as React from 'react'

type SystemTheme = 'light' | 'dark'

type ThemeContextValue = {
  theme: Theme | undefined
  setTheme: (theme: Theme) => void
  resolvedTheme: Theme | SystemTheme | undefined
  systemTheme: SystemTheme | undefined
  initialAppliedThemeName?: ThemeName
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined)

function coerceToValidTheme(value: Theme | undefined): Theme {
  const pref = value ?? 'system'
  const allowed = getAvailableThemes()
  if (pref !== 'system' && !allowed.includes(pref)) return 'system'
  return pref
}

const VALID_THEMES: ReadonlyArray<Theme> = ['system', ...themes.map(t => t.name)]

function readCookieTheme(): Theme | undefined {
  try {
    const re = /(?:^|; )theme=([^;]+)/
    const match = re.exec(document.cookie)
    if (match?.[1]) {
      const raw = match[1]
      const decoded = decodeURIComponent(raw)
      return VALID_THEMES.includes(decoded as Theme) ? (decoded as Theme) : undefined
    }
  } catch {}
  return undefined
}

function readStorageTheme(): Theme | undefined {
  try {
    const v = localStorage.getItem('theme')
    if (!v) return undefined
    return VALID_THEMES.includes(v as Theme) ? (v as Theme) : undefined
  } catch {}
  return undefined
}

function readCookieThemeMeta(): { theme: Theme | undefined; updatedAt: number | undefined } {
  try {
    const reTheme = /(?:^|; )theme=([^;]+)/
    const reTs = /(?:^|; )themeUpdatedAt=([^;]+)/
    const mTheme = reTheme.exec(document.cookie)
    const mTs = reTs.exec(document.cookie)
    const themeRaw = mTheme?.[1] ? decodeURIComponent(mTheme[1]) : undefined
    const theme: Theme | undefined = VALID_THEMES.includes(themeRaw as Theme) ? (themeRaw as Theme) : undefined
    const updatedAt = mTs?.[1] ? Number(mTs[1]) : undefined
    return { theme, updatedAt: Number.isFinite(updatedAt) ? updatedAt : undefined }
  } catch {}
  return { theme: undefined, updatedAt: undefined }
}

function readStorageThemeMeta(): { theme: Theme | undefined; updatedAt: number | undefined } {
  try {
    const themeStr = localStorage.getItem('theme') ?? undefined
    const tsStr = localStorage.getItem('theme_updatedAt') ?? undefined
    const theme: Theme | undefined =
      themeStr && VALID_THEMES.includes(themeStr as Theme) ? (themeStr as Theme) : undefined
    const updatedAt = tsStr ? Number(tsStr) : undefined
    return { theme, updatedAt: Number.isFinite(updatedAt) ? updatedAt : undefined }
  } catch {}
  return { theme: undefined, updatedAt: undefined }
}

function writeCookieTheme(value: Theme, updatedAt?: number) {
  try {
    const isProduction = process.env.NODE_ENV === 'production'
    const isSecure = window.location.protocol === 'https:' || isProduction ? '; secure' : ''
    const v = coerceToValidTheme(value)
    const ts = typeof updatedAt === 'number' && Number.isFinite(updatedAt) ? updatedAt : Date.now()
    document.cookie = `theme=${encodeURIComponent(v)}; path=/; max-age=31536000; samesite=lax${isSecure}`
    document.cookie = `themeUpdatedAt=${ts}; path=/; max-age=31536000; samesite=lax${isSecure}`
  } catch {}
}

function writeStorageTheme(value: Theme, updatedAt?: number) {
  try {
    const v = coerceToValidTheme(value)
    const ts = typeof updatedAt === 'number' && Number.isFinite(updatedAt) ? updatedAt : Date.now()
    localStorage.setItem('theme', v)
    localStorage.setItem('theme_updatedAt', String(ts))
  } catch {}
}

function writeCookieSystemTheme(value: SystemTheme | undefined) {
  if (!value) return
  try {
    const isProduction = process.env.NODE_ENV === 'production'
    const isSecure = window.location.protocol === 'https:' || isProduction ? '; secure' : ''
    document.cookie = `systemTheme=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax${isSecure}`
  } catch {}
}

function getSystemTheme(): SystemTheme | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {}
  return undefined
}

function applyClasses(preference: Theme, system: SystemTheme | undefined) {
  const root = document.documentElement
  const seasonalDefault = getDefaultThemeForNow()
  const allowed = getAvailableThemes()
  const pref: Theme = preference !== 'system' && !allowed.includes(preference) ? 'system' : preference
  const remove = (cls: string) => root.classList.remove(cls)
  const add = (cls: string) => root.classList.add(cls)
  const allThemeClassNames: ThemeName[] = themes.map(t => t.name)

  if (pref === 'system') {
    const effective = system ?? 'light'
    // Ensure system dark/light present
    if (!root.classList.contains(effective)) add(effective)
    const other = effective === 'dark' ? 'light' : 'dark'
    if (root.classList.contains(other)) remove(other)
    // Seasonal overlay when active; otherwise ensure non-system theme classes are removed
    const overlay = seasonalDefault !== 'system' ? seasonalDefault : undefined
    for (const cls of allThemeClassNames) {
      if (cls === 'light' || cls === 'dark') continue
      if (overlay && cls === overlay) {
        if (!root.classList.contains(cls)) add(cls)
      } else {
        if (root.classList.contains(cls)) remove(cls)
      }
    }
    return
  }

  // Explicit theme preference
  for (const c of allThemeClassNames) remove(c)
  add(pref)
}

export function ThemeProvider({
  children,
  initialAppliedTheme,
}: {
  children: React.ReactNode
  initialAppliedTheme?: ThemeName
}) {
  const [theme, setThemeState] = React.useState<Theme | undefined>(() => {
    if (typeof document === 'undefined') return undefined
    try {
      const root = document.documentElement
      const applied = (root.dataset.appliedTheme as Theme | undefined) ?? undefined
      if (applied && applied !== 'light' && applied !== 'dark') return applied
      // base theme might be dark/light; still set preference if storage has explicit
      const ls = readStorageTheme()
      const ck = readCookieTheme()
      return ls ?? ck ?? undefined
    } catch {
      return undefined
    }
  })
  const [systemTheme, setSystemTheme] = React.useState<SystemTheme | undefined>(() => {
    if (typeof document === 'undefined') return undefined
    try {
      const root = document.documentElement
      if (root.classList.contains('dark')) return 'dark'
      if (root.classList.contains('light')) return 'light'
      return getSystemTheme()
    } catch {
      return undefined
    }
  })

  // Initialize from storage/cookie and normalize expired seasonal themes back to system
  // Use layout effect to apply classes before paint to avoid light-theme flash
  React.useLayoutEffect(() => {
    const { theme: lsTheme, updatedAt: lsUpdatedAt } = readStorageThemeMeta()
    const { theme: ckTheme, updatedAt: ckUpdatedAt } = readCookieThemeMeta()

    const lsTs = typeof lsUpdatedAt === 'number' ? lsUpdatedAt : -1
    const ckTs = typeof ckUpdatedAt === 'number' ? ckUpdatedAt : -1

    const source = lsTs >= ckTs ? 'localStorage' : 'cookie'
    const pickedRaw = source === 'localStorage' ? (lsTheme ?? ckTheme) : (ckTheme ?? lsTheme)
    const pickedTs = Math.max(lsTs, ckTs)
    const initialPref: Theme = coerceToValidTheme(pickedRaw)

    setThemeState(initialPref)
    const sys = getSystemTheme()
    setSystemTheme(sys)
    writeCookieSystemTheme(sys)

    // Normalize both storage and cookie to the chosen value and timestamp
    const tsToPersist = pickedTs > 0 ? pickedTs : Date.now()
    writeStorageTheme(initialPref, tsToPersist)
    writeCookieTheme(initialPref, tsToPersist)

    // Ensure classes match preference immediately after mount; if a server computed initial theme exists, keep it
    const hasServerApplied = (() => {
      try {
        const root = document.documentElement
        return !!root.dataset.appliedTheme
      } catch {
        return false
      }
    })()
    if (!initialAppliedTheme && !hasServerApplied) {
      applyClasses(initialPref, getSystemTheme())
    }
  }, [initialAppliedTheme])

  // Watch OS theme changes
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      const sys = mq.matches ? 'dark' : 'light'
      setSystemTheme(sys)
      writeCookieSystemTheme(sys)
      if ((theme ?? 'system') === 'system') applyClasses('system', sys)
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key !== 'theme') return
      // Re-read storage meta to get both value and timestamp
      const { theme: lsTheme, updatedAt } = readStorageThemeMeta()
      const next = coerceToValidTheme(lsTheme)
      setThemeState(next)
      writeCookieTheme(next, updatedAt)
      applyClasses(next, getSystemTheme())
    }
    try {
      mq.addEventListener('change', handler)
      window.addEventListener('storage', onStorage)
      return () => {
        mq.removeEventListener('change', handler)
        window.removeEventListener('storage', onStorage)
      }
    } catch {
      // Safari fallback
      mq.addListener?.(handler)
      window.addEventListener('storage', onStorage)
      return () => {
        mq.removeListener?.(handler)
        window.removeEventListener('storage', onStorage)
      }
    }
  }, [theme])

  const setTheme = React.useCallback((next: Theme) => {
    setThemeState(next)
    writeStorageTheme(next)
    writeCookieTheme(next)
    applyClasses(next, getSystemTheme())
  }, [])

  // If user explicitly selected a seasonal theme, schedule a check at next midnight
  // to auto-revert to 'system' when the seasonal theme expires while the tab is open.
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const currentPref = theme ?? 'system'
    const isSeasonal = SEASONAL_THEMES.some(t => t.theme === currentPref)
    if (!isSeasonal) return

    const msUntilNextMidnight = () => {
      const now = new Date()
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1)
      return Math.max(250, next.getTime() - now.getTime())
    }

    const id = window.setTimeout(() => {
      const allowed = getAvailableThemes()
      if (currentPref !== 'system' && !allowed.includes(currentPref)) {
        setTheme('system')
      } else {
        // Re-apply classes in case seasonal state changed but still valid
        applyClasses(currentPref, getSystemTheme())
      }
    }, msUntilNextMidnight())

    return () => window.clearTimeout(id)
  }, [theme, setTheme])

  const resolvedTheme: Theme | SystemTheme | undefined = React.useMemo(() => {
    const pref = theme ?? 'system'
    if (pref === 'system') return systemTheme ?? 'light'
    return pref
  }, [theme, systemTheme])

  const value: ThemeContextValue = React.useMemo(() => {
    const computedInitial =
      initialAppliedTheme ??
      (typeof document !== 'undefined'
        ? ((document.documentElement.dataset.appliedTheme as ThemeName | undefined) ?? undefined)
        : undefined)
    return { theme, setTheme, resolvedTheme, systemTheme, initialAppliedThemeName: computedInitial }
  }, [theme, setTheme, resolvedTheme, systemTheme, initialAppliedTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
