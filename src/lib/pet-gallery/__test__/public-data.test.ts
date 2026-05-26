import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../../../convex/_generated/api'

const query = vi.fn()

vi.mock('convex/browser', () => ({
  ConvexHttpClient: vi.fn(function ConvexHttpClient(url: string) {
    return { query, url }
  }),
}))

vi.mock('next/cache', () => ({
  unstable_cache: (fn: unknown) => fn,
}))

describe('getCachedPetGallerySnapshot', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('returns null in tests when Convex is not configured', async () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'test-posthog-key')
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://example.test')
    vi.stubEnv('NEXT_PUBLIC_CONVEX_URL', '')

    const { getCachedPetGallerySnapshot } = await import('../public-data')

    await expect(getCachedPetGallerySnapshot()).resolves.toBeNull()
    expect(query).not.toHaveBeenCalled()
  })

  it('throws in production when Convex is not configured', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'test-posthog-key')
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://example.test')
    vi.stubEnv('NEXT_PUBLIC_CONVEX_URL', '')

    const { getCachedPetGallerySnapshot } = await import('../public-data')

    await expect(getCachedPetGallerySnapshot()).rejects.toThrow('Pet gallery Convex URL is not configured')
    expect(query).not.toHaveBeenCalled()
  })

  it('loads the public snapshot through Convex', async () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'test-posthog-key')
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://example.test')
    vi.stubEnv('NEXT_PUBLIC_CONVEX_URL', 'https://example.convex.cloud')
    const snapshot = { revision: 'rev-1', publishedAt: 1, photos: [], animals: [] }
    query.mockResolvedValue(snapshot)

    const { getCachedPetGallerySnapshot } = await import('../public-data')

    await expect(getCachedPetGallerySnapshot()).resolves.toBe(snapshot)
    expect(query).toHaveBeenCalledWith(api.petGallery.getPublicSnapshot, {})
  })

  it('uses the public E2E snapshot without calling Convex', async () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('PET_GALLERY_E2E', '1')
    vi.stubEnv('PET_GALLERY_TEST_ADMIN', '1')
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'test-posthog-key')
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://example.test')
    vi.stubEnv('NEXT_PUBLIC_CONVEX_URL', 'https://pet-gallery-e2e.convex.cloud')

    const { getCachedPetGallerySnapshot } = await import('../public-data')
    const snapshot = await getCachedPetGallerySnapshot()

    expect(snapshot?.revision).toBe('test-bypass-public-snapshot')
    expect(snapshot?.photos.length).toBeGreaterThan(0)
    expect(query).not.toHaveBeenCalled()
  })

  it('does not enable the public E2E snapshot for arbitrary Convex URLs', async () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('PET_GALLERY_E2E', '1')
    vi.stubEnv('PET_GALLERY_TEST_ADMIN', '1')
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'test-posthog-key')
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://example.test')
    vi.stubEnv('NEXT_PUBLIC_CONVEX_URL', 'https://example.convex.cloud')
    const snapshot = { revision: 'rev-1', publishedAt: 1, photos: [], animals: [] }
    query.mockResolvedValue(snapshot)

    const { getCachedPetGallerySnapshot } = await import('../public-data')

    await expect(getCachedPetGallerySnapshot()).resolves.toBe(snapshot)
    expect(query).toHaveBeenCalledWith(api.petGallery.getPublicSnapshot, {})
  })

  it('falls back to an empty public gallery in tests when Convex snapshot loading fails', async () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'test-posthog-key')
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://example.test')
    vi.stubEnv('NEXT_PUBLIC_CONVEX_URL', 'https://example.convex.cloud')
    query.mockRejectedValue(new Error('Function not deployed'))

    const { getCachedPetGallerySnapshot } = await import('../public-data')

    await expect(getCachedPetGallerySnapshot()).resolves.toBeNull()
  })

  it('throws in production when Convex snapshot loading fails', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'test-posthog-key')
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://example.test')
    vi.stubEnv('NEXT_PUBLIC_CONVEX_URL', 'https://example.convex.cloud')
    query.mockRejectedValue(new Error('Function not deployed'))

    const { getCachedPetGallerySnapshot } = await import('../public-data')

    await expect(getCachedPetGallerySnapshot()).rejects.toThrow('Function not deployed')
  })
})
