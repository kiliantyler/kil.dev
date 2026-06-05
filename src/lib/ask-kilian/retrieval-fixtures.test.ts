import { describe, expect, it } from 'vitest'

import { buildAskKilianKnowledgeEntries } from './knowledge-sources'
import { ASK_KILIAN_RETRIEVAL_FIXTURES } from './retrieval-fixtures'

describe('Ask Kilian retrieval fixtures', () => {
  const entries = buildAskKilianKnowledgeEntries()
  const byKey = new Map(entries.map(entry => [entry.stableKey, entry]))

  it.each(ASK_KILIAN_RETRIEVAL_FIXTURES)('has indexed source entries for "$query"', fixture => {
    for (const key of fixture.expectedStableKeys) {
      const entry = byKey.get(key)

      expect(entry, `missing ${key}`).toBeDefined()
      expect(entry?.text.length).toBeGreaterThan(40)

      if (fixture.minimumTier !== undefined) {
        expect(entry?.minTier).toBeLessThanOrEqual(fixture.minimumTier)
      }
    }
  })

  it('does not expose tier 2 fake private fact lore to lower tiers', () => {
    expect(byKey.get('fun:fake-private-facts')?.minTier).toBe(2)
  })
})
