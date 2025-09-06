import { GitHubButton } from '@/components/layout/header/github-button'
import { HomeLogo } from '@/components/layout/header/home-logo'
import { LinkedInButton } from '@/components/layout/header/linkedin-button'
import { NavLava } from '@/components/layout/header/nav-lava'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export function Header() {
  return (
    <header className="flex items-center justify-between border-solid whitespace-nowrap sticky top-0 z-50 w-full bg-background/90 px-10 py-8 border-b border-border">
      <HomeLogo />
      <NavLava />
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <GitHubButton />
        <LinkedInButton />
      </div>
    </header>
  )
}
