'use client'

import type { ThemeName } from '@/lib/themes'
import { PostHogProvider } from './posthog-provider'
import { ThemeProvider } from './theme-provider'

export function Providers({
  children,
  initialAppliedTheme,
}: {
  children: React.ReactNode
  initialAppliedTheme?: ThemeName
}) {
  return (
    <PostHogProvider>
      <ThemeProvider initialAppliedTheme={initialAppliedTheme}>{children}</ThemeProvider>
    </PostHogProvider>
  )
}
