'use client'

import { AchievementCardBack } from '@/components/layout/achievements/achievement-card-back'
import { AchievementCardFront } from '@/components/layout/achievements/achievement-card-front'
import { useAchievements } from '@/components/providers/achievements-provider'
import { FlippingCard } from '@/components/ui/flipping-card'
import unknownAchievementImage from '@/images/achievements/unknown.webp'
import { ACHIEVEMENTS, type AchievementId } from '@/lib/achievements'
import { format, isValid as isValidDate, parseISO } from 'date-fns'

export function AchievementCard({ id, initialUnlockedAt }: { id: AchievementId; initialUnlockedAt?: string }) {
  const { unlocked } = useAchievements()

  const unlockedAt = unlocked[id] ?? initialUnlockedAt
  const isUnlocked = Boolean(unlockedAt)
  const def = ACHIEVEMENTS[id]
  if (!def) return null

  const title = isUnlocked ? def.title : 'Hidden achievement'
  const description = isUnlocked ? def.cardDescription : 'Unlock to reveal details.'

  let footer = 'Keep exploring the site!'
  if (isUnlocked) {
    if (unlockedAt) {
      const isoDate = parseISO(unlockedAt)
      if (isValidDate(isoDate)) {
        footer = `Unlocked: ${format(isoDate, 'PP p')}`
      } else {
        const fallbackDate = new Date(unlockedAt)
        footer = Number.isNaN(fallbackDate.getTime()) ? 'Unlocked' : `Unlocked: ${format(fallbackDate, 'PP p')}`
      }
    } else {
      footer = 'Unlocked'
    }
  }

  const imageSrc = isUnlocked ? def.imageSrc : unknownAchievementImage
  const imageAlt = isUnlocked ? def.imageAlt : 'Unknown achievement'
  const ariaLabel = isUnlocked ? `Achievement: ${def.title}` : 'Hidden achievement'

  return (
    <FlippingCard
      front={<AchievementCardFront />}
      back={<AchievementCardBack title={title} description={description} footer={footer} />}
      backgroundImageSrc={imageSrc}
      backgroundImageAlt={imageAlt}
      backgroundSizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      ariaLabel={ariaLabel}
      className="rounded-xl"
      flipLabelFrontDesktop="View details"
      flipLabelFrontMobile="Flip"
      flipLabelBackDesktop="Go back"
      flipLabelBackMobile="Flip"
    />
  )
}
