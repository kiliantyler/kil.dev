import type { IconComponent } from '@/types/themes'
import type { Route } from 'next'

export interface NavigationItem {
  label: string
  href: Route
  icon: IconComponent
}
