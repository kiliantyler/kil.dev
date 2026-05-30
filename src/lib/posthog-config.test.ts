import { describe, expect, it } from 'vitest'

import { shouldInitializePostHog } from './posthog-config'

describe('shouldInitializePostHog', () => {
  it('does not initialize when PostHog is explicitly disabled', () => {
    expect(
      shouldInitializePostHog({
        isDevRuntime: false,
        posthogDisabled: '1',
        posthogHost: 'test-host',
        posthogKey: 'test-key',
      }),
    ).toBe(false)
  })

  it('initializes in production when PostHog is configured and enabled', () => {
    expect(
      shouldInitializePostHog({
        isDevRuntime: false,
        posthogHost: '/vibecheck',
        posthogKey: 'test-key',
      }),
    ).toBe(true)
  })
})
