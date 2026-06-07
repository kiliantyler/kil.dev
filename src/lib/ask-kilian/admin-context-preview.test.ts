import { describe, expect, it } from 'vitest'
import { buildAskKilianAdminContextPreview } from './admin-context-preview'

describe('buildAskKilianAdminContextPreview', () => {
  it('builds deterministic retrieval context without final prompt or generation metadata', () => {
    const preview = buildAskKilianAdminContextPreview({
      prompt: 'What projects should I ask about?',
      tier: 1,
      includeSpoilers: false,
      categories: ['projects'],
      results: [
        {
          stableKey: 'project:site',
          title: 'kil.dev',
          category: 'projects',
          score: 0.91,
          text: 'Project: kil.dev personal site.',
        },
      ],
    })

    expect(preview).toContain('User prompt: What projects should I ask about?')
    expect(preview).toContain('Tier: Tier 1')
    expect(preview).toContain('Spoilers: excluded')
    expect(preview).toContain('[project:site] kil.dev')
    expect(preview).toContain('Runtime chat also uses the active Convex prompt config and fixed guardrails.')
    expect(preview).not.toContain('model')
    expect(preview).not.toContain('temperature')
  })
})
