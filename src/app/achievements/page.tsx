import { AchievementCard } from '@/components/layout/achievements/achievement-card'
import { LadybirdSecretListener } from '@/components/layout/achievements/ladybird-secret-listener'
import { SectionLabel } from '@/components/ui/section-label'
import { ACHIEVEMENTS, ACHIEVEMENTS_COOKIE_NAME, parseUnlockedCookie, type AchievementId } from '@/lib/achievements'
import { cookies } from 'next/headers'

export default async function AchievementsPage() {
  // Read per-user achievement state only for this page to keep other routes static
  const cookieStore = await cookies()
  const cookieValue = cookieStore.get(ACHIEVEMENTS_COOKIE_NAME)?.value
  const unlocked = parseUnlockedCookie(cookieValue)
  const entries: Array<[AchievementId, (typeof ACHIEVEMENTS)[AchievementId]]> = Object.entries(ACHIEVEMENTS)

  return (
    <div className="px-10 py-16 md:px-20 lg:px-40">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <LadybirdSecretListener />
        <div className="flex flex-col gap-2">
          <SectionLabel as="p">Achievements</SectionLabel>
          <p className="text-muted-foreground">Some are hidden. Can you find them all?</p>
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
