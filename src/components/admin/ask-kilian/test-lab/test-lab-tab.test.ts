import {
  buildAskKilianAdminContextPreview,
  type AskKilianAdminRetrievedContext,
} from '@/lib/ask-kilian/admin-context-preview'
import { describe, expect, test } from 'vitest'
import { buildContextPreviewPanelSections } from './context-preview-panel'
import {
  TEST_LAB_ACTION_TEXT,
  buildRetrievalPreviewPayload,
  clampRetrievalLimit,
  containsForbiddenGenerationActionText,
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
})

describe('Test Lab action copy', () => {
  test('no helper exposes send/generate/chat action text', () => {
    expect(TEST_LAB_ACTION_TEXT).toEqual(['Preview retrieval'])
    expect(TEST_LAB_ACTION_TEXT.some(containsForbiddenGenerationActionText)).toBe(false)
  })
})
