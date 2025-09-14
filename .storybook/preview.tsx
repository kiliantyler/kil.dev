import type { Preview } from '@storybook/react'
import { ThemeProvider } from '../src/components/providers/theme-provider'
import { themes } from '../src/lib/themes'
import '../src/styles/globals.css'

const preview: Preview = {
  decorators: [
    (Story, context) => {
      const g = (context.globals as { kdTheme?: unknown }).kdTheme
      const selected = typeof g === 'string' ? g : 'system'
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
        }
      } catch {}
      return (
        <ThemeProvider storageNamespace="storybook" key={`storybook-${selected}`}>
          <Story />
        </ThemeProvider>
      )
    },
  ],
  parameters: {
    controls: { expanded: true },
    layout: 'centered',
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
