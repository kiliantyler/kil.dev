import { afterEach, describe, expect, it, vi } from 'vitest'

describe('Convex WorkOS HTTP routes', () => {
  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('registers 503 fallback routes when WorkOS AuthKit env is missing', async () => {
    const route = vi.fn()
    const http = { route }
    const httpAction = vi.fn((handler: () => Promise<Response>) => handler)
    const getAuthKit = vi.fn()

    vi.doMock('convex/server', () => ({
      httpRouter: () => http,
    }))
    vi.doMock('./_generated/server', () => ({
      httpAction,
    }))
    vi.doMock('./auth', () => ({
      getAuthKit,
      getMissingWorkOSAuthKitEnv: () => ['WORKOS_CLIENT_ID', 'WORKOS_WEBHOOK_SECRET'],
    }))

    await import('./http')

    expect(getAuthKit).not.toHaveBeenCalled()
    expect(httpAction).toHaveBeenCalledTimes(1)
    expect(route).toHaveBeenCalledWith({
      path: '/workos/webhook',
      method: 'POST',
      handler: expect.any(Function),
    })
    expect(route).toHaveBeenCalledWith({
      path: '/workos/action',
      method: 'POST',
      handler: expect.any(Function),
    })

    const handler = httpAction.mock.calls[0]?.[0]
    const response = await handler?.()
    await expect(response?.text()).resolves.toBe('WorkOS AuthKit environment is not configured')
    expect(response?.status).toBe(503)
  })

  it('registers AuthKit routes when WorkOS AuthKit env is complete', async () => {
    const http = { route: vi.fn() }
    const registerRoutes = vi.fn()
    const getAuthKit = vi.fn(() => ({ registerRoutes }))

    vi.doMock('convex/server', () => ({
      httpRouter: () => http,
    }))
    vi.doMock('./_generated/server', () => ({
      httpAction: vi.fn((handler: () => Promise<Response>) => handler),
    }))
    vi.doMock('./auth', () => ({
      getAuthKit,
      getMissingWorkOSAuthKitEnv: () => [],
    }))

    await import('./http')

    expect(registerRoutes).toHaveBeenCalledWith(http)
    expect(http.route).not.toHaveBeenCalled()
  })
})
