import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ADMIN_TEST_BYPASS_COOKIE, ADMIN_TEST_BYPASS_COOKIE_VALUE } from './lib/admin-test-bypass'

const protectedProxyHandler = vi.fn(() => new Response('protected'))
const bypassProxyHandler = vi.fn(() => new Response('bypass'))
const authkitProxy = vi.fn(() => (authkitProxy.mock.calls.length === 1 ? protectedProxyHandler : bypassProxyHandler))

vi.mock('@workos-inc/authkit-nextjs', () => ({
  authkitProxy,
}))

describe('auth proxy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  function request(path: string, cookie?: string) {
    return {
      nextUrl: { pathname: path },
      cookies: {
        get: vi.fn((name: string) =>
          name === ADMIN_TEST_BYPASS_COOKIE && cookie ? { name: ADMIN_TEST_BYPASS_COOKIE, value: cookie } : undefined,
        ),
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
    expect(headers.get('Vary')).toBe('Cookie')
  }

  it('lets UploadThing and the admin layout handle their own authentication boundaries', async () => {
    vi.resetModules()
    const proxy = await import('./proxy')

    expect(authkitProxy).toHaveBeenNthCalledWith(1, {
      middlewareAuth: {
        enabled: true,
        unauthenticatedPaths: ['/api/uploadthing/:path*', '/admin/:path*', '/auth/sign-in', '/auth/callback'],
      },
    })
    expect(authkitProxy).toHaveBeenNthCalledWith(2, {
      middlewareAuth: {
        enabled: true,
        unauthenticatedPaths: ['/api/uploadthing/:path*', '/admin/:path*', '/auth/sign-in', '/auth/callback'],
      },
    })
    expect(proxy.config.matcher).toEqual(['/admin/:path*', '/auth/:path*', '/api/uploadthing/:path*'])
  })

  it('keeps admin protected when the E2E bypass cookie is absent', async () => {
    vi.resetModules()
    vi.stubEnv('PET_GALLERY_E2E', '1')
    vi.stubEnv('PET_GALLERY_TEST_ADMIN', '1')
    vi.stubEnv('VERCEL_ENV', 'development')
    const proxy = await import('./proxy')

    const response = await proxy.default(request('/admin') as never, undefined as never)

    expect(protectedProxyHandler).toHaveBeenCalledWith(
      expect.objectContaining({ nextUrl: { pathname: '/admin' } }),
      undefined,
    )
    expect(bypassProxyHandler).not.toHaveBeenCalled()
    expectNoStoreHeaders(response)
    vi.unstubAllEnvs()
  })

  it('allows admin through middleware only when E2E env guards and the test cookie are present', async () => {
    vi.resetModules()
    vi.stubEnv('PET_GALLERY_E2E', '1')
    vi.stubEnv('PET_GALLERY_TEST_ADMIN', '1')
    vi.stubEnv('VERCEL_ENV', 'development')
    const proxy = await import('./proxy')

    const response = await proxy.default(
      request('/admin/pet-gallery', ADMIN_TEST_BYPASS_COOKIE_VALUE) as never,
      undefined as never,
    )

    expect(bypassProxyHandler).toHaveBeenCalledWith(
      expect.objectContaining({ nextUrl: { pathname: '/admin/pet-gallery' } }),
      undefined,
    )
    expect(protectedProxyHandler).not.toHaveBeenCalled()
    expectNoStoreHeaders(response)
    vi.unstubAllEnvs()
  })

  it.each([
    ['missing E2E flag', undefined, '1', undefined],
    ['missing admin flag', '1', undefined, undefined],
    ['missing local Vercel development env', '1', '1', undefined],
    ['preview Vercel deployment', '1', '1', 'preview'],
    ['production Vercel deployment', '1', '1', 'production'],
  ])('keeps admin protected when the test bypass env is incomplete: %s', async (_name, e2e, testAdmin, vercelEnv) => {
    vi.resetModules()
    if (e2e) vi.stubEnv('PET_GALLERY_E2E', e2e)
    if (testAdmin) vi.stubEnv('PET_GALLERY_TEST_ADMIN', testAdmin)
    if (vercelEnv) vi.stubEnv('VERCEL_ENV', vercelEnv)
    const proxy = await import('./proxy')

    const response = await proxy.default(
      request('/admin/pet-gallery', ADMIN_TEST_BYPASS_COOKIE_VALUE) as never,
      undefined as never,
    )

    expect(protectedProxyHandler).toHaveBeenCalledWith(
      expect.objectContaining({ nextUrl: { pathname: '/admin/pet-gallery' } }),
      undefined,
    )
    expect(bypassProxyHandler).not.toHaveBeenCalled()
    expectNoStoreHeaders(response)
    vi.unstubAllEnvs()
  })

  it('preserves existing Vary values when disabling cache for auth responses', async () => {
    protectedProxyHandler.mockReturnValueOnce(new Response('protected', { headers: { Vary: 'Accept-Encoding' } }))
    vi.resetModules()
    const proxy = await import('./proxy')

    const response = await proxy.default(request('/auth/callback') as never, undefined as never)

    expect(response).toBeInstanceOf(Response)
    expect((response as Response).headers.get('Vary')).toBe('Accept-Encoding, Cookie')
    expect((response as Response).headers.get('Cache-Control')).toBe(
      'private, no-store, no-cache, must-revalidate, max-age=0',
    )
  })
})
