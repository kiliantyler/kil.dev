import { useMemo } from 'react'

interface ThemeConfig {
  fontFamily: string
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    text: string
    border: string
  }
}

export function useTheme(): ThemeConfig {
  return useMemo(
    () => ({
      fontFamily:
        'var(--font-space-grotesk), var(--font-noto-sans), ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol, Noto Color Emoji',
      colors: {
        primary: 'var(--primary)',
        secondary: 'var(--secondary)',
        accent: 'var(--accent)',
        background: 'var(--background)',
        text: 'var(--foreground)',
        border: 'var(--border)',
      },
    }),
    [],
  )
}
