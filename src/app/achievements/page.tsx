'use client'

import { useAchievements } from '@/components/providers/achievements-provider'
import { ACHIEVEMENTS, type AchievementId } from '@/lib/achievements'

export default function AchievementsPage() {
  const { unlocked } = useAchievements()
  const entries = Object.entries(ACHIEVEMENTS) as Array<[AchievementId, (typeof ACHIEVEMENTS)[AchievementId]]>

  return (
    <div className="mx-auto w-full max-w-3xl px-10 py-16 md:px-20 lg:px-40">
      <h1 className="mb-6 text-3xl font-bold">Achievements</h1>
      <p className="mb-10 text-muted-foreground">Some are hidden. Can you find them all?</p>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {entries.map(([id, def]) => {
          const unlockedAt = unlocked[id]
          const isUnlocked = Boolean(unlockedAt)
          return (
            <li key={id} className="rounded-lg border border-border p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-2xl" aria-hidden>
                  {def.icon ?? '🏆'}
                </span>
                <h2 className="text-lg font-semibold">{isUnlocked ? def.title : 'Hidden achievement'}</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                {isUnlocked ? def.description : 'Unlock to reveal details.'}
              </p>
              {isUnlocked && (
                <p className="mt-2 text-xs text-muted-foreground">Unlocked: {new Date(unlockedAt).toLocaleString()}</p>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
