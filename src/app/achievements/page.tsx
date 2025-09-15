import { AchievementCardBack } from '@/components/layout/achievements/achievement-card-back'
import { AchievementCardFront } from '@/components/layout/achievements/achievement-card-front'
import { FlippingCard } from '@/components/ui/flipping-card'
import { SectionLabel } from '@/components/ui/section-label'
import unknownAchievementImage from '@/images/achievements/unknown.webp'
import { ACHIEVEMENTS, ACHIEVEMENTS_COOKIE_NAME, parseUnlockedCookie, type AchievementId } from '@/lib/achievements'
import { format, isValid as isValidDate, parseISO } from 'date-fns'
import { cookies } from 'next/headers'

export default async function AchievementsPage() {
  // Read per-user achievement state only for this page to keep other routes static
  const cookieStore = await cookies()
  const cookieValue = cookieStore.get(ACHIEVEMENTS_COOKIE_NAME)?.value
  const unlocked = parseUnlockedCookie(cookieValue)
  const entries = Object.entries(ACHIEVEMENTS) as Array<[AchievementId, (typeof ACHIEVEMENTS)[AchievementId]]>

  return (
    <div className="px-10 py-16 md:px-20 lg:px-40">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <div className="flex flex-col gap-2">
          <SectionLabel as="p">Achievements</SectionLabel>
          <p className="text-muted-foreground">Some are hidden. Can you find them all?</p>
        </div>

        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map(([id, def]) => {
            const unlockedAt = unlocked[id]
            const isUnlocked = Boolean(unlockedAt)
            const title = isUnlocked ? def.title : 'Hidden achievement'
            const description = isUnlocked ? def.cardDescription : 'Unlock to reveal details.'
            let footer = 'Keep exploring the site!'
            if (isUnlocked) {
              if (unlockedAt) {
                // Safely parse and format. Prefer ISO parsing; fall back to Date constructor.
                const isoDate = parseISO(unlockedAt)
                if (isValidDate(isoDate)) {
                  footer = `Unlocked: ${format(isoDate, 'PP p')}`
                } else {
                  const fallbackDate = new Date(unlockedAt)
                  footer = Number.isNaN(fallbackDate.getTime())
                    ? 'Unlocked'
                    : `Unlocked: ${format(fallbackDate, 'PP p')}`
                }
              } else {
                footer = 'Unlocked'
              }
            }
            const imageSrc = isUnlocked ? def.imageSrc : unknownAchievementImage
            const imageAlt = isUnlocked ? def.imageAlt : 'Unknown achievement'
            const ariaLabel = isUnlocked ? `Achievement: ${def.title}` : 'Hidden achievement'

            return (
              <li key={id} className="list-none">
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
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
