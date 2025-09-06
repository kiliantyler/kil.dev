import { GitHubButton } from '@/components/layout/header/github-button'
import { HomeLogo } from '@/components/layout/header/home-logo'
import { LinkedInButton } from '@/components/layout/header/linkedin-button'
import { NavLava } from '@/components/layout/header/nav-lava'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export function Header() {
  return (
    <header className="grid grid-cols-[1fr_auto_1fr] items-center border-solid whitespace-nowrap sticky top-0 z-50 w-full bg-background/90 px-10 py-8 border-b border-border">
      <div className="justify-self-start">
        <HomeLogo />
      </div>
      <div className="justify-self-center">
        <NavLava />
      </div>
      <div className="flex items-center gap-3 justify-self-end">
        <ThemeToggle />
        <GitHubButton />
        <LinkedInButton />
      </div>
    </header>
  )
}
