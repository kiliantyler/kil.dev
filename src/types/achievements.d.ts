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
  confetti: boolean
}
