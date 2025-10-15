import Cyberpunk from '@/images/headshot/cartoon-cyberpunk.webp'
import Halloween from '@/images/headshot/cartoon-halloween.webp'
import Headshot from '@/images/headshot/cartoon-headshot.webp'
import Thanksgiving from '@/images/headshot/cartoon-thanksgiving.webp'
import { Ghost, Leaf, Moon, Sun, Zap } from 'lucide-react'
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
  darkModeNote?: string
  timeRange?: { start: MonthDay; end: MonthDay }
}

export const themes = [
  {
    name: 'light',
    icon: Sun,
    headshotImage: Headshot,
    baseColor: 'light',
    darkModeNote: '(why are you in light mode?)',
  },
  {
    name: 'dark',
    icon: Moon,
    headshotImage: Headshot,
    baseColor: 'dark',
    darkModeNote: '(good choice)',
  },
  {
    name: 'cyberpunk',
    icon: Zap,
    headshotImage: Cyberpunk,
    baseColor: 'dark',
    darkModeNote: '(cyberpunk is cool, too)',
  },
  {
    name: 'halloween',
    icon: Ghost,
    headshotImage: Halloween,
    baseColor: 'dark',
    darkModeNote: '(Happy Halloween!)',
    timeRange: { start: { month: 10, day: 15 }, end: { month: 11, day: 1 } },
  },
  {
    name: 'thanksgiving',
    icon: Leaf,
    headshotImage: Thanksgiving,
    baseColor: 'dark',
    darkModeNote: '(Happy Thanksgiving!)',
    timeRange: { start: { month: 11, day: 15 }, end: { month: 11, day: 30 } },
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
export const THEME_BY_NAME = new Map<ThemeName, ThemeEntry>(themes.map(t => [t.name, t] as const))

export function getThemeIcon(theme: Theme, systemIcon: IconComponent): IconComponent {
  if (theme === 'system') return systemIcon
  const entry = THEME_BY_NAME.get(theme)
  return entry?.icon ?? Sun
}

export function getThemeHeadshot(theme: ThemeName): StaticImageData {
  const entry = THEME_BY_NAME.get(theme)
  return entry?.headshotImage ?? Headshot
}

// Runtime helpers for safe validation/guards
export const KNOWN_THEMES = themes.map(t => t.name) as readonly ThemeName[]

export function isThemeName(val: unknown): val is ThemeName {
  if (typeof val !== 'string') return false
  return KNOWN_THEMES.includes(val as ThemeName)
}

export function isSystemVal(val: unknown): val is BaseColor {
  return val === 'dark' || val === 'light'
}

export function getThemeBaseColor(theme: ThemeName): BaseColor {
  const entry = THEME_BY_NAME.get(theme)
  return entry?.baseColor ?? 'light'
}
