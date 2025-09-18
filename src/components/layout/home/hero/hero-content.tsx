'use client'

import { useKonamiAnimation } from '@/components/providers/konami-animation-provider'
import { LinkButton } from '@/components/ui/link-button'
import { MapTooltip } from '@/components/ui/map-tooltip'
import { HOME_CONTENT } from '@/lib/content'

export function HeroContent() {
  const { isAnimating, hasAnimated } = useKonamiAnimation()

  return (
    <div
      className={`order-2 flex flex-col gap-6 lg:order-1 ${isAnimating ? 'konami-fly-left' : ''} ${hasAnimated ? 'konami-complete konami-fly-left' : ''}`}>
      <div className="flex flex-col gap-2">
        <h1 className="text-5xl leading-tight font-black tracking-tight text-foreground md:text-6xl">
          {HOME_CONTENT.NAME}
        </h1>
        <p className="text-primary text-lg font-semibold md:text-xl">{HOME_CONTENT.TITLE}</p>
        <MapTooltip />
      </div>
      <div className="flex flex-wrap justify-center gap-4 lg:flex-nowrap lg:justify-start">
        <LinkButton
          href="/experience"
          className="bg-primary hover:bg-primary/90 h-12 min-w-[140px] gap-2 rounded-md px-6 text-base font-bold text-primary-foreground shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
          aria-label="View Experience">
          <span className="md:hidden">Experience</span>
          <span className="hidden md:inline">View Experience</span>
        </LinkButton>
        <LinkButton
          href="/projects"
          variant="secondary"
          className="bg-secondary h-12 min-w-[140px] rounded-md px-6 text-base font-bold text-secondary-foreground shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-secondary/80 hover:shadow-xl"
          aria-label="Open projects page">
          <span className="truncate md:hidden">Projects</span>
          <span className="hidden md:inline">View Projects</span>
        </LinkButton>
      </div>
    </div>
  )
}
