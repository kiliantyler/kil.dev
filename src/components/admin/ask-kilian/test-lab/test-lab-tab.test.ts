import {
  buildAskKilianAdminContextPreview,
  type AskKilianAdminRetrievedContext,
} from '@/lib/ask-kilian/admin-context-preview'
import { describe, expect, test } from 'vitest'
import { CONTEXT_PREVIEW_EMPTY_COPY, buildContextPreviewPanelSections } from './context-preview-panel'
import {
  ASK_KILIAN_MODEL_PRESETS,
  TEST_LAB_ACTION_TEXT,
  buildAskKilianGeneratePayload,
  buildAskKilianRuntimeConfigPayload,
  buildRetrievalPreviewPayload,
  clampRetrievalLimit,
  formatSelectedCategoriesLabel,
  resolveModelPickerValue,
  toggleCategorySelection,
} from './test-lab-tab'

const result: AskKilianAdminRetrievedContext = {
  stableKey: 'repo:project-kil-dev',
  title: 'kil.dev',
  category: 'projects',
  score: 0.921,
  text: 'Personal site project context.',
}

describe('buildRetrievalPreviewPayload', () => {
  test('empty prompt returns validation copy', () => {
    expect(
      buildRetrievalPreviewPayload({
        prompt: '   ',
        tier: 1,
        includeSpoilers: false,
        categories: [],
        limit: 4,
      }),
    ).toEqual({
      ok: false,
      error: 'Enter a prompt before previewing retrieval.',
    })
  })

  test('limit is clamped from 1 to 12', () => {
    expect(clampRetrievalLimit(0)).toBe(1)
    expect(clampRetrievalLimit(-8)).toBe(1)
    expect(clampRetrievalLimit(13)).toBe(12)
    expect(clampRetrievalLimit('42')).toBe(12)
  })

  test('category filter payload preserves selected categories', () => {
    const payload = buildRetrievalPreviewPayload({
      prompt: 'Which pets are on the site?',
      tier: 0,
      includeSpoilers: false,
      categories: toggleCategorySelection(['pets'], 'projects'),
      limit: 6,
    })

    expect(payload).toMatchObject({
      ok: true,
      payload: {
        categories: ['pets', 'projects'],
      },
    })
  })

  test('spoiler toggle changes retrieval payload', () => {
    const withoutSpoilers = buildRetrievalPreviewPayload({
      prompt: 'What achievements should I ask about?',
      tier: 2,
      includeSpoilers: false,
      categories: ['achievements'],
      limit: 3,
    })
    const withSpoilers = buildRetrievalPreviewPayload({
      prompt: 'What achievements should I ask about?',
      tier: 2,
      includeSpoilers: true,
      categories: ['achievements'],
      limit: 3,
    })

    expect(withoutSpoilers).toMatchObject({ ok: true, payload: { includeSpoilers: false } })
    expect(withSpoilers).toMatchObject({ ok: true, payload: { includeSpoilers: true } })
  })
})

describe('formatSelectedCategoriesLabel', () => {
  test('summarizes the category multiselect state', () => {
    expect(formatSelectedCategoriesLabel([])).toBe('All categories')
    expect(formatSelectedCategoriesLabel(['projects'])).toBe('projects')
    expect(formatSelectedCategoriesLabel(['projects', 'career', 'pets'])).toBe('3 categories')
  })
})

describe('buildAskKilianGeneratePayload', () => {
  test('builds a multi-turn admin generation payload', () => {
    const result = buildAskKilianGeneratePayload({
      priorMessages: [
        { role: 'user', content: '  What is kil.dev?  ' },
        { role: 'assistant', content: 'A personal site.  ' },
        { role: 'user', content: '   ' },
      ],
      prompt: '  What should I ask next?  ',
      tier: 2,
      includeSpoilers: true,
      categories: ['projects', 'career'],
      promptOverride: '  Keep it direct.  ',
      runtimeModelOverride: '  test/generation-model  ',
    })

    expect(result).toEqual({
      ok: true,
      payload: {
        messages: [
          { role: 'user', content: 'What is kil.dev?' },
          { role: 'assistant', content: 'A personal site.' },
          { role: 'user', content: 'What should I ask next?' },
        ],
        tier: 2,
        includeSpoilers: true,
        categories: ['projects', 'career'],
        promptOverride: 'Keep it direct.',
        runtimeModelOverride: 'test/generation-model',
      },
    })
  })

  test('empty prompt returns validation error for generation', () => {
    expect(
      buildAskKilianGeneratePayload({
        priorMessages: [{ role: 'user', content: 'Earlier question' }],
        prompt: '   ',
        tier: 1,
        includeSpoilers: false,
        categories: [],
      }),
    ).toEqual({
      ok: false,
      error: 'Enter a prompt before generating a response.',
    })
  })
})

