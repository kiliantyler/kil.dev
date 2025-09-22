import type { AchievementId } from '@/lib/achievements'

export type StarValue = 0 | 1 | 2 | 3 | 4 | 5
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
    ratingText: Record<StarValue, string>
  }
}

export type ReviewState = {
  triggeredAt?: string
  submittedAt?: string
  lastRating?: StarValue
  reminderCount: number
}
