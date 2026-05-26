import type { QuickFact } from '@/types/quick-facts'
import { PETS, formatPetTypeSummary } from './pets'

export const QUICK_FACTS: QuickFact[] = [
  { label: 'Mode', value: 'Dark mode' },
  { label: 'Shell', value: 'fish', href: 'https://fishshell.com' },
  { label: 'Terminal', value: 'Ghostty', href: 'https://ghostty.org' },
  { label: 'Editor', value: 'Cursor', href: 'https://cursor.com' },
  { label: 'OS', value: 'macOS', href: 'https://www.apple.com/macos', note: '(Windows for gaming)' },
  { label: 'Pets', value: formatPetTypeSummary(PETS), note: '(Pictured below)' },
]
