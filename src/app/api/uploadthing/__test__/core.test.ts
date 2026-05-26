import {
  PET_GALLERY_UPLOADTHING_MAX_FILE_COUNT,
  PET_GALLERY_UPLOADTHING_MAX_FILE_SIZE,
} from '@/lib/pet-gallery/upload-inputs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../../../../convex/_generated/api'

const requirePetGalleryAdminAuthContext = vi.fn()
const mutation = vi.fn()
const setAuth = vi.fn()
const deleteFiles = vi.fn()
const ConvexHttpClient = vi.fn(function ConvexHttpClient() {
  return { mutation, setAuth }
})
const UTApi = vi.fn(function UTApi() {
  return { deleteFiles }
})

vi.mock('@/lib/pet-gallery/admin-auth', () => ({
  PetGalleryAdminUnauthorizedError: class PetGalleryAdminUnauthorizedError extends Error {},
  requirePetGalleryAdminAuthContext,
}))

vi.mock('convex/browser', () => ({
  ConvexHttpClient,
}))

vi.mock('uploadthing/server', () => ({
  UploadThingError: class UploadThingError extends Error {
    code: string

    constructor(input: { code: string; message: string }) {
      super(input.message)
      this.code = input.code
    }
  },
  UTApi,
}))

async function importUploadThingCore() {
  vi.resetModules()
  return import('../core')
}

describe('petGalleryFileRouter', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_CONVEX_URL', 'https://example.convex.cloud')
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'test-posthog-key')
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://example.test')
    vi.stubEnv('UPLOADTHING_TOKEN', 'uploadthing-token-valid-value')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it('rejects unauthorized upload attempts in middleware', async () => {
    requirePetGalleryAdminAuthContext.mockRejectedValue(new Error('Pet gallery admin access denied'))
    const { petGalleryFileRouter } = await importUploadThingCore()

    await expect(petGalleryFileRouter.generatedImageVariant.middleware({})).rejects.toMatchObject({
      code: 'FORBIDDEN',
      message: 'Pet gallery admin access denied',
    })
  })

  it('attaches actor metadata for authorized upload attempts', async () => {
    const actor = {
      workosUserId: 'user_admin',
      workosOrgId: 'org_allowed',
      email: 'admin@example.test',
      name: 'Kilian Tyler',
      timestamp: 1770000000000,
    }
    requirePetGalleryAdminAuthContext.mockResolvedValue({ actor, accessToken: 'access-token' })
    const { petGalleryFileRouter } = await importUploadThingCore()

    await expect(petGalleryFileRouter.generatedImageVariant.middleware({})).resolves.toEqual({
      actor,
      accessToken: 'access-token',
    })
  })

  it('uses the shared UploadThing upload limits', async () => {
    const { petGalleryGeneratedImageVariantUploadConfig } = await importUploadThingCore()

    expect(PET_GALLERY_UPLOADTHING_MAX_FILE_COUNT).toBe(4)
    expect(PET_GALLERY_UPLOADTHING_MAX_FILE_SIZE).toBe('8MB')
    expect(petGalleryGeneratedImageVariantUploadConfig).toEqual({
      image: {
        maxFileCount: 4,
        maxFileSize: '8MB',
      },
    })
  })

  it('returns uploaded variant metadata with actor context', async () => {
    const actor = {
      workosUserId: 'user_admin',
      workosOrgId: 'org_allowed',
      email: 'admin@example.test',
      timestamp: 1770000000000,
    }
    const { petGalleryFileRouter } = await importUploadThingCore()

    await expect(
      petGalleryFileRouter.generatedImageVariant.onUploadComplete({
        metadata: { actor, accessToken: 'access-token' },
        file: {
          key: 'photo-a/card.webp',
          ufsUrl: 'https://utfs.io/f/photo-a/card.webp',
          name: 'card.webp',
          size: 12345,
          type: 'image/webp',
        },
      }),
    ).resolves.toEqual({
      actor,
      key: 'photo-a/card.webp',
      url: 'https://utfs.io/f/photo-a/card.webp',
      name: 'card.webp',
      size: 12345,
      mimeType: 'image/webp',
    })
    expect(ConvexHttpClient).toHaveBeenCalledWith('https://example.convex.cloud')
    expect(setAuth).toHaveBeenCalledWith('access-token')
    expect(mutation).toHaveBeenCalledWith(api.petGallery.recordPendingVariantUpload, {
      key: 'photo-a/card.webp',
      url: 'https://utfs.io/f/photo-a/card.webp',
      name: 'card.webp',
      size: 12345,
      mimeType: 'image/webp',
    })
  })

  it('deletes the uploaded file when Convex registration fails', async () => {
    const actor = {
      workosUserId: 'user_admin',
      workosOrgId: 'org_allowed',
      email: 'admin@example.test',
      timestamp: 1770000000000,
    }
    mutation.mockRejectedValueOnce(new Error('Convex unavailable'))
    deleteFiles.mockResolvedValueOnce({ success: true, deletedCount: 1 })
    const { petGalleryFileRouter } = await importUploadThingCore()

    await expect(
      petGalleryFileRouter.generatedImageVariant.onUploadComplete({
        metadata: { actor, accessToken: 'access-token' },
        file: {
          key: 'photo-a/card.webp',
          ufsUrl: 'https://utfs.io/f/photo-a/card.webp',
          name: 'card.webp',
          size: 12345,
          type: 'image/webp',
        },
      }),
    ).rejects.toThrow('Convex unavailable')
    expect(UTApi).toHaveBeenCalledWith({ token: 'uploadthing-token-valid-value' })
    expect(deleteFiles).toHaveBeenCalledWith(['photo-a/card.webp'])
  })

  it('surfaces cleanup failures when Convex registration fails after UploadThing stored the file', async () => {
    const actor = {
      workosUserId: 'user_admin',
      workosOrgId: 'org_allowed',
      email: 'admin@example.test',
      timestamp: 1770000000000,
    }
    mutation.mockRejectedValueOnce(new Error('Convex unavailable'))
    deleteFiles.mockRejectedValueOnce(new Error('UploadThing delete failed'))
    const { petGalleryFileRouter } = await importUploadThingCore()

    await expect(
      petGalleryFileRouter.generatedImageVariant.onUploadComplete({
        metadata: { actor, accessToken: 'access-token' },
        file: {
          key: 'photo-a/card.webp',
          ufsUrl: 'https://utfs.io/f/photo-a/card.webp',
          name: 'card.webp',
          size: 12345,
          type: 'image/webp',
        },
      }),
    ).rejects.toThrow('Convex unavailable; uploaded file photo-a/card.webp cleanup failed: UploadThing delete failed')
  })
})
