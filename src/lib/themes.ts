import { Moon, Sun } from 'lucide-react'
import type { ComponentType } from 'react'
export const themeNames = ['system', 'light', 'dark'] as const

export type Theme = (typeof themeNames)[number]

export type CssTheme = Exclude<Theme, 'system'>

export const cssThemes = themeNames.filter(t => t !== 'system') as CssTheme[]

export function isCssTheme(theme: Theme): theme is CssTheme {
  return theme !== 'system'
}

export type IconComponent = ComponentType<{ className?: string }>

export const themeLabels: Partial<Record<Theme, string>> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
}

export const themeIcons: Partial<Record<Theme, IconComponent>> = {
  light: Sun,
  dark: Moon,
  // add custom theme icons here, e.g. midnight: Star
}

export function getThemeLabel(theme: Theme): string {
  const known = themeLabels[theme]
  if (known) return known
  const s = `${theme}`
  return s.slice(0, 1).toUpperCase() + s.slice(1)
}

export function getThemeIcon(theme: Theme, systemIcon: IconComponent): IconComponent {
  if (theme === 'system') return systemIcon
  return themeIcons[theme] ?? Sun
}
