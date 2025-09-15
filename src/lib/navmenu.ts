import { Briefcase, Folder, Home, User } from 'lucide-react'
import type { Route } from 'next'
import type { IconComponent } from './themes'

export interface NavigationItem {
  label: string
  href: Route
  icon: IconComponent
}

export const NAVIGATION: NavigationItem[] = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'About', href: '/about', icon: User },
  { label: 'Experience', href: '/experience', icon: Briefcase },
  { label: 'Projects', href: '/projects', icon: Folder },
]
