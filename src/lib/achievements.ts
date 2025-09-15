export type AchievementId = 'GRUMPY_GLIMPSE'

export interface AchievementDefinition {
  id: AchievementId
  title: string
  description: string
  icon?: string
}

export const ACHIEVEMENTS: Record<AchievementId, AchievementDefinition> = {
  GRUMPY_GLIMPSE: {
    id: 'GRUMPY_GLIMPSE',
    title: 'Grumpy Glimpse',
    description: 'You discovered the grumpy portrait.',
    icon: '😠',
  },
}

export type UnlockedMap = Record<AchievementId, string>

export function createEmptyUnlocked(): UnlockedMap {
  return {
    GRUMPY_GLIMPSE: '',
  }
}

export function isValidAchievementId(id: string): id is AchievementId {
  return Object.prototype.hasOwnProperty.call(ACHIEVEMENTS, id)
}
