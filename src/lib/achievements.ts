import ConfusedAchievement from '@/images/achievements/confused-click.webp'
import GrumpyAchievement from '@/images/achievements/grumpy-glimpse.webp'
import LadybirdAchievement from '@/images/achievements/ladybird-landing.webp'
import type { StaticImageData } from 'next/image'

export interface AchievementDefinition {
  id: string
  title: string
  description: string
  icon: string
  imageSrc: StaticImageData
  imageAlt: string
  cardDescription: string
  unlockHint: string
}

export const ACHIEVEMENTS: Record<string, AchievementDefinition> = {
  GRUMPY_GLIMPSE: {
    id: 'GRUMPY_GLIMPSE',
    title: 'Grumpy Glimpse',
    description: "He's not a fan of being clicked on.",
    icon: '😠',
    imageSrc: GrumpyAchievement,
    imageAlt: 'Grumpy Glimpse',
    cardDescription: 'A fleeting look at the grumpiest timeline. No smiles here. Why did you click on him?',
    unlockHint: "I don't think he likes to be clicked on.",
  },
  CONFUSED_CLICK: {
    id: 'CONFUSED_CLICK',
    title: 'But why?',
    description: 'You clicked on the same site again.',
    icon: '🤔',
    imageSrc: ConfusedAchievement,
    imageAlt: 'Confused Glimpse',
    cardDescription:
      'Even though you were already on this site, you clicked to visit it again. Why? Oh well, you got an achievement for it.',
    unlockHint: 'Have you ever been so confused you clicked on the same site again?',
  },
  // PET_PARADE: {
  //   id: 'PET_PARADE',
  //   title: 'Pet Parade',
  //   description: 'Ohhh you like pets? You got an achievement for that.',
  //   icon: '🐾',
  //   imageSrc: PetParadeAchievement,
  //   imageAlt: 'Pet Parade',
  //   cardDescription: 'I have a lot of pets and I love them all. This is a celebration of them. Thanks for looking!',
  //   unlockHint: 'How much do you love pets? Enough to learn about them all?',
  // },
  // RECURSIVE_REWARD: {
  //   id: 'RECURSIVE_REWARD',
  //   title: 'Recursive Reward',
  //   description: 'You got an achievement for getting an achievement. How meta!',
  //   icon: '🎉',
  //   imageSrc: RecursiveRewardAchievement,
  //   imageAlt: 'Recursive Reward',
  //   cardDescription:
  //     'You unlocked three achievements and got a fourth one as a reward! An achievement collectors dream!',
  //   unlockHint: 'How are you even viewing this page without having unlocked this? Did you look at the source code?',
  // },
  LADYBIRD_LANDING: {
    id: 'LADYBIRD_LANDING',
    title: 'Ladybird Landing',
    description: 'You landed on the site using Ladybird!',
    icon: '🦅',
    imageSrc: LadybirdAchievement,
    imageAlt: 'Ladybird Landing',
    cardDescription: 'We love an open web and independent browsers! Ladybird is such a great project.',
    unlockHint: 'You should browse this site on a truly independent web browser.',
  },
}

export type AchievementId = keyof typeof ACHIEVEMENTS
export type UnlockedMap = Record<AchievementId, string>

export function createEmptyUnlocked(): UnlockedMap {
  return {}
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
      const k = key
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
  for (const key of Object.keys(base)) {
    payload[key] = map[key] ?? ''
  }
  return JSON.stringify(payload)
}
