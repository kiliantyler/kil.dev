import { describe, expect, it } from 'vitest'

import { buildAskKilianRagCorpusVersionKey, normalizeAskKilianQuotaDay } from '../askKilianChat'

describe('Ask Kilian chat helpers', () => {
  it('normalizes quota timestamps to UTC day keys', () => {
    expect(normalizeAskKilianQuotaDay(new Date('2026-06-06T23:59:59.000Z').getTime())).toBe('2026-06-06')
  })

  it('builds a RAG corpus version key from sorted entry fingerprints and embedding config', () => {
    expect(
      buildAskKilianRagCorpusVersionKey({
        entries: [
          { stableKey: 'repo:beta', contentHash: 'hash-beta' },
          { stableKey: 'repo:alpha', contentHash: 'hash-alpha' },
        ],
        ragFilterVersion: 2,
        embeddingModel: 'alibaba/qwen3-embedding-4b',
        embeddingDimensions: 2048,
      }),
    ).toMatch(/^rag:v2:/)
  })
})
