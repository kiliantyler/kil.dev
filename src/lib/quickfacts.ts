import type { Route } from 'next'

export interface QuickFact {
  label: string
  value: string | React.ReactNode
  href?: Route
  note?: string
}

export const QUICK_FACTS: QuickFact[] = [
  { label: 'Mode', value: 'Dark mode' },
  { label: 'Shell', value: 'fish', href: 'https://fishshell.com' },
  { label: 'Terminal', value: 'Ghostty', href: 'https://ghostty.app' },
  { label: 'Editor', value: 'Cursor', href: 'https://cursor.com' },
  { label: 'OS', value: 'macOS', href: 'https://www.apple.com/macos', note: '(Windows for gaming)' },
  { label: 'Pets', value: '3 dogs, 3 cats', note: '(Pictured below)' },
]
