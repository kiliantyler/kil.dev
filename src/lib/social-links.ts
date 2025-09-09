import type { Route } from 'next'

export interface SociallLinks {
  GITHUB: Route
  LINKEDIN: Route
}

export const SOCIAL_LINKS: SociallLinks = {
  GITHUB: 'https://github.com/kiliantyler/',
  LINKEDIN: 'https://www.linkedin.com/in/kilian-tyler/',
}
