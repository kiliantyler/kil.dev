import { afterEach, describe, expect, it, vi } from 'vitest'
import { ADMIN_TEST_BYPASS_COOKIE, ADMIN_TEST_BYPASS_COOKIE_VALUE } from './admin-test-bypass'

const withAuth = vi.fn()
const cookieGet = vi.fn()
const headersGet = vi.fn()
const unsealData = vi.fn()
const jwtVerify = vi.fn()
const notFound = vi.fn(() => {
  throw new Error('not-found')
})
const redirect = vi.fn((url: string) => {
  throw new Error(`redirect:${url}`)
})

const BASE_ENV = {
  NODE_ENV: 'test',
  NEXT_PUBLIC_POSTHOG_KEY: 'test-posthog-key',
  NEXT_PUBLIC_POSTHOG_HOST: 'https://example.test',
  NEXT_PUBLIC_CONVEX_URL: 'https://example.convex.cloud',
  WORKOS_API_KEY: 'sk_test_valid_test_value',
  WORKOS_CLIENT_ID: 'client_test_valid_value',
  WORKOS_COOKIE_PASSWORD: 'a'.repeat(32),
  NEXT_PUBLIC_WORKOS_REDIRECT_URI: 'http://localhost:3000/auth/callback',
  WORKOS_ORG_ID: 'org_allowed',
  ADMIN_EMAIL: 'admin@example.test',
  UPLOADTHING_TOKEN: 'uploadthing-token-valid-value',
}

vi.mock('@workos-inc/authkit-nextjs', () => ({
  withAuth,
}))

vi.mock('iron-session', () => ({
  unsealData,
}))

vi.mock('jose', () => ({
  createRemoteJWKSet: vi.fn(() => 'jwks'),
  decodeJwt: vi.fn(() => ({ sid: 'session_cookie', org_id: 'org_allowed' })),
  jwtVerify,
}))

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => ({
    get: headersGet,
  })),
  cookies: vi.fn(async () => ({
    get: cookieGet,
  })),
}))

vi.mock('next/navigation', () => ({
  notFound,
  redirect,
}))

async function importAdminAuth() {
  vi.resetModules()
  for (const [key, value] of Object.entries(BASE_ENV)) {
    vi.stubEnv(key, value)
  }

  return import('./admin-auth')
}

function validAdminSession(overrides: Record<string, unknown> = {}) {
  return {
    user: { id: 'user_admin', email: 'admin@example.test' },
    organizationId: 'org_allowed',
    sessionId: 'session_1',
    accessToken: 'access-token',
    ...overrides,
  }
}

