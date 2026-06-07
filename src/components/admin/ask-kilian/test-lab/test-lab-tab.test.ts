import {
  buildAskKilianAdminContextPreview,
  type AskKilianAdminRetrievedContext,
} from '@/lib/ask-kilian/admin-context-preview'
import { describe, expect, test } from 'vitest'
import { buildContextPreviewPanelSections } from './context-preview-panel'
import {
  TEST_LAB_ACTION_TEXT,
  buildAskKilianGeneratePayload,
  buildRetrievalPreviewPayload,
  clampRetrievalLimit,
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
      runtimeModelOverride: '  openai/gpt-5-mini  ',
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
        runtimeModelOverride: 'openai/gpt-5-mini',
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

describe('buildContextPreviewPanelSections', () => {
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
})

describe('Test Lab action copy', () => {
  test('exposes separate retrieval and generation actions', () => {
    expect(TEST_LAB_ACTION_TEXT).toEqual(['Preview retrieval', 'Generate response'])
  })
})
