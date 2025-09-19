import * as Headshots from '@/images/headshot'
import type { ThemeConfig } from '@/types/themes'
import { Ghost, Gift, Leaf, Moon, Sun, Zap } from 'lucide-react'

export const themes = [
  {
    name: 'light',
    icon: Sun,
    headshotImage: Headshots.Headshot,
    baseColor: 'light',
    darkModeNote: '(why are you in light mode?)',
  },
  {
    name: 'dark',
    icon: Moon,
    headshotImage: Headshots.Headshot,
    baseColor: 'dark',
    darkModeNote: '(good choice)',
  },
  {
    name: 'cyberpunk',
    icon: Zap,
    headshotImage: Headshots.Cyberpunk,
    darkModeNote: '(cyberpunk is cool, too)',
    baseColor: 'dark',
  },
  {
    name: 'halloween',
    icon: Ghost,
    headshotImage: Headshots.Halloween,
    baseColor: 'dark',
    darkModeNote: '(Spooky Season!)',
    timeRange: { start: { month: 10, day: 15 }, end: { month: 11, day: 1 } },
  },
  {
    name: 'thanksgiving',
    icon: Leaf,
    headshotImage: Headshots.Thanksgiving,
    baseColor: 'dark',
    darkModeNote: '(Happy Thanksgiving!)',
    timeRange: { start: { month: 11, day: 15 }, end: { month: 11, day: 30 } },
  },
  {
    name: 'christmas',
    icon: Gift,
    headshotImage: Headshots.Christmas,
    baseColor: 'dark',
    darkModeNote: '(Merry Christmas!)',
    disableGridLights: true,
    enableSnow: true,
    timeRange: { start: { month: 12, day: 1 }, end: { month: 12, day: 26 } },
  },
] as const satisfies ReadonlyArray<ThemeConfig>

export type ThemeEntry = (typeof themes)[number]
export type ThemeName = ThemeEntry['name']
export type Theme = ThemeName | 'system'
export const KNOWN_THEMES = themes.map(t => t.name) as readonly ThemeName[]
