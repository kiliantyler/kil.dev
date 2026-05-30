import { describe, expect, it } from 'vitest'

import { buildPostHogInitOptions } from './posthog-provider'

describe('buildPostHogInitOptions', () => {
  it('uses the configured PostHog host for direct ingestion', () => {
    expect(buildPostHogInitOptions('https://eu.i.posthog.com')).toMatchObject({
      api_host: 'https://eu.i.posthog.com',
      ui_host: 'https://eu.posthog.com',
    })
  })

  it('keeps the local PostHog proxy aligned with the US UI host', () => {
    expect(buildPostHogInitOptions('/vibecheck')).toMatchObject({
      api_host: '/vibecheck',
      ui_host: 'https://us.posthog.com',
    })
  })
})
