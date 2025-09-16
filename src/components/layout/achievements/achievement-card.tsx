'use client'

import { AchievementCardBack } from '@/components/layout/achievements/achievement-card-back'
import { AchievementCardFront } from '@/components/layout/achievements/achievement-card-front'
import { useAchievements } from '@/components/providers/achievements-provider'
import { FlippingCard } from '@/components/ui/flipping-card'
import unknownAchievementImage from '@/images/achievements/unknown.webp'
import { ACHIEVEMENTS, type AchievementId } from '@/lib/achievements'
import { isLadybirdUA } from '@/utils/ladybird'
import { format, isValid as isValidDate, parseISO } from 'date-fns'
import { useEffect, useState } from 'react'

export function AchievementCard({ id, initialUnlockedAt }: { id: AchievementId; initialUnlockedAt?: string }) {
  const { unlocked } = useAchievements()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // After mount, prefer client state. During SSR/first paint, fall back to server-sent value
  const unlockedAt = isMounted ? unlocked[id] : initialUnlockedAt
  const isUnlocked = Boolean(unlockedAt)
  const def = ACHIEVEMENTS[id]
  if (!def) return null

  const title = isUnlocked ? def.title : 'Hidden achievement'

  const isLadybird = isLadybirdUA()

  let description = isUnlocked ? def.cardDescription : def.unlockHint
  if (id === ('LADYBIRD_LANDING' as AchievementId)) {
    let friendTip = "Thanks for checking out the site on Ladybird! (I assume you did that and didn't cheat, right?)"
    if (isLadybird) {
      friendTip = 'Tip for friends not on Ladybird: on the Achievements page, type ‘ladybird!’ to unlock this.'
    }
    description = isUnlocked ? `${def.cardDescription} ${friendTip}` : `${def.unlockHint}`
  }

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
  const flipLabelFrontDesktop = isUnlocked ? 'View details' : 'View a hint'
  const flipLabelFrontMobile = isUnlocked ? 'Tap for details' : 'Tap for a hint'
  const flipLabelBackDesktop = isUnlocked ? 'Go back' : 'Go back'
  const flipLabelBackMobile = isUnlocked ? 'Tap to go back' : 'Tap to go back'

  return (
    <FlippingCard
      front={<AchievementCardFront />}
      back={<AchievementCardBack title={title} description={description} footer={footer} />}
      backgroundImageSrc={imageSrc}
      backgroundImageAlt={imageAlt}
      backgroundSizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      ariaLabel={ariaLabel}
      className="rounded-xl"
      flipLabelFrontDesktop={flipLabelFrontDesktop}
      flipLabelFrontMobile={flipLabelFrontMobile}
      flipLabelBackDesktop={flipLabelBackDesktop}
      flipLabelBackMobile={flipLabelBackMobile}
    />
  )
}
