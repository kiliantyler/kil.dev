'use client'

import { getDefaultThemeForNow, type Theme } from '@/lib/themes'
import * as React from 'react'

type SystemTheme = 'light' | 'dark'

type ThemeContextValue = {
  theme: Theme | undefined
  setTheme: (theme: Theme) => void
  resolvedTheme: Theme | SystemTheme | undefined
  systemTheme: SystemTheme | undefined
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined)

function readCookieTheme(): Theme | undefined {
  try {
    const re = /(?:^|; )theme=([^;]+)/
    const match = re.exec(document.cookie)
    if (match?.[1]) {
      const raw = match[1]
      const decoded = decodeURIComponent(raw)
      return decoded as Theme
    }
  } catch {}
  return undefined
}

function readStorageTheme(): Theme | undefined {
  try {
    const v = localStorage.getItem('theme')
    return v ? (v as Theme) : undefined
  } catch {}
  return undefined
}

function writeCookieTheme(value: Theme) {
  try {
    document.cookie = `theme=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax`
  } catch {}
}

function writeStorageTheme(value: Theme) {
  try {
    localStorage.setItem('theme', value)
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
  const remove = (cls: string) => root.classList.remove(cls)
  const add = (cls: string) => root.classList.add(cls)

  if (preference === 'system') {
    const effective = system ?? 'light'
    // Ensure system dark/light present
    if (!root.classList.contains(effective)) add(effective)
    const other = effective === 'dark' ? 'light' : 'dark'
    if (root.classList.contains(other)) remove(other)
    // Seasonal overlay when active
    if (seasonalDefault && seasonalDefault !== 'system') {
      if (!root.classList.contains(seasonalDefault)) add(seasonalDefault)
      // Do not remove seasonal here
    } else {
      remove('halloween')
      remove('cyberpunk')
    }
    return
  }

  // Explicit theme preference
  const cssClasses = ['dark', 'light', 'halloween', 'cyberpunk']
  for (const c of cssClasses) remove(c)
  add(preference)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme | undefined>(undefined)
  const [systemTheme, setSystemTheme] = React.useState<SystemTheme | undefined>(undefined)

  // Initialize from storage/cookie
  React.useEffect(() => {
    const stored = readStorageTheme() ?? readCookieTheme() ?? 'system'
    setThemeState(stored)
    setSystemTheme(getSystemTheme())
    // Ensure classes match preference immediately after mount
    applyClasses(stored, getSystemTheme())
  }, [])

  // Watch OS theme changes
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      const sys = mq.matches ? 'dark' : 'light'
      setSystemTheme(sys)
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

  const resolvedTheme: Theme | SystemTheme | undefined = React.useMemo(() => {
    const pref = theme ?? 'system'
    if (pref === 'system') return systemTheme ?? 'light'
    return pref
  }, [theme, systemTheme])

  const value: ThemeContextValue = React.useMemo(
    () => ({ theme, setTheme, resolvedTheme, systemTheme }),
    [theme, setTheme, resolvedTheme, systemTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
