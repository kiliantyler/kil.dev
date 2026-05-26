import type { PetGalleryAdminWorkspaceState, UploadQueueItem } from '@/lib/pet-gallery/admin-workspace'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { removeCompletedUploadQueueItems } from './pet-gallery-admin-photo-utils'
import { processPetGalleryUploadBatch, processPetGalleryUploadFile, readImageDimensions } from './upload-workflow'

function createState(): PetGalleryAdminWorkspaceState {
  return {
    mode: 'convex',
    animals: [],
    photos: [],
    publishedOrderBaseline: [],
    publishHistory: [],
  }
}

function createFile(name = 'Sunny Nap.png') {
  return new File(['image-bytes'], name, { type: 'image/png', lastModified: 1 })
}

describe('pet gallery upload workflow', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads ImageBitmap dimensions before closing the bitmap', async () => {
    const bitmap = {
      width: 1200,
      height: 800,
      close() {
        this.width = 0
        this.height = 0
      },
    }
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap))

    await expect(readImageDimensions(createFile())).resolves.toEqual({ width: 1200, height: 800 })
    expect(bitmap).toEqual(expect.objectContaining({ width: 0, height: 0 }))
  })

  it('uploads generated variants and creates the Convex draft photo', async () => {
    const state = createState()
    const upload = vi.fn(async (_route, payload: { files: File[] }) =>
      payload.files.map((file, index) => ({
        key: `uploaded-${index}`,
        ufsUrl: `https://utfs.io/f/uploaded-${index}`,
        name: file.name,
        size: file.size,
        type: file.type,
      })),
    )
    const createPhotoDraft = vi.fn().mockResolvedValue({ photoId: 'photos:1', state })
    const cleanupFiles = vi.fn()

    await expect(
      processPetGalleryUploadFile({
        file: createFile(),
        draftOrder: 4,
        deps: {
          uploadFiles: upload as never,
          createPhotoDraft,
          cleanupFiles,
          digestFile: async () => 'abcdef1234567890',
          readDimensions: async () => ({ width: 2000, height: 1000 }),
          encodeVariant: async (_file, plan) => ({
            ...plan,
            blob: new Blob([plan.kind], { type: 'image/webp' }),
            byteSize: plan.kind.length,
            mimeType: 'image/webp',
            extension: 'webp',
          }),
        },
      }),
    ).resolves.toEqual({
      stableId: 'sunny-nap-abcdef123456',
      sourceHash: 'abcdef1234567890',
      uploadedKeys: ['uploaded-0', 'uploaded-1', 'uploaded-2', 'uploaded-3'],
      state,
    })

    expect(upload).toHaveBeenCalledWith('generatedImageVariant', {
      files: expect.arrayContaining([
        expect.objectContaining({ name: 'Sunny Nap-thumb.webp', type: 'image/webp' }),
        expect.objectContaining({ name: 'Sunny Nap-full.webp', type: 'image/webp' }),
      ]),
    })
    expect(createPhotoDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        stableId: 'sunny-nap-abcdef123456',
        sourceHash: 'abcdef1234567890',
        filename: 'Sunny Nap.png',
        animalIds: [],
        draftOrder: 4,
      }),
    )
    expect(cleanupFiles).not.toHaveBeenCalled()
  })

  it('stores extracted image date metadata on the Convex draft photo', async () => {
    const createPhotoDraft = vi.fn().mockResolvedValue({ photoId: 'photos:dated', state: createState() })

    await processPetGalleryUploadFile({
      file: createFile('dated.jpg'),
      draftOrder: 2,
      deps: {
        uploadFiles: vi.fn(async (_route, payload: { files: File[] }) =>
          payload.files.map((file, index) => ({
            key: `uploaded-${index}`,
            ufsUrl: `https://utfs.io/f/uploaded-${index}`,
            name: file.name,
            size: file.size,
            type: file.type,
          })),
        ) as never,
        createPhotoDraft,
        cleanupFiles: vi.fn(),
        digestFile: async () => 'dated-hash-value',
        readDimensions: async () => ({ width: 2000, height: 1000 }),
        readApproximateDate: async () => ({ year: 2021, month: 7, day: 9 }),
        encodeVariant: async (_file, plan) => ({
          ...plan,
          blob: new Blob([plan.kind], { type: 'image/webp' }),
          byteSize: plan.kind.length,
          mimeType: 'image/webp',
          extension: 'webp',
        }),
      },
    })

    expect(createPhotoDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        approximateDate: { year: 2021, month: 7, day: 9 },
      }),
    )
  })

  it('cleans up uploaded files when draft creation fails', async () => {
    const upload = vi.fn(async (_route, payload: { files: File[] }) =>
      payload.files.map((file, index) => ({
        key: `uploaded-${index}`,
        ufsUrl: `https://utfs.io/f/uploaded-${index}`,
        name: file.name,
        size: file.size,
        type: file.type,
      })),
    )
    const cleanupFiles = vi.fn().mockResolvedValue({ ok: true })

    await expect(
      processPetGalleryUploadFile({
        file: createFile('failed.png'),
        draftOrder: 1,
        deps: {
          uploadFiles: upload as never,
          createPhotoDraft: vi.fn().mockRejectedValue(new Error('Convex create failed')),
          cleanupFiles,
          digestFile: async () => '1234567890abcdef',
          readDimensions: async () => ({ width: 1000, height: 1000 }),
          encodeVariant: async (_file, plan) => ({
            ...plan,
            blob: new Blob([plan.kind], { type: 'image/webp' }),
            byteSize: plan.kind.length,
            mimeType: 'image/webp',
            extension: 'webp',
          }),
        },
      }),
    ).rejects.toThrow('Convex create failed')

    expect(cleanupFiles).toHaveBeenCalledWith(['uploaded-0', 'uploaded-1', 'uploaded-2', 'uploaded-3'])
  })

  it('rejects duplicate source uploads before generating or uploading variants', async () => {
    const upload = vi.fn()
    const createPhotoDraft = vi.fn()
    const cleanupFiles = vi.fn()
    const readDimensions = vi.fn()
    const encodeVariant = vi.fn()

    await expect(
      processPetGalleryUploadFile({
        file: createFile('duplicate.png'),
        draftOrder: 1,
        existingUploads: [{ stableId: 'existing-photo', sourceHash: 'duplicate-hash' }],
        deps: {
          uploadFiles: upload as never,
          createPhotoDraft,
          cleanupFiles,
          digestFile: async () => 'duplicate-hash',
          readDimensions,
          encodeVariant,
        },
      }),
    ).rejects.toThrow('Upload already exists as existing-photo')

    expect(readDimensions).not.toHaveBeenCalled()
    expect(encodeVariant).not.toHaveBeenCalled()
    expect(upload).not.toHaveBeenCalled()
    expect(createPhotoDraft).not.toHaveBeenCalled()
    expect(cleanupFiles).not.toHaveBeenCalled()
  })

  it('rejects oversized source files before hashing or decoding', async () => {
    const file = new File([new Uint8Array(30 * 1024 * 1024 + 1)], 'huge.png', { type: 'image/png' })
    const digestFile = vi.fn()
    const readDimensions = vi.fn()

    await expect(
      processPetGalleryUploadFile({
        file,
        draftOrder: 1,
        deps: {
          uploadFiles: vi.fn() as never,
          createPhotoDraft: vi.fn(),
          cleanupFiles: vi.fn(),
          digestFile,
          readDimensions,
        },
      }),
    ).rejects.toThrow('Image is too large. Choose an image under 30 MB.')

    expect(digestFile).not.toHaveBeenCalled()
    expect(readDimensions).not.toHaveBeenCalled()
  })

  it('rejects oversized decoded dimensions before generating variants', async () => {
    const encodeVariant = vi.fn()

    await expect(
      processPetGalleryUploadFile({
        file: createFile('huge-dimensions.png'),
        draftOrder: 1,
        deps: {
          uploadFiles: vi.fn() as never,
          createPhotoDraft: vi.fn(),
          cleanupFiles: vi.fn(),
          digestFile: async () => 'large-dimensions',
          readDimensions: async () => ({ width: 12_000, height: 8_000 }),
          encodeVariant,
        },
      }),
    ).rejects.toThrow('Image dimensions are too large')

    expect(encodeVariant).not.toHaveBeenCalled()
  })

  it('surfaces cleanup failures without hiding the original create failure', async () => {
    await expect(
      processPetGalleryUploadFile({
        file: createFile('cleanup-fails.png'),
        draftOrder: 1,
        deps: {
          uploadFiles: vi.fn(async (_route, payload: { files: File[] }) =>
            payload.files.map((file, index) => ({
              key: `uploaded-${index}`,
              ufsUrl: `https://utfs.io/f/uploaded-${index}`,
              name: file.name,
              size: file.size,
              type: file.type,
            })),
          ) as never,
          createPhotoDraft: vi.fn().mockRejectedValue(new Error('Convex create failed')),
          cleanupFiles: vi.fn().mockRejectedValue(new Error('UploadThing cleanup failed')),
          digestFile: async () => '1234567890abcdef',
          readDimensions: async () => ({ width: 1000, height: 1000 }),
          encodeVariant: async (_file, plan) => ({
            ...plan,
            blob: new Blob([plan.kind], { type: 'image/webp' }),
            byteSize: plan.kind.length,
            mimeType: 'image/webp',
            extension: 'webp',
          }),
        },
      }),
    ).rejects.toThrow('Convex create failed; cleanup failed: UploadThing cleanup failed')
  })

  it('surfaces failed cleanup results without hiding the original create failure', async () => {
    await expect(
      processPetGalleryUploadFile({
        file: createFile('cleanup-result-fails.png'),
        draftOrder: 1,
        deps: {
          uploadFiles: vi.fn(async (_route, payload: { files: File[] }) =>
            payload.files.map((file, index) => ({
              key: `uploaded-${index}`,
              ufsUrl: `https://utfs.io/f/uploaded-${index}`,
              name: file.name,
              size: file.size,
              type: file.type,
            })),
          ) as never,
          createPhotoDraft: vi.fn().mockRejectedValue(new Error('Convex create failed')),
          cleanupFiles: vi.fn().mockResolvedValue({ ok: false, error: 'UploadThing deleted 1 of 4 files' }),
          digestFile: async () => '1234567890abcdef',
          readDimensions: async () => ({ width: 1000, height: 1000 }),
          encodeVariant: async (_file, plan) => ({
            ...plan,
            blob: new Blob([plan.kind], { type: 'image/webp' }),
            byteSize: plan.kind.length,
            mimeType: 'image/webp',
            extension: 'webp',
          }),
        },
      }),
    ).rejects.toThrow('Convex create failed; cleanup failed: UploadThing deleted 1 of 4 files')
  })

  it('processes a real upload batch, marks queue success, and refreshes workspace state once', async () => {
    const state = createState()
    const refreshedState = {
      ...state,
      photos: [
        {
          docId: 'photos:1',
          stableId: 'batch-photo',
          sourceHash: 'batch-hash',
          filename: 'batch.png',
          title: 'batch.png',
          altText: 'batch.png',
          variants: {
            thumb: {
              kind: 'thumb',
              url: 'https://utfs.example/thumb.webp',
              key: 'uploaded-0',
              width: 320,
              height: 240,
              byteSize: 10,
              mimeType: 'image/webp',
              extension: 'webp',
            },
            card: {
              kind: 'card',
              url: 'https://utfs.example/card.webp',
              key: 'uploaded-1',
              width: 768,
              height: 576,
              byteSize: 10,
              mimeType: 'image/webp',
              extension: 'webp',
            },
            display: {
              kind: 'display',
              url: 'https://utfs.example/display.webp',
              key: 'uploaded-2',
              width: 1600,
              height: 1200,
              byteSize: 10,
              mimeType: 'image/webp',
              extension: 'webp',
            },
            full: {
              kind: 'full',
              url: 'https://utfs.example/full.webp',
              key: 'uploaded-3',
              width: 2000,
              height: 1500,
              byteSize: 10,
              mimeType: 'image/webp',
              extension: 'webp',
            },
          },
          animalIds: [],
          draftVisible: true,
          draftOrder: 1,
          favorite: false,
          cover: false,
        },
      ],
    } satisfies PetGalleryAdminWorkspaceState
    const queueChanges: Array<{ itemId: string; status: string; message: string }> = []
    const completedQueueBatches: string[][] = []
    const appliedStates: PetGalleryAdminWorkspaceState[] = []
    const errors: string[] = []
    const upload = vi.fn(async (_route, payload: { files: File[] }) =>
      payload.files.map((file, index) => ({
        key: `uploaded-${index}`,
        ufsUrl: `https://utfs.io/f/uploaded-${index}`,
        name: file.name,
        size: file.size,
        type: file.type,
      })),
    )
    const createPhotoDraft = vi.fn().mockResolvedValue({ photoId: 'photos:1', state })
    const refreshState = vi.fn().mockResolvedValue(refreshedState)

    await processPetGalleryUploadBatch({
      files: [createFile('batch.png')],
      queuedItems: [{ id: 'queue-1', filename: 'batch.png', status: 'queued', message: 'Queued' }],
      photos: [],
      deps: {
        uploadFiles: upload as never,
        createPhotoDraft,
        cleanupFiles: vi.fn(),
        refreshState,
        digestFile: async () => 'batch-hash-value',
        readDimensions: async () => ({ width: 2000, height: 1500 }),
        encodeVariant: async (_file, plan) => ({
          ...plan,
          blob: new Blob([plan.kind], { type: 'image/webp' }),
          byteSize: plan.kind.length,
          mimeType: 'image/webp',
          extension: 'webp',
        }),
      },
      onQueueItemChange: (itemId, patch) => queueChanges.push({ itemId, ...patch }),
      onQueueItemsComplete: itemIds => completedQueueBatches.push(itemIds),
      onUploadError: message => errors.push(message),
      onState: state => appliedStates.push(state),
    })

    expect(queueChanges).toEqual([
      { itemId: 'queue-1', status: 'processing', message: 'Generating variants' },
      { itemId: 'queue-1', status: 'ready', message: 'Draft photo created' },
    ])
    expect(createPhotoDraft).toHaveBeenCalledWith(expect.objectContaining({ draftOrder: 1 }))
    expect(refreshState).toHaveBeenCalledTimes(1)
    expect(appliedStates).toEqual([refreshedState])
    expect(completedQueueBatches).toEqual([['queue-1']])
    expect(errors).toEqual([])
  })

  it('removes completed queue rows through the workspace completion reducer', async () => {
    const state = createState()
    let queue: UploadQueueItem[] = [
      { id: 'queue-1', filename: 'batch.png', status: 'queued' as const, message: 'Queued' },
      { id: 'queue-2', filename: 'still-pending.png', status: 'queued' as const, message: 'Queued' },
    ]
    const upload = vi.fn(async (_route, payload: { files: File[] }) =>
      payload.files.map((file, index) => ({
        key: `uploaded-${index}`,
        ufsUrl: `https://utfs.io/f/uploaded-${index}`,
        name: file.name,
        size: file.size,
        type: file.type,
      })),
    )

    await processPetGalleryUploadBatch({
      files: [createFile('batch.png')],
      queuedItems: queue.slice(0, 1),
      photos: [],
      deps: {
        uploadFiles: upload as never,
        createPhotoDraft: vi.fn().mockResolvedValue({ photoId: 'photos:1', state }),
        cleanupFiles: vi.fn(),
        refreshState: vi.fn().mockResolvedValue(state),
        digestFile: async () => 'batch-hash-value',
        readDimensions: async () => ({ width: 2000, height: 1500 }),
        encodeVariant: async (_file, plan) => ({
          ...plan,
          blob: new Blob([plan.kind], { type: 'image/webp' }),
          byteSize: plan.kind.length,
          mimeType: 'image/webp',
          extension: 'webp',
        }),
      },
      onQueueItemChange: (itemId, patch) => {
        queue = queue.map(item => (item.id === itemId ? { ...item, ...patch } : item))
      },
      onQueueItemsComplete: itemIds => {
        queue = removeCompletedUploadQueueItems(queue, itemIds)
      },
      onUploadError: vi.fn(),
      onState: vi.fn(),
    })

    expect(queue).toEqual([{ id: 'queue-2', filename: 'still-pending.png', status: 'queued', message: 'Queued' }])
  })

  it('leaves successful queue rows visible when workspace refresh fails', async () => {
    const queueChanges: Array<{ itemId: string; status: string; message: string }> = []
    const completedQueueBatches: string[][] = []
    const errors: string[] = []
    const upload = vi.fn(async (_route, payload: { files: File[] }) =>
      payload.files.map((file, index) => ({
        key: `uploaded-${index}`,
        ufsUrl: `https://utfs.io/f/uploaded-${index}`,
        name: file.name,
        size: file.size,
        type: file.type,
      })),
    )

    await processPetGalleryUploadBatch({
      files: [createFile('refresh-fails.png')],
      queuedItems: [{ id: 'queue-refresh', filename: 'refresh-fails.png', status: 'queued', message: 'Queued' }],
      photos: [],
      deps: {
        uploadFiles: upload as never,
        createPhotoDraft: vi.fn().mockResolvedValue({ photoId: 'photos:1', state: createState() }),
        cleanupFiles: vi.fn(),
        refreshState: vi.fn().mockRejectedValue(new Error('Convex refresh failed')),
        digestFile: async () => 'refresh-fails-hash',
        readDimensions: async () => ({ width: 2000, height: 1500 }),
        encodeVariant: async (_file, plan) => ({
          ...plan,
          blob: new Blob([plan.kind], { type: 'image/webp' }),
          byteSize: plan.kind.length,
          mimeType: 'image/webp',
          extension: 'webp',
        }),
      },
      onQueueItemChange: (itemId, patch) => queueChanges.push({ itemId, ...patch }),
      onQueueItemsComplete: itemIds => completedQueueBatches.push(itemIds),
      onUploadError: message => errors.push(message),
      onState: vi.fn(),
    })

    expect(queueChanges).toEqual([
      { itemId: 'queue-refresh', status: 'processing', message: 'Generating variants' },
      { itemId: 'queue-refresh', status: 'ready', message: 'Draft photo created' },
    ])
    expect(completedQueueBatches).toEqual([])
    expect(errors).toEqual(['Convex refresh failed'])
  })

  it('rejects duplicate source hashes within the same upload batch before uploading the duplicate file', async () => {
    const queueChanges: Array<{ itemId: string; status: string; message: string }> = []
    const errors: string[] = []
    const upload = vi.fn(async (_route, payload: { files: File[] }) =>
      payload.files.map((file, index) => ({
        key: `uploaded-${file.name}-${index}`,
        ufsUrl: `https://utfs.io/f/uploaded-${file.name}-${index}`,
        name: file.name,
        size: file.size,
        type: file.type,
      })),
    )

    await processPetGalleryUploadBatch({
      files: [createFile('first.png'), createFile('second.png')],
      queuedItems: [
        { id: 'queue-1', filename: 'first.png', status: 'queued', message: 'Queued' },
        { id: 'queue-2', filename: 'second.png', status: 'queued', message: 'Queued' },
      ],
      photos: [],
      deps: {
        uploadFiles: upload as never,
        createPhotoDraft: vi.fn().mockResolvedValue({ photoId: 'photos:1', state: createState() }),
        cleanupFiles: vi.fn(),
        refreshState: vi.fn().mockResolvedValue(createState()),
        digestFile: async () => 'same-batch-hash',
        readDimensions: async () => ({ width: 1000, height: 1000 }),
        encodeVariant: async (_file, plan) => ({
          ...plan,
          blob: new Blob([plan.kind], { type: 'image/webp' }),
          byteSize: plan.kind.length,
          mimeType: 'image/webp',
          extension: 'webp',
        }),
      },
      onQueueItemChange: (itemId, patch) => queueChanges.push({ itemId, ...patch }),
      onUploadError: message => errors.push(message),
      onState: vi.fn(),
    })

    expect(upload).toHaveBeenCalledTimes(1)
    expect(errors).toEqual(['Upload already exists as first-same-batch-h'])
    expect(queueChanges).toContainEqual({
      itemId: 'queue-2',
      status: 'error',
      message: 'Upload already exists as first-same-batch-h',
    })
  })
})
