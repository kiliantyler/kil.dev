export type AchievementId = 'GRUMPY_GLIMPSE'

import GrumpyGlimpse from '@/images/achievements/grumpy-glimpse.webp'
import type { StaticImageData } from 'next/image'

export interface AchievementDefinition {
  id: AchievementId
  title: string
  description: string
  icon: string
  imageSrc: StaticImageData
  imageAlt: string
  cardDescription: string
}

export const ACHIEVEMENTS: Record<AchievementId, AchievementDefinition> = {
  GRUMPY_GLIMPSE: {
    id: 'GRUMPY_GLIMPSE',
    title: 'Grumpy Glimpse',
    description: 'You discovered the grumpy portrait.',
    icon: '😠',
    imageSrc: GrumpyGlimpse,
    imageAlt: 'Grumpy Glimpse',
    cardDescription:
      "A fleeting look at the grumpiest timeline. No smiles here. I don't think he likes to be clicked on.",
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
