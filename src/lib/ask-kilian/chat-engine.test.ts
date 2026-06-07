import { describe, expect, it, vi } from 'vitest'

import type { AskKilianClassificationDecision } from './chat-classifier'
import { createAskKilianChatEngine, type AskKilianChatEngineDeps } from './chat-engine'

const now = new Date('2026-06-06T21:00:00.000Z').getTime()

const promptConfig = {
  id: 'prompt-rev-1',
  title: 'Active Ask Kilian prompt',
  promptText: 'Answer like Kilian, grounded in retrieved context.',
  createdBy: 'admin@example.com',
  createdAt: now - 10_000,
}

const runtimeConfig = {
  id: 'runtime-config-1',
  modelId: 'openai/gpt-5-mini',
  maxOutputTokens: 320,
  temperature: 0.4,
  conversationWindow: 6,
  ragLimit: 3,
  quota: {
    adminTestDailyRequests: 12,
    publicDailyRequests: 40,
    publicDailyEstimatedTokens: 20_000,
  },
  createdBy: 'admin@example.com',
  createdAt: now - 5_000,
}

const allowedClassification: AskKilianClassificationDecision = {
  scope: 'allowed',
  behavior: 'answer',
  topic: 'projects',
  reason: 'The prompt asks about Kilian projects.',
  source: 'deterministic',
}

function createDeps(overrides: Partial<AskKilianChatEngineDeps> = {}): AskKilianChatEngineDeps {
  return {
    now: vi.fn(() => now),
    createTraceId: vi.fn(() => 'trace-ask-kilian-1'),
    loadActivePromptConfig: vi.fn(async () => promptConfig),
    loadActiveRuntimeConfig: vi.fn(async () => runtimeConfig),
    classify: vi.fn(async () => allowedClassification),
    reserveQuota: vi.fn(async () => ({
      allowed: true,
      bucket: 'admin_test' as const,
      reason: 'reserved',
      remainingDailyRequests: 11,
    })),
    searchRag: vi.fn(async () => ({
      ragCorpusVersionKey: 'rag:v2:abc123',
      entries: [
        {
          stableKey: 'repo:kil-dev',
          title: 'kil.dev project',
          category: 'projects' as const,
          score: 0.92,
          text: 'kil.dev is Kilian Tyler portfolio site.',
          contentHash: 'hash-kil-dev',
        },
      ],
    })),
    streamModel: vi.fn(async () => ({
      text: 'Kilian has been turning kil.dev into a weirdly useful portfolio playground.',
      metadata: {
        modelId: 'openai/gpt-5-mini',
        latencyMs: 842,
        inputTokens: 188,
        outputTokens: 21,
        finishReason: 'stop',
      },
    })),
    recordConversation: vi.fn(async () => ({
      conversationId: 'conversation-1',
      traceId: 'trace-ask-kilian-1',
    })),
    captureMetric: vi.fn(async () => {}),
    ...overrides,
  }
}

function adminInput() {
  return {
    callerMode: 'admin_test' as const,
    distinctId: 'admin@example.com',
    messages: [{ role: 'user' as const, content: 'What is Kilian doing with kil.dev?' }],
    tier: 2 as const,
    includeSpoilers: true,
    categories: ['projects' as const],
  }
}

