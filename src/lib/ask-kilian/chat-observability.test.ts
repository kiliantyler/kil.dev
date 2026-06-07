import { describe, expect, it, vi } from 'vitest'

import { buildAskKilianPostHogEvent, captureAskKilianPostHogEvent } from './chat-observability'

describe('Ask Kilian chat observability', () => {
  it('builds a redaction-safe completion event', () => {
    const event = buildAskKilianPostHogEvent({
      event: 'ask_kilian_chat_completed',
      distinctId: 'visitor-123',
      traceId: 'trace-123',
      status: 'completed',
      bucket: 'admin_test',
      modelId: 'openai/gpt-4.1-mini',
      latencyMs: 732,
      promptRevisionId: 'prompt-rev-1',
      runtimeConfigVersionId: 'runtime-config-1',
      ragCorpusVersionKey: 'rag-2026-06-06',
      retrievedCount: 4,
      classificationScope: 'allowed',
      classificationBehavior: 'answer',
      prompt: 'What is Kilian working on?',
      userInput: 'Tell me private details.',
      aiResponse: 'Raw generated response.',
    } as Parameters<typeof buildAskKilianPostHogEvent>[0] & {
      prompt: string
      userInput: string
      aiResponse: string
    })

    expect(event).toEqual({
      event: 'ask_kilian_chat_completed',
      distinctId: 'visitor-123',
      properties: {
        traceId: 'trace-123',
        status: 'completed',
        bucket: 'admin_test',
        modelId: 'openai/gpt-4.1-mini',
        latencyMs: 732,
        promptRevisionId: 'prompt-rev-1',
        runtimeConfigVersionId: 'runtime-config-1',
        ragCorpusVersionKey: 'rag-2026-06-06',
        retrievedCount: 4,
        classificationScope: 'allowed',
        classificationBehavior: 'answer',
      },
    })
    expect(JSON.stringify(event.properties)).not.toContain('Kilian working')
    expect(JSON.stringify(event.properties)).not.toContain('private details')
    expect(JSON.stringify(event.properties)).not.toContain('Raw generated response')
  })

  it('skips fetch when the PostHog key or host is missing', async () => {
    const fetchImplementation = vi.fn()
    const event = buildAskKilianPostHogEvent({
      event: 'ask_kilian_chat_started',
      distinctId: 'visitor-123',
      traceId: 'trace-123',
      status: 'completed',
      bucket: 'public',
      modelId: 'openai/gpt-4.1-mini',
      latencyMs: 0,
      promptRevisionId: 'prompt-rev-1',
      runtimeConfigVersionId: 'runtime-config-1',
      ragCorpusVersionKey: 'rag-2026-06-06',
      retrievedCount: 0,
      classificationScope: 'ambiguous_valid',
      classificationBehavior: 'clarify',
    })

    await captureAskKilianPostHogEvent({
      posthogKey: '',
      posthogHost: 'https://posthog.test',
      event,
      fetchImplementation,
    })
    await captureAskKilianPostHogEvent({
      posthogKey: 'phc_test',
      posthogHost: '   ',
      event,
      fetchImplementation,
    })

    expect(fetchImplementation).not.toHaveBeenCalled()
  })

  it('posts redaction-safe event metadata to PostHog capture when configured', async () => {
    const fetchImplementation = vi.fn(async () => new Response(null, { status: 200 }))
    const event = buildAskKilianPostHogEvent({
      event: 'ask_kilian_chat_failed',
      distinctId: 'visitor-123',
      traceId: 'trace-123',
      status: 'failed',
      bucket: 'public',
      modelId: 'openai/gpt-4.1-mini',
      latencyMs: 1412,
      promptRevisionId: 'prompt-rev-1',
      runtimeConfigVersionId: 'runtime-config-1',
      ragCorpusVersionKey: 'rag-2026-06-06',
      retrievedCount: 2,
      classificationScope: 'general_ai_misuse',
      classificationBehavior: 'redirect',
    })

    await captureAskKilianPostHogEvent({
      posthogKey: '  phc_test  ',
      posthogHost: 'https://posthog.test/',
      event,
      fetchImplementation,
    })

    expect(fetchImplementation).toHaveBeenCalledOnce()
    expect(fetchImplementation).toHaveBeenCalledWith('https://posthog.test/capture/', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        api_key: 'phc_test',
        event: 'ask_kilian_chat_failed',
        distinct_id: 'visitor-123',
        properties: event.properties,
      }),
    })

    const [, requestInit] = fetchImplementation.mock.calls[0] as unknown as [string, RequestInit]
    const requestBody = JSON.parse(requestInit.body as string) as {
      properties: Record<string, unknown>
    }
    expect(requestBody.properties).not.toHaveProperty('prompt')
    expect(requestBody.properties).not.toHaveProperty('userInput')
    expect(requestBody.properties).not.toHaveProperty('aiResponse')
    expect(JSON.stringify(requestBody.properties)).not.toContain('Raw generated response')
  })
})
