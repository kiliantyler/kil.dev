import { AchievementCard } from '@/components/layout/achievements/achievement-card'
import { AchievementResetButton } from '@/components/layout/achievements/achievement-reset-button'
import { LadybirdSecretListener } from '@/components/layout/achievements/ladybird-secret-listener'
import { SectionLabel } from '@/components/ui/section-label'
import { ACHIEVEMENTS, ACHIEVEMENTS_COOKIE_NAME, type AchievementId } from '@/lib/achievements'
import { parseUnlockedCookie } from '@/utils/achievements'
import { cookies } from 'next/headers'

export default async function AchievementsPage() {
  // Read per-user achievement state only for this page to keep other routes static
  const cookieStore = await cookies()
  const cookieValue = cookieStore.get(ACHIEVEMENTS_COOKIE_NAME)?.value
  const unlocked = parseUnlockedCookie(cookieValue)
  const entries: Array<[AchievementId, (typeof ACHIEVEMENTS)[AchievementId]]> = Object.entries(ACHIEVEMENTS) as Array<
    [AchievementId, (typeof ACHIEVEMENTS)[AchievementId]]
  >

  return (
    <div className="px-10 py-16 md:px-20 lg:px-40">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <LadybirdSecretListener />
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-2">
              <SectionLabel as="p">Dopamine Hits</SectionLabel>
              <p className="text-muted-foreground">Some are hidden. Can you find them all?</p>
            </div>
            <AchievementResetButton />
          </div>
        </div>

        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map(([id]) => (
            <li key={id} className="list-none">
              <AchievementCard id={id} initialUnlockedAt={unlocked[id]} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
