import { describe, expect, it, vi } from 'vitest'

import {
  buildAskKilianRagCorpusVersionKey,
  createSavePromptRevisionHandler,
  createSaveRuntimeConfigHandler,
  normalizeAskKilianQuotaDay,
} from '../askKilianChat'

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

  it('deactivates older active prompts and inserts a new active prompt revision', async () => {
    const now = 1_783_280_001
    const previousPrompt = { _id: 'prompt-old-1', active: true }
    const secondPreviousPrompt = { _id: 'prompt-old-2', active: true }
    const collect = vi.fn(async () => [previousPrompt, secondPreviousPrompt])
    const eq = vi.fn(() => 'active-query')
    const withIndex = vi.fn((_index, buildQuery) => {
      buildQuery({ eq })
      return { collect }
    })
    const db = {
      insert: vi.fn(async () => 'prompt-new'),
      patch: vi.fn(async () => null),
      query: vi.fn(() => ({ withIndex })),
    }
    const handler = createSavePromptRevisionHandler({
      now: () => now,
      refs: { table: 'askKilianPromptConfigs' },
    })

    await expect(
      handler(
        { db } as never,
        {
          title: 'Admin test prompt',
          promptText: 'Answer like Kilian, grounded in the retrieved context.',
          notes: 'First admin-editable prompt.',
          actor: 'admin@example.com',
        },
      ),
    ).resolves.toEqual({ promptRevisionId: 'prompt-new' })

    expect(db.query).toHaveBeenCalledWith('askKilianPromptConfigs')
    expect(withIndex).toHaveBeenCalledWith('by_active', expect.any(Function))
    expect(eq).toHaveBeenCalledWith('active', true)
    expect(db.patch).toHaveBeenCalledWith('prompt-old-1', { active: false })
    expect(db.patch).toHaveBeenCalledWith('prompt-old-2', { active: false })
    expect(db.insert).toHaveBeenCalledWith('askKilianPromptConfigs', {
      title: 'Admin test prompt',
      promptText: 'Answer like Kilian, grounded in the retrieved context.',
      notes: 'First admin-editable prompt.',
      active: true,
      createdBy: 'admin@example.com',
      createdAt: now,
    })
  })

  it('deactivates older active runtime configs and inserts a new active runtime config', async () => {
    const now = 1_783_280_002
    const collect = vi.fn(async () => [{ _id: 'runtime-old-1', active: true }])
    const eq = vi.fn(() => 'active-query')
    const withIndex = vi.fn((_index, buildQuery) => {
      buildQuery({ eq })
      return { collect }
    })
    const db = {
      insert: vi.fn(async () => 'runtime-new'),
      patch: vi.fn(async () => null),
      query: vi.fn(() => ({ withIndex })),
    }
    const handler = createSaveRuntimeConfigHandler({
      now: () => now,
      refs: { table: 'askKilianRuntimeConfigs' },
    })

    await expect(
      handler(
        { db } as never,
        {
          modelId: 'openai/gpt-5-mini',
          maxOutputTokens: 900,
          temperature: 0.7,
          conversationWindow: 8,
          ragLimit: 5,
          quota: {
            adminTestDailyRequests: 100,
            publicDailyRequests: 40,
            publicDailyEstimatedTokens: 60_000,
          },
          actor: 'admin@example.com',
        },
      ),
    ).resolves.toEqual({ runtimeConfigVersionId: 'runtime-new' })

    expect(db.query).toHaveBeenCalledWith('askKilianRuntimeConfigs')
    expect(withIndex).toHaveBeenCalledWith('by_active', expect.any(Function))
    expect(eq).toHaveBeenCalledWith('active', true)
    expect(db.patch).toHaveBeenCalledWith('runtime-old-1', { active: false })
    expect(db.insert).toHaveBeenCalledWith('askKilianRuntimeConfigs', {
      modelId: 'openai/gpt-5-mini',
      maxOutputTokens: 900,
      temperature: 0.7,
      conversationWindow: 8,
      ragLimit: 5,
      quota: {
        adminTestDailyRequests: 100,
        publicDailyRequests: 40,
        publicDailyEstimatedTokens: 60_000,
      },
      active: true,
      createdBy: 'admin@example.com',
      createdAt: now,
    })
  })
})
