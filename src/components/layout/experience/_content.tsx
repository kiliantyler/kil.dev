import { UnlockOnMount } from '@/components/layout/achievements/unlock-on-mount'
import type { AchievementId } from '@/lib/achievements'
import { ExperienceSkills } from './skills/_content'
import { WorkHistory } from './work-history/_content'

export function ExperienceContent() {
  return (
    <div className="px-10 py-16 md:px-20 lg:px-40">
      <UnlockOnMount id={'EXPERIENCE_EXPLORER' as AchievementId} />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <WorkHistory />
        <ExperienceSkills />
      </div>
    </div>
  )
}
