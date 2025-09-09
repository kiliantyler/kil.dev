'use client'

import type { ThemeName } from '@/lib/themes'
import { PostHogProvider } from './posthog-provider'
import { ThemeCookieSync } from './theme-cookie-sync'
import { ThemeProvider } from './theme-provider'

export function Providers({
  children,
  initialAppliedTheme,
}: {
  children: React.ReactNode
  initialAppliedTheme: ThemeName
}) {
  return (
    <PostHogProvider>
      <ThemeProvider initialAppliedTheme={initialAppliedTheme}>
        <ThemeCookieSync />
        {children}
      </ThemeProvider>
    </PostHogProvider>
  )
}
