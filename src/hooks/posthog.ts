import posthog from 'posthog-js'

export function captureSocialLinkClicked(platform: string, href: string) {
  posthog.capture('social_link_clicked', {
    platform: platform,
    href: href,
  })
}
