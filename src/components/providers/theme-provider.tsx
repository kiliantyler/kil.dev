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

function readCookieTheme(): Theme | undefined {
  try {
    const re = /(?:^|; )theme=([^;]+)/
    const match = re.exec(document.cookie)
    if (match?.[1]) {
      const raw = match[1]
      const decoded = decodeURIComponent(raw)
      const validThemes: Theme[] = ['system', ...themes.map(t => t.name)]
      return validThemes.includes(decoded as Theme) ? (decoded as Theme) : undefined
    }
  } catch {}
  return undefined
}

function readStorageTheme(): Theme | undefined {
  try {
    const v = localStorage.getItem('theme')
    if (!v) return undefined
    const validThemes: Theme[] = ['system', ...themes.map(t => t.name)]
    return validThemes.includes(v as Theme) ? (v as Theme) : undefined
  } catch {}
  return undefined
}

function writeCookieTheme(value: Theme) {
  try {
    const isSecure = window.location.protocol === 'https:' ? '; secure' : ''
    document.cookie = `theme=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax${isSecure}`
  } catch {}
}

function writeStorageTheme(value: Theme) {
  try {
    localStorage.setItem('theme', value)
  } catch {}
}

function writeCookieSystemTheme(value: SystemTheme | undefined) {
  if (!value) return
  try {
    const isSecure = window.location.protocol === 'https:' ? '; secure' : ''
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
  const [theme, setThemeState] = React.useState<Theme | undefined>(undefined)
  const [systemTheme, setSystemTheme] = React.useState<SystemTheme | undefined>(undefined)

  // Initialize from storage/cookie and normalize expired seasonal themes back to system
  React.useEffect(() => {
    const stored = readStorageTheme() ?? readCookieTheme() ?? 'system'
    const allowed = getAvailableThemes()
    const initialPref: Theme = stored !== 'system' && !allowed.includes(stored) ? 'system' : stored

    setThemeState(initialPref)
    const sys = getSystemTheme()
    setSystemTheme(sys)
    writeCookieSystemTheme(sys)

    // Persist normalization if it changed
    if (initialPref !== stored) {
      writeStorageTheme(initialPref)
      writeCookieTheme(initialPref)
    }

    // Ensure classes match preference immediately after mount; if a server computed initial theme exists, keep it
    if (!initialAppliedTheme) {
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
      const next = (e.newValue as Theme | null) ?? 'system'
      setThemeState(next)
      writeCookieTheme(next)
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

  const value: ThemeContextValue = React.useMemo(
    () => ({ theme, setTheme, resolvedTheme, systemTheme, initialAppliedThemeName: initialAppliedTheme }),
    [theme, setTheme, resolvedTheme, systemTheme, initialAppliedTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
