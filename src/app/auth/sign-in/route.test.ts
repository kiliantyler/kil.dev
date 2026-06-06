import type * as NextServer from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getSignInUrl = vi.fn()
const connection = vi.fn()

vi.mock('@workos-inc/authkit-nextjs', () => ({
  getSignInUrl,
}))

vi.mock('next/server', async importActual => ({
  ...(await importActual<typeof NextServer>()),
  connection,
}))

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
}

async function importRoute(env: Record<string, string> = {}) {
  vi.resetModules()
  for (const [key, value] of Object.entries({ ...BASE_ENV, ...env })) {
    vi.stubEnv(key, value)
  }

  return import('./route')
}

function request(url: string) {
  return new Request(url) as never
}

describe('AuthKit sign-in route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it('creates an org-scoped WorkOS sign-in URL from a safe admin return path', async () => {
    getSignInUrl.mockResolvedValue('https://workos.example.test/sign-in')
    const route = await importRoute()

    const response = await route.GET(
      request('http://localhost:3000/auth/sign-in?returnTo=/admin/pet-gallery?tab=photos'),
    )

    expect(connection).toHaveBeenCalledWith()
    expect(getSignInUrl).toHaveBeenCalledWith({
      organizationId: 'org_allowed',
      returnTo: '/admin/pet-gallery?tab=photos',
      redirectUri: 'http://localhost:3000/auth/callback',
    })
    expect(response.headers.get('location')).toBe('https://workos.example.test/sign-in')
    expect(response.headers.get('Cache-Control')).toBe('private, no-store, no-cache, must-revalidate, max-age=0')
    expect(response.headers.get('Pragma')).toBe('no-cache')
    expect(response.headers.get('Expires')).toBe('0')
    expect(response.headers.get('Vary')).toBe('Cookie')
  })

  it('canonicalizes local sign-in requests to the configured callback origin before starting WorkOS auth', async () => {
    const route = await importRoute({
      NEXT_PUBLIC_WORKOS_REDIRECT_URI: 'http://127.0.0.1:3000/auth/callback',
    })

    const response = await route.GET(
      request('http://localhost:3000/auth/sign-in?returnTo=%2Fadmin%2Fask-kilian%3Ftab%3Dops'),
    )

    expect(connection).toHaveBeenCalledWith()
    expect(getSignInUrl).not.toHaveBeenCalled()
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'http://127.0.0.1:3000/auth/sign-in?returnTo=%2Fadmin%2Fask-kilian%3Ftab%3Dops',
    )
    expect(response.headers.get('Cache-Control')).toBe('private, no-store, no-cache, must-revalidate, max-age=0')
    expect(response.headers.get('Vary')).toBe('Cookie')
  })

  it('does not canonicalize when the request Host header already matches the configured local callback origin', async () => {
    getSignInUrl.mockResolvedValue('https://workos.example.test/sign-in')
    const route = await importRoute({
      NEXT_PUBLIC_WORKOS_REDIRECT_URI: 'http://127.0.0.1:3000/auth/callback',
    })

    const response = await route.GET(
      new Request('http://localhost:3000/auth/sign-in?returnTo=%2Fadmin', {
        headers: { Host: '127.0.0.1:3000' },
      }) as never,
    )

    expect(getSignInUrl).toHaveBeenCalledWith({
      organizationId: 'org_allowed',
      returnTo: '/admin',
      redirectUri: 'http://127.0.0.1:3000/auth/callback',
    })
    expect(response.headers.get('location')).toBe('https://workos.example.test/sign-in')
  })

  it('uses the preview request origin as the WorkOS redirect URI when a deployed callback is configured', async () => {
    getSignInUrl.mockResolvedValue('https://workos.example.test/sign-in')
    const route = await importRoute({
      VERCEL_ENV: 'preview',
      NEXT_PUBLIC_WORKOS_REDIRECT_URI: 'https://kil.dev/auth/callback',
    })

    await route.GET(request('https://kil-dev-git-feature-ktyler.vercel.app/auth/sign-in?returnTo=%2Fadmin'))

    expect(getSignInUrl).toHaveBeenCalledWith({
      organizationId: 'org_allowed',
      returnTo: '/admin',
      redirectUri: 'https://kil-dev-git-feature-ktyler.vercel.app/auth/callback',
    })
  })

  it.each([
    'https://evil.example.test/admin',
    '//evil.example.test/admin',
    '/projects',
    '/administrator',
    '/admin/../pet-gallery',
  ])('falls back to /admin for unsafe return path %s', async returnTo => {
    getSignInUrl.mockResolvedValue('https://workos.example.test/sign-in')
    const route = await importRoute()

    await route.GET(request(`http://localhost:3000/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`))

    expect(getSignInUrl).toHaveBeenCalledWith({
      organizationId: 'org_allowed',
      returnTo: '/admin',
      redirectUri: 'http://localhost:3000/auth/callback',
    })
  })
})