describe('requireAdminSession', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    withAuth.mockReset()
    cookieGet.mockReset()
    headersGet.mockReset()
    unsealData.mockReset()
    jwtVerify.mockReset()
    vi.clearAllMocks()
  })

  it('allows the configured admin email in the configured WorkOS organization', async () => {
    withAuth.mockResolvedValue(validAdminSession())
    const { requireAdminSession } = await importAdminAuth()

    await expect(requireAdminSession()).resolves.toEqual({
      session: expect.objectContaining({ organizationId: 'org_allowed' }),
      user: expect.objectContaining({ id: 'user_admin' }),
      email: 'admin@example.test',
      workosUserId: 'user_admin',
      workosOrgId: 'org_allowed',
      accessToken: 'access-token',
    })
    expect(notFound).not.toHaveBeenCalled()
  })

  it('redirects an unauthenticated admin request to an org-scoped WorkOS sign-in URL', async () => {
    headersGet.mockReturnValue('http://localhost:3000/admin/pet-gallery?tab=photos')
    withAuth.mockResolvedValue({ user: null })
    const { requireAdminSession } = await importAdminAuth()

    await expect(requireAdminSession()).rejects.toThrow(
      'redirect:/auth/sign-in?returnTo=%2Fadmin%2Fpet-gallery%3Ftab%3Dphotos',
    )
    expect(redirect).toHaveBeenCalledWith('/auth/sign-in?returnTo=%2Fadmin%2Fpet-gallery%3Ftab%3Dphotos')
    expect(notFound).not.toHaveBeenCalled()
  })

  it('redirects a configured admin in the wrong organization through org session completion', async () => {
    headersGet.mockReturnValue('http://localhost:3000/admin/pet-gallery')
    withAuth.mockResolvedValue(validAdminSession({ organizationId: 'org_other' }))
    const { requireAdminSession } = await importAdminAuth()

    await expect(requireAdminSession()).rejects.toThrow('redirect:/auth/complete?returnTo=%2Fadmin%2Fpet-gallery')
    expect(redirect).toHaveBeenCalledWith('/auth/complete?returnTo=%2Fadmin%2Fpet-gallery')
    expect(notFound).not.toHaveBeenCalled()
  })

  it('redirects a configured admin without an organization through org session completion', async () => {
    withAuth.mockResolvedValue(validAdminSession({ organizationId: undefined }))
    const { requireAdminSession } = await importAdminAuth()

    await expect(requireAdminSession()).rejects.toThrow('redirect:/auth/complete?returnTo=%2Fadmin')
    expect(redirect).toHaveBeenCalledWith('/auth/complete?returnTo=%2Fadmin')
    expect(notFound).not.toHaveBeenCalled()
  })

  it('does not switch organizations for Convex-backed admin operations before AuthKit returns the configured org', async () => {
    withAuth.mockResolvedValue(validAdminSession({ organizationId: undefined }))
    const { requireAdminAuthContext } = await importAdminAuth()

    await expect(requireAdminAuthContext()).rejects.toThrow('Admin access denied')
  })

  it('falls back to a verified WorkOS session cookie when middleware auth headers are missing', async () => {
    withAuth.mockResolvedValue({ user: null })
    cookieGet.mockImplementation((name: string) =>
      name === 'wos-session' ? { name: 'wos-session', value: 'sealed-session' } : undefined,
    )
    unsealData.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: { id: 'user_admin', email: 'Admin@Example.Test' },
    })
    const { requireAdminAuthContext } = await importAdminAuth()

    await expect(requireAdminAuthContext()).resolves.toEqual(
      expect.objectContaining({
        email: 'admin@example.test',
        workosUserId: 'user_admin',
        workosOrgId: 'org_allowed',
        accessToken: 'access-token',
      }),
    )
    expect(unsealData).toHaveBeenCalledWith('sealed-session', { password: 'a'.repeat(32) })
    expect(jwtVerify).toHaveBeenCalledWith('access-token', 'jwks')
  })

  it('rejects a signed-in WorkOS user with the wrong email', async () => {
    withAuth.mockResolvedValue(validAdminSession({ user: { id: 'user_admin', email: 'other@example.test' } }))
    const { requireAdminSession } = await importAdminAuth()

    await expect(requireAdminSession()).rejects.toThrow('not-found')
  })

  it('allows the test admin cookie only when both private E2E environment guards are enabled', async () => {
    vi.stubEnv('PET_GALLERY_E2E', '1')
    vi.stubEnv('PET_GALLERY_TEST_ADMIN', '1')
    vi.stubEnv('VERCEL_ENV', 'development')
    cookieGet.mockReturnValue({ name: ADMIN_TEST_BYPASS_COOKIE, value: ADMIN_TEST_BYPASS_COOKIE_VALUE })
    const { requireAdminSession } = await importAdminAuth()

    await expect(requireAdminSession()).resolves.toEqual({
      session: expect.objectContaining({ organizationId: 'org_test_pet_gallery_e2e' }),
      user: expect.objectContaining({ id: 'user_test_pet_gallery_e2e' }),
      email: 'admin-e2e@example.invalid',
      workosUserId: 'user_test_pet_gallery_e2e',
      workosOrgId: 'org_test_pet_gallery_e2e',
    })
    expect(withAuth).not.toHaveBeenCalled()
    expect(notFound).not.toHaveBeenCalled()
  })

  it.each([
    ['missing E2E flag', undefined, '1', undefined],
    ['missing admin flag', '1', undefined, undefined],
    ['missing local Vercel development env', '1', '1', undefined],
    ['preview Vercel deployment', '1', '1', 'preview'],
    ['production Vercel deployment', '1', '1', 'production'],
  ])(
    'does not allow the test admin cookie when the bypass env is incomplete: %s',
    async (_name, e2e, testAdmin, vercelEnv) => {
      if (e2e) vi.stubEnv('PET_GALLERY_E2E', e2e)
      if (testAdmin) vi.stubEnv('PET_GALLERY_TEST_ADMIN', testAdmin)
      if (vercelEnv) vi.stubEnv('VERCEL_ENV', vercelEnv)
      cookieGet.mockReturnValue({ name: ADMIN_TEST_BYPASS_COOKIE, value: ADMIN_TEST_BYPASS_COOKIE_VALUE })
      withAuth.mockResolvedValue({ user: null })
      const { requireAdminSession } = await importAdminAuth()

      await expect(requireAdminSession()).rejects.toThrow('redirect:/auth/sign-in?returnTo=%2Fadmin')
      expect(withAuth).toHaveBeenCalledWith()
      expect(notFound).not.toHaveBeenCalled()
    },
  )

  it('does not let the page-only E2E bypass authenticate Convex-backed admin operations', async () => {
    vi.stubEnv('PET_GALLERY_E2E', '1')
    vi.stubEnv('PET_GALLERY_TEST_ADMIN', '1')
    vi.stubEnv('VERCEL_ENV', 'development')
    cookieGet.mockReturnValue({ name: ADMIN_TEST_BYPASS_COOKIE, value: ADMIN_TEST_BYPASS_COOKIE_VALUE })
    withAuth.mockResolvedValue({ user: null })
    const { requireAdminAuthContext } = await importAdminAuth()

    await expect(requireAdminAuthContext()).rejects.toThrow('Admin access denied')
    expect(withAuth).toHaveBeenCalledWith()
  })
})
