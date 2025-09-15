'use client'

import type { ThemeName } from '@/lib/themes'
import { AchievementsProvider } from './achievements-provider'
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
      <ThemeProvider initialAppliedTheme={initialAppliedTheme}>
        <AchievementsProvider>{children}</AchievementsProvider>
      </ThemeProvider>
    </PostHogProvider>
  )
}
