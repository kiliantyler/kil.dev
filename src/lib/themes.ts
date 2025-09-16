import Cyberpunk from '@/images/headshot/cartoon-cyberpunk.webp'
import Halloween from '@/images/headshot/cartoon-halloween.webp'
import Headshot from '@/images/headshot/cartoon-headshot.webp'
import Thanksgiving from '@/images/headshot/cartoon-thanksgiving.webp'
import type { ThemeConfig } from '@/types/themes'
import { Ghost, Leaf, Moon, Sun, Zap } from 'lucide-react'

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
    darkModeNote: '(cyberpunk is cool, too)',
    baseColor: 'dark',
  },
  {
    name: 'halloween',
    icon: Ghost,
    headshotImage: Halloween,
    baseColor: 'dark',
    darkModeNote: '(Spooky Season!)',
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
export const KNOWN_THEMES = themes.map(t => t.name) as readonly ThemeName[]
