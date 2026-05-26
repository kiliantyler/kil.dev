import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const requirePetGalleryAdminAuthContext = vi.fn()
const setAuth = vi.fn()
const ConvexHttpClient = vi.fn(function ConvexHttpClient() {
  return { setAuth }
})

vi.mock('@/lib/pet-gallery/admin-auth', () => ({
  requirePetGalleryAdminAuthContext,
}))

vi.mock('convex/browser', () => ({
  ConvexHttpClient,
}))

const BASE_ENV = {
  NODE_ENV: 'test',
  NEXT_PUBLIC_POSTHOG_KEY: 'test-posthog-key',
  NEXT_PUBLIC_POSTHOG_HOST: 'https://example.test',
  NEXT_PUBLIC_CONVEX_URL: 'https://example.convex.cloud',
}

async function importConvexServerClient() {
  vi.resetModules()
  return import('../convex-server-client')
}

describe('createPetGalleryConvexServerClient', () => {
  beforeEach(() => {
    for (const [key, value] of Object.entries(BASE_ENV)) {
      vi.stubEnv(key, value)
    }
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it('sets the AuthKit access token on the Convex HTTP client', async () => {
    requirePetGalleryAdminAuthContext.mockResolvedValue({ accessToken: 'access-token' })
    const { createPetGalleryConvexServerClient } = await importConvexServerClient()

    await expect(createPetGalleryConvexServerClient()).resolves.toEqual({ setAuth })
    expect(ConvexHttpClient).toHaveBeenCalledWith('https://example.convex.cloud')
    expect(setAuth).toHaveBeenCalledWith('access-token')
  })

  it('fails when the admin auth token cannot be obtained', async () => {
    requirePetGalleryAdminAuthContext.mockRejectedValue(new Error('missing token'))
    const { createPetGalleryConvexServerClient } = await importConvexServerClient()

    await expect(createPetGalleryConvexServerClient()).rejects.toThrow('missing token')
    expect(ConvexHttpClient).not.toHaveBeenCalled()
  })
})
