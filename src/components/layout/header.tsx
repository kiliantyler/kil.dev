import { GitHubIcon } from '@/components/icons/github'
import { LinkedInIcon } from '@/components/icons/linkedin'
import { Logo } from '@/components/icons/logo'
import { LinkButton } from '@/components/ui/link-button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { EXTERNAL_LINKS, NAVIGATION } from '@/lib/constants'
import Link from 'next/link'

function Navigation() {
  return (
    <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
      {NAVIGATION.map(item => {
        const isExternal = item.href.startsWith('http')
        const Component = isExternal ? 'a' : Link

        return (
          <Component
            key={item.href}
            href={item.href}
            className="hover:text-example-primary text-sm font-medium text-slate-300 transition-colors"
            {...(isExternal && {
              target: '_blank',
              rel: 'noopener noreferrer',
            })}>
            {item.label}
          </Component>
        )
      })}
    </nav>
  )
}

function GitHubButton() {
  return (
    <LinkButton
      href={EXTERNAL_LINKS.GITHUB}
      external
      className="bg-example-secondary hover:bg-example-accent h-10 min-w-0 rounded-lg px-4 text-sm font-bold text-white transition-colors"
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
      className="bg-example-secondary hover:bg-example-accent h-10 min-w-0 rounded-lg px-4 text-sm font-bold text-white transition-colors"
      aria-label="Open Kilian's LinkedIn profile in a new tab">
      <LinkedInIcon className="size-5" />
      <span className="hidden md:inline">LinkedIn</span>
    </LinkButton>
  )
}

function Header() {
  return (
    <header className="border-example-border flex items-center justify-between border-b border-solid px-10 py-5 whitespace-nowrap">
      <div className="group flex cursor-default items-center gap-3 text-white">
        <Logo
          fill="white"
          width={32}
          height={32}
          className="transition-all duration-300 ease-in-out group-hover:scale-110"
        />
        <h2
          className="relative text-xl leading-tight font-bold text-white transition-all duration-300 ease-in-out"
          data-hover-text="Kilian.DevOps">
          <span className="transition-opacity duration-300 group-hover:opacity-0">kil.dev</span>
          <span className="absolute top-0 left-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            Kilian.DevOps
          </span>
        </h2>
      </div>
      <Navigation />
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <GitHubButton />
        <LinkedInButton />
      </div>
    </header>
  )
}

export { GitHubButton, Header, Navigation }
