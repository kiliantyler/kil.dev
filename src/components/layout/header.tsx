import { GitHubIcon } from '@/components/icons/github'
import { LinkedInIcon } from '@/components/icons/linkedin'
import { Logo } from '@/components/icons/logo'
import { NavigationLava } from '@/components/layout/nav-lava'
import { LinkButton } from '@/components/ui/link-button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { EXTERNAL_LINKS } from '@/lib/constants'
import Link from 'next/link'

function GitHubButton() {
  return (
    <LinkButton
      href={EXTERNAL_LINKS.GITHUB}
      external
      className="bg-secondary hover:bg-accent h-10 min-w-0 rounded-lg px-4 text-sm font-bold text-secondary-foreground hover:ring-accent hover:ring-1 hover:ring-offset-2 ring-offset-background duration-300"
      aria-label="Open Kilian's GitHub profile in a new tab">
      <GitHubIcon className="size-5" />
      <span className="hidden md:inline">GitHub</span>
    </LinkButton>
  )
}

function LinkedInButton() {
  return (
    <LinkButton
      href={EXTERNAL_LINKS.LINKEDIN}
      external
      className="bg-secondary hover:bg-accent h-10 min-w-0 rounded-lg px-4 text-sm font-bold text-secondary-foreground hover:ring-accent hover:ring-1 hover:ring-offset-2 ring-offset-background duration-300"
      aria-label="Open Kilian's LinkedIn profile in a new tab">
      <LinkedInIcon className="size-5" />
      <span className="hidden md:inline">LinkedIn</span>
    </LinkButton>
  )
}

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
