import { createHash } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { stableStringify } from '@/utils/stable-stringify'
import {
  buildAskKilianKnowledgeEntries,
  isAskKilianKnowledgeSourcePathCovered,
  normalizeKnowledgeKey,
} from './knowledge-sources'

describe('normalizeKnowledgeKey', () => {
  it('normalizes labels for stable keys', () => {
    expect(normalizeKnowledgeKey('Five Star Fan')).toBe('five-star-fan')
    expect(normalizeKnowledgeKey('OS')).toBe('os')
  })
})

describe('buildAskKilianKnowledgeEntries', () => {
  const entries = buildAskKilianKnowledgeEntries()
  const byKey = new Map(entries.map(entry => [entry.stableKey, entry]))

  it('creates unique stable keys for all repo-seeded entries', () => {
    expect(entries.length).toBeGreaterThan(20)
    expect(byKey.size).toBe(entries.length)
  })

  it('marks all repo-seeded entries active', () => {
    expect(entries).toEqual(entries.map(() => expect.objectContaining({ source: 'repo', status: 'active' })))
  })

  it('builds career entries from WORK_HISTORY', () => {
    const draftkings = byKey.get('career:draftkings')

    expect(draftkings).toMatchObject({
      category: 'career',
      source: 'repo',
      minTier: 0,
      spoilerLevel: 'none',
      sourcePath: 'src/lib/experience.ts',
    })
    expect(draftkings?.text).toContain('DraftKings')
    expect(draftkings?.text).toContain('Senior Site Reliability Engineer')
  })

  it('builds project entries from projects', () => {
    expect(byKey.get('project:kil-dev')?.text).toContain('kil.dev')
    expect(byKey.get('project:kubernetes')?.text).toContain('Home Kubernetes Cluster')
  })

  it('builds pet entries from PETS', () => {
    expect(byKey.get('pet:lux')?.text).toContain('Golden Retriever')
    expect(byKey.get('pet:gozer')?.text).toContain('Gozarian')
  })

  it('builds quick fact entries with durable ids', () => {
    expect(byKey.get('quickfact:operating-system')?.text).toContain('macOS')
    expect(byKey.get('quickfact:browser')?.text).toContain('Zen')
    expect(byKey.get('quickfact:os')).toBeUndefined()
  })

  it('builds achievement entries with safe hint metadata', () => {
    const achievement = byKey.get('achievement:console-commander')

    expect(achievement).toMatchObject({
      category: 'achievements',
      minTier: 1,
      spoilerLevel: 'hint',
    })
    expect(achievement?.text).toContain('Console Commander')

    const konami = byKey.get('achievement:konami-killer')

    expect(konami?.text).toContain('Konami Killer')
    expect(konami?.text).not.toContain('↑↑↓↓←→←→BA')
    expect(konami?.text).not.toContain('You entered the Konami code')
  })

  it('gates hidden and always-hidden theme metadata as hint-level spoilers', () => {
    expect(byKey.get('theme:dotcom')).toMatchObject({ minTier: 1, spoilerLevel: 'hint' })
    expect(byKey.get('theme:matrix')).toMatchObject({ minTier: 1, spoilerLevel: 'hint' })
    expect(byKey.get('theme:st-patricks')).toMatchObject({ minTier: 1, spoilerLevel: 'hint' })
    expect(byKey.get('theme:april-fools')).toMatchObject({ minTier: 1, spoilerLevel: 'hint' })
  })

  it('builds tier 2 fake lore entries for private-fact deflection', () => {
    const fakeLore = byKey.get('fun:fake-private-facts')

    expect(fakeLore).toMatchObject({
      category: 'fun',
      minTier: 2,
    })
    expect(fakeLore?.text).toContain('obviously fake')
  })

  it('hashes content deterministically', () => {
    const rebuilt = buildAskKilianKnowledgeEntries()

    expect(rebuilt.map(entry => [entry.stableKey, entry.contentHash])).toEqual(
      entries.map(entry => [entry.stableKey, entry.contentHash]),
    )
  })

  it('hashes the full entry contract', () => {
    for (const entry of entries) {
      const { contentHash, ...entryWithoutContentHash } = entry
      const expectedHash = createHash('sha256').update(stableStringify(entryWithoutContentHash)).digest('hex')

      expect(contentHash).toBe(expectedHash)
    }
  })
})

describe('ASK_KILIAN_KNOWLEDGE_SOURCE_GLOBS', () => {
  it('covers every emitted sourcePath', () => {
    const uncovered = buildAskKilianKnowledgeEntries()
      .map(entry => entry.sourcePath)
      .filter(sourcePath => !isAskKilianKnowledgeSourcePathCovered(sourcePath))

    expect(uncovered).toEqual([])
  })

  it('matches intended knowledge source paths directly', () => {
    const intendedSourcePaths = [
      'src/lib/achievements.ts',
      'src/lib/experience.ts',
      'src/lib/ask-kilian/config.ts',
      'src/lib/ask-kilian/knowledge-sources.ts',
      'src/types/themes.ts',
      'src/utils/stable-stringify.ts',
    ]

    for (const sourcePath of intendedSourcePaths) {
      expect(isAskKilianKnowledgeSourcePathCovered(sourcePath)).toBe(true)
    }
  })

  it('rejects unrelated paths that would add noisy preview embedding signals', () => {
    const unrelatedSourcePaths = [
      'src/lib/not-knowledge.ts',
      'convex/askKilianKnowledge.ts',
      'scripts/sync-ask-kilian-knowledge.ts',
      'src/app/page.tsx',
    ]

    for (const sourcePath of unrelatedSourcePaths) {
      expect(isAskKilianKnowledgeSourcePathCovered(sourcePath)).toBe(false)
    }
  })
})
