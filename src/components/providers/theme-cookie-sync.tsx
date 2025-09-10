'use client'

import { useTheme } from '@/components/providers/theme-provider'
import { getDefaultThemeForNow } from '@/lib/theme-runtime'
import { themes, type ThemeName } from '@/lib/themes'
import { useEffect } from 'react'

function setThemeCookie(value: string) {
  try {
    const isSecure = window.location.protocol === 'https:' ? '; secure' : ''
    document.cookie = `theme=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax${isSecure}`
  } catch {}
}

export function ThemeCookieSync() {
  const { resolvedTheme, theme } = useTheme()

  useEffect(() => {
    const seasonalDefault = getDefaultThemeForNow()
    if (theme === 'system' && seasonalDefault !== 'system') {
      const seasonal: ThemeName = seasonalDefault
      try {
        const root = document.documentElement
        // Layer seasonal on top of system-effective (dark/light) without removing it
        const allThemeClassNames = themes.map(t => t.name)
        for (const cls of allThemeClassNames) {
          if (cls === 'light' || cls === 'dark') continue
          root.classList.remove(cls)
        }
        root.classList.add(seasonal)
        root.dataset.seasonalOverlay = seasonal
      } catch {}
      // Preserve the user's selected preference of "system" in the cookie
      setThemeCookie('system')
      return
    }
    // Store the user's explicit preference (not the resolved/effective theme)
    const pref = theme ?? 'system'
    try {
      const root = document.documentElement
      const overlay = root.dataset.seasonalOverlay
      if (overlay) {
        root.classList.remove(overlay)
        delete root.dataset.seasonalOverlay
      }
      // If an explicit theme is chosen (non-system), proactively remove all non-base theme classes
      if (pref !== 'system') {
        const allThemeClassNames = themes.map(t => t.name)
        for (const cls of allThemeClassNames) {
          if (cls === 'light' || cls === 'dark') continue
          root.classList.remove(cls)
        }
        // Apply explicit base theme or add explicit non-base theme class
        if (pref === 'light' || pref === 'dark') {
          const other = pref === 'light' ? 'dark' : 'light'
          root.classList.remove(other)
          root.classList.add(pref)
        } else {
          root.classList.add(pref)
        }
      }
    } catch {}
    setThemeCookie(pref)
  }, [resolvedTheme, theme])

  return null
}
