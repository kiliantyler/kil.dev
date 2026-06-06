import { describe, expect, it } from 'vitest'
import {
  ASK_KILIAN_CHAT_CONTEXT_WINDOW,
  ASK_KILIAN_CHAT_MAX_INPUT_LENGTH,
  buildAskKilianChatRequest,
  normalizeAskKilianConversationWindow,
} from './chat-contracts'

describe('Ask Kilian chat contracts', () => {
  it('rejects empty chat input before model or RAG work', () => {
    const result = buildAskKilianChatRequest({
      callerMode: 'admin_test',
      messages: [{ role: 'user', content: '   ' }],
      tier: 0,
      includeSpoilers: false,
      categories: ['projects'],
    })

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'empty_input',
        message: 'Enter a message before asking Ask Kilian.',
      },
    })
  })

  it('rejects oversized input using the configured maximum input length', () => {
    const result = buildAskKilianChatRequest({
      callerMode: 'public',
      messages: [{ role: 'user', content: 'x'.repeat(ASK_KILIAN_CHAT_MAX_INPUT_LENGTH + 1) }],
      tier: 0,
      includeSpoilers: false,
      categories: ['quickfacts'],
    })

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'input_too_large',
        message: `Ask Kilian messages must be ${ASK_KILIAN_CHAT_MAX_INPUT_LENGTH} characters or fewer.`,
      },
    })
  })

  it('normalizes a valid admin test request', () => {
    const categories = ['projects', 'career'] as const

    const result = buildAskKilianChatRequest({
      callerMode: 'admin_test',
      messages: [
        { role: 'assistant', content: '  Earlier answer  ' },
        { role: 'user', content: '' },
        { role: 'user', content: '  What should I ask about kil.dev?  ' },
      ],
      tier: 2,
      includeSpoilers: true,
      categories,
      promptOverride: '  Be concise.  ',
      runtimeModelOverride: '  test-model  ',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.request).toMatchObject({
      callerMode: 'admin_test',
      quotaBucket: 'admin_test',
      latestUserMessage: 'What should I ask about kil.dev?',
      tier: 2,
      includeSpoilers: true,
      categories: ['projects', 'career'],
      promptOverride: 'Be concise.',
      runtimeModelOverride: 'test-model',
    })
    expect(result.request.categories).not.toBe(categories)
    expect(result.request.messages).toEqual([
      { role: 'assistant', content: 'Earlier answer' },
      { role: 'user', content: 'What should I ask about kil.dev?' },
    ])
  })

  it('keeps the last six non-empty trimmed conversation messages in order', () => {
    const window = normalizeAskKilianConversationWindow([
      { role: 'user', content: ' first ' },
      { role: 'assistant', content: ' ' },
      { role: 'assistant', content: ' second ' },
      { role: 'user', content: ' third ' },
      { role: 'assistant', content: ' fourth ' },
      { role: 'user', content: ' fifth ' },
      { role: 'assistant', content: ' sixth ' },
      { role: 'user', content: ' seventh ' },
    ])

    expect(window).toHaveLength(ASK_KILIAN_CHAT_CONTEXT_WINDOW)
    expect(window).toEqual([
      { role: 'assistant', content: 'second' },
      { role: 'user', content: 'third' },
      { role: 'assistant', content: 'fourth' },
      { role: 'user', content: 'fifth' },
      { role: 'assistant', content: 'sixth' },
      { role: 'user', content: 'seventh' },
    ])
  })
})
