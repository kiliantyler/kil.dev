import type { AchievementId } from '@/lib/achievements'

export interface ReviewConfig {
  enabled: boolean
  achievementsThreshold: number
  storageKey: string
  achievementIdOnSubmit: AchievementId
  copy: {
    title: string
    intro: string
    submitCta: string
    snarkOnReturn: string[]
    ratingText: Record<1 | 2 | 3 | 4 | 5, string>
  }
}

export type ReviewState = {
  triggeredAt?: string
  submittedAt?: string
  lastRating?: 0 | 1 | 2 | 3 | 4 | 5
  reminderCount: number
}