describe('buildAskKilianRuntimeConfigPayload', () => {
  test('requires an explicit active model id', () => {
    expect(
      buildAskKilianRuntimeConfigPayload({
        modelId: '   ',
        maxOutputTokens: 900,
        temperature: 0.7,
        conversationWindow: 8,
        ragLimit: 6,
        adminTestDailyRequests: 100,
        publicDailyRequests: 40,
        publicDailyEstimatedTokens: 60_000,
      }),
    ).toEqual({
      ok: false,
      error: 'Enter an active model id before saving runtime config.',
    })
  })

  test('normalizes runtime config without applying a model fallback', () => {
    expect(
      buildAskKilianRuntimeConfigPayload({
        modelId: '  test/generation-model  ',
        maxOutputTokens: 900.8,
        temperature: 2.5,
        conversationWindow: 8.2,
        ragLimit: 99,
        adminTestDailyRequests: 100.5,
        publicDailyRequests: 40.9,
        publicDailyEstimatedTokens: 60_000.1,
      }),
    ).toEqual({
      ok: true,
      payload: {
        modelId: 'test/generation-model',
        maxOutputTokens: 900,
        temperature: 2,
        conversationWindow: 8,
        ragLimit: 12,
        quota: {
          adminTestDailyRequests: 100,
          publicDailyRequests: 40,
          publicDailyEstimatedTokens: 60_000,
        },
      },
    })
  })

  test.each([
    { label: 'NaN', value: Number.NaN, temperature: 0 },
    { label: 'Infinity', value: Infinity, temperature: 2 },
    { label: '-Infinity', value: -Infinity, temperature: 0 },
  ])('normalizes $label runtime config numbers before saving', ({ value, temperature }) => {
    const result = buildAskKilianRuntimeConfigPayload({
      modelId: 'test/generation-model',
      maxOutputTokens: value,
      temperature: value,
      conversationWindow: value,
      ragLimit: value,
      adminTestDailyRequests: value,
      publicDailyRequests: value,
      publicDailyEstimatedTokens: value,
    })

    expect(result).toEqual({
      ok: true,
      payload: {
        modelId: 'test/generation-model',
        maxOutputTokens: 1,
        temperature,
        conversationWindow: 1,
        ragLimit: 1,
        quota: {
          adminTestDailyRequests: 1,
          publicDailyRequests: 1,
          publicDailyEstimatedTokens: 1,
        },
      },
    })
  })
})

describe('Ask Kilian model picker presets', () => {
  test('offers curated Gateway presets and a custom fallback path', () => {
    expect(ASK_KILIAN_MODEL_PRESETS.map(model => model.id)).toEqual([
      'google/gemini-3.1-flash-lite',
      'openai/gpt-4.1-mini',
      'xai/grok-4.1-fast-non-reasoning',
      'deepseek/deepseek-v4-flash',
      'alibaba/qwen3.5-flash',
      'alibaba/qwen-3-30b',
      'anthropic/claude-haiku-4.5',
      'openai/gpt-5.4-mini',
    ])
    expect(resolveModelPickerValue('openai/gpt-4.1-mini')).toBe('openai/gpt-4.1-mini')
    expect(resolveModelPickerValue('provider/custom-model')).toBe('custom')
    expect(resolveModelPickerValue('   ')).toBe('unset')
  })
})

describe('buildContextPreviewPanelSections', () => {
  test('empty context debug copy reflects the wired chat flow', () => {
    expect(CONTEXT_PREVIEW_EMPTY_COPY).toBe(
      'Preview retrieval or send a message to inspect context and response details.',
    )
    expect(CONTEXT_PREVIEW_EMPTY_COPY).not.toContain('KTY-66')
    expect(CONTEXT_PREVIEW_EMPTY_COPY).not.toContain('before wiring')
  })

  test('no-match retrieval builds the no-results state', () => {
    const sections = buildContextPreviewPanelSections({
      results: [],
      contextPreview: buildAskKilianAdminContextPreview({
        prompt: 'No match expected',
        tier: 1,
        includeSpoilers: false,
        categories: [],
        results: [],
      }),
    })

    expect(sections[0]).toMatchObject({
      id: 'retrieved-context',
      emptyText: 'No matching knowledge entries.',
    })
  })

  test('context preview section order is deterministic', () => {
    expect(
      buildContextPreviewPanelSections({
        results: [result],
        contextPreview: buildAskKilianAdminContextPreview({
          prompt: 'What project context is available?',
          tier: 1,
          includeSpoilers: false,
          categories: ['projects'],
          results: [result],
        }),
      }).map(section => section.id),
    ).toEqual(['retrieved-context', 'preview-text', 'response'])
  })

  test('response section shows generated text when chat response is present', () => {
    const sections = buildContextPreviewPanelSections(null, {
      ok: true,
      status: 'completed',
      text: 'Kilian built kil.dev as a personal site.',
      traceId: 'trace-admin-1',
      diagnostics: { promptRevisionId: 'prompt_123' },
    })

    expect(sections[2]).toMatchObject({
      id: 'response',
      text: 'Kilian built kil.dev as a personal site.',
    })
  })

  test('response section shows failed generation reasons', () => {
    const sections = buildContextPreviewPanelSections(null, {
      ok: false,
      status: 'failed',
      reason: 'missing_active_prompt_config',
      traceId: 'trace-admin-failed',
      diagnostics: {},
    })

    expect(sections[2]).toMatchObject({
      id: 'response',
      text: 'Generation failed: missing_active_prompt_config',
    })
  })
})

describe('Test Lab action copy', () => {
  test('exposes separate retrieval and generation actions', () => {
    expect(TEST_LAB_ACTION_TEXT).toEqual(['Preview retrieval', 'Send message'])
  })
})
