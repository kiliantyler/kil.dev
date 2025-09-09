import Cyberpunk from '@/images/headshot/cartoon-cyberpunk.webp'
import Halloween from '@/images/headshot/cartoon-halloween.webp'
import Headshot from '@/images/headshot/cartoon-headshot.webp'
import { Ghost, Moon, Sun, Zap } from 'lucide-react'
import type { StaticImageData } from 'next/image'
import type { ComponentType } from 'react'

// Central, single-source theme definitions
export type BaseColor = 'light' | 'dark'
export type MonthDay = { month: number; day: number }
export type IconComponent = ComponentType<{ className?: string }>

export type ThemeConfig = {
  name: string
  icon: IconComponent
  headshotImage: StaticImageData
  baseColor: BaseColor
  timeRange?: { start: MonthDay; end: MonthDay }
}

export const themes = [
  {
    name: 'light',
    icon: Sun,
    headshotImage: Headshot,
    baseColor: 'light',
  },
  {
    name: 'dark',
    icon: Moon,
    headshotImage: Headshot,
    baseColor: 'dark',
  },
  {
    name: 'cyberpunk',
    icon: Zap,
    headshotImage: Cyberpunk,
    baseColor: 'dark',
  },
  {
    name: 'halloween',
    icon: Ghost,
    headshotImage: Halloween,
    baseColor: 'dark',
    timeRange: { start: { month: 8, day: 15 }, end: { month: 11, day: 1 } },
  },
] as const satisfies ReadonlyArray<ThemeConfig>

export type ThemeEntry = (typeof themes)[number]
export type ThemeName = ThemeEntry['name']
export type Theme = ThemeName | 'system'

// Labels and icons derived from the central array
export function getThemeLabel(theme: Theme): string {
  if (theme === 'system') return 'System'
  const s = `${theme}`
  return s.slice(0, 1).toUpperCase() + s.slice(1)
}

export function getThemeIcon(theme: Theme, systemIcon: IconComponent): IconComponent {
  if (theme === 'system') return systemIcon
  const entry = themes.find(t => t.name === theme)
  return entry?.icon ?? Sun
}

export function getThemeHeadshot(theme: ThemeName): StaticImageData {
  const entry = themes.find(t => t.name === theme)
  return entry?.headshotImage ?? Headshot
}
