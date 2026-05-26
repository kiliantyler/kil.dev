import type { QuickFact } from '@/types/quick-facts'
import { PETS, formatPetTypeSummary } from './pets'

export const QUICK_FACTS: QuickFact[] = [
  { label: 'Mode', value: 'Dark mode' },
  { label: 'Shell', value: 'fish', href: 'https://fishshell.com' },
  { label: 'Terminal', value: 'Ghostty', href: 'https://ghostty.org' },
  { label: 'Browser', value: 'Zen', href: 'https://zen-browser.app' },
  { label: 'Launcher', value: 'Raycast', href: 'https://raycast.com' },
  { label: 'Font', value: 'Fira Code', href: 'https://www.nerdfonts.com/font-downloads', note: '(nerd font)' },
  { label: 'OS', value: 'macOS', href: 'https://www.apple.com/macos', note: '(Windows for gaming)' },
  { label: 'Pets', value: formatPetTypeSummary(PETS), note: '(Pictured below)' },
]
