import { AboutMeContent } from './aboutme/_content'
import { PetsContent } from './pets/_content'

export function AboutContent() {
  return (
    <div className="flex flex-1 items-center px-10 py-20 md:px-20 lg:px-40">
      <div className="w-full">
        <AboutMeContent />
        <PetsContent />
      </div>
    </div>
  )
}