describe('Ask Kilian chat engine', () => {
  it('handles the allowed admin_test path with quota, RAG, model streaming, trace logging, metrics, and diagnostics', async () => {
    const deps = createDeps()
    const engine = createAskKilianChatEngine(deps)

    const result = await engine.run(adminInput())

    expect(result).toMatchObject({
      ok: true,
      status: 'completed',
      text: 'Kilian has been turning kil.dev into a weirdly useful portfolio playground.',
      traceId: 'trace-ask-kilian-1',
      diagnostics: {
        promptRevisionId: 'prompt-rev-1',
        runtimeConfigVersionId: 'runtime-config-1',
        ragCorpusVersionKey: 'rag:v2:abc123',
        model: {
          modelId: 'openai/gpt-5-mini',
          latencyMs: 842,
          inputTokens: 188,
          outputTokens: 21,
          finishReason: 'stop',
        },
      },
    })

    expect(deps.loadActivePromptConfig).toHaveBeenCalledOnce()
    expect(deps.loadActiveRuntimeConfig).toHaveBeenCalledOnce()
    expect(deps.classify).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: 'What is Kilian doing with kil.dev?',
        tier: 2,
      }),
    )
    expect(deps.reserveQuota).toHaveBeenCalledWith({
      bucket: 'admin_test',
      estimatedTokens: expect.any(Number),
      quota: runtimeConfig.quota,
    })
    expect(deps.searchRag).toHaveBeenCalledWith({
      messages: [{ role: 'user', content: 'What is Kilian doing with kil.dev?' }],
      latestUserMessage: 'What is Kilian doing with kil.dev?',
      tier: 2,
      includeSpoilers: true,
      categories: ['projects'],
      limit: 3,
    })
    expect(deps.streamModel).toHaveBeenCalledWith(
      expect.objectContaining({
        modelId: 'openai/gpt-5-mini',
        maxOutputTokens: 320,
        temperature: 0.4,
        systemPrompt: expect.stringContaining('Answer like Kilian'),
        messages: [{ role: 'user', content: 'What is Kilian doing with kil.dev?' }],
        traceId: 'trace-ask-kilian-1',
      }),
    )
    expect(deps.recordConversation).toHaveBeenCalledWith({
      traceId: 'trace-ask-kilian-1',
      messages: [
        {
          role: 'user',
          content: 'What is Kilian doing with kil.dev?',
          createdAt: now,
        },
        {
          role: 'assistant',
          content: 'Kilian has been turning kil.dev into a weirdly useful portfolio playground.',
          createdAt: now,
        },
      ],
      metadata: expect.objectContaining({
        callerMode: 'admin_test',
        quotaBucket: 'admin_test',
        status: 'completed',
        promptRevisionId: 'prompt-rev-1',
        runtimeConfigVersionId: 'runtime-config-1',
        ragCorpusVersionKey: 'rag:v2:abc123',
        classification: allowedClassification,
        model: {
          modelId: 'openai/gpt-5-mini',
          latencyMs: 842,
          inputTokens: 188,
          outputTokens: 21,
          finishReason: 'stop',
        },
        posthogDistinctId: 'admin@example.com',
        posthogTraceId: 'trace-ask-kilian-1',
      }),
    })
    expect(deps.captureMetric).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'ask_kilian_chat_completed',
        distinctId: 'admin@example.com',
        traceId: 'trace-ask-kilian-1',
        status: 'completed',
      }),
    )
  })

  it('returns deterministic clarification without calling the model', async () => {
    const clarifyingClassification: AskKilianClassificationDecision = {
      scope: 'ambiguous_valid',
      behavior: 'clarify',
      topic: 'unknown',
      reason: 'The prompt needs a clearer Ask Kilian topic.',
      source: 'fail_closed',
    }
    const deps = createDeps({
      classify: vi.fn(async () => clarifyingClassification),
    })
    const engine = createAskKilianChatEngine(deps)

    const result = await engine.run({
      ...adminInput(),
      messages: [{ role: 'user', content: 'What about that thing?' }],
    })

    expect(result).toMatchObject({
      ok: true,
      status: 'clarifying',
      text: expect.stringContaining('Ask Kilian'),
      diagnostics: {
        promptRevisionId: 'prompt-rev-1',
        runtimeConfigVersionId: 'runtime-config-1',
        ragCorpusVersionKey: 'rag:v2:abc123',
      },
    })
    expect(deps.searchRag).toHaveBeenCalledOnce()
    expect(deps.streamModel).not.toHaveBeenCalled()
    expect(deps.recordConversation).toHaveBeenCalledOnce()
  })

  it('fails closed when quota blocks and skips RAG, model streaming, and trace logging', async () => {
    const deps = createDeps({
      reserveQuota: vi.fn(async () => ({
        allowed: false,
        bucket: 'admin_test' as const,
        reason: 'daily_request_limit_exhausted',
        remainingDailyRequests: 0,
      })),
    })
    const engine = createAskKilianChatEngine(deps)

    const result = await engine.run(adminInput())

    expect(result).toMatchObject({
      ok: false,
      status: 'failed',
      reason: 'daily_request_limit_exhausted',
      traceId: 'trace-ask-kilian-1',
      diagnostics: {
        promptRevisionId: 'prompt-rev-1',
        runtimeConfigVersionId: 'runtime-config-1',
        quotaDecision: {
          allowed: false,
          bucket: 'admin_test',
          reason: 'daily_request_limit_exhausted',
          remainingDailyRequests: 0,
        },
      },
    })
    expect(deps.searchRag).not.toHaveBeenCalled()
    expect(deps.streamModel).not.toHaveBeenCalled()
    expect(deps.recordConversation).not.toHaveBeenCalled()
    expect(deps.captureMetric).not.toHaveBeenCalled()
  })

  it('preserves model metadata from streamModel in diagnostics and conversation metadata', async () => {
    const deps = createDeps({
      streamModel: vi.fn(async () => ({
        text: 'Ask Kilian response with measured model metadata.',
        metadata: {
          modelId: 'vercel/openai/gpt-5-mini',
          latencyMs: 1_437,
          inputTokens: 231,
          outputTokens: 17,
          finishReason: 'length',
        },
      })),
    })
    const engine = createAskKilianChatEngine(deps)

    const result = await engine.run(adminInput())

    expect(result).toMatchObject({
      ok: true,
      diagnostics: {
        model: {
          modelId: 'vercel/openai/gpt-5-mini',
          latencyMs: 1_437,
          inputTokens: 231,
          outputTokens: 17,
          finishReason: 'length',
        },
      },
    })
    expect(deps.recordConversation).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          model: {
            modelId: 'vercel/openai/gpt-5-mini',
            latencyMs: 1_437,
            inputTokens: 231,
            outputTokens: 17,
            finishReason: 'length',
          },
        }),
      }),
    )
  })
})
