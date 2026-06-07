import { describe, expect, it, vi } from 'vitest'

import {
  buildAskKilianRagCorpusVersionKey,
  createGetActivePromptConfigHandler,
  createGetActiveRuntimeConfigHandler,
  createRecordConversationHandler,
  createReserveQuotaHandler,
  createRuntimeRagSearchHandler,
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

  it('loads the newest active prompt config summary and fails closed when none exists', async () => {
    const olderPrompt = {
      _id: 'prompt-old',
      title: 'Older prompt',
      promptText: 'Older prompt text.',
      notes: 'Older notes',
      createdBy: 'admin@example.com',
      createdAt: 1,
    }
    const newestPrompt = {
      _id: 'prompt-new',
      title: 'Newest prompt',
      promptText: 'Newest prompt text.',
      createdBy: 'admin@example.com',
      createdAt: 2,
    }
    const collect = vi.fn(async () => [olderPrompt, newestPrompt])
    const eq = vi.fn(() => 'active-query')
    const withIndex = vi.fn((_index, buildQuery) => {
      buildQuery({ eq })
      return { collect }
    })
    const db = {
      query: vi.fn(() => ({ withIndex })),
    }
    const handler = createGetActivePromptConfigHandler({
      refs: { table: 'askKilianPromptConfigs' },
    })

    await expect(handler({ db } as never)).resolves.toEqual({
      id: 'prompt-new',
      title: 'Newest prompt',
      promptText: 'Newest prompt text.',
      createdBy: 'admin@example.com',
      createdAt: 2,
    })
    expect(db.query).toHaveBeenCalledWith('askKilianPromptConfigs')
    expect(withIndex).toHaveBeenCalledWith('by_active', expect.any(Function))
    expect(eq).toHaveBeenCalledWith('active', true)

    collect.mockResolvedValueOnce([])
    await expect(handler({ db } as never)).rejects.toThrow('Missing active Ask Kilian prompt config')
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

  it('loads the newest active runtime config summary and fails closed when none exists', async () => {
    const newestRuntime = {
      _id: 'runtime-new',
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
      createdBy: 'admin@example.com',
      createdAt: 2,
    }
    const collect = vi.fn(async () => [{ ...newestRuntime, _id: 'runtime-old', createdAt: 1 }, newestRuntime])
    const eq = vi.fn(() => 'active-query')
    const withIndex = vi.fn((_index, buildQuery) => {
      buildQuery({ eq })
      return { collect }
    })
    const db = {
      query: vi.fn(() => ({ withIndex })),
    }
    const handler = createGetActiveRuntimeConfigHandler({
      refs: { table: 'askKilianRuntimeConfigs' },
    })

    await expect(handler({ db } as never)).resolves.toEqual({
      id: 'runtime-new',
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
      createdBy: 'admin@example.com',
      createdAt: 2,
    })

    collect.mockResolvedValueOnce([])
    await expect(handler({ db } as never)).rejects.toThrow('Missing active Ask Kilian runtime config')
  })

  it('reserves admin_test quota without touching public quota', async () => {
    const now = new Date('2026-06-06T14:30:00.000Z').getTime()
    const usageRow = {
      _id: 'usage-admin-2026-06-06',
      bucket: 'admin_test',
      day: '2026-06-06',
      requestCount: 2,
      estimatedTokens: 900,
      updatedAt: now - 1_000,
    }
    const first = vi.fn(() => usageRow)
    const indexQuery = {
      eq: vi.fn(() => indexQuery),
    }
    const withIndex = vi.fn((_index, buildQuery) => {
      buildQuery(indexQuery)
      return { first }
    })
    const db = {
      insert: vi.fn(),
      patch: vi.fn(async () => null),
      query: vi.fn(() => ({ withIndex })),
    }
    const handler = createReserveQuotaHandler({
      now: () => now,
      refs: { table: 'askKilianQuotaUsage' },
    })

    await expect(
      handler(
        { db } as never,
        {
          bucket: 'admin_test',
          estimatedTokens: 250,
          quota: {
            adminTestDailyRequests: 4,
            publicDailyRequests: 1,
            publicDailyEstimatedTokens: 1,
          },
        },
      ),
    ).resolves.toEqual({
      allowed: true,
      bucket: 'admin_test',
      reason: 'reserved',
      remainingDailyRequests: 1,
    })

    expect(db.query).toHaveBeenCalledWith('askKilianQuotaUsage')
    expect(withIndex).toHaveBeenCalledWith('by_bucket_day', expect.any(Function))
    expect(indexQuery.eq).toHaveBeenCalledWith('bucket', 'admin_test')
    expect(indexQuery.eq).toHaveBeenCalledWith('day', '2026-06-06')
    expect(indexQuery.eq).not.toHaveBeenCalledWith('bucket', 'public')
    expect(db.patch).toHaveBeenCalledWith('usage-admin-2026-06-06', {
      requestCount: 3,
      estimatedTokens: 1_150,
      updatedAt: now,
    })
    expect(db.insert).not.toHaveBeenCalled()
  })

  it('blocks when daily request limit is exhausted without upserting usage', async () => {
    const now = new Date('2026-06-06T18:00:00.000Z').getTime()
    const usageRow = {
      _id: 'usage-admin-exhausted',
      bucket: 'admin_test',
      day: '2026-06-06',
      requestCount: 4,
      estimatedTokens: 2_000,
      updatedAt: now - 1_000,
    }
    const first = vi.fn(() => usageRow)
    const indexQuery = {
      eq: vi.fn(() => indexQuery),
    }
    const withIndex = vi.fn((_index, buildQuery) => {
      buildQuery(indexQuery)
      return { first }
    })
    const db = {
      insert: vi.fn(),
      patch: vi.fn(),
      query: vi.fn(() => ({ withIndex })),
    }
    const handler = createReserveQuotaHandler({
      now: () => now,
      refs: { table: 'askKilianQuotaUsage' },
    })

    await expect(
      handler(
        { db } as never,
        {
          bucket: 'admin_test',
          estimatedTokens: 250,
          quota: {
            adminTestDailyRequests: 4,
            publicDailyRequests: 40,
            publicDailyEstimatedTokens: 60_000,
          },
        },
      ),
    ).resolves.toEqual({
      allowed: false,
      bucket: 'admin_test',
      reason: 'daily_request_limit_exhausted',
      remainingDailyRequests: 0,
    })

    expect(db.insert).not.toHaveBeenCalled()
    expect(db.patch).not.toHaveBeenCalled()
  })

  it('blocks public quota when next estimated tokens exceeds the public daily token limit', async () => {
    const now = new Date('2026-06-06T19:00:00.000Z').getTime()
    const usageRow = {
      _id: 'usage-public-2026-06-06',
      bucket: 'public',
      day: '2026-06-06',
      requestCount: 5,
      estimatedTokens: 950,
      updatedAt: now - 1_000,
    }
    const first = vi.fn(() => usageRow)
    const indexQuery = {
      eq: vi.fn(() => indexQuery),
    }
    const withIndex = vi.fn((_index, buildQuery) => {
      buildQuery(indexQuery)
      return { first }
    })
    const db = {
      insert: vi.fn(),
      patch: vi.fn(),
      query: vi.fn(() => ({ withIndex })),
    }
    const handler = createReserveQuotaHandler({
      now: () => now,
      refs: { table: 'askKilianQuotaUsage' },
    })

    await expect(
      handler(
        { db } as never,
        {
          bucket: 'public',
          estimatedTokens: 51,
          quota: {
            adminTestDailyRequests: 100,
            publicDailyRequests: 40,
            publicDailyEstimatedTokens: 1_000,
          },
        },
      ),
    ).resolves.toEqual({
      allowed: false,
      bucket: 'public',
      reason: 'daily_estimated_token_limit_exhausted',
      remainingDailyRequests: 35,
    })

    expect(db.insert).not.toHaveBeenCalled()
    expect(db.patch).not.toHaveBeenCalled()
  })

  it('records a full conversation trace and returns its identifiers', async () => {
    const now = new Date('2026-06-06T20:00:00.000Z').getTime()
    const db = {
      insert: vi.fn(async () => 'conversation-1'),
    }
    const handler = createRecordConversationHandler({
      now: () => now,
      refs: { table: 'askKilianConversations' },
    })
    const messages = [
      { role: 'user' as const, content: 'What should I know about Kilian?', createdAt: now - 100 },
      { role: 'assistant' as const, content: 'Kilian ships careful, weird little web things.', createdAt: now },
    ]
    const metadata = {
      callerMode: 'admin_test' as const,
      quotaBucket: 'admin_test' as const,
      status: 'completed' as const,
      tier: 1 as const,
      includeSpoilers: false,
      categories: ['persona' as const],
      promptRevisionId: 'prompt-1',
      runtimeConfigVersionId: 'runtime-1',
      ragCorpusVersionKey: 'rag:v2:abc123',
      condensedQuery: 'Kilian profile',
      classification: {
        scope: 'allowed' as const,
        behavior: 'answer' as const,
        topic: 'profile',
        reason: 'Relevant site/persona question.',
        source: 'deterministic' as const,
      },
      retrievedEntries: [
        {
          stableKey: 'repo:profile',
          title: 'Profile',
          category: 'persona' as const,
          score: 0.91,
          contentHash: 'hash-profile',
        },
      ],
      quotaDecision: {
        allowed: true,
        bucket: 'admin_test' as const,
        reason: 'reserved',
        remainingDailyRequests: 11,
      },
      publicEquivalentQuotaDecision: {
        allowed: true,
        bucket: 'public' as const,
        reason: 'reserved',
        remainingDailyRequests: 39,
      },
      model: {
        modelId: 'openai/gpt-5-mini',
        latencyMs: 1_234,
        inputTokens: 100,
        outputTokens: 40,
        finishReason: 'stop',
      },
      posthogDistinctId: 'admin@example.com',
      posthogTraceId: 'ph-trace-1',
    }

    await expect(
      handler(
        { db } as never,
        {
          traceId: 'trace-ask-kilian-1',
          messages,
          metadata,
        },
      ),
    ).resolves.toEqual({
      conversationId: 'conversation-1',
      traceId: 'trace-ask-kilian-1',
    })

    expect(db.insert).toHaveBeenCalledWith('askKilianConversations', {
      traceId: 'trace-ask-kilian-1',
      messages,
      metadata,
      createdAt: now,
      updatedAt: now,
    })
  })

  it('builds a condensed runtime RAG query and returns search results with a corpus version key', async () => {
    const searchResults = [
      {
        stableKey: 'repo:kil-dev',
        title: 'kil.dev',
        category: 'projects' as const,
        score: 0.92,
        text: 'kil.dev is Kilian Tyler portfolio site.',
      },
    ]
    const searchKnowledge = vi.fn(async () => searchResults)
    const buildVersionKey = vi.fn(() => 'rag:v2:test')
    const handler = createRuntimeRagSearchHandler({
      searchKnowledge,
      buildVersionKey,
    })

    await expect(
      handler(
        { runQuery: vi.fn() } as never,
        {
          messages: [
            { role: 'user', content: 'Tell me about the site.' },
            { role: 'assistant', content: 'Ask about projects.' },
          ],
          latestUserMessage: 'What is Kilian doing with kil.dev?',
          tier: 1,
          includeSpoilers: false,
          categories: ['projects'],
          limit: 4,
        },
      ),
    ).resolves.toEqual({
      condensedQuery:
        'user: Tell me about the site.\nassistant: Ask about projects.\nlatest: What is Kilian doing with kil.dev?',
      ragCorpusVersionKey: 'rag:v2:test',
      results: searchResults,
    })
    expect(searchKnowledge).toHaveBeenCalledWith(expect.anything(), {
      query: 'user: Tell me about the site.\nassistant: Ask about projects.\nlatest: What is Kilian doing with kil.dev?',
      tier: 1,
      includeSpoilers: false,
      categories: ['projects'],
      limit: 4,
    })
    expect(buildVersionKey).toHaveBeenCalledWith(searchResults)
  })
})
