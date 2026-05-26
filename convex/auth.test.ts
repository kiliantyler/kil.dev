import { afterEach, describe, expect, it, vi } from 'vitest'

describe('Convex WorkOS auth config', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('reports the missing WorkOS AuthKit environment variables', async () => {
    vi.stubEnv('WORKOS_CLIENT_ID', '')
    vi.stubEnv('WORKOS_API_KEY', 'sk_test_valid')
    vi.stubEnv('WORKOS_WEBHOOK_SECRET', '')
    vi.stubEnv('WORKOS_ACTION_SECRET', '')
    const { getMissingWorkOSAuthKitEnv } = await import('./auth')

    expect(getMissingWorkOSAuthKitEnv()).toEqual(['WORKOS_CLIENT_ID', 'WORKOS_WEBHOOK_SECRET'])
  })

  it('omits Convex auth providers until the WorkOS AuthKit environment is configured', async () => {
    vi.stubEnv('WORKOS_CLIENT_ID', '')
    vi.stubEnv('WORKOS_API_KEY', 'sk_test_valid')
    vi.stubEnv('WORKOS_WEBHOOK_SECRET', 'whsec_test_valid')
    vi.stubEnv('WORKOS_ACTION_SECRET', 'action_secret_test_valid')
    const { getWorkOSAuthConfigProviders } = await import('./auth')

    expect(getWorkOSAuthConfigProviders()).toEqual([])
  })

  it('builds Convex auth providers when only the WorkOS client ID is configured', async () => {
    vi.stubEnv('WORKOS_CLIENT_ID', 'client_test_valid')
    vi.stubEnv('WORKOS_API_KEY', '')
    vi.stubEnv('WORKOS_WEBHOOK_SECRET', '')
    vi.stubEnv('WORKOS_ACTION_SECRET', '')
    const { getWorkOSAuthConfigProviders } = await import('./auth')

    expect(getWorkOSAuthConfigProviders()).toEqual([
      {
        type: 'customJwt',
        issuer: 'https://api.workos.com/',
        algorithm: 'RS256',
        jwks: 'https://api.workos.com/sso/jwks/client_test_valid',
        applicationID: 'client_test_valid',
      },
      {
        type: 'customJwt',
        issuer: 'https://api.workos.com/user_management/client_test_valid',
        algorithm: 'RS256',
        jwks: 'https://api.workos.com/sso/jwks/client_test_valid',
      },
    ])
  })

  it('reads WorkOS client ID from Convex auth config process environment shape', async () => {
    const originalEnv = process.env
    process.env = Object.assign(Object.create({ WORKOS_CLIENT_ID: 'client_test_inherited' }), {}) as NodeJS.ProcessEnv

    try {
      const { getWorkOSAuthConfigProviders } = await import('./auth')

      expect(getWorkOSAuthConfigProviders()).toEqual([
        {
          type: 'customJwt',
          issuer: 'https://api.workos.com/',
          algorithm: 'RS256',
          jwks: 'https://api.workos.com/sso/jwks/client_test_inherited',
          applicationID: 'client_test_inherited',
        },
        {
          type: 'customJwt',
          issuer: 'https://api.workos.com/user_management/client_test_inherited',
          algorithm: 'RS256',
          jwks: 'https://api.workos.com/sso/jwks/client_test_inherited',
        },
      ])
    } finally {
      process.env = originalEnv
    }
  })

  it('builds Convex auth providers when the optional WorkOS action secret is missing', async () => {
    vi.stubEnv('WORKOS_CLIENT_ID', 'client_test_valid')
    vi.stubEnv('WORKOS_API_KEY', 'sk_test_valid')
    vi.stubEnv('WORKOS_WEBHOOK_SECRET', 'whsec_test_valid')
    vi.stubEnv('WORKOS_ACTION_SECRET', '')
    const { getWorkOSAuthConfigProviders } = await import('./auth')

    expect(getWorkOSAuthConfigProviders()).toEqual([
      {
        type: 'customJwt',
        issuer: 'https://api.workos.com/',
        algorithm: 'RS256',
        jwks: 'https://api.workos.com/sso/jwks/client_test_valid',
        applicationID: 'client_test_valid',
      },
      {
        type: 'customJwt',
        issuer: 'https://api.workos.com/user_management/client_test_valid',
        algorithm: 'RS256',
        jwks: 'https://api.workos.com/sso/jwks/client_test_valid',
      },
    ])
  })

  it('builds both WorkOS JWT provider contracts for Convex', async () => {
    vi.stubEnv('WORKOS_CLIENT_ID', 'client_test_valid')
    vi.stubEnv('WORKOS_API_KEY', 'sk_test_valid')
    vi.stubEnv('WORKOS_WEBHOOK_SECRET', 'whsec_test_valid')
    vi.stubEnv('WORKOS_ACTION_SECRET', 'action_secret_test_valid')
    const { getWorkOSAuthConfigProviders } = await import('./auth')

    expect(getWorkOSAuthConfigProviders()).toEqual([
      {
        type: 'customJwt',
        issuer: 'https://api.workos.com/',
        algorithm: 'RS256',
        jwks: 'https://api.workos.com/sso/jwks/client_test_valid',
        applicationID: 'client_test_valid',
      },
      {
        type: 'customJwt',
        issuer: 'https://api.workos.com/user_management/client_test_valid',
        algorithm: 'RS256',
        jwks: 'https://api.workos.com/sso/jwks/client_test_valid',
      },
    ])
  })
})
