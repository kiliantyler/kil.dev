import { describe, expect, it } from 'vitest'

import { QUICK_FACTS } from '@/lib/quickfacts'

describe('QUICK_FACTS', () => {
  it('uses the current tooling facts', () => {
    expect(QUICK_FACTS).toContainEqual(expect.objectContaining({ label: 'Browser', value: 'Zen' }))
    expect(QUICK_FACTS).toContainEqual(expect.objectContaining({ label: 'Launcher', value: 'Raycast' }))
    expect(QUICK_FACTS).toContainEqual(
      expect.objectContaining({ label: 'Font', value: 'Fira Code', note: '(nerd font)' }),
    )
  })

  it('does not include the stale editor fact', () => {
    expect(QUICK_FACTS.find(fact => fact.label === 'Editor')).toBeUndefined()
    expect(QUICK_FACTS.find(fact => fact.value === 'Cursor')).toBeUndefined()
  })
})
