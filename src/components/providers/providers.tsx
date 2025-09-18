'use client'

import type { ThemeName } from '@/lib/themes'
import type { UnlockedMap } from '@/utils/achievements'
import { AchievementsProvider } from './achievements-provider'
import { ConfettiProvider } from './confetti-provider'
import { PostHogProvider } from './posthog-provider'
import { ThemeProvider } from './theme-provider'

export function Providers({
  children,
  initialAppliedTheme,
  initialUnlocked,
}: {
  children: React.ReactNode
  initialAppliedTheme?: ThemeName
  initialUnlocked?: UnlockedMap
}) {
  return (
    <PostHogProvider>
      <ThemeProvider initialAppliedTheme={initialAppliedTheme}>
        <ConfettiProvider>
          <AchievementsProvider initialUnlocked={initialUnlocked}>{children}</AchievementsProvider>
        </ConfettiProvider>
      </ThemeProvider>
    </PostHogProvider>
  )
}
