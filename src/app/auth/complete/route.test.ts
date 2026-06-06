import type * as NextServer from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

const refreshSession = vi.fn()
const connection = vi.fn()

vi.mock('@workos-inc/authkit-nextjs', () => ({
  refreshSession,
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

async function importRoute() {
  vi.resetModules()
  for (const [key, value] of Object.entries(BASE_ENV)) {
    vi.stubEnv(key, value)
  }

  return import('./route')
}

function request(url: string) {
  return new Request(url) as never
}

describe('AuthKit completion route', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it('refreshes the WorkOS session into the configured admin organization before returning to admin', async () => {
    refreshSession.mockResolvedValue({ user: { id: 'user_admin' }, organizationId: 'org_allowed' })
    const route = await importRoute()

    const response = await route.GET(request('http://localhost:3000/auth/complete?returnTo=/admin/pet-gallery'))

    expect(connection).toHaveBeenCalledWith()
    expect(refreshSession).toHaveBeenCalledWith({ organizationId: 'org_allowed' })
    expect(response.headers.get('location')).toBe('http://localhost:3000/admin/pet-gallery')
    expect(response.headers.get('Cache-Control')).toBe('private, no-store, no-cache, must-revalidate, max-age=0')
    expect(response.headers.get('Pragma')).toBe('no-cache')
    expect(response.headers.get('Expires')).toBe('0')
    expect(response.headers.get('Vary')).toBe('Cookie')
  })

  it('falls back to org-scoped sign-in when the organization refresh fails', async () => {
    refreshSession.mockRejectedValue(new Error('refresh failed'))
    const route = await importRoute()

    const response = await route.GET(request('http://localhost:3000/auth/complete?returnTo=/admin/pet-gallery'))

    expect(response.headers.get('location')).toBe('http://localhost:3000/auth/sign-in?returnTo=%2Fadmin%2Fpet-gallery')
  })

  it.each(['https://evil.example.test/admin', '//evil.example.test/admin', '/projects', '/administrator'])(
    'falls back to /admin for unsafe return path %s',
    async returnTo => {
      refreshSession.mockResolvedValue({ user: { id: 'user_admin' }, organizationId: 'org_allowed' })
      const route = await importRoute()

      const response = await route.GET(
        request(`http://localhost:3000/auth/complete?returnTo=${encodeURIComponent(returnTo)}`),
      )

      expect(response.headers.get('location')).toBe('http://localhost:3000/admin')
    },
  )

  it('falls back to sign-in if refresh returns a session outside the configured organization', async () => {
    refreshSession.mockResolvedValue({ user: { id: 'user_admin' }, organizationId: 'org_other' })
    const route = await importRoute()

    const response = await route.GET(request('http://localhost:3000/auth/complete?returnTo=/admin'))

    expect(response.headers.get('location')).toBe('http://localhost:3000/auth/sign-in?returnTo=%2Fadmin')
  })
})
