import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPetGalleryHarness, petGalleryVariants } from '../../tests/convex/petGalleryHarness'
import {
  beginPhotoHardDeleteHandler,
  beginUploadedVariantCleanupHandler,
  bulkTagPhotosHandler,
  createAnimalHandler,
  createPhotoDraftHandler,
  getAdminStateHandler,
  getPublicSnapshotHandler,
  hideAnimalHandler,
  listPendingPhotoFileCleanupsHandler,
  publishDraftHandler,
  recordPendingVariantUploadHandler,
  recordPhotoFileCleanupResultHandler,
  recordUploadedVariantCleanupResultHandler,
  reorderPhotosHandler,
  restoreAnimalHandler,
  updateAnimalHandler,
  updatePhotoDraftHandler,
} from '../petGallery'

async function createUploadedPhotoDraft(
  harness: ReturnType<typeof createPetGalleryHarness>,
  input: Parameters<typeof createPhotoDraftHandler>[1],
) {
  for (const variant of Object.values(input.variants)) {
    await recordPendingVariantUploadHandler(harness.ctx, {
      key: variant.key,
      url: variant.url,
      name: `${input.stableId}-${variant.kind}.${variant.extension}`,
      size: variant.byteSize,
      mimeType: variant.mimeType,
    })
  }

  return createPhotoDraftHandler(harness.ctx, input)
}

