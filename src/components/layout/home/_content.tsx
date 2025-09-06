import { HeroContent } from './hero/hero-content'
import { ProfileImage } from './hero/profile-image'

export function HomeContent() {
  return (
    <section className="flex min-h-[calc(100svh-14rem)] md:min-h-[calc(100svh-16rem)] items-center px-10 py-20 md:px-20 lg:px-40">
      <div className="mx-auto w-full max-w-7xl text-center lg:text-left">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
          <ProfileImage />
          <HeroContent />
        </div>
      </div>
    </section>
  )
}
