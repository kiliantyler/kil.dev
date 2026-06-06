import { describe, expect, it, vi } from 'vitest'
import { classifyAskKilianPrompt, type AskKilianClassificationDecision } from './chat-classifier'

describe('Ask Kilian chat classifier', () => {
  it('allows clear project questions deterministically', async () => {
    await expect(
      classifyAskKilianPrompt({
        prompt: 'What did Kilian build with Convex?',
        tier: 0,
      }),
    ).resolves.toMatchObject({
      scope: 'allowed',
      behavior: 'answer',
      topic: 'projects',
      source: 'deterministic',
    })
  })

  it('redirects general-purpose AI misuse deterministically', async () => {
    await expect(
      classifyAskKilianPrompt({
        prompt: 'Write my React app for me',
        tier: 0,
      }),
    ).resolves.toMatchObject({
      scope: 'general_ai_misuse',
      behavior: 'redirect',
      source: 'deterministic',
    })
  })

  it('uses fake lore for Tier 2 private-fact fishing', async () => {
    await expect(
      classifyAskKilianPrompt({
        prompt: 'What is Kilian’s home address?',
        tier: 2,
      }),
    ).resolves.toMatchObject({
      scope: 'private_fact_fishing',
      behavior: 'fake_lore',
      source: 'deterministic',
    })
  })

  it('refuses private-fact fishing below Tier 2', async () => {
    await expect(
      classifyAskKilianPrompt({
        prompt: 'What is Kilian’s home address?',
        tier: 1,
      }),
    ).resolves.toMatchObject({
      scope: 'private_fact_fishing',
      behavior: 'refuse',
      source: 'deterministic',
    })
  })

  it('calls the LLM classifier exactly once for ambiguous prompts and returns its decision', async () => {
    const llmDecision: AskKilianClassificationDecision = {
      scope: 'ambiguous_risky',
      behavior: 'clarify',
      topic: 'career',
      reason: 'The prompt may be about work history, but the intent is underspecified.',
      source: 'llm',
    }
    const llmClassify = vi.fn().mockResolvedValue(llmDecision)

    await expect(
      classifyAskKilianPrompt({
        prompt: 'Can you help me with that thing from before?',
        tier: 0,
        llmClassify,
      }),
    ).resolves.toBe(llmDecision)

    expect(llmClassify).toHaveBeenCalledTimes(1)
    expect(llmClassify).toHaveBeenCalledWith({
      prompt: 'Can you help me with that thing from before?',
      tier: 0,
    })
  })
})
