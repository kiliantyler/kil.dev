import type { Preview } from '@storybook/react'
import * as React from 'react'
import { ThemeProvider } from '../src/components/providers/theme-provider'
import type { Theme } from '../src/lib/themes'
import { themes } from '../src/lib/themes'
import '../src/styles/globals.css'
import DocsContainer from './docs-container'
import ThemeSync from './theme-sync'

const preview: Preview = {
  decorators: [
    (Story, context) => {
      const g = (context.globals as { kdTheme?: unknown }).kdTheme
      const selected: Theme = typeof g === 'string' ? (g as Theme) : 'system'
      try {
        if (typeof window !== 'undefined') {
          const ts = String(Date.now())
          window.localStorage.setItem('storybook_theme', selected)
          window.localStorage.setItem('storybook_theme_updatedAt', ts)
          const isProduction = process.env.NODE_ENV === 'production'
          const isSecure =
            (typeof window !== 'undefined' && window.location.protocol === 'https:') || isProduction ? '; secure' : ''
          document.cookie = `storybook_theme=${encodeURIComponent(selected)}; path=/; max-age=31536000; samesite=lax${isSecure}`
          document.cookie = `storybook_themeUpdatedAt=${ts}; path=/; max-age=31536000; samesite=lax${isSecure}`

          try {
            const isDark = !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
            const root = document.documentElement
            root.style.colorScheme = isDark ? 'dark' : 'light'
            root.dataset.appliedTheme = isDark ? 'dark' : 'light'
            root.dataset.themePref = 'system'
            if (isDark) {
              root.classList.add('dark')
              root.classList.remove('light')
            } else {
              root.classList.add('light')
              root.classList.remove('dark')
            }
          } catch {}
        }
      } catch {}
      function CanvasThemeEnforcer({ selected }: { selected: Theme }) {
        React.useLayoutEffect(() => {
          if (typeof window === 'undefined') return
          const root = document.documentElement
          const getKnown = (): string[] => {
            // prefer window-provided list, else fallback to base
            const w: unknown = typeof window !== 'undefined' ? (window as unknown) : undefined
            const fromWin = (w as Record<string, unknown> | undefined)?.__KD_KNOWN_THEMES__
            if (Array.isArray(fromWin)) {
              const names: string[] = []
              const seen: Record<string, true> = {}
              for (const base of ['light', 'dark']) {
                if (!seen[base]) {
                  seen[base] = true
                  names.push(base)
                }
              }
              for (const item of fromWin as unknown[]) {
                const name = typeof item === 'string' ? item : ''
                if (!name || seen[name]) continue
                seen[name] = true
                names.push(name)
              }
              return names
            }
            return ['light', 'dark']
          }

          const apply = (choice: 'light' | 'dark' | Theme) => {
            try {
              const scheme = choice === 'dark' ? 'dark' : 'light'
              root.style.colorScheme = scheme
              // Remove all known theme classes first
              const knownList = getKnown()
              for (const cls of knownList) {
                if (root.classList.contains(cls)) root.classList.remove(cls)
              }
              if (knownList.includes(choice as string)) root.classList.add(choice as string)
              root.dataset.appliedTheme = choice as string
              root.dataset.themePref = selected
            } catch {}
          }

          if (selected === 'system') {
            const mq = window.matchMedia('(prefers-color-scheme: dark)')
            const run = () => apply(mq.matches ? 'dark' : 'light')
            run()
            try {
              mq.addEventListener('change', run)
              return () => mq.removeEventListener('change', run)
            } catch {
              mq.addListener?.(run)
              return () => mq.removeListener?.(run)
            }
          } else {
            apply(selected)
          }
        }, [selected])
        return null
      }

      // Expose the known themes to the head script so it doesn't need a hardcoded list
      try {
        if (typeof window !== 'undefined') {
          const names = Array.from(new Set(['light', 'dark', ...themes.map(t => t.name)]))
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          window.__KD_KNOWN_THEMES__ = names
        }
      } catch {}

      return (
        <ThemeProvider storageNamespace="storybook">
          {context.viewMode === 'story' ? <CanvasThemeEnforcer selected={selected} /> : null}
          <ThemeSync selected={selected} />
          <Story />
        </ThemeProvider>
      )
    },
  ],
  parameters: {
    controls: { expanded: true },
    layout: 'centered',
    docs: {
      container: DocsContainer,
    },
  },
  tags: ['autodocs'],
}

export default preview

export const globalTypes = {
  kdTheme: {
    name: 'Theme',
    description: 'Storybook theme (independent of site)',
    defaultValue: 'system',
    toolbar: {
      icon: 'paintbrush',
      dynamicTitle: true,
      items: [
        { value: 'system', title: 'System' },
        ...themes.map(t => ({ value: t.name, title: t.name })),
      ],
    },
  },
} as const
