import type { Route } from 'next'

export interface NavigationItem {
  label: string
  href: Route
}

export const NAVIGATION: NavigationItem[] = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Experience', href: '/experience' },
  { label: 'Projects', href: '/projects' },
]
