export const PROFILE_IMAGE_ALT_DOMAINS = [
  'xn--7zc.net',
  'xn--j0c.net',
] as const

export type ProfileImageAltDomain = (typeof PROFILE_IMAGE_ALT_DOMAINS)[number]

export function isProfileImageAltDomain(hostname: string | null | undefined): boolean {
  if (!hostname) return false
  return PROFILE_IMAGE_ALT_DOMAINS.some(domain => domain.toLowerCase() === hostname.toLowerCase())
}
