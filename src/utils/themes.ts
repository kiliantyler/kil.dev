import Headshot from '@/images/headshot/cartoon-headshot.webp'
import type { ThemeEntry, ThemeName } from '@/lib/themes'
import { KNOWN_THEMES, themes, type Theme } from '@/lib/themes'
import type { BaseColor, IconComponent } from '@/types/themes'
import { Sun } from 'lucide-react'
import type { StaticImageData } from 'next/image'

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