describe('pet gallery Convex admin API', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('rejects unauthenticated and mismatched admin identities', async () => {
    vi.stubEnv('ADMIN_EMAIL', 'admin@example.com')
    vi.stubEnv('WORKOS_ORG_ID', 'org_good')

    await expect(getAdminStateHandler(createPetGalleryHarness({ auth: 'unauth' }).ctx, {})).rejects.toThrow(
      'Pet gallery admin access denied',
    )
    await expect(getAdminStateHandler(createPetGalleryHarness({ auth: 'wrongEmail' }).ctx, {})).rejects.toThrow(
      'Pet gallery admin access denied',
    )
    await expect(getAdminStateHandler(createPetGalleryHarness({ auth: 'wrongOrg' }).ctx, {})).rejects.toThrow(
      'Pet gallery admin access denied',
    )
    await expect(getAdminStateHandler(createPetGalleryHarness({ auth: 'nestedAllowedOrg' }).ctx, {})).rejects.toThrow(
      'Pet gallery admin access denied',
    )
  })

  it('rejects unauthenticated and mismatched admin identities for admin write and cleanup handlers', async () => {
    vi.stubEnv('ADMIN_EMAIL', 'admin@example.com')
    vi.stubEnv('WORKOS_ORG_ID', 'org_good')

    const adminHandlers = [
      {
        name: 'createAnimal',
        handler: createAnimalHandler,
        args: { stableId: 'fern', name: 'Fern', color: '#88aa66', sortOrder: 1 },
      },
      {
        name: 'updateAnimal',
        handler: updateAnimalHandler,
        args: { animalId: 'animals:fern', name: 'Fern', color: '#88aa66', sortOrder: 1 },
      },
      { name: 'hideAnimal', handler: hideAnimalHandler, args: { animalId: 'animals:fern' } },
      { name: 'restoreAnimal', handler: restoreAnimalHandler, args: { animalId: 'animals:fern' } },
      {
        name: 'createPhotoDraft',
        handler: createPhotoDraftHandler,
        args: {
          stableId: 'photo-a',
          sourceHash: 'hash-a',
          variants: petGalleryVariants('photo-a'),
          animalIds: [],
          draftVisible: true,
          draftOrder: 1,
          favorite: false,
          cover: false,
        },
      },
      {
        name: 'recordPendingVariantUpload',
        handler: recordPendingVariantUploadHandler,
        args: {
          key: 'photo-a/card.webp',
          url: 'https://utfs.io/f/photo-a/card.webp',
          name: 'card.webp',
          size: 1,
          mimeType: 'image/webp',
        },
      },
      {
        name: 'beginUploadedVariantCleanup',
        handler: beginUploadedVariantCleanupHandler,
        args: { variantKeys: ['photo-a/card.webp'] },
      },
      {
        name: 'recordUploadedVariantCleanupResult',
        handler: recordUploadedVariantCleanupResultHandler,
        args: { variantKeys: ['photo-a/card.webp'], ok: false, error: 'failed' },
      },
      { name: 'updatePhotoDraft', handler: updatePhotoDraftHandler, args: { photoId: 'photos:a', caption: 'Updated' } },
      {
        name: 'bulkTagPhotos',
        handler: bulkTagPhotosHandler,
        args: { photoIds: ['photos:a'], animalIds: [], mode: 'add' as const },
      },
      { name: 'reorderPhotos', handler: reorderPhotosHandler, args: { photoIds: ['photos:a'] } },
      { name: 'publishDraft', handler: publishDraftHandler, args: {} },
      { name: 'beginPhotoHardDelete', handler: beginPhotoHardDeleteHandler, args: { photoId: 'photos:a' } },
      { name: 'listPendingPhotoFileCleanups', handler: listPendingPhotoFileCleanupsHandler, args: {} },
      {
        name: 'recordPhotoFileCleanupResult',
        handler: recordPhotoFileCleanupResultHandler,
        args: { cleanupId: 'cleanups:a', ok: false, error: 'failed' },
      },
    ]

    for (const auth of ['unauth', 'wrongEmail', 'wrongOrg'] as const) {
      for (const { name, handler, args } of adminHandlers) {
        await expect(handler(createPetGalleryHarness({ auth }).ctx, args as never), name).rejects.toThrow(
          'Pet gallery admin access denied',
        )
      }
    }
  })

  it('creates, edits, hides, and restores animals', async () => {
    const harness = createPetGalleryHarness()

    const animalId = await createAnimalHandler(harness.ctx, {
      stableId: 'fern',
      name: 'Fern',
      species: 'cat',
      color: '#88aa66',
      sortOrder: 20,
    })
    await updateAnimalHandler(harness.ctx, {
      animalId,
      name: 'Fernie',
      species: 'cat',
      color: '#557744',
      sortOrder: 10,
    })
    await hideAnimalHandler(harness.ctx, { animalId })
    await restoreAnimalHandler(harness.ctx, { animalId })
    await hideAnimalHandler(harness.ctx, { animalId })

    const state = await getAdminStateHandler(harness.ctx, {})
    expect(state.animals).toEqual([
      expect.objectContaining({
        _id: animalId,
        stableId: 'fern',
        name: 'Fernie',
        species: 'cat',
        color: '#557744',
        sortOrder: 10,
        hidden: true,
      }),
    ])
    await expect(harness.db.get(animalId)).resolves.toEqual(expect.not.objectContaining({ retired: expect.anything() }))
  })

  it('rejects animal species outside the shared pet gallery contract', async () => {
    const harness = createPetGalleryHarness()
    const animalId = await createAnimalHandler(harness.ctx, {
      stableId: 'fern',
      name: 'Fern',
      species: 'cat',
      color: '#88aa66',
      sortOrder: 1,
    })

    await expect(
      createAnimalHandler(harness.ctx, {
        stableId: 'moss',
        name: 'Moss',
        species: 'bird',
        color: '#557744',
        sortOrder: 2,
      } as unknown as Parameters<typeof createAnimalHandler>[1]),
    ).rejects.toThrow('Pet gallery animal species must be cat or dog')
    await expect(
      updateAnimalHandler(harness.ctx, {
        animalId,
        name: 'Fern',
        species: 'lizard',
        color: '#88aa66',
        sortOrder: 1,
      } as unknown as Parameters<typeof updateAnimalHandler>[1]),
    ).rejects.toThrow('Pet gallery animal species must be cat or dog')
  })

  it('rejects animal stable IDs reserved for admin filters', async () => {
    const harness = createPetGalleryHarness()

    for (const stableId of ['all', 'untagged', 'hidden']) {
      await expect(
        createAnimalHandler(harness.ctx, {
          stableId,
          name: `Reserved ${stableId}`,
          color: '#88aa66',
          sortOrder: 1,
        }),
      ).rejects.toThrow('Pet gallery animal stable ID is reserved')
    }
  })

  it('rejects duplicate animal names even when the caller proposes a different stable ID', async () => {
    const harness = createPetGalleryHarness()

    await createAnimalHandler(harness.ctx, {
      stableId: 'sunny',
      name: 'Sunny',
      color: '#88aa66',
      sortOrder: 1,
    })

    await expect(
      createAnimalHandler(harness.ctx, {
        stableId: 'sunny-2',
        name: ' sunny ',
        color: '#557744',
        sortOrder: 2,
      }),
    ).rejects.toThrow('Pet gallery animal name already exists')
  })

  it('rejects blank or duplicate animal names on update', async () => {
    const harness = createPetGalleryHarness()
    const sunnyId = await createAnimalHandler(harness.ctx, {
      stableId: 'sunny',
      name: 'Sunny',
      color: '#88aa66',
      sortOrder: 1,
    })
    const mochiId = await createAnimalHandler(harness.ctx, {
      stableId: 'mochi',
      name: 'Mochi',
      color: '#557744',
      sortOrder: 2,
    })

    await expect(
      updateAnimalHandler(harness.ctx, {
        animalId: sunnyId,
        name: ' ',
        color: '#88aa66',
        sortOrder: 1,
      }),
    ).rejects.toThrow('Pet gallery animal name is required')
    await expect(
      updateAnimalHandler(harness.ctx, {
        animalId: mochiId,
        name: ' sunny ',
        color: '#557744',
        sortOrder: 2,
      }),
    ).rejects.toThrow('Pet gallery animal name already exists')
  })

  it('creates and edits photo draft metadata, ordering, visibility, and rejects duplicate hashes', async () => {
    const harness = createPetGalleryHarness()
    const fernId = await createAnimalHandler(harness.ctx, {
      stableId: 'fern',
      name: 'Fern',
      color: '#88aa66',
      sortOrder: 1,
    })
    const mossId = await createAnimalHandler(harness.ctx, {
      stableId: 'moss',
      name: 'Moss',
      color: '#444444',
      sortOrder: 2,
    })

    const firstPhotoId = await createUploadedPhotoDraft(harness, {
      stableId: 'photo-a',
      sourceHash: 'hash-a',
      caption: 'First',
      internalNotes: 'private',
      variants: petGalleryVariants('photo-a'),
      animalIds: [fernId],
      draftVisible: false,
      draftOrder: 20,
      favorite: false,
      cover: false,
    })
    const secondPhotoId = await createUploadedPhotoDraft(harness, {
      stableId: 'photo-b',
      sourceHash: 'hash-b',
      variants: petGalleryVariants('photo-b'),
      animalIds: [mossId],
      draftVisible: true,
      draftOrder: 10,
      favorite: true,
      cover: true,
      approximateDate: { year: 2026, month: 5 },
    })

    await expect(
      createUploadedPhotoDraft(harness, {
        stableId: 'photo-c',
        sourceHash: 'hash-a',
        variants: petGalleryVariants('photo-c'),
        animalIds: [],
        draftVisible: true,
        draftOrder: 30,
        favorite: false,
        cover: false,
      }),
    ).rejects.toThrow('Pet gallery photo source hash already exists')

    await updatePhotoDraftHandler(harness.ctx, {
      photoId: firstPhotoId,
      caption: 'Visible first',
      internalNotes: 'still private',
      animalIds: [fernId, mossId],
      draftVisible: true,
      draftOrder: 30,
      favorite: true,
      cover: false,
      approximateDate: { year: 2025 },
    })
    await reorderPhotosHandler(harness.ctx, {
      photoIds: [firstPhotoId, secondPhotoId],
    })

    const state = await getAdminStateHandler(harness.ctx, {})
    expect(state.photos.filter(photo => photo.sourceHash === 'hash-a')).toHaveLength(1)
    expect(state.photos.map(photo => photo._id)).toEqual([firstPhotoId, secondPhotoId])
    expect(state.photos[0]).toEqual(
      expect.objectContaining({
        stableId: 'photo-a',
        caption: 'Visible first',
        internalNotes: 'still private',
        animalIds: [fernId, mossId],
        draftVisible: true,
        draftOrder: 0,
        favorite: true,
        cover: false,
        approximateDate: { year: 2025 },
      }),
    )

    await updatePhotoDraftHandler(harness.ctx, {
      photoId: firstPhotoId,
      approximateDate: { year: 3000, month: 13, day: 99 },
    })
    expect((await getAdminStateHandler(harness.ctx, {})).photos[0]?.approximateDate).toEqual({
      year: 2100,
      month: 12,
      day: 31,
    })

    await updatePhotoDraftHandler(harness.ctx, {
      photoId: firstPhotoId,
      caption: null,
      internalNotes: null,
      approximateDate: null,
    })
    const clearedPhoto = (await getAdminStateHandler(harness.ctx, {})).photos[0]
    expect(clearedPhoto).not.toHaveProperty('caption')
    expect(clearedPhoto).not.toHaveProperty('internalNotes')
    expect(clearedPhoto).not.toHaveProperty('approximateDate')
  })

  it('bulk tags photos by add, remove, and replace modes', async () => {
    const harness = createPetGalleryHarness()
    const fernId = await createAnimalHandler(harness.ctx, {
      stableId: 'fern',
      name: 'Fern',
      color: '#88aa66',
      sortOrder: 1,
    })
    const mossId = await createAnimalHandler(harness.ctx, {
      stableId: 'moss',
      name: 'Moss',
      color: '#444444',
      sortOrder: 2,
    })
    const rookId = await createAnimalHandler(harness.ctx, {
      stableId: 'rook',
      name: 'Rook',
      color: '#aa8844',
      sortOrder: 3,
    })
    const photoId = await createUploadedPhotoDraft(harness, {
      stableId: 'photo-a',
      sourceHash: 'hash-a',
      variants: petGalleryVariants('photo-a'),
      animalIds: [fernId],
      draftVisible: true,
      draftOrder: 1,
      favorite: false,
      cover: false,
    })
    const secondPhotoId = await createUploadedPhotoDraft(harness, {
      stableId: 'photo-b',
      sourceHash: 'hash-b',
      variants: petGalleryVariants('photo-b'),
      animalIds: [],
      draftVisible: true,
      draftOrder: 2,
      favorite: false,
      cover: false,
    })

    await bulkTagPhotosHandler(harness.ctx, {
      photoIds: [photoId, secondPhotoId],
      animalIds: [mossId, rookId],
      mode: 'add',
    })
    let photos = (await getAdminStateHandler(harness.ctx, {})).photos
    expect(photos[0]?.animalIds).toEqual([fernId, mossId, rookId])
    expect(photos[1]?.animalIds).toEqual([mossId, rookId])

    await bulkTagPhotosHandler(harness.ctx, {
      photoIds: [photoId, secondPhotoId],
      animalIds: [fernId, mossId],
      mode: 'remove',
    })
    photos = (await getAdminStateHandler(harness.ctx, {})).photos
    expect(photos[0]?.animalIds).toEqual([rookId])
    expect(photos[1]?.animalIds).toEqual([rookId])

    await bulkTagPhotosHandler(harness.ctx, {
      photoIds: [photoId, secondPhotoId],
      animalIds: [fernId, mossId],
      mode: 'replace',
    })
    photos = (await getAdminStateHandler(harness.ctx, {})).photos
    expect(photos[0]?.animalIds).toEqual([fernId, mossId])
    expect(photos[1]?.animalIds).toEqual([fernId, mossId])
  })

  it('rejects hidden animals as bulk tagging targets', async () => {
    const harness = createPetGalleryHarness()
    const fernId = await createAnimalHandler(harness.ctx, {
      stableId: 'fern',
      name: 'Fern',
      color: '#88aa66',
      sortOrder: 1,
    })
    const hiddenAnimalId = await createAnimalHandler(harness.ctx, {
      stableId: 'moss',
      name: 'Moss',
      color: '#444444',
      sortOrder: 2,
    })
    const photoId = await createUploadedPhotoDraft(harness, {
      stableId: 'photo-a',
      sourceHash: 'hash-a',
      variants: petGalleryVariants('photo-a'),
      animalIds: [fernId],
      draftVisible: true,
      draftOrder: 1,
      favorite: false,
      cover: false,
    })
    await hideAnimalHandler(harness.ctx, { animalId: hiddenAnimalId })

    await expect(
      bulkTagPhotosHandler(harness.ctx, {
        photoIds: [photoId],
        animalIds: [hiddenAnimalId],
        mode: 'add',
      }),
    ).rejects.toThrow('Pet gallery hidden animals cannot be used for bulk tagging')

    expect((await getAdminStateHandler(harness.ctx, {})).photos[0]?.animalIds).toEqual([fernId])
  })

  it('publishes a public snapshot and history without internal fields', async () => {
    const harness = createPetGalleryHarness()
    const fernId = await createAnimalHandler(harness.ctx, {
      stableId: 'fern',
      name: 'Fern',
      species: 'cat',
      color: '#88aa66',
      sortOrder: 1,
    })
    const mossId = await createAnimalHandler(harness.ctx, {
      stableId: 'moss',
      name: 'Moss',
      color: '#444444',
      sortOrder: 2,
    })
    await hideAnimalHandler(harness.ctx, { animalId: mossId })
    await createUploadedPhotoDraft(harness, {
      stableId: 'hidden-photo',
      sourceHash: 'hash-hidden',
      internalNotes: 'do not leak',
      variants: petGalleryVariants('hidden-photo'),
      animalIds: [fernId],
      draftVisible: false,
      draftOrder: 0,
      favorite: false,
      cover: false,
    })
    await createUploadedPhotoDraft(harness, {
      stableId: 'visible-photo',
      sourceHash: 'hash-visible',
      caption: 'Visible',
      internalNotes: 'admin only',
      variants: petGalleryVariants('visible-photo'),
      animalIds: [fernId, mossId],
      draftVisible: true,
      draftOrder: 1,
      favorite: true,
      cover: true,
      approximateDate: { year: 2026, month: 5, day: 17 },
    })

    const published = await publishDraftHandler(harness.ctx, { now: 1_800_000_000_000, revision: 'rev-test' })
    const publicSnapshot = await getPublicSnapshotHandler(harness.ctx, {})
    const adminState = await getAdminStateHandler(harness.ctx, {})
    const serialized = JSON.stringify(publicSnapshot)

    expect(published).toEqual({
      revision: 'rev-test',
      publishedAt: 1_800_000_000_000,
      photoCount: 1,
      animalCount: 1,
    })
    expect(publicSnapshot).toEqual({
      revision: 'rev-test',
      publishedAt: 1_800_000_000_000,
      animals: [{ stableId: 'fern', name: 'Fern', species: 'cat', order: 1 }],
      photos: [
        {
          stableId: 'visible-photo',
          caption: 'Visible',
          variants: {
            thumb: { kind: 'thumb', url: 'https://cdn.example.com/visible-photo/thumb.webp', width: 320, height: 214 },
            card: { kind: 'card', url: 'https://cdn.example.com/visible-photo/card.webp', width: 768, height: 512 },
            display: {
              kind: 'display',
              url: 'https://cdn.example.com/visible-photo/display.webp',
              width: 1600,
              height: 1067,
            },
            full: { kind: 'full', url: 'https://cdn.example.com/visible-photo/full.webp', width: 2560, height: 1707 },
          },
          animalIds: ['fern'],
          favorite: true,
          cover: true,
          approximateDate: { year: 2026, month: 5, day: 17 },
        },
      ],
    })
    expect(adminState.publishHistory).toEqual([
      expect.objectContaining({
        revision: 'rev-test',
        publishedAt: 1_800_000_000_000,
        photoCount: 1,
        animalCount: 1,
        actor: expect.objectContaining({ email: 'admin@example.com', workosOrgId: 'org_good' }),
      }),
    ])
    expect(adminState.draft).toEqual(
      expect.objectContaining({
        key: 'current',
        lastPublishedRevision: 'rev-test',
        updatedBy: expect.objectContaining({ email: 'admin@example.com' }),
      }),
    )
    expect(serialized).not.toContain('internalNotes')
    expect(serialized).not.toContain('draftVisible')
    expect(serialized).not.toContain('admin@example.com')
    expect(serialized).not.toContain('storage-key')
    expect(serialized).not.toContain('byteSize')
    expect(serialized).not.toContain('hidden-photo')
  })

  it('blocks the first publish until the static gallery baseline has been migrated', async () => {
    const harness = createPetGalleryHarness()
    const fernId = await createAnimalHandler(harness.ctx, {
      stableId: 'fern',
      name: 'Fern',
      color: '#88aa66',
      sortOrder: 1,
    })
    await createUploadedPhotoDraft(harness, {
      stableId: 'visible-photo',
      sourceHash: 'hash-visible',
      variants: petGalleryVariants('visible-photo'),
      animalIds: [fernId],
      draftVisible: true,
      draftOrder: 1,
      favorite: false,
      cover: false,
    })
    await createUploadedPhotoDraft(harness, {
      stableId: 'hidden-photo',
      sourceHash: 'hash-hidden',
      variants: petGalleryVariants('hidden-photo'),
      animalIds: [fernId],
      draftVisible: false,
      draftOrder: 2,
      favorite: false,
      cover: false,
    })

    await expect(publishDraftHandler(harness.ctx, { expectedMinimumPhotoCount: 2 })).rejects.toThrow(
      'Pet gallery migration required before first publish: Convex public snapshot has 1 of 2 static photos.',
    )
    expect(await getPublicSnapshotHandler(harness.ctx, {})).toBeNull()
  })

  it('blocks admin publishes before the initial migration has created a public snapshot', async () => {
    const harness = createPetGalleryHarness()
    const fernId = await createAnimalHandler(harness.ctx, {
      stableId: 'fern',
      name: 'Fern',
      color: '#88aa66',
      sortOrder: 1,
    })
    await createUploadedPhotoDraft(harness, {
      stableId: 'visible-photo',
      sourceHash: 'hash-visible',
      variants: petGalleryVariants('visible-photo'),
      animalIds: [fernId],
      draftVisible: true,
      draftOrder: 1,
      favorite: false,
      cover: false,
    })

    await expect(publishDraftHandler(harness.ctx, { requireExistingSnapshot: true })).rejects.toThrow(
      'Pet gallery migration required before first admin publish',
    )
    expect(await getPublicSnapshotHandler(harness.ctx, {})).toBeNull()
  })

  it('records hard-delete metadata removal and retryable file cleanup state', async () => {
    const harness = createPetGalleryHarness()
    const fernId = await createAnimalHandler(harness.ctx, {
      stableId: 'fern',
      name: 'Fern',
      color: '#88aa66',
      sortOrder: 1,
    })
    const photoId = await createUploadedPhotoDraft(harness, {
      stableId: 'photo-a',
      sourceHash: 'hash-a',
      variants: petGalleryVariants('photo-a'),
      animalIds: [fernId],
      draftVisible: true,
      draftOrder: 1,
      favorite: false,
      cover: false,
    })

    await publishDraftHandler(harness.ctx, { now: 1_800_000_000_000, revision: 'before-delete' })
    expect((await getPublicSnapshotHandler(harness.ctx, {}))?.photos).toEqual([
      expect.objectContaining({ stableId: 'photo-a' }),
    ])

    const { cleanupId, variantKeys } = await beginPhotoHardDeleteHandler(harness.ctx, { photoId })
    expect(variantKeys).toEqual([
      'photo-a/thumb-storage-key',
      'photo-a/card-storage-key',
      'photo-a/display-storage-key',
      'photo-a/full-storage-key',
    ])
    expect((await getAdminStateHandler(harness.ctx, {})).photos).toEqual([])
    const snapshotAfterDelete = await getPublicSnapshotHandler(harness.ctx, {})
    expect(snapshotAfterDelete?.photos).toEqual([])
    expect(snapshotAfterDelete?.revision).toContain('before-delete:delete:photo-a:')
    expect(snapshotAfterDelete?.publishedAt).not.toBe(1_800_000_000_000)
    expect(await listPendingPhotoFileCleanupsHandler(harness.ctx, {})).toEqual([
      expect.objectContaining({
        _id: cleanupId,
        photoStableId: 'photo-a',
        status: 'pending',
        attempts: 0,
        variantKeys: [
          'photo-a/thumb-storage-key',
          'photo-a/card-storage-key',
          'photo-a/display-storage-key',
          'photo-a/full-storage-key',
        ],
        actor: expect.objectContaining({ email: 'admin@example.com' }),
      }),
    ])
    await expect(
      createUploadedPhotoDraft(harness, {
        stableId: 'photo-a',
        sourceHash: 'hash-replacement',
        variants: petGalleryVariants('photo-a-replacement'),
        animalIds: [fernId],
        draftVisible: true,
        draftOrder: 2,
        favorite: false,
        cover: false,
      }),
    ).rejects.toThrow('Pet gallery photo cleanup is still pending for stable ID')

    await recordPhotoFileCleanupResultHandler(harness.ctx, {
      cleanupId,
      ok: false,
      error: 'blob service unavailable',
    })
    expect(await listPendingPhotoFileCleanupsHandler(harness.ctx, {})).toEqual([
      expect.objectContaining({
        _id: cleanupId,
        status: 'failed',
        attempts: 1,
        lastError: 'blob service unavailable',
      }),
    ])

    await recordPhotoFileCleanupResultHandler(harness.ctx, {
      cleanupId,
      ok: true,
    })
    expect(await listPendingPhotoFileCleanupsHandler(harness.ctx, {})).toEqual([])
    const cleanup = await harness.db.get(cleanupId)
    expect(cleanup).toEqual(
      expect.objectContaining({
        status: 'complete',
        attempts: 2,
      }),
    )
    expect(cleanup).not.toHaveProperty('lastError')

    await recordPhotoFileCleanupResultHandler(harness.ctx, {
      cleanupId,
      ok: false,
      error: 'stale retry',
    })
    expect(await listPendingPhotoFileCleanupsHandler(harness.ctx, {})).toEqual([])
    expect(await harness.db.get(cleanupId)).toEqual(
      expect.objectContaining({
        status: 'complete',
        attempts: 2,
      }),
    )

    await expect(
      createUploadedPhotoDraft(harness, {
        stableId: 'photo-a',
        sourceHash: 'hash-replacement',
        variants: petGalleryVariants('photo-a-replacement'),
        animalIds: [fernId],
        draftVisible: true,
        draftOrder: 2,
        favorite: false,
        cover: false,
      }),
    ).resolves.toBeTruthy()
  })

  it('tracks uploaded variant files and only allows pending uploads to be cleaned up', async () => {
    const harness = createPetGalleryHarness()
    const fernId = await createAnimalHandler(harness.ctx, {
      stableId: 'fern',
      name: 'Fern',
      color: '#88aa66',
      sortOrder: 1,
    })
    const uploadedId = await recordPendingVariantUploadHandler(harness.ctx, {
      key: 'upload/thumb-key',
      url: 'https://utfs.example/upload/thumb.webp',
      name: 'thumb.webp',
      size: 1234,
      mimeType: 'image/webp',
    })

    await expect(
      beginUploadedVariantCleanupHandler(harness.ctx, { variantKeys: ['upload/thumb-key', 'unknown-key'] }),
    ).rejects.toThrow('Pet gallery upload cleanup can only delete pending uploaded variant files')
    await expect(
      beginUploadedVariantCleanupHandler(harness.ctx, {
        variantKeys: ['one', 'two', 'three', 'four', 'five'],
      }),
    ).rejects.toThrow('Pet gallery upload cleanup is limited to 4 variant files')

    await expect(
      beginUploadedVariantCleanupHandler(harness.ctx, { variantKeys: ['upload/thumb-key'] }),
    ).resolves.toEqual({
      variantKeys: ['upload/thumb-key'],
    })
    expect(await harness.db.get(uploadedId)).toEqual(expect.objectContaining({ status: 'cleanupPending' }))
    await recordUploadedVariantCleanupResultHandler(harness.ctx, {
      variantKeys: ['upload/thumb-key'],
      ok: false,
      error: 'UploadThing failed',
    })
    expect(await harness.db.get(uploadedId)).toEqual(
      expect.objectContaining({ status: 'cleanupFailed', attempts: 1, lastError: 'UploadThing failed' }),
    )

    const ownerHarness = createPetGalleryHarness()
    const otherAdminHarness = createPetGalleryHarness({ auth: 'secondAdmin', db: ownerHarness.db })
    const ownedByFirstAdmin = petGalleryVariants('owned-by-first-admin')
    const ownerAnimalId = await createAnimalHandler(ownerHarness.ctx, {
      stableId: 'owner-cat',
      name: 'Owner Cat',
      color: '#88aa66',
      sortOrder: 1,
    })
    for (const variant of Object.values(ownedByFirstAdmin)) {
      await recordPendingVariantUploadHandler(ownerHarness.ctx, {
        key: variant.key,
        url: variant.url,
        name: `${variant.kind}.webp`,
        size: variant.byteSize,
        mimeType: variant.mimeType,
      })
    }
    await expect(
      beginUploadedVariantCleanupHandler(otherAdminHarness.ctx, {
        variantKeys: Object.values(ownedByFirstAdmin).map(variant => variant.key),
      }),
    ).rejects.toThrow('Pet gallery upload cleanup can only delete pending uploaded variant files')
    await expect(
      createPhotoDraftHandler(otherAdminHarness.ctx, {
        stableId: 'owned-by-first-admin',
        sourceHash: 'hash-owned',
        variants: ownedByFirstAdmin,
        animalIds: [ownerAnimalId],
        draftVisible: true,
        draftOrder: 1,
        favorite: false,
        cover: false,
      }),
    ).rejects.toThrow('Pet gallery photo variants must be pending uploads owned by the current admin')

    await expect(
      createPhotoDraftHandler(harness.ctx, {
        stableId: 'unowned-photo',
        sourceHash: 'hash-unowned',
        variants: petGalleryVariants('unowned-photo'),
        animalIds: [fernId],
        draftVisible: true,
        draftOrder: 1,
        favorite: false,
        cover: false,
      }),
    ).rejects.toThrow('Pet gallery photo variants must be pending uploads owned by the current admin')

    const attachedUploadId = await recordPendingVariantUploadHandler(harness.ctx, {
      key: 'photo-a/thumb-storage-key',
      url: 'https://utfs.example/photo-a/thumb.webp',
      name: 'thumb.webp',
      size: 1234,
      mimeType: 'image/webp',
    })
    await createUploadedPhotoDraft(harness, {
      stableId: 'photo-a',
      sourceHash: 'hash-a',
      variants: petGalleryVariants('photo-a'),
      animalIds: [fernId],
      draftVisible: true,
      draftOrder: 1,
      favorite: false,
      cover: false,
    })
    expect(await harness.db.get(uploadedId)).toEqual(expect.objectContaining({ status: 'cleanupFailed' }))
    const attachedUpload = await harness.db.get(attachedUploadId)
    expect(attachedUpload).toEqual(expect.objectContaining({ status: 'attached', photoStableId: 'photo-a' }))
    await expect(
      recordPendingVariantUploadHandler(harness.ctx, {
        key: 'photo-a/thumb-storage-key',
        url: 'https://utfs.example/photo-a/thumb.webp',
        name: 'thumb.webp',
        size: 1234,
        mimeType: 'image/webp',
      }),
    ).rejects.toThrow('Pet gallery uploaded variant key is already registered')
    await expect(
      beginUploadedVariantCleanupHandler(harness.ctx, { variantKeys: ['photo-a/thumb-storage-key'] }),
    ).rejects.toThrow('Pet gallery upload cleanup can only delete pending uploaded variant files')
  })

  it('allows failed uploaded variant cleanup attempts to be retried by the same admin', async () => {
    const harness = createPetGalleryHarness()
    const uploadedId = await recordPendingVariantUploadHandler(harness.ctx, {
      key: 'retry/thumb-key',
      url: 'https://utfs.example/retry/thumb.webp',
      name: 'thumb.webp',
      size: 1234,
      mimeType: 'image/webp',
    })

    await expect(
      beginUploadedVariantCleanupHandler(harness.ctx, { variantKeys: ['retry/thumb-key'] }),
    ).resolves.toEqual({
      variantKeys: ['retry/thumb-key'],
    })
    await recordUploadedVariantCleanupResultHandler(harness.ctx, {
      variantKeys: ['retry/thumb-key'],
      ok: false,
      error: 'UploadThing failed',
    })
    expect(await harness.db.get(uploadedId)).toEqual(
      expect.objectContaining({ status: 'cleanupFailed', attempts: 1, lastError: 'UploadThing failed' }),
    )

    await expect(
      beginUploadedVariantCleanupHandler(harness.ctx, { variantKeys: ['retry/thumb-key'] }),
    ).resolves.toEqual({
      variantKeys: ['retry/thumb-key'],
    })
    expect(await harness.db.get(uploadedId)).toEqual(
      expect.objectContaining({ status: 'cleanupPending', attempts: 1, lastError: 'UploadThing failed' }),
    )
  })

  it('allows cleanup-pending uploaded variants to be retried when result recording failed', async () => {
    const harness = createPetGalleryHarness()
    const uploadedId = await recordPendingVariantUploadHandler(harness.ctx, {
      key: 'retry-pending/thumb-key',
      url: 'https://utfs.example/retry-pending/thumb.webp',
      name: 'thumb.webp',
      size: 1234,
      mimeType: 'image/webp',
    })

    await beginUploadedVariantCleanupHandler(harness.ctx, { variantKeys: ['retry-pending/thumb-key'] })
    expect(await harness.db.get(uploadedId)).toEqual(expect.objectContaining({ status: 'cleanupPending' }))

    await expect(
      beginUploadedVariantCleanupHandler(harness.ctx, { variantKeys: ['retry-pending/thumb-key'] }),
    ).resolves.toEqual({
      variantKeys: ['retry-pending/thumb-key'],
    })
    expect(await harness.db.get(uploadedId)).toEqual(expect.objectContaining({ status: 'cleanupPending' }))
  })
})
