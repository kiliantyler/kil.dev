import { HomeLogo } from '@/components/layout/header/home-logo'
import { NavigationLava } from '@/components/layout/nav-lava'
import { GitHubButton, LinkedInButton } from '@/components/layout/social-buttons'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export function Header() {
  return (
    <header className="flex items-center justify-between border-solid whitespace-nowrap sticky top-0 z-50 w-full bg-background/90 px-10 py-8 border-b border-border">
      <HomeLogo />
      <NavigationLava />
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <GitHubButton />
        <LinkedInButton />
      </div>
    </header>
  )
}

export { GitHubButton, Header }
