'use client'

import { GitHubIcon } from '@/components/icons/github'
import { LinkButton } from '@/components/ui/link-button'
import { captureSocialLinkClicked } from '@/hooks/posthog'
import { EXTERNAL_LINKS } from '@/lib/constants'

export function GitHubButton() {
  return (
    <LinkButton
      href={EXTERNAL_LINKS.GITHUB}
      external
      className="bg-secondary hover:bg-accent h-10 min-w-0 rounded-lg px-4 text-sm font-bold text-secondary-foreground hover:ring-accent hover:ring-1 hover:ring-offset-2 ring-offset-background duration-300"
      aria-label="Open Kilian's GitHub profile in a new tab"
      onClick={() => {
        captureSocialLinkClicked('github', EXTERNAL_LINKS.GITHUB)
      }}>
      <GitHubIcon className="size-5" />
      <span className="hidden md:inline">GitHub</span>
    </LinkButton>
  )
}
