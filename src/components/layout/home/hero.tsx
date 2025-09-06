import { HeroContent } from './hero/hero-content'
import { ProfileImage } from './hero/profile-image'

export function Hero() {
  return (
    <main className="flex flex-1 items-center px-10 py-20 md:px-20 lg:px-40">
      <div className="w-full text-center lg:text-left">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
          <ProfileImage />
          <HeroContent />
        </div>
      </div>
    </main>
  )
}
