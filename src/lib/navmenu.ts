import type { NavigationItem } from '@/types/navigation-item'
import { Briefcase, Folder, Home, User } from 'lucide-react'

export const NAVIGATION: NavigationItem[] = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'About', href: '/about', icon: User },
  { label: 'Experience', href: '/experience', icon: Briefcase },
  { label: 'Projects', href: '/projects', icon: Folder },
]
