import type { QuickFact } from '@/types/quick-facts'
import { PETS, formatPetTypeSummary } from './pets'

export const QUICK_FACTS: QuickFact[] = [
  { id: 'mode', label: 'Mode', value: 'Dark mode' },
  { id: 'shell', label: 'Shell', value: 'fish', href: 'https://fishshell.com' },
  { id: 'terminal', label: 'Terminal', value: 'Ghostty', href: 'https://ghostty.org' },
  { id: 'browser', label: 'Browser', value: 'Zen', href: 'https://zen-browser.app' },
  { id: 'launcher', label: 'Launcher', value: 'Raycast', href: 'https://raycast.com' },
  {
    id: 'font',
    label: 'Font',
    value: 'Fira Code',
    href: 'https://www.nerdfonts.com/font-downloads',
    note: '(nerd font)',
  },
  {
    id: 'operating-system',
    label: 'OS',
    value: 'macOS',
    href: 'https://www.apple.com/macos',
    note: '(Windows for gaming)',
  },
  { id: 'pets', label: 'Pets', value: formatPetTypeSummary(PETS), note: '(Pictured below)' },
]
