import { AboutMeQuickFacts } from './aboutme-quickfacts'
import { AboutMeText } from './aboutme-text'

export function AboutMeContent() {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-transparent p-6 shadow-none backdrop-blur-2xs">
      <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
        <AboutMeText />
        <AboutMeQuickFacts />
      </div>
    </div>
  )
}
