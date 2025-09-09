'use client'

import { GitHubButton } from '@/components/layout/header/github-button'
import { HomeLogo } from '@/components/layout/header/home-logo'
import { LinkedInButton } from '@/components/layout/header/linkedin-button'
import { MobileNav } from '@/components/layout/header/mobile-nav'
import { NavLava } from '@/components/layout/header/nav-lava'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import React from 'react'

export function Header() {
  const [themeFlyoutWidth, setThemeFlyoutWidth] = React.useState(0)
  const [themeOpen, setThemeOpen] = React.useState(false)
  const [shouldAvoidOverlap, setShouldAvoidOverlap] = React.useState(false)

  React.useEffect(() => {
    if (typeof window === 'undefined') return
    // Only avoid overlap at <= 1000px
    const mql = window.matchMedia('(max-width: 1000px)')
    const update = () => setShouldAvoidOverlap(mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [])
  return (
    <header className="border-solid whitespace-nowrap sticky top-0 z-50 w-full bg-background/90 border-b border-border">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center px-4 md:px-10 py-6 md:py-8">
        <div className="justify-self-start">
          <div className="flex items-center gap-2">
            <MobileNav />
            <HomeLogo condensed={shouldAvoidOverlap && Boolean(themeFlyoutWidth)} />
          </div>
        </div>
        <div
          className="justify-self-center transition-transform duration-300 ease-out will-change-transform"
          style={{
            transform:
              shouldAvoidOverlap && (themeOpen || themeFlyoutWidth)
                ? `translateX(-${Math.ceil(Math.max(themeFlyoutWidth, 56))}px)`
                : undefined,
          }}>
          <NavLava />
        </div>
        <div className="flex items-center gap-3 justify-self-end">
          <ThemeToggle onFlyoutWidthChange={setThemeFlyoutWidth} onOpenChange={setThemeOpen} />
          <GitHubButton />
          <LinkedInButton />
        </div>
      </div>
    </header>
  )
}
