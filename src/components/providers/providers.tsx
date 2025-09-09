'use client'

import { getActiveSeasonalThemes, getCssThemesForNow } from '@/lib/themes'
import { PostHogProvider } from './posthog-provider'
import { ThemeCookieSync } from './theme-cookie-sync'
import { ThemeProvider } from './theme-provider'

export function Providers({ children }: { children: React.ReactNode }) {
  // Intentionally compute and ignore; seasonal exclusion handled by custom ThemeProvider
  void getCssThemesForNow()
  void getActiveSeasonalThemes()
  return (
    <PostHogProvider>
      <ThemeProvider>
        <ThemeCookieSync />
        {children}
      </ThemeProvider>
    </PostHogProvider>
  )
}
