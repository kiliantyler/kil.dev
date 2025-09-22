'use client'

import type { ThemeName } from '@/lib/themes'
import type { UnlockedMap } from '@/utils/achievements'
import { AchievementsProvider } from './achievements-provider'
import { ConfettiProvider } from './confetti-provider'
import { PostHogProvider } from './posthog-provider'
import { ReviewProvider } from './review-provider'
import { SnowProvider } from './snow-provider'
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
          <SnowProvider>
            <AchievementsProvider initialUnlocked={initialUnlocked}>
              <ReviewProvider>{children}</ReviewProvider>
            </AchievementsProvider>
          </SnowProvider>
        </ConfettiProvider>
      </ThemeProvider>
    </PostHogProvider>
  )
}
