import type { DocsContainerProps } from '@storybook/addon-docs/blocks'
import { DocsContainer as BaseDocsContainer } from '@storybook/addon-docs/blocks'
import type { PropsWithChildren } from 'react'
import * as React from 'react'
import { GLOBALS_UPDATED } from 'storybook/internal/core-events'
import { themes as sbThemes } from 'storybook/theming'

import { ThemeProvider } from '../src/components/providers/theme-provider'
import { type Theme } from '../src/lib/themes'
import { getThemeBaseColor, isThemeName } from '../src/utils/themes'
import ThemeSync from './theme-sync'

function readCookie(name: string): string | undefined {
  try {
    const re = new RegExp(`(?:^|; )${name}=([^;]+)`) // simple cookie reader
    const match = re.exec(document.cookie)
    return match?.[1] ? decodeURIComponent(match[1]) : undefined
  } catch {
    return undefined
  }
}

function getSelectedThemeFromEnvironment(): Theme {
  // Prefer explicitly applied theme from DOM
  try {
    const applied = document.documentElement.dataset.appliedTheme
    if (applied && isThemeName(applied)) return applied
  } catch {}

  // Then persisted Storybook selection
  try {
    const fromLs = typeof window !== 'undefined' ? window.localStorage.getItem('storybook_theme') : null
    if (fromLs && (fromLs === 'system' || isThemeName(fromLs))) return fromLs as Theme
  } catch {}

  const fromCookie = readCookie('storybook_theme')
  if (fromCookie && (fromCookie === 'system' || isThemeName(fromCookie))) return fromCookie as Theme

  return 'system'
}

function getDocsThemeForSelected(selected: Theme) {
  const base: 'light' | 'dark' = (() => {
    if (selected === 'system') {
      try {
        if (typeof window !== 'undefined' && window.matchMedia) {
          return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        }
      } catch {}
      return 'light'
    }
    if (isThemeName(selected)) return getThemeBaseColor(selected)
    return 'light'
  })()

  return base === 'dark' ? sbThemes.dark : sbThemes.light
}

function persistSelection(selected: Theme) {
  try {
    if (typeof window === 'undefined') return
    const ts = String(Date.now())
    // Keep in sync with ThemeProvider's storageNamespace="storybook" behavior
    window.localStorage.setItem('storybook_theme', selected)
    window.localStorage.setItem('storybook_theme_updatedAt', ts)

    const isProduction = process.env.NODE_ENV === 'production'
    const isSecure =
      (typeof window !== 'undefined' && window.location.protocol === 'https:') || isProduction ? '; secure' : ''
    document.cookie = `storybook_theme=${encodeURIComponent(selected)}; path=/; max-age=31536000; samesite=lax${isSecure}`
    document.cookie = `storybook_themeUpdatedAt=${ts}; path=/; max-age=31536000; samesite=lax${isSecure}`
  } catch {}
}

export default function DocsContainer(props: PropsWithChildren<DocsContainerProps>) {
  const [selected, setSelected] = React.useState<Theme>(() => getSelectedThemeFromEnvironment())

  React.useEffect(() => {
    const ch = props.context.channel
    const onGlobalsUpdated = (payload: { globals?: Record<string, unknown> } | undefined) => {
      const raw = payload?.globals?.kdTheme
      const next = typeof raw === 'string' ? (raw as Theme) : 'system'
      if (next === selected) return
      setSelected(next)
      persistSelection(next)
    }
    ch.on(GLOBALS_UPDATED, onGlobalsUpdated)
    return () => {
      ch.off(GLOBALS_UPDATED, onGlobalsUpdated)
    }
  }, [props.context.channel, selected])

  const sbTheme = React.useMemo(() => getDocsThemeForSelected(selected), [selected])

  return (
    <ThemeProvider storageNamespace="storybook">
      <ThemeSync selected={selected} />
      <BaseDocsContainer {...props} theme={sbTheme}>
        {props.children}
      </BaseDocsContainer>
    </ThemeProvider>
  )
}
