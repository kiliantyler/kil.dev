import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../../../convex/_generated/api'
const createPetGalleryConvexServerClient = vi.fn()
const revalidatePath = vi.fn()
const revalidateTag = vi.fn()
const deleteFiles = vi.fn()
const getFileUrls = vi.fn()
const UTApi = vi.fn(function UTApi() {
  return { deleteFiles, getFileUrls }
})

vi.mock('@/lib/pet-gallery/convex-server-client', () => ({
  createPetGalleryConvexServerClient,
}))

vi.mock('next/cache', () => ({
  revalidatePath,
  revalidateTag,
}))

vi.mock('uploadthing/server', () => ({
  UTApi,
}))

const BASE_ENV = {
  NODE_ENV: 'test',
  NEXT_PUBLIC_POSTHOG_KEY: 'test-posthog-key',
  NEXT_PUBLIC_POSTHOG_HOST: 'https://example.test',
  NEXT_PUBLIC_CONVEX_URL: 'https://example.convex.cloud',
  CONVEX_DEPLOYMENT: '',
  WORKOS_API_KEY: 'sk_test_valid_test_value',
  WORKOS_CLIENT_ID: 'client_test_valid_value',
  WORKOS_COOKIE_PASSWORD: 'a'.repeat(32),
  NEXT_PUBLIC_WORKOS_REDIRECT_URI: 'http://localhost:3000/auth/callback',
  WORKOS_ORG_ID: 'org_allowed',
  ADMIN_EMAIL: 'admin@example.test',
  UPLOADTHING_TOKEN: 'uploadthing-token-valid-value',
}

function createConvexMock() {
  return {
    mutation: vi.fn(),
    query: vi.fn().mockResolvedValue({
      animals: [
        {
          _id: 'animals:1',
          _creationTime: 1,
          stableId: 'sunny',
          name: 'Sunny',
          color: '#123456',
          sortOrder: 1,
          hidden: false,
          createdAt: 1,
          updatedAt: 1,
        },
      ],
      photos: [
        {
          _id: 'photos:1',
          _creationTime: 1,
          stableId: 'photo-sunny',
          sourceHash: 'hash-sunny',
          variants: {
            thumb: {
              kind: 'thumb',
              url: 'https://utfs.example/thumb.webp',
              key: 'thumb-key',
              width: 320,
              height: 240,
              byteSize: 10,
              mimeType: 'image/webp',
              extension: 'webp',
            },
            card: {
              kind: 'card',
              url: 'https://utfs.example/card.webp',
              key: 'card-key',
              width: 768,
              height: 576,
              byteSize: 20,
              mimeType: 'image/webp',
              extension: 'webp',
            },
            display: {
              kind: 'display',
              url: 'https://utfs.example/display.webp',
              key: 'display-key',
              width: 1200,
              height: 900,
              byteSize: 30,
              mimeType: 'image/webp',
              extension: 'webp',
            },
            full: {
              kind: 'full',
              url: 'https://utfs.example/full.webp',
              key: 'full-key',
              width: 1600,
              height: 1200,
              byteSize: 40,
              mimeType: 'image/webp',
              extension: 'webp',
            },
          },
          animalIds: ['animals:1'],
          draftVisible: true,
          draftOrder: 1,
          favorite: false,
          cover: false,
          createdAt: 1,
          updatedAt: 1,
        },
      ],
      draft: null,
      publishHistory: [],
    }),
  }
}

async function importActions() {
  vi.resetModules()
  return import('./actions')
}

