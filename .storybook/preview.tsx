import { withThemeByClassName } from '@storybook/addon-themes'
import type { Preview } from '@storybook/react'
import { ThemeProvider } from '../src/components/providers/theme-provider'
import { themes, type Theme, type ThemeName } from '../src/lib/themes'
import '../src/styles/globals.css'
import DocsContainer from './docs-container'
import ThemeSync from './theme-sync'

const preview: Preview = {
  decorators: [
    withThemeByClassName({
      themes: Object.fromEntries(themes.map(t => [t.name, t.name] as const)),
      defaultTheme: 'light',
      parentSelector: 'html',
    }),
    (Story, context) => {
      const selected = (context.globals as { theme?: unknown }).theme
      let initialApplied: ThemeName | undefined
      try {
        const root = document.documentElement
        const known = themes.map(t => t.name)
        initialApplied =
          known.find(n => root.classList.contains(n)) ??
          ((root.classList.contains('dark') ? 'dark' : 'light') as ThemeName)
      } catch {}
      return (
        <ThemeProvider storageNamespace="storybook" initialAppliedTheme={initialApplied}>
          {typeof selected === 'string' ? <ThemeSync selected={selected as Theme} /> : null}
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
