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

// Cookie bridge for SSR hydration consistency
export const ACHIEVEMENTS_COOKIE_NAME = 'kil.dev_achievements_v1'

export function parseUnlockedCookie(raw: string | undefined): UnlockedMap {
  if (!raw) return createEmptyUnlocked()
  let text = raw
  try {
    // Handle percent-encoded cookie values
    text = decodeURIComponent(raw)
  } catch {}
  try {
    const parsed = JSON.parse(text) as unknown
    if (!parsed || typeof parsed !== 'object') return createEmptyUnlocked()
    const base = createEmptyUnlocked()
    const result: UnlockedMap = { ...base }
    for (const key of Object.keys(base)) {
      const k = key as AchievementId
      const v = (parsed as Record<string, unknown>)[k]
      result[k] = typeof v === 'string' ? v : ''
    }
    return result
  } catch {
    return createEmptyUnlocked()
  }
}

export function serializeUnlockedCookie(map: UnlockedMap): string {
  // Only persist known keys to keep cookie compact and predictable
  const base = createEmptyUnlocked()
  const payload: Record<AchievementId, string> = { ...base }
  for (const key of Object.keys(base) as AchievementId[]) {
    payload[key] = map[key] || ''
  }
  return JSON.stringify(payload)
}
