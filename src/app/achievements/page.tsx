'use client'

import { useAchievements } from '@/components/providers/achievements-provider'
import { FlippingCard } from '@/components/ui/flipping-card'
import { SectionLabel } from '@/components/ui/section-label'
import { ACHIEVEMENTS, type AchievementId } from '@/lib/achievements'

export default function AchievementsPage() {
  const { unlocked } = useAchievements()
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
            const frontIcon = isUnlocked ? (def.icon ?? '🏆') : '❓'
            const title = isUnlocked ? def.title : 'Hidden achievement'
            const description = isUnlocked ? def.description : 'Unlock to reveal details.'

            return (
              <li key={id} className="list-none">
                <FlippingCard
                  front={
                    <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-xl bg-card text-card-foreground border border-border">
                      <div className="text-6xl" aria-hidden>
                        {frontIcon}
                      </div>
                      <div className="px-4 text-center text-base font-semibold">{title}</div>
                    </div>
                  }
                  back={
                    <div className="flex h-full w-full flex-col justify-between rounded-xl bg-card text-card-foreground border border-border">
                      <div className="flex-1 p-6">
                        <h3 className="mb-2 text-lg font-semibold">{isUnlocked ? def.title : 'Hidden achievement'}</h3>
                        <p className="text-sm text-muted-foreground">{description}</p>
                      </div>
                      <div className="border-t border-border p-4 text-xs text-muted-foreground/90">
                        {isUnlocked ? `Unlocked: ${new Date(unlockedAt).toLocaleString()}` : 'Keep exploring the site!'}
                      </div>
                    </div>
                  }
                  backgroundImageSrc=""
                  ariaLabel={`Achievement: ${def.title}`}
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
