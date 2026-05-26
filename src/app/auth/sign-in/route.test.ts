import type * as NextServer from 'next/server'
import { describe, expect, it, vi } from 'vitest'

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
  PET_GALLERY_WORKOS_ORG_ID: 'org_allowed',
  PET_GALLERY_ADMIN_EMAIL: 'admin@example.test',
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

describe('AuthKit sign-in route', () => {
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
    })
    expect(response.headers.get('location')).toBe('https://workos.example.test/sign-in')
  })

  it.each(['https://evil.example.test/admin', '//evil.example.test/admin', '/projects'])(
    'falls back to /admin for unsafe return path %s',
    async returnTo => {
      getSignInUrl.mockResolvedValue('https://workos.example.test/sign-in')
      const route = await importRoute()

      await route.GET(request(`http://localhost:3000/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`))

      expect(getSignInUrl).toHaveBeenCalledWith({
        organizationId: 'org_allowed',
        returnTo: '/admin',
      })
    },
  )
})
