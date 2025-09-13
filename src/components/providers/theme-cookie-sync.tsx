'use client'

import { useTheme } from '@/components/providers/theme-provider'
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
    // Only persist the user's preference. Class management is handled by
    // the SSR scripts and ThemeProvider to avoid reflows/FOUC on mount.
    const pref = theme ?? 'system'
    setThemeCookie(pref)
  }, [resolvedTheme, theme])

  return null
}
