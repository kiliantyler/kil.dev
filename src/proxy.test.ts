import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ADMIN_TEST_BYPASS_COOKIE, ADMIN_TEST_BYPASS_COOKIE_VALUE } from './lib/admin-test-bypass'

const authkit = vi.fn()
const handleAuthkitHeaders = vi.fn((request: Request, headers: Headers, options?: { redirect?: URL | string }) => {
  const response = options?.redirect
    ? new Response(null, { status: 307, headers: { Location: new URL(options.redirect, request.url).toString() } })
    : new Response('next')

  for (const [name, value] of headers) {
    response.headers.set(name, value)
  }

  return response
})

vi.mock('@workos-inc/authkit-nextjs', () => ({
  authkit,
  handleAuthkitHeaders,
}))

describe('auth proxy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    authkit.mockResolvedValue({ session: { user: { id: 'user_admin' } }, headers: new Headers() })
  })

  function request(path: string, options: { bypassCookie?: string; sessionCookie?: string } = {}) {
    const url = new URL(path, 'https://kil.dev')
    return {
      url: url.toString(),
      headers: new Headers(),
      nextUrl: url,
      cookies: {
        get: vi.fn((name: string) => {
          if (name === ADMIN_TEST_BYPASS_COOKIE && options.bypassCookie) {
            return { name: ADMIN_TEST_BYPASS_COOKIE, value: options.bypassCookie }
          }
          if (name === 'wos-session' && options.sessionCookie)
            return { name: 'wos-session', value: options.sessionCookie }
          return
        }),
        has: vi.fn((name: string) => name === 'wos-session' && !!options.sessionCookie),
      },
    }
  }

  function expectNoStoreHeaders(response: unknown) {
    expect(response).toBeInstanceOf(Response)
    const headers = (response as Response).headers
    expect(headers.get('Cache-Control')).toBe('private, no-store, no-cache, must-revalidate, max-age=0')
    expect(headers.get('Pragma')).toBe('no-cache')
    expect(headers.get('Expires')).toBe('0')
    expect(headers.get('x-middleware-cache')).toBe('no-cache')
    expect(
      headers
        .get('Vary')
        ?.split(',')
        .map(value => value.trim()),
    ).toContain('Cookie')
  }

  it('matches only routes that need AuthKit request headers', async () => {
    vi.resetModules()
    const proxy = await import('./proxy')

    expect(proxy.config.matcher).toEqual(['/admin/:path*', '/api/uploadthing/:path*'])
  })

  it('redirects admin requests without a WorkOS session cookie before rendering the app route', async () => {
    vi.resetModules()
    const proxy = await import('./proxy')

    const response = await proxy.default(request('/admin/pet-gallery?tab=photos') as never, undefined as never)

    expect(authkit).not.toHaveBeenCalled()
    expect(response.status).toBe(307)
    expect(response.headers.get('Location')).toBe(
      'https://kil.dev/auth/sign-in?returnTo=%2Fadmin%2Fpet-gallery%3Ftab%3Dphotos',
    )
    expectNoStoreHeaders(response)
  })

  it('redirects admin requests when an existing WorkOS cookie does not resolve to a session', async () => {
    authkit.mockResolvedValueOnce({
      session: { user: null },
      headers: new Headers({ Vary: 'Accept-Encoding', 'Set-Cookie': 'wos-session=; Max-Age=0' }),
    })
    vi.resetModules()
    const proxy = await import('./proxy')

    const response = await proxy.default(
      request('/admin', { sessionCookie: 'sealed-session' }) as never,
      undefined as never,
    )

    expect(authkit).toHaveBeenCalledWith(expect.objectContaining({ url: 'https://kil.dev/admin' }))
    expect(handleAuthkitHeaders).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://kil.dev/admin' }),
      expect.any(Headers),
      { redirect: new URL('https://kil.dev/auth/sign-in?returnTo=%2Fadmin') },
    )
    expect(response.status).toBe(307)
    expect(response.headers.get('Location')).toBe('https://kil.dev/auth/sign-in?returnTo=%2Fadmin')
    expectNoStoreHeaders(response)
  })

  it('continues authenticated admin requests with AuthKit request headers', async () => {
    const headers = new Headers({ Vary: 'Accept-Encoding' })
    authkit.mockResolvedValueOnce({ session: { user: { id: 'user_admin' } }, headers })
    vi.resetModules()
    const proxy = await import('./proxy')

    const response = await proxy.default(
      request('/admin', { sessionCookie: 'sealed-session' }) as never,
      undefined as never,
    )

    expect(handleAuthkitHeaders).toHaveBeenCalledWith(expect.anything(), headers)
    expect(response.status).toBe(200)
    expect(response.headers.get('Vary')).toBe('Accept-Encoding, Cookie')
    expect(response.headers.get('Cache-Control')).toBe('private, no-store, no-cache, must-revalidate, max-age=0')
  })

  it('allows admin through proxy only when E2E env guards and the test cookie are present', async () => {
    vi.resetModules()
    vi.stubEnv('PET_GALLERY_E2E', '1')
    vi.stubEnv('PET_GALLERY_TEST_ADMIN', '1')
    vi.stubEnv('VERCEL_ENV', 'development')
    const proxy = await import('./proxy')

    const response = await proxy.default(
      request('/admin/pet-gallery', { bypassCookie: ADMIN_TEST_BYPASS_COOKIE_VALUE }) as never,
      undefined as never,
    )

    expect(authkit).not.toHaveBeenCalled()
    expect(handleAuthkitHeaders).not.toHaveBeenCalled()
    expect(response.status).toBe(200)
    expectNoStoreHeaders(response)
  })

  it.each([
    ['missing E2E flag', undefined, '1', undefined],
    ['missing admin flag', '1', undefined, undefined],
    ['missing local Vercel development env', '1', '1', undefined],
    ['preview Vercel deployment', '1', '1', 'preview'],
    ['production Vercel deployment', '1', '1', 'production'],
  ])('does not allow the test bypass when the env is incomplete: %s', async (_name, e2e, testAdmin, vercelEnv) => {
    vi.resetModules()
    if (e2e) vi.stubEnv('PET_GALLERY_E2E', e2e)
    if (testAdmin) vi.stubEnv('PET_GALLERY_TEST_ADMIN', testAdmin)
    if (vercelEnv) vi.stubEnv('VERCEL_ENV', vercelEnv)
    const proxy = await import('./proxy')

    const response = await proxy.default(
      request('/admin/pet-gallery', { bypassCookie: ADMIN_TEST_BYPASS_COOKIE_VALUE }) as never,
      undefined as never,
    )

    expect(authkit).not.toHaveBeenCalled()
    expect(response.status).toBe(307)
    expect(response.headers.get('Location')).toBe('https://kil.dev/auth/sign-in?returnTo=%2Fadmin%2Fpet-gallery')
    expectNoStoreHeaders(response)
  })
})
