import { afterEach, describe, expect, it, vi } from 'vitest'

const requireAdminAuthContext = vi.fn()
const ConvexHttpClient = vi.fn(function ConvexHttpClient(url: string) {
  return { url, action: vi.fn(), query: vi.fn(), mutation: vi.fn(), setAuth: vi.fn() }
})

vi.mock('@/lib/admin-auth', () => ({ requireAdminAuthContext }))
vi.mock('convex/browser', () => ({ ConvexHttpClient }))

describe('createAskKilianConvexServerClient', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('requires an admin session and sets the WorkOS token on the Convex client', async () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'key')
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://posthog.test')
    vi.stubEnv('NEXT_PUBLIC_CONVEX_URL', 'https://convex.test')
    requireAdminAuthContext.mockResolvedValue({ email: 'admin@example.test', accessToken: 'workos-token' })

    const { createAskKilianConvexServerClient } = await import('./convex-server-client')
    const result = await createAskKilianConvexServerClient()

    expect(requireAdminAuthContext).toHaveBeenCalledWith()
    expect(ConvexHttpClient).toHaveBeenCalledWith('https://convex.test')
    expect(result.setAuth).toHaveBeenCalledWith('workos-token')
  })
})
