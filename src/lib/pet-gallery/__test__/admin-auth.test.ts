import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const withAuth = vi.fn()

const BASE_ENV = {
  NODE_ENV: 'test',
  NEXT_PUBLIC_POSTHOG_KEY: 'test-posthog-key',
  NEXT_PUBLIC_POSTHOG_HOST: 'https://example.test',
  NEXT_PUBLIC_CONVEX_URL: 'https://example.convex.cloud',
  WORKOS_API_KEY: 'sk_test_valid_test_value',
  WORKOS_CLIENT_ID: 'client_test_valid_value',
  WORKOS_COOKIE_PASSWORD: 'a'.repeat(32),
  NEXT_PUBLIC_WORKOS_REDIRECT_URI: 'http://localhost:3000/auth/callback',
  PET_GALLERY_WORKOS_ORG_ID: 'org_allowed',
  PET_GALLERY_ADMIN_EMAIL: 'admin@example.test',
  UPLOADTHING_TOKEN: 'uploadthing-token-valid-value',
}

vi.mock('@workos-inc/authkit-nextjs', () => ({
  withAuth,
}))

function jwtWithClaims(claims: Record<string, unknown>) {
  return [
    Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url'),
    Buffer.from(JSON.stringify(claims)).toString('base64url'),
    'signature',
  ].join('.')
}

function configuredAdminSession(overrides: Record<string, unknown> = {}) {
  return {
    user: { id: 'user_admin', email: 'admin@example.test' },
    organizationId: 'org_allowed',
    accessToken: 'access-token',
    ...overrides,
  }
}

async function importAdminAuth() {
  vi.resetModules()
  return import('../admin-auth')
}

describe('requirePetGalleryAdminSession', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2026-05-17T12:00:00.000Z'))
    for (const [key, value] of Object.entries(BASE_ENV)) {
      vi.stubEnv(key, value)
    }
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it('rejects a missing session', async () => {
    withAuth.mockResolvedValue({ user: null })
    const { requirePetGalleryAdminSession } = await importAdminAuth()

    await expect(requirePetGalleryAdminSession()).rejects.toThrow('Pet gallery admin access denied')
  })

  it('rejects a signed-in user with the wrong email', async () => {
    withAuth.mockResolvedValue({
      user: { id: 'user_admin', email: 'other@example.test' },
      organizationId: 'org_allowed',
      accessToken: 'access-token',
    })
    const { requirePetGalleryAdminSession } = await importAdminAuth()

    await expect(requirePetGalleryAdminSession()).rejects.toThrow('Pet gallery admin access denied')
  })

  it('rejects a signed-in user with the wrong organization', async () => {
    withAuth.mockResolvedValue({
      user: { id: 'user_admin', email: 'admin@example.test' },
      organizationId: 'org_other',
      accessToken: 'access-token',
    })
    const { requirePetGalleryAdminSession } = await importAdminAuth()

    await expect(requirePetGalleryAdminSession()).rejects.toThrow('Pet gallery admin access denied')
  })

  it('rejects a signed-in user missing an organization claim when an organization is configured', async () => {
    withAuth.mockResolvedValue({
      user: { id: 'user_admin', email: 'admin@example.test' },
      accessToken: 'access-token',
    })
    const { requirePetGalleryAdminSession } = await importAdminAuth()

    await expect(requirePetGalleryAdminSession()).rejects.toThrow('Pet gallery admin access denied')
  })

  it('rejects an otherwise valid admin session missing a WorkOS user id', async () => {
    withAuth.mockResolvedValue(configuredAdminSession({ user: { email: 'admin@example.test' } }))
    const { requirePetGalleryAdminSession } = await importAdminAuth()

    await expect(requirePetGalleryAdminSession()).rejects.toThrow('Pet gallery admin access denied')
  })

  it('rejects an otherwise valid admin session missing an access token', async () => {
    withAuth.mockResolvedValue(configuredAdminSession({ accessToken: undefined }))
    const { requirePetGalleryAdminSession } = await importAdminAuth()

    await expect(requirePetGalleryAdminSession()).rejects.toThrow('Pet gallery admin access denied')
  })

  it('rejects an otherwise valid admin session with a blank access token', async () => {
    withAuth.mockResolvedValue(configuredAdminSession({ accessToken: '   ' }))
    const { requirePetGalleryAdminSession } = await importAdminAuth()

    await expect(requirePetGalleryAdminSession()).rejects.toThrow('Pet gallery admin access denied')
  })

  it('returns actor metadata for the configured admin identity', async () => {
    withAuth.mockResolvedValue({
      user: {
        id: 'user_admin',
        email: 'Admin@Example.Test',
        firstName: 'Kilian',
        lastName: 'Tyler',
      },
      organizationId: 'org_allowed',
      accessToken: 'access-token',
    })
    const { requirePetGalleryAdminSession } = await importAdminAuth()

    await expect(requirePetGalleryAdminSession()).resolves.toEqual({
      workosUserId: 'user_admin',
      workosOrgId: 'org_allowed',
      email: 'admin@example.test',
      name: 'Kilian Tyler',
      timestamp: Date.parse('2026-05-17T12:00:00.000Z'),
    })
    expect(withAuth).toHaveBeenCalledWith()
  })

  it('accepts the verified JWT organization claim when the session field is absent', async () => {
    withAuth.mockResolvedValue({
      user: {
        id: 'user_admin',
        email: 'Admin@Example.Test',
      },
      accessToken: jwtWithClaims({ org_id: 'org_allowed' }),
    })
    const { requirePetGalleryAdminSession } = await importAdminAuth()

    await expect(requirePetGalleryAdminSession()).resolves.toEqual(
      expect.objectContaining({
        workosUserId: 'user_admin',
        workosOrgId: 'org_allowed',
        email: 'admin@example.test',
      }),
    )
  })

  it('does not trust arbitrary nested organization claims on the session object', async () => {
    withAuth.mockResolvedValue({
      user: { id: 'user_admin', email: 'admin@example.test' },
      claims: { org_id: 'org_allowed' },
      accessToken: 'access-token',
    })
    const { requirePetGalleryAdminSession } = await importAdminAuth()

    await expect(requirePetGalleryAdminSession()).rejects.toThrow('Pet gallery admin access denied')
  })
})
