'use client'
import { LinkedInIcon } from '@/components/icons/linkedin'
import { LinkButton } from '@/components/ui/link-button'
import { captureSocialLinkClicked } from '@/hooks/posthog'
import { SOCIAL_LINKS } from '@/lib/social-links'

export function LinkedInButton() {
  return (
    <LinkButton
      href={SOCIAL_LINKS.LINKEDIN}
      external
      className="bg-secondary hover:bg-accent h-10 min-w-0 rounded-lg px-4 text-sm font-bold text-secondary-foreground hover:ring-accent hover:ring-1 hover:ring-offset-2 ring-offset-background duration-300"
      aria-label="Open Kilian's LinkedIn profile in a new tab"
      onClick={() => {
        captureSocialLinkClicked('linkedin', SOCIAL_LINKS.LINKEDIN)
      }}>
      <LinkedInIcon className="size-5" />
    </LinkButton>
  )
}
