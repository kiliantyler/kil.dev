import { Logo } from '@/components/icons/logo'
import { NavigationLava } from '@/components/layout/nav-lava'
import { GitHubButton, LinkedInButton } from '@/components/layout/social-buttons'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import Link from 'next/link'

function HomeLogo() {
  return (
    <Link href="/">
      <div className="group flex cursor-pointer items-center gap-3 text-foreground">
        <Logo fill="currentColor" width={32} height={32} />
        <h2
          className="relative text-xl leading-tight font-bold text-foreground transition-all duration-300 ease-in-out"
          data-hover-text="Kilian.DevOps">
          <span className="transition-opacity duration-300 group-hover:opacity-0">kil.dev</span>
          <span className="absolute top-0 left-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            Kilian.DevOps
          </span>
        </h2>
      </div>
    </Link>
  )
}

function Header() {
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
