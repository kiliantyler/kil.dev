'use client'

import { GitHubIcon } from '@/components/icons/github'
import { LinkButton } from '@/components/ui/link-button'
import { captureSocialLinkClicked } from '@/hooks/posthog'
import { SOCIAL_LINKS } from '@/lib/social-links'

export function GitHubButton() {
  return (
    <LinkButton
      href={SOCIAL_LINKS.GITHUB}
      external
      className="bg-secondary hover:bg-accent h-10 min-w-0 rounded-lg px-4 text-sm font-bold text-secondary-foreground hover:ring-accent hover:ring-1 hover:ring-offset-2 ring-offset-background duration-300"
      aria-label="Open Kilian's GitHub profile in a new tab"
      onClick={() => {
        captureSocialLinkClicked('github', SOCIAL_LINKS.GITHUB)
      }}>
      <GitHubIcon className="size-5" />
    </LinkButton>
  )
}
