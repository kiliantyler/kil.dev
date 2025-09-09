import { Ghost, Moon, Sun, Zap } from 'lucide-react'
import type { ComponentType } from 'react'
export const themeNames = ['system', 'light', 'dark', 'cyberpunk', 'halloween'] as const

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
  cyberpunk: 'Cyberpunk',
  halloween: 'Halloween',
}

export const themeIcons: Partial<Record<Theme, IconComponent>> = {
  light: Sun,
  dark: Moon,
  cyberpunk: Zap,
  halloween: Ghost,
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

// Seasonal theme gating
export type MonthDay = { month: number; day: number }

export type SeasonalThemeConfig = {
  theme: CssTheme
  start: MonthDay // inclusive
  end: MonthDay // exclusive
  defaultDuring?: boolean
}

const BASE_CSS_THEMES: CssTheme[] = ['light', 'dark', 'cyberpunk']

// Add future seasonal themes here
export const SEASONAL_THEMES: SeasonalThemeConfig[] = [
  { theme: 'halloween', start: { month: 8, day: 9 }, end: { month: 9, day: 9 }, defaultDuring: true },
]

function compareMonthDay(a: MonthDay, b: MonthDay): number {
  if (a.month !== b.month) return a.month < b.month ? -1 : 1
  if (a.day !== b.day) return a.day < b.day ? -1 : 1
  return 0
}

function isDateInRecurringRange(date: Date, start: MonthDay, end: MonthDay): boolean {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()

  const crossesYear = compareMonthDay(end, start) <= 0

  const isOnOrAfterStartThisYear = month > start.month || (month === start.month && day >= start.day)
  const startYear = crossesYear ? (isOnOrAfterStartThisYear ? year : year - 1) : year
  const endYear = crossesYear ? startYear + 1 : startYear

  const startDate = new Date(startYear, start.month - 1, start.day)
  const endDate = new Date(endYear, end.month - 1, end.day)
  return date >= startDate && date < endDate
}

export function getActiveSeasonalThemes(date: Date = new Date()): SeasonalThemeConfig[] {
  return SEASONAL_THEMES.filter(cfg => isDateInRecurringRange(date, cfg.start, cfg.end))
}

export function getAvailableThemes(date: Date = new Date()): Theme[] {
  const active = getActiveSeasonalThemes(date)
  const seasonalNames = active.map(a => a.theme)
  return ['system', ...BASE_CSS_THEMES, ...seasonalNames]
}

export function getCssThemesForNow(date: Date = new Date()): CssTheme[] {
  const active = getActiveSeasonalThemes(date)
  return [...BASE_CSS_THEMES, ...active.map(a => a.theme)]
}

export function getDefaultThemeForNow(date: Date = new Date()): Theme {
  const active = getActiveSeasonalThemes(date)
  const preferred = active.find(a => a.defaultDuring)?.theme
  return preferred ?? 'system'
}

export function buildInitThemeScript(): string {
  const seasonal = SEASONAL_THEMES.map(s => ({
    theme: s.theme,
    start: { m: s.start.month, d: s.start.day },
    end: { m: s.end.month, d: s.end.day },
    def: Boolean(s.defaultDuring),
  }))
  const base = BASE_CSS_THEMES
  // Keep the script compact and self-contained
  return `("use strict");(function(){try{var cfg={base:${JSON.stringify(base)},seasonal:${JSON.stringify(seasonal)}};function inRange(dt,s,e){var y=dt.getFullYear(),m=dt.getMonth()+1,d=dt.getDate();var crosses=(e.m<s.m)||((e.m===s.m)&&(e.d<=s.d));var onOrAfterStart=(m>s.m)||((m===s.m)&&(d>=s.d));var sy=crosses?(onOrAfterStart?y:y-1):y;var ey=crosses?sy+1:sy;var sd=new Date(sy,s.m-1,s.d);var ed=new Date(ey,e.m-1,e.d);return dt>=sd&&dt<ed}var now=new Date();var active=cfg.seasonal.filter(function(s){return inRange(now,s.start,s.end)});var allowed=cfg.base.concat(active.map(function(s){return s.theme}));var def=(active.find(function(s){return s.def})||null);var defaultTheme=def?def.theme:null;function isAllowed(t){return !!t&&allowed.indexOf(t)!==-1}function getCookieTheme(){try{var m=document.cookie.match(/(?:^|; )theme=([^;]+)/);return m?decodeURIComponent(m[1]):null}catch(_){return null}}function getLsTheme(){try{return localStorage.getItem('theme')}catch(_){return null}}var cookieTheme=getCookieTheme();var lsTheme=getLsTheme();var sysDark=(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);var pref=(lsTheme||cookieTheme||'system');var applyTheme=null;if(pref==='system'&&defaultTheme){applyTheme=defaultTheme}else if(pref!=='system'&&isAllowed(pref)){applyTheme=pref}else if(defaultTheme){applyTheme=defaultTheme}else{applyTheme=sysDark?'dark':'light'}var root=document.documentElement;var removeList=(function(){var set={};function add(a){for(var i=0;i<a.length;i++){set[a[i]] = 1}}add(cfg.base);add(cfg.seasonal.map(function(s){return s.theme}));add(['light','dark']);return Object.keys(set)})();for(var i=0;i<removeList.length;i++){try{root.classList.remove(removeList[i])}catch(_){}}root.classList.add(applyTheme);try{root.dataset.themePref=(pref||'');root.dataset.seasonalDefault=(defaultTheme||'');root.dataset.appliedTheme=(applyTheme||'')}catch(_){}}catch(e){}})();`
}
