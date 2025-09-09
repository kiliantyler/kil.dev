'use client'

import { cssThemes } from '@/lib/themes'
import { PostHogProvider } from './posthog-provider'
import { ThemeCookieSync } from './theme-cookie-sync'
import { ThemeProvider } from './theme-provider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PostHogProvider>
      <ThemeProvider themes={cssThemes} attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <ThemeCookieSync />
        {children}
      </ThemeProvider>
    </PostHogProvider>
  )
}
