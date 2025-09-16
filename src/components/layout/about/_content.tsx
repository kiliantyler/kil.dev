import { UnlockOnMount } from '@/components/layout/achievements/unlock-on-mount'
import type { AchievementId } from '@/lib/achievements'
import { AboutMeContent } from './aboutme/_content'
import { PetsContent } from './pets/_content'

export function AboutContent() {
  return (
    <div className="flex flex-1 items-center px-10 py-20 md:px-20 lg:px-40">
      <UnlockOnMount id={'ABOUT_AMBLER' as AchievementId} />
      <div className="w-full">
        <AboutMeContent />
        <PetsContent />
      </div>
    </div>
  )
}
