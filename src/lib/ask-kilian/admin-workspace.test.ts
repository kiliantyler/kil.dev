import { describe, expect, it } from 'vitest'
import {
  buildAdminKnowledgeEntry,
  normalizeAdminKnowledgeSlug,
  validateAdminKnowledgeEntryInput,
} from './admin-workspace'

describe('Ask Kilian admin workspace helpers', () => {
  it('normalizes admin slugs and prefixes stable keys', () => {
    expect(normalizeAdminKnowledgeSlug('  Cool Fact!! 2026 ')).toBe('cool-fact-2026')
    expect(
      buildAdminKnowledgeEntry({
        mode: 'create',
        slug: 'Cool Fact',
        title: 'Cool Fact',
        category: 'fun',
        minTier: 1,
        spoilerLevel: 'hint',
        text: 'This is a sufficiently long manual Ask Kilian entry.',
        importance: 0.7,
      }).stableKey,
    ).toBe('admin:cool-fact')
  })

  it('rejects invalid admin entry input with concrete field errors', () => {
    const result = validateAdminKnowledgeEntryInput({
      slug: '!!!',
      title: '',
      category: 'fun',
      minTier: 0,
      spoilerLevel: 'none',
      text: 'short',
      importance: 3,
    })

    expect(result.ok).toBe(false)
    expect(result.errors).toEqual({
      slug: 'Enter a slug using letters or numbers.',
      title: 'Enter a title.',
      text: 'Enter at least 20 characters of source text.',
      importance: 'Importance must be between 0 and 1.',
    })
  })
})
