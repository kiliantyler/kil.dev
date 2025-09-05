import { LocationWithMapTooltip } from '@/components/layout/location-with-map-tooltip'
import { ProfileImage } from '@/components/layout/profile-image'
import { LinkButton } from '@/components/ui/link-button'
import { CONTENT } from '@/lib/constants'

function HeroContent() {
  return (
    <div className="order-2 flex flex-col gap-6 lg:order-1">
      <div className="flex flex-col gap-2">
        <h1 className="text-5xl leading-tight font-black tracking-tight text-foreground md:text-6xl">{CONTENT.NAME}</h1>
        <p className="text-primary text-lg font-semibold md:text-xl">{CONTENT.TITLE}</p>
        <LocationWithMapTooltip />
      </div>
      <div className="flex flex-wrap justify-center gap-4 lg:justify-start">
        <LinkButton
          href="#"
          className="bg-primary hover:bg-primary/90 h-12 min-w-[140px] gap-2 rounded-md px-6 text-base font-bold text-primary-foreground shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
          aria-label="View Experience">
          <span>View Experience</span>
        </LinkButton>
        <LinkButton
          href="/projects"
          variant="secondary"
          className="bg-secondary h-12 min-w-[140px] rounded-md px-6 text-base font-bold text-secondary-foreground shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-secondary/80 hover:shadow-xl"
          aria-label="Open projects page">
          <span className="truncate">View Projects</span>
        </LinkButton>
      </div>
    </div>
  )
}

function Hero() {
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

export { Hero, HeroContent, ProfileImage }
