'use client'

import { useTheme } from '@/components/providers/theme-provider'
import { getDefaultThemeForNow } from '@/lib/theme-runtime'
import { type CssTheme } from '@/lib/themes'
import { useEffect } from 'react'

function setThemeCookie(value: string) {
  try {
    document.cookie = `theme=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax`
  } catch {}
}

export function ThemeCookieSync() {
  const { resolvedTheme, theme } = useTheme()

  useEffect(() => {
    const seasonalDefault = getDefaultThemeForNow()
    if (theme === 'system' && seasonalDefault !== 'system') {
      const seasonal: CssTheme = seasonalDefault as CssTheme
      try {
        const root = document.documentElement
        // Layer seasonal on top of system-effective (dark/light) without removing it
        root.classList.remove('halloween', 'cyberpunk')
        root.classList.add(seasonal)
      } catch {}
      // Preserve the user's selected preference of "system" in the cookie
      setThemeCookie('system')
      return
    }

    // Store the user's explicit preference (not the resolved/effective theme)
    const pref = theme ?? 'system'
    setThemeCookie(pref)
  }, [resolvedTheme, theme])

  return null
}