describe('pet gallery admin actions', () => {
  beforeEach(() => {
    for (const [key, value] of Object.entries(BASE_ENV)) {
      vi.stubEnv(key, value)
    }
    getFileUrls.mockImplementation(async (keys: string[]) => ({
      data: keys.map(key => ({ key, url: `https://utfs.io/f/${key}` })),
    }))
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it('publishes through the authenticated Convex client and revalidates the public gallery', async () => {
    const convex = createConvexMock()
    const summary = { revision: 'rev-1', publishedAt: 1, photoCount: 2, animalCount: 1 }
    convex.mutation.mockResolvedValue(summary)
    createPetGalleryConvexServerClient.mockResolvedValue(convex)
    const { publishPetGalleryAction } = await importActions()

    await expect(publishPetGalleryAction()).resolves.toMatchObject({ summary })
    expect(convex.mutation).toHaveBeenCalledWith(api.petGallery.publishDraft, { requireExistingSnapshot: true })
    expect(convex.query).toHaveBeenCalledWith(api.petGallery.getAdminState, {})
    expect(revalidateTag).toHaveBeenCalledWith('pet-gallery', 'max')
    expect(revalidatePath).toHaveBeenCalledWith('/pet-gallery')
  })

  it('allows the first admin publish against a Convex dev deployment', async () => {
    vi.stubEnv('CONVEX_DEPLOYMENT', 'dev:fast-alpaca-175')
    const convex = createConvexMock()
    const summary = { revision: 'rev-dev-1', publishedAt: 1, photoCount: 2, animalCount: 1 }
    convex.mutation.mockResolvedValue(summary)
    createPetGalleryConvexServerClient.mockResolvedValue(convex)
    const { publishPetGalleryAction } = await importActions()

    await expect(publishPetGalleryAction()).resolves.toMatchObject({ summary })
    expect(convex.mutation).toHaveBeenCalledWith(api.petGallery.publishDraft, { requireExistingSnapshot: false })
  })

  it('creates photo draft metadata after UploadThing variants are uploaded', async () => {
    const convex = createConvexMock()
    convex.mutation.mockResolvedValue('photos:1')
    createPetGalleryConvexServerClient.mockResolvedValue(convex)
    const { createPetGalleryPhotoDraftAction } = await importActions()
    const variants = {
      thumb: {
        kind: 'thumb',
        url: 'https://utfs.example/thumb.webp',
        key: 'thumb-key',
        width: 320,
        height: 240,
        byteSize: 10,
        mimeType: 'image/webp',
        extension: 'webp',
      },
      card: {
        kind: 'card',
        url: 'https://utfs.example/card.webp',
        key: 'card-key',
        width: 768,
        height: 576,
        byteSize: 20,
        mimeType: 'image/webp',
        extension: 'webp',
      },
      display: {
        kind: 'display',
        url: 'https://utfs.example/display.webp',
        key: 'display-key',
        width: 1200,
        height: 900,
        byteSize: 30,
        mimeType: 'image/webp',
        extension: 'webp',
      },
      full: {
        kind: 'full',
        url: 'https://utfs.example/full.webp',
        key: 'full-key',
        width: 1600,
        height: 1200,
        byteSize: 40,
        mimeType: 'image/webp',
        extension: 'webp',
      },
    } as const

    await expect(
      createPetGalleryPhotoDraftAction({
        stableId: 'drop-cat',
        sourceHash: 'sha256-source',
        filename: 'drop-cat.png',
        variants,
        animalIds: [],
        draftOrder: 4,
      }),
    ).resolves.toEqual({
      photoId: 'photos:1',
      state: expect.objectContaining({
        mode: 'convex',
        photos: expect.arrayContaining([expect.objectContaining({ docId: 'photos:1' })]),
      }),
    })

    expect(convex.mutation).toHaveBeenCalledWith(api.petGallery.createPhotoDraft, {
      stableId: 'drop-cat',
      sourceHash: 'sha256-source',
      title: 'drop-cat.png',
      caption: 'drop-cat.png',
      altText: 'drop-cat.png',
      internalNotes: undefined,
      variants,
      animalIds: [],
      draftVisible: true,
      draftOrder: 4,
      favorite: false,
      cover: false,
      approximateDate: undefined,
    })
  })

  it('only cleans up uploaded variants that Convex marked as pending for this admin', async () => {
    const convex = createConvexMock()
    convex.mutation.mockResolvedValueOnce({ variantKeys: ['thumb-key', 'full-key'] }).mockResolvedValueOnce(null)
    createPetGalleryConvexServerClient.mockResolvedValue(convex)
    deleteFiles.mockResolvedValue({ success: true, deletedCount: 2 })
    const { cleanupUploadedPetGalleryVariantFilesAction } = await importActions()

    await expect(cleanupUploadedPetGalleryVariantFilesAction(['thumb-key', 'full-key'])).resolves.toEqual({
      ok: true,
      deletedCount: 2,
      variantKeys: ['thumb-key', 'full-key'],
    })
    expect(convex.mutation).toHaveBeenNthCalledWith(1, api.petGallery.beginUploadedVariantCleanup, {
      variantKeys: ['thumb-key', 'full-key'],
    })
    expect(UTApi).toHaveBeenCalledWith({ token: 'uploadthing-token-valid-value' })
    expect(deleteFiles).toHaveBeenCalledWith(['thumb-key', 'full-key'])
    expect(convex.mutation).toHaveBeenNthCalledWith(2, api.petGallery.recordUploadedVariantCleanupResult, {
      variantKeys: ['thumb-key', 'full-key'],
      ok: true,
      error: undefined,
    })
  })

  it('returns uploaded variant cleanup errors for partial UploadThing deletes', async () => {
    const convex = createConvexMock()
    convex.mutation.mockResolvedValueOnce({ variantKeys: ['thumb-key', 'full-key'] }).mockResolvedValueOnce(null)
    createPetGalleryConvexServerClient.mockResolvedValue(convex)
    deleteFiles.mockResolvedValue({ success: false, deletedCount: 1 })
    const { cleanupUploadedPetGalleryVariantFilesAction } = await importActions()

    await expect(cleanupUploadedPetGalleryVariantFilesAction(['thumb-key', 'full-key'])).resolves.toEqual({
      ok: false,
      deletedCount: 1,
      variantKeys: ['thumb-key', 'full-key'],
      error: 'UploadThing deleted 1 of 2 files',
    })
    expect(convex.mutation).toHaveBeenLastCalledWith(api.petGallery.recordUploadedVariantCleanupResult, {
      variantKeys: ['thumb-key', 'full-key'],
      ok: false,
      error: 'UploadThing deleted 1 of 2 files',
    })
  })

  it('returns uploaded variant cleanup errors when UploadThing reports success with a partial delete count', async () => {
    const convex = createConvexMock()
    convex.mutation.mockResolvedValueOnce({ variantKeys: ['thumb-key', 'full-key'] }).mockResolvedValueOnce(null)
    createPetGalleryConvexServerClient.mockResolvedValue(convex)
    deleteFiles.mockResolvedValue({ success: true, deletedCount: 1 })
    const { cleanupUploadedPetGalleryVariantFilesAction } = await importActions()

    await expect(cleanupUploadedPetGalleryVariantFilesAction(['thumb-key', 'full-key'])).resolves.toEqual({
      ok: false,
      deletedCount: 1,
      variantKeys: ['thumb-key', 'full-key'],
      error: 'UploadThing deleted 1 of 2 files',
    })
    expect(convex.mutation).toHaveBeenLastCalledWith(api.petGallery.recordUploadedVariantCleanupResult, {
      variantKeys: ['thumb-key', 'full-key'],
      ok: false,
      error: 'UploadThing deleted 1 of 2 files',
    })
  })

  it('does not delete UploadThing files when Convex rejects uploaded variant cleanup', async () => {
    const convex = createConvexMock()
    convex.mutation.mockRejectedValue(
      new Error('Pet gallery upload cleanup can only delete pending uploaded variant files'),
    )
    createPetGalleryConvexServerClient.mockResolvedValue(convex)
    const { cleanupUploadedPetGalleryVariantFilesAction } = await importActions()

    await expect(cleanupUploadedPetGalleryVariantFilesAction(['thumb-key'])).rejects.toThrow(
      'Pet gallery upload cleanup can only delete pending uploaded variant files',
    )
    expect(UTApi).toHaveBeenCalledWith({ token: 'uploadthing-token-valid-value' })
    expect(deleteFiles).not.toHaveBeenCalled()
  })

  it('validates UploadThing config before marking uploaded variant files cleanup-pending', async () => {
    vi.stubEnv('UPLOADTHING_TOKEN', '')
    const convex = createConvexMock()
    createPetGalleryConvexServerClient.mockResolvedValue(convex)
    const { cleanupUploadedPetGalleryVariantFilesAction } = await importActions()

    await expect(cleanupUploadedPetGalleryVariantFilesAction(['thumb-key'])).rejects.toThrow(
      'Missing pet gallery admin environment variables: UPLOADTHING_TOKEN',
    )
    expect(convex.mutation).not.toHaveBeenCalledWith(api.petGallery.beginUploadedVariantCleanup, expect.anything())
    expect(deleteFiles).not.toHaveBeenCalled()
  })

  it('calls production server actions for non-bypass upload cleanup paths', async () => {
    const convex = createConvexMock()
    convex.mutation.mockResolvedValueOnce({ variantKeys: ['thumb-key'] }).mockResolvedValueOnce(null)
    createPetGalleryConvexServerClient.mockResolvedValue(convex)
    deleteFiles.mockResolvedValue({ success: true, deletedCount: 1 })
    const { cleanupUploadedPetGalleryVariantFilesAction } = await importActions()

    await expect(cleanupUploadedPetGalleryVariantFilesAction(['thumb-key'])).resolves.toMatchObject({
      ok: true,
      deletedCount: 1,
      variantKeys: ['thumb-key'],
    })
    expect(convex.mutation).toHaveBeenNthCalledWith(1, api.petGallery.beginUploadedVariantCleanup, {
      variantKeys: ['thumb-key'],
    })
    expect(deleteFiles).toHaveBeenCalledWith(['thumb-key'])
  })

  it('does not publish or revalidate when the Convex auth token is unavailable', async () => {
    createPetGalleryConvexServerClient.mockRejectedValue(new Error('missing access token'))
    const { publishPetGalleryAction } = await importActions()

    await expect(publishPetGalleryAction()).rejects.toThrow('missing access token')
    expect(revalidateTag).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('returns the publish summary when public gallery revalidation fails after publishing', async () => {
    const convex = createConvexMock()
    const summary = { revision: 'rev-1', publishedAt: 1, photoCount: 2, animalCount: 1 }
    convex.mutation.mockResolvedValue(summary)
    createPetGalleryConvexServerClient.mockResolvedValue(convex)
    revalidatePath.mockImplementationOnce(() => {
      throw new Error('path cache unavailable')
    })
    const { publishPetGalleryAction } = await importActions()

    await expect(publishPetGalleryAction()).resolves.toMatchObject({
      summary: {
        ...summary,
        revalidationError: 'path cache unavailable',
      },
    })
    expect(convex.mutation).toHaveBeenCalledWith(api.petGallery.publishDraft, { requireExistingSnapshot: true })
    expect(revalidateTag).toHaveBeenCalledWith('pet-gallery', 'max')
    expect(revalidatePath).toHaveBeenCalledWith('/pet-gallery')
  })

  it('returns the created photo id even if refreshing workspace state fails after draft creation', async () => {
    const convex = createConvexMock()
    convex.mutation.mockResolvedValue('photos:1')
    convex.query.mockRejectedValue(new Error('refresh failed'))
    createPetGalleryConvexServerClient.mockResolvedValue(convex)
    const { createPetGalleryPhotoDraftAction } = await importActions()

    await expect(
      createPetGalleryPhotoDraftAction({
        stableId: 'drop-cat',
        sourceHash: 'sha256-source',
        filename: 'drop-cat.png',
        variants: {
          thumb: {
            kind: 'thumb',
            url: 'https://utfs.example/thumb.webp',
            key: 'thumb-key',
            width: 320,
            height: 240,
            byteSize: 10,
            mimeType: 'image/webp',
            extension: 'webp',
          },
          card: {
            kind: 'card',
            url: 'https://utfs.example/card.webp',
            key: 'card-key',
            width: 768,
            height: 576,
            byteSize: 20,
            mimeType: 'image/webp',
            extension: 'webp',
          },
          display: {
            kind: 'display',
            url: 'https://utfs.example/display.webp',
            key: 'display-key',
            width: 1200,
            height: 900,
            byteSize: 30,
            mimeType: 'image/webp',
            extension: 'webp',
          },
          full: {
            kind: 'full',
            url: 'https://utfs.example/full.webp',
            key: 'full-key',
            width: 1600,
            height: 1200,
            byteSize: 40,
            mimeType: 'image/webp',
            extension: 'webp',
          },
        },
        animalIds: [],
        draftOrder: 4,
      }),
    ).resolves.toEqual({ photoId: 'photos:1', state: undefined })
  })

  it('wraps edit, tag, and order mutations with authenticated Convex refreshes', async () => {
    const convex = createConvexMock()
    convex.mutation.mockResolvedValue(null)
    createPetGalleryConvexServerClient.mockResolvedValue(convex)
    const {
      bulkTagPetGalleryPhotosAction,
      reorderPetGalleryAnimalsAction,
      reorderPetGalleryPhotosAction,
      restorePetGalleryAnimalAction,
      hidePetGalleryAnimalAction,
      updatePetGalleryAnimalAction,
      updatePetGalleryPhotoDraftAction,
    } = await importActions()

    await updatePetGalleryAnimalAction('animals:1', {
      name: 'Sunny',
      species: 'cat',
      color: '#123456',
      order: 2,
    })
    await hidePetGalleryAnimalAction('animals:1')
    await restorePetGalleryAnimalAction('animals:1')
    await reorderPetGalleryAnimalsAction(['sunny'])
    await updatePetGalleryPhotoDraftAction('photos:1', {
      title: 'Updated title',
      caption: 'Updated',
      altText: 'Updated alt',
      internalNotes: 'private',
      animalIds: ['sunny'],
      draftVisible: false,
      favorite: true,
      cover: false,
      approximateDate: { year: 2026, month: 5 },
    })
    await bulkTagPetGalleryPhotosAction(['photos:1'], ['animals:1'], 'add')
    await reorderPetGalleryPhotosAction(['photos:1', 'photos:2'])

    expect(convex.mutation).toHaveBeenCalledWith(api.petGallery.updateAnimal, {
      animalId: 'animals:1',
      name: 'Sunny',
      species: 'cat',
      color: '#123456',
      sortOrder: 2,
    })
    expect(convex.mutation).toHaveBeenCalledWith(api.petGallery.hideAnimal, {
      animalId: 'animals:1',
    })
    expect(convex.mutation).toHaveBeenCalledWith(api.petGallery.restoreAnimal, {
      animalId: 'animals:1',
    })
    expect(convex.mutation).toHaveBeenCalledWith(api.petGallery.updateAnimal, {
      animalId: 'animals:1',
      name: 'Sunny',
      species: undefined,
      color: '#123456',
      sortOrder: 1,
    })
    expect(convex.mutation).toHaveBeenCalledWith(api.petGallery.updatePhotoDraft, {
      photoId: 'photos:1',
      title: 'Updated title',
      caption: 'Updated',
      altText: 'Updated alt',
      internalNotes: 'private',
      animalIds: ['animals:1'],
      draftVisible: false,
      favorite: true,
      cover: false,
      approximateDate: { year: 2026, month: 5 },
    })
    expect(convex.mutation).toHaveBeenCalledWith(api.petGallery.bulkTagPhotos, {
      photoIds: ['photos:1'],
      animalIds: ['animals:1'],
      mode: 'add',
    })
    expect(convex.mutation).toHaveBeenCalledWith(api.petGallery.reorderPhotos, {
      photoIds: ['photos:1', 'photos:2'],
    })
    expect(convex.query).toHaveBeenCalledWith(api.petGallery.getAdminState, {})
  })

  it('hard-deletes metadata, deletes UploadThing files, records success, and revalidates', async () => {
    const convex = createConvexMock()
    convex.mutation
      .mockResolvedValueOnce({ cleanupId: 'cleanup:1', variantKeys: ['thumb-key', 'full-key'] })
      .mockResolvedValueOnce(null)
    createPetGalleryConvexServerClient.mockResolvedValue(convex)
    deleteFiles.mockResolvedValue({ success: true, deletedCount: 2 })
    const { deletePetGalleryPhotoAction } = await importActions()

    await expect(deletePetGalleryPhotoAction('photos:1')).resolves.toMatchObject({
      cleanupId: 'cleanup:1',
      variantKeys: ['thumb-key', 'full-key'],
      ok: true,
      deletedCount: 2,
    })
    expect(UTApi).toHaveBeenCalledWith({ token: 'uploadthing-token-valid-value' })
    expect(deleteFiles).toHaveBeenCalledWith(['thumb-key', 'full-key'])
    expect(convex.mutation).toHaveBeenNthCalledWith(1, api.petGallery.beginPhotoHardDelete, {
      photoId: 'photos:1',
    })
    expect(convex.mutation).toHaveBeenLastCalledWith(api.petGallery.recordPhotoFileCleanupResult, {
      cleanupId: 'cleanup:1',
      ok: true,
      error: undefined,
    })
    expect(revalidateTag).toHaveBeenCalledWith('pet-gallery', 'max')
    expect(revalidatePath).toHaveBeenCalledWith('/pet-gallery')
  })

  it('records a failed cleanup when UploadThing only deletes part of the requested keys', async () => {
    const convex = createConvexMock()
    convex.mutation
      .mockResolvedValueOnce({ cleanupId: 'cleanup:1', variantKeys: ['thumb-key', 'full-key'] })
      .mockResolvedValueOnce(null)
    createPetGalleryConvexServerClient.mockResolvedValue(convex)
    deleteFiles.mockResolvedValue({ success: false, deletedCount: 1 })
    const { deletePetGalleryPhotoAction } = await importActions()

    await expect(deletePetGalleryPhotoAction('photos:1')).resolves.toMatchObject({
      cleanupId: 'cleanup:1',
      variantKeys: ['thumb-key', 'full-key'],
      ok: false,
      deletedCount: 1,
      error: 'UploadThing deleted 1 of 2 files',
    })
    expect(convex.mutation).toHaveBeenLastCalledWith(api.petGallery.recordPhotoFileCleanupResult, {
      cleanupId: 'cleanup:1',
      ok: false,
      error: 'UploadThing deleted 1 of 2 files',
      remainingVariantKeys: ['thumb-key', 'full-key'],
    })
  })

  it('records a failed cleanup when UploadThing reports success with a partial delete count', async () => {
    const convex = createConvexMock()
    convex.mutation
      .mockResolvedValueOnce({ cleanupId: 'cleanup:1', variantKeys: ['thumb-key', 'full-key'] })
      .mockResolvedValueOnce(null)
    createPetGalleryConvexServerClient.mockResolvedValue(convex)
    deleteFiles.mockResolvedValue({ success: true, deletedCount: 1 })
    const { deletePetGalleryPhotoAction } = await importActions()

    await expect(deletePetGalleryPhotoAction('photos:1')).resolves.toMatchObject({
      cleanupId: 'cleanup:1',
      variantKeys: ['thumb-key', 'full-key'],
      ok: false,
      deletedCount: 1,
      error: 'UploadThing deleted 1 of 2 files',
    })
    expect(convex.mutation).toHaveBeenLastCalledWith(api.petGallery.recordPhotoFileCleanupResult, {
      cleanupId: 'cleanup:1',
      ok: false,
      error: 'UploadThing deleted 1 of 2 files',
      remainingVariantKeys: ['thumb-key', 'full-key'],
    })
  })

  it('marks partial cleanup complete when UploadThing no longer lists the requested keys', async () => {
    const convex = createConvexMock()
    convex.mutation
      .mockResolvedValueOnce({ cleanupId: 'cleanup:1', variantKeys: ['thumb-key', 'full-key'] })
      .mockResolvedValueOnce(null)
    createPetGalleryConvexServerClient.mockResolvedValue(convex)
    deleteFiles.mockResolvedValue({ success: true, deletedCount: 1 })
    getFileUrls.mockResolvedValueOnce({ data: [] })
    const { deletePetGalleryPhotoAction } = await importActions()

    await expect(deletePetGalleryPhotoAction('photos:1')).resolves.toMatchObject({
      cleanupId: 'cleanup:1',
      variantKeys: ['thumb-key', 'full-key'],
      ok: true,
      deletedCount: 1,
    })
    expect(convex.mutation).toHaveBeenLastCalledWith(api.petGallery.recordPhotoFileCleanupResult, {
      cleanupId: 'cleanup:1',
      ok: true,
      error: undefined,
      remainingVariantKeys: undefined,
    })
  })

  it('shrinks failed cleanup tombstones to only keys still listed by UploadThing', async () => {
    const convex = createConvexMock()
    convex.query.mockResolvedValue([{ _id: 'cleanup:1', variantKeys: ['one', 'two'] }])
    convex.mutation.mockResolvedValue(null)
    createPetGalleryConvexServerClient.mockResolvedValue(convex)
    deleteFiles.mockResolvedValue({ success: true, deletedCount: 1 })
    getFileUrls.mockResolvedValueOnce({ data: [{ key: 'two', url: 'https://utfs.io/f/two' }] })
    const { cleanupUploadThingFilesAction } = await importActions()

    await expect(cleanupUploadThingFilesAction()).resolves.toMatchObject({
      checked: 1,
      complete: 0,
      failed: 1,
      results: [
        {
          cleanupId: 'cleanup:1',
          variantKeys: ['two'],
          ok: false,
          deletedCount: 1,
          error: 'UploadThing deleted 1 of 2 files',
        },
      ],
    })
    expect(convex.mutation).toHaveBeenLastCalledWith(api.petGallery.recordPhotoFileCleanupResult, {
      cleanupId: 'cleanup:1',
      ok: false,
      error: 'UploadThing deleted 1 of 2 files',
      remainingVariantKeys: ['two'],
    })
  })

  it('records a failed cleanup when UploadThing deletion throws after metadata removal', async () => {
    const convex = createConvexMock()
    convex.mutation
      .mockResolvedValueOnce({ cleanupId: 'cleanup:1', variantKeys: ['thumb-key'] })
      .mockResolvedValueOnce(null)
    createPetGalleryConvexServerClient.mockResolvedValue(convex)
    deleteFiles.mockRejectedValue(new Error('network failed'))
    const { deletePetGalleryPhotoAction } = await importActions()

    await expect(deletePetGalleryPhotoAction('photos:1')).resolves.toMatchObject({
      cleanupId: 'cleanup:1',
      variantKeys: ['thumb-key'],
      ok: false,
      deletedCount: 0,
      error: 'network failed',
    })
    expect(convex.mutation).toHaveBeenLastCalledWith(api.petGallery.recordPhotoFileCleanupResult, {
      cleanupId: 'cleanup:1',
      ok: false,
      error: 'network failed',
    })
  })

  it('revalidates the public gallery when cleanup result recording fails after metadata removal', async () => {
    const convex = createConvexMock()
    convex.mutation
      .mockResolvedValueOnce({ cleanupId: 'cleanup:1', variantKeys: ['thumb-key'] })
      .mockRejectedValueOnce(new Error('convex cleanup write failed'))
    createPetGalleryConvexServerClient.mockResolvedValue(convex)
    deleteFiles.mockResolvedValue({ success: true, deletedCount: 1 })
    const { deletePetGalleryPhotoAction } = await importActions()

    await expect(deletePetGalleryPhotoAction('photos:1')).resolves.toMatchObject({
      cleanupId: 'cleanup:1',
      variantKeys: ['thumb-key'],
      ok: false,
      deletedCount: 1,
      error: 'convex cleanup write failed',
      state: expect.objectContaining({ mode: 'convex' }),
    })
    expect(convex.mutation).toHaveBeenLastCalledWith(api.petGallery.recordPhotoFileCleanupResult, {
      cleanupId: 'cleanup:1',
      ok: true,
      error: undefined,
    })
    expect(revalidateTag).toHaveBeenCalledWith('pet-gallery', 'max')
    expect(revalidatePath).toHaveBeenCalledWith('/pet-gallery')
  })

  it('keeps hard-deleted files pending when public gallery revalidation fails after metadata removal', async () => {
    const convex = createConvexMock()
    convex.mutation.mockResolvedValueOnce({ cleanupId: 'cleanup:1', variantKeys: ['thumb-key'] })
    createPetGalleryConvexServerClient.mockResolvedValue(convex)
    revalidatePath.mockImplementationOnce(() => {
      throw new Error('cache unavailable')
    })
    const { deletePetGalleryPhotoAction } = await importActions()

    await expect(deletePetGalleryPhotoAction('photos:1')).resolves.toMatchObject({
      cleanupId: 'cleanup:1',
      variantKeys: ['thumb-key'],
      ok: false,
      deletedCount: 0,
      error: 'Photo metadata was deleted, but file cleanup is waiting for public gallery revalidation.',
      revalidationError: 'cache unavailable',
    })
    expect(revalidatePath).toHaveBeenCalledWith('/pet-gallery')
    expect(deleteFiles).not.toHaveBeenCalled()
    expect(convex.mutation).toHaveBeenCalledTimes(1)
  })

  it('does not delete files or revalidate when the Convex auth token is unavailable for delete', async () => {
    createPetGalleryConvexServerClient.mockRejectedValue(new Error('missing access token'))
    const { deletePetGalleryPhotoAction } = await importActions()

    await expect(deletePetGalleryPhotoAction('photos:1')).rejects.toThrow('missing access token')
    expect(deleteFiles).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('validates UploadThing config before hard-deleting photo metadata', async () => {
    vi.stubEnv('UPLOADTHING_TOKEN', '')
    const convex = createConvexMock()
    createPetGalleryConvexServerClient.mockResolvedValue(convex)
    const { deletePetGalleryPhotoAction } = await importActions()

    await expect(deletePetGalleryPhotoAction('photos:1')).rejects.toThrow(
      'Missing pet gallery admin environment variables: UPLOADTHING_TOKEN',
    )
    expect(convex.mutation).not.toHaveBeenCalledWith(api.petGallery.beginPhotoHardDelete, expect.anything())
    expect(deleteFiles).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('marks empty cleanup key lists complete without calling UploadThing', async () => {
    const convex = createConvexMock()
    convex.mutation.mockResolvedValueOnce({ cleanupId: 'cleanup:1', variantKeys: [] }).mockResolvedValueOnce(null)
    createPetGalleryConvexServerClient.mockResolvedValue(convex)
    const { deletePetGalleryPhotoAction } = await importActions()

    await expect(deletePetGalleryPhotoAction('photos:1')).resolves.toMatchObject({
      cleanupId: 'cleanup:1',
      variantKeys: [],
      ok: true,
      deletedCount: 0,
    })
    expect(deleteFiles).not.toHaveBeenCalled()
    expect(convex.mutation).toHaveBeenLastCalledWith(api.petGallery.recordPhotoFileCleanupResult, {
      cleanupId: 'cleanup:1',
      ok: true,
      error: undefined,
    })
  })

  it('retries pending cleanup tombstones and reports a summary', async () => {
    const convex = createConvexMock()
    convex.query.mockResolvedValue([
      { _id: 'cleanup:1', variantKeys: ['one', 'two'] },
      { _id: 'cleanup:2', variantKeys: ['three'] },
    ])
    convex.mutation.mockResolvedValue(null)
    createPetGalleryConvexServerClient.mockResolvedValue(convex)
    deleteFiles.mockResolvedValueOnce({ success: true, deletedCount: 2 }).mockRejectedValueOnce(new Error('still down'))
    const { cleanupUploadThingFilesAction } = await importActions()

    await expect(cleanupUploadThingFilesAction()).resolves.toEqual({
      checked: 2,
      complete: 1,
      failed: 1,
      deletedCount: 2,
      results: [
        { cleanupId: 'cleanup:1', variantKeys: ['one', 'two'], ok: true, deletedCount: 2 },
        { cleanupId: 'cleanup:2', variantKeys: ['three'], ok: false, deletedCount: 0, error: 'still down' },
      ],
    })
    expect(convex.query).toHaveBeenCalledWith(api.petGallery.listPendingPhotoFileCleanups, {})
    expect(convex.mutation).toHaveBeenNthCalledWith(1, api.petGallery.recordPhotoFileCleanupResult, {
      cleanupId: 'cleanup:1',
      ok: true,
      error: undefined,
    })
    expect(convex.mutation).toHaveBeenNthCalledWith(2, api.petGallery.recordPhotoFileCleanupResult, {
      cleanupId: 'cleanup:2',
      ok: false,
      error: 'still down',
    })
  })

  it('does not retry pending cleanup tombstones until public gallery revalidation succeeds', async () => {
    const convex = createConvexMock()
    convex.query.mockResolvedValue([{ _id: 'cleanup:1', variantKeys: ['one', 'two'] }])
    createPetGalleryConvexServerClient.mockResolvedValue(convex)
    revalidatePath.mockImplementationOnce(() => {
      throw new Error('cache unavailable')
    })
    const { cleanupUploadThingFilesAction } = await importActions()

    await expect(cleanupUploadThingFilesAction()).resolves.toEqual({
      checked: 1,
      complete: 0,
      failed: 1,
      deletedCount: 0,
      revalidationError: 'cache unavailable',
      results: [
        {
          cleanupId: 'cleanup:1',
          variantKeys: ['one', 'two'],
          ok: false,
          deletedCount: 0,
          error: 'File cleanup is waiting for public gallery revalidation.',
          revalidationError: 'cache unavailable',
        },
      ],
    })
    expect(deleteFiles).not.toHaveBeenCalled()
    expect(convex.mutation).not.toHaveBeenCalledWith(api.petGallery.recordPhotoFileCleanupResult, expect.anything())
  })
})
