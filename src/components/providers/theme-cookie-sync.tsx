'use client'

import { useTheme } from 'next-themes'
import { useEffect } from 'react'

function setThemeCookie(value: string) {
  try {
    document.cookie = `theme=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax`
  } catch {}
}

export function ThemeCookieSync() {
  const { resolvedTheme, theme } = useTheme()

  useEffect(() => {
    const chosen = resolvedTheme || theme || 'system'
    setThemeCookie(chosen)
  }, [resolvedTheme, theme])

  return null
}
