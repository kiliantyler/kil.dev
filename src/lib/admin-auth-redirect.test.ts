import { beforeEach, describe, expect, it, vi } from 'vitest'
import { adminAuthRedirectUri } from './admin-auth-redirect'

describe('adminAuthRedirectUri', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  it('uses the configured local redirect URI for local requests', () => {
    vi.stubEnv('NEXT_PUBLIC_WORKOS_REDIRECT_URI', 'http://127.0.0.1:3000/auth/callback')

    expect(adminAuthRedirectUri(new Request('http://localhost:3000/admin'))).toBe(
      'http://127.0.0.1:3000/auth/callback',
    )
  })

  it('does not apply a local redirect URI to a deployed request origin', () => {
    vi.stubEnv('NEXT_PUBLIC_WORKOS_REDIRECT_URI', 'http://127.0.0.1:3000/auth/callback')

    expect(adminAuthRedirectUri(new Request('https://kil.dev/admin'))).toBe('https://kil.dev/auth/callback')
  })

  it('uses a configured deployed redirect URI for deployed request origins', () => {
    vi.stubEnv('NEXT_PUBLIC_WORKOS_REDIRECT_URI', 'https://kil.dev/auth/callback')

    expect(adminAuthRedirectUri(new Request('https://kil.dev/admin'))).toBe('https://kil.dev/auth/callback')
  })

  it('uses the Host header when Next normalizes the request URL host', () => {
    vi.stubEnv('NEXT_PUBLIC_WORKOS_REDIRECT_URI', 'http://127.0.0.1:3000/auth/callback')

    expect(
      adminAuthRedirectUri(
        new Request('http://localhost:3000/admin', {
          headers: { Host: '127.0.0.1:3000' },
        }),
      ),
    ).toBe('http://127.0.0.1:3000/auth/callback')
  })
})
