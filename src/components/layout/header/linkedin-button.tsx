'use client'
import { LinkedInIcon } from '@/components/icons/linkedin'
import { LinkButton } from '@/components/ui/link-button'
import { captureSocialLinkClicked } from '@/hooks/posthog'
import { EXTERNAL_LINKS } from '@/lib/constants'

export function LinkedInButton() {
  return (
    <LinkButton
      href={EXTERNAL_LINKS.LINKEDIN}
      external
      className="bg-secondary hover:bg-accent h-10 min-w-0 rounded-lg px-4 text-sm font-bold text-secondary-foreground hover:ring-accent hover:ring-1 hover:ring-offset-2 ring-offset-background duration-300"
      aria-label="Open Kilian's LinkedIn profile in a new tab"
      onClick={() => {
        captureSocialLinkClicked('linkedin', EXTERNAL_LINKS.LINKEDIN)
      }}>
      <LinkedInIcon className="size-5" />
      <span className="hidden md:inline">LinkedIn</span>
    </LinkButton>
  )
}
