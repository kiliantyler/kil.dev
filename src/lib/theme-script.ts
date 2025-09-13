// Theme initialization runtime (browser)
// This file is compiled and minified at build-time into an IIFE that exposes
// a global object `ThemeRuntime` with a named export function `initTheme`.

export type CompactDate = { m: number; d: number }

export type SeasonalEntry = {
  theme: string
  start: CompactDate
  end: CompactDate
}

export type ThemeScriptConfig = {
  base: string[]
  seasonal: SeasonalEntry[]
}

function validateConfig(config: ThemeScriptConfig): void {
  if (!config || !Array.isArray(config.base) || !Array.isArray(config.seasonal)) {
    throw new Error('Invalid theme runtime config shape')
  }

  const nameRe = /^[a-z][a-z0-9-]{0,31}$/

  for (const name of config.base) {
    if (typeof name !== 'string' || !nameRe.test(name)) {
      throw new Error(`Invalid base theme name: ${String(name)}`)
    }
  }

  for (const s of config.seasonal) {
    if (!s || typeof s.theme !== 'string' || !nameRe.test(s.theme)) {
      const bad =
        s && typeof (s as { theme?: unknown }).theme !== 'undefined'
          ? String((s as { theme?: unknown }).theme)
          : 'undefined'
      throw new Error(`Invalid seasonal theme name: ${bad}`)
    }
    const fields: Array<['start' | 'end', CompactDate]> = [
      ['start', s.start],
      ['end', s.end],
    ]
    for (const [label, val] of fields) {
      if (!val || typeof val.m !== 'number' || typeof val.d !== 'number') {
        throw new Error(`Invalid seasonal ${label} for theme ${s.theme}`)
      }
      if (val.m < 1 || val.m > 12 || val.d < 1 || val.d > 31) {
        throw new Error(`Out of range seasonal ${label} for theme ${s.theme}`)
      }
    }
  }
}

function inRange(dt: Date, s: CompactDate, e: CompactDate): boolean {
  const y = dt.getFullYear()
  const m = dt.getMonth() + 1
  const d = dt.getDate()

  const crosses = e.m < s.m || (e.m === s.m && e.d < s.d)
  const onOrAfterStart = m > s.m || (m === s.m && d >= s.d)
  const sy = crosses ? (onOrAfterStart ? y : y - 1) : y
  const ey = crosses ? sy + 1 : sy
  const sd = new Date(sy, s.m - 1, s.d)
  const ed = new Date(ey, e.m - 1, e.d)
  return dt >= sd && dt < ed
}

function getCookieTheme(): string | null {
  try {
    const re = /(?:^|;\s*)theme=([^;]+)/
    const m = re.exec(document.cookie)
    return m ? decodeURIComponent(m[1]!) : null
  } catch {
    return null
  }
}

function getLocalStorageTheme(): string | null {
  try {
    return localStorage.getItem('theme')
  } catch {
    return null
  }
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)]
}

function addDisableTransitionStyle(): HTMLStyleElement | null {
  try {
    const style = document.createElement('style')
    style.id = '__disable-theme-transitions'
    style.appendChild(
      document.createTextNode('*,*::before,*::after{transition:none !important;animation:none !important}'),
    )
    document.head.appendChild(style)
    return style
  } catch {
    return null
  }
}

function removeElementSoon(el: HTMLElement | null): void {
  try {
    const rm = () => {
      el?.parentNode?.removeChild(el)
    }
    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => rm())
    } else {
      setTimeout(rm, 0)
    }
  } catch {}
}

export function initTheme(config: ThemeScriptConfig): void {
  validateConfig(config)

  const now = new Date()
  const active = config.seasonal.filter(s => inRange(now, s.start, s.end))

  const allowed = uniqueStrings([...config.base, ...active.map(s => s.theme)])
  const defaultTheme = active[0]?.theme ?? null

  const isAllowed = (t: unknown): t is string => typeof t === 'string' && allowed.includes(t)

  const cookieTheme = getCookieTheme()
  const lsTheme = getLocalStorageTheme()
  const sysDark = !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)

  const pref = isAllowed(lsTheme) ? lsTheme : isAllowed(cookieTheme) ? cookieTheme : 'system'

  const baseClass = sysDark ? 'dark' : ''

  let explicit: string | null = null
  let overlay: string | null = null

  if (pref === 'system') {
    overlay = defaultTheme ?? null
  } else if (isAllowed(pref)) {
    explicit = pref
  } else if (defaultTheme) {
    explicit = defaultTheme
  } else {
    explicit = baseClass
  }

  const root = document.documentElement
  const disable = addDisableTransitionStyle()

  const targetClasses: string[] = []
  if (explicit) {
    targetClasses.push(explicit)
  } else {
    if (baseClass) targetClasses.push(baseClass)
    if (overlay) targetClasses.push(overlay)
  }

  const known = uniqueStrings([...config.base, ...config.seasonal.map(s => s.theme), 'dark'])

  for (const cls of known) {
    if (!targetClasses.includes(cls)) {
      try {
        root.classList.remove(cls)
      } catch {}
    }
  }

  for (const cls of targetClasses) {
    try {
      root.classList.add(cls)
    } catch {}
  }

  try {
    root.dataset.themePref = pref ?? ''
    root.dataset.seasonalDefault = overlay ?? ''
    root.dataset.appliedTheme = explicit ?? baseClass ?? ''
  } catch {}

  removeElementSoon(disable)
}

export default initTheme
