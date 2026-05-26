import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../convex/_generated/api'
import fixtureManifest from '../../tests/fixtures/pet-gallery/manifest.json' with { type: 'json' }
import {
  generatePetGalleryUploadThingVariants,
  getDefaultPetGalleryMigrationResumeFile,
  getPetGalleryConvexAuthToken,
  hashPetGallerySource,
  migratePetGalleryToUploadThing,
  stableIdFromPetGalleryImage,
  type PetGalleryMigrationDeps,
} from '../migrate-pet-gallery-uploadthing'

const { convexSetAuth, convexQuery, convexMutation, listBlobs, uploadThingUploadFiles, uploadThingDeleteFiles } =
  vi.hoisted(() => ({
    convexSetAuth: vi.fn(),
    convexQuery: vi.fn(),
    convexMutation: vi.fn(),
    listBlobs: vi.fn(),
    uploadThingUploadFiles: vi.fn(),
    uploadThingDeleteFiles: vi.fn(),
  }))

vi.mock('convex/browser', () => ({
  ConvexHttpClient: vi.fn(function () {
    return {
      setAuth: convexSetAuth,
      query: convexQuery,
      mutation: convexMutation,
    }
  }),
}))

vi.mock('uploadthing/server', () => ({
  UTApi: vi.fn(function () {
    return {
      uploadFiles: uploadThingUploadFiles,
      deleteFiles: uploadThingDeleteFiles,
    }
  }),
}))

vi.mock('@vercel/blob', () => ({
  list: listBlobs,
}))

type TestManifest = {
  generatedAt?: string
  images: Array<(typeof fixtureManifest.images)[number]>
}

async function createTempCwd() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'pet-gallery-uploadthing-migration-'))
}

async function writeManifest(cwd: string, manifest: TestManifest = fixtureManifest) {
  const manifestPath = path.join(cwd, 'public', 'pet-gallery', 'manifest.json')
  await fs.mkdir(path.dirname(manifestPath), { recursive: true })
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2))
}

async function writeOriginal(
  cwd: string,
  fileName: string,
  options: { width?: number; height?: number; background?: string } = {},
) {
  const originalPath = path.join(cwd, 'public', 'pet-gallery', 'originals', fileName)
  await fs.mkdir(path.dirname(originalPath), { recursive: true })
  const buffer = await sharp({
    create: {
      width: options.width ?? 1200,
      height: options.height ?? 800,
      channels: 3,
      background: options.background ?? '#f2a65a',
    },
  })
    .jpeg()
    .toBuffer()
  await fs.writeFile(originalPath, buffer)
  return buffer
}

function createDeps(
  state: { photos?: Array<{ stableId: string; sourceHash: string }> } = {},
): PetGalleryMigrationDeps & {
  uploadFiles: ReturnType<typeof vi.fn>
  deleteFiles: ReturnType<typeof vi.fn>
  mutation: ReturnType<typeof vi.fn>
} {
  const uploadFiles = vi.fn(async (files: File[]) =>
    files.map(file => ({
      key: `uploaded/${file.name}`,
      url: `https://utfs.io/f/uploaded/${file.name}`,
      ufsUrl: `https://utfs.io/f/uploaded/${file.name}`,
      name: file.name,
      size: file.size,
      type: file.type,
    })),
  )
  const deleteFiles = vi.fn()
  const mutation = vi.fn(async (_reference: unknown, args: unknown) => {
    if (args && typeof args === 'object' && 'stableId' in args) return `photos:${String(args.stableId)}`
    if (args && typeof args === 'object' && 'expectedMinimumPhotoCount' in args) {
      return { revision: 'published-revision', publishedAt: 1, photoCount: 1, animalCount: 0 }
    }
    return null
  })

  return {
    uploadThing: {
      uploadFiles,
      deleteFiles,
    },
    convex: {
      query: vi.fn(async () => ({
        animals: [],
        photos: state.photos ?? [],
        draft: null,
        publishHistory: [],
      })),
      mutation,
    },
    now: () => 1_800_000_000_000,
    log: vi.fn(),
    fetch: vi.fn(),
    uploadFiles,
    deleteFiles,
    mutation,
  }
}

describe('pet gallery UploadThing migration', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    convexSetAuth.mockReset()
    convexQuery.mockReset()
    convexMutation.mockReset()
    listBlobs.mockReset()
    uploadThingUploadFiles.mockReset()
    uploadThingDeleteFiles.mockReset()
    vi.unstubAllEnvs()
  })

  it('uses CONVEX_AUTH_TOKEN when the pet gallery access token is empty', async () => {
    const cwd = await createTempCwd()
    await writeManifest(cwd)
    await writeOriginal(cwd, 'fixture-photo.jpg')
    vi.stubEnv('NEXT_PUBLIC_CONVEX_URL', 'https://example.convex.cloud')
    vi.stubEnv('PET_GALLERY_CONVEX_ACCESS_TOKEN', '   ')
    vi.stubEnv('CONVEX_AUTH_TOKEN', ' fallback-token ')
    convexQuery.mockResolvedValueOnce({ photos: [] })

    const result = await migratePetGalleryToUploadThing({ cwd, dryRun: true })

    expect(getPetGalleryConvexAuthToken()).toBe('fallback-token')
    expect(convexSetAuth).toHaveBeenCalledWith('fallback-token')
    expect(result.planned).toBe(1)
    expect(result.uploaded).toBe(0)
  })

  it('dry-runs planned uploads and Convex writes without remote writes', async () => {
    const cwd = await createTempCwd()
    await writeManifest(cwd)
    await writeOriginal(cwd, 'fixture-photo.jpg')
    const deps = createDeps()

    const result = await migratePetGalleryToUploadThing({ cwd, dryRun: true }, deps)

    expect(result.planned).toBe(1)
    expect(result.uploaded).toBe(0)
    expect(result.published).toBe(false)
    expect(deps.uploadFiles).not.toHaveBeenCalled()
    expect(deps.mutation).not.toHaveBeenCalled()
    await expect(fs.stat(getDefaultPetGalleryMigrationResumeFile(cwd))).rejects.toThrow()
  })

  it('generates all four UploadThing variants with sharp', async () => {
    const source = await sharp({
      create: {
        width: 3200,
        height: 2000,
        channels: 3,
        background: '#437c90',
      },
    })
      .jpeg()
      .toBuffer()

    const variants = await generatePetGalleryUploadThingVariants(source, 'wide-photo')

    expect(variants.map(variant => variant.kind)).toEqual(['thumb', 'card', 'display', 'full'])
    expect(variants.every(variant => variant.extension === 'webp' && variant.mimeType === 'image/webp')).toBe(true)
    expect(variants.every(variant => Math.max(variant.width, variant.height) <= variant.longEdge)).toBe(true)
    expect(variants.every(variant => variant.buffer.byteLength > 0)).toBe(true)
  })

  it('skips images when an existing source hash or stable ID is detectable', async () => {
    const cwd = await createTempCwd()
    const manifest = {
      generatedAt: fixtureManifest.generatedAt,
      images: [
        fixtureManifest.images[0]!,
        {
          ...fixtureManifest.images[0]!,
          fileName: 'hash-match.jpg',
          url: '/pet-gallery/originals/hash-match.jpg',
          blobUrl: 'https://blob.example/hash-match.jpg',
        },
      ],
    }
    await writeManifest(cwd, manifest)
    await writeOriginal(cwd, 'fixture-photo.jpg')
    const hashMatchBuffer = await writeOriginal(cwd, 'hash-match.jpg')
    const deps = createDeps({
      photos: [
        { stableId: stableIdFromPetGalleryImage(fixtureManifest.images[0]!), sourceHash: 'other-hash' },
        { stableId: 'other-photo', sourceHash: hashPetGallerySource(hashMatchBuffer) },
      ],
    })

    const result = await migratePetGalleryToUploadThing({ cwd }, deps)

    expect(result.skipped).toBe(2)
    expect(result.uploaded).toBe(0)
    expect(deps.uploadFiles).not.toHaveBeenCalled()
    expect(deps.mutation).toHaveBeenCalledOnce()
    expect(deps.mutation.mock.calls[0]?.[1]).toMatchObject({ expectedMinimumPhotoCount: 2 })
  })

  it('resumes after a failed image by reading the ignored scratch resume file', async () => {
    const cwd = await createTempCwd()
    const manifest = {
      generatedAt: fixtureManifest.generatedAt,
      images: [
        fixtureManifest.images[0]!,
        {
          ...fixtureManifest.images[0]!,
          fileName: 'second-photo.jpg',
          url: '/pet-gallery/originals/second-photo.jpg',
          blobUrl: 'https://blob.example/second-photo.jpg',
        },
      ],
    }
    await writeManifest(cwd, manifest)
    await writeOriginal(cwd, 'fixture-photo.jpg')
    await writeOriginal(cwd, 'second-photo.jpg', { background: '#6f8ab7' })
    const deps = createDeps()
    deps.uploadFiles.mockResolvedValueOnce([
      {
        key: 'uploaded/fixture-thumb.webp',
        url: 'https://utfs.io/f/fixture-thumb.webp',
        ufsUrl: 'https://utfs.io/f/fixture-thumb.webp',
        name: 'fixture-thumb.webp',
        size: 1,
        type: 'image/webp',
      },
      {
        key: 'uploaded/fixture-card.webp',
        url: 'https://utfs.io/f/fixture-card.webp',
        ufsUrl: 'https://utfs.io/f/fixture-card.webp',
        name: 'fixture-card.webp',
        size: 1,
        type: 'image/webp',
      },
      {
        key: 'uploaded/fixture-display.webp',
        url: 'https://utfs.io/f/fixture-display.webp',
        ufsUrl: 'https://utfs.io/f/fixture-display.webp',
        name: 'fixture-display.webp',
        size: 1,
        type: 'image/webp',
      },
      {
        key: 'uploaded/fixture-full.webp',
        url: 'https://utfs.io/f/fixture-full.webp',
        ufsUrl: 'https://utfs.io/f/fixture-full.webp',
        name: 'fixture-full.webp',
        size: 1,
        type: 'image/webp',
      },
    ])
    deps.uploadFiles.mockRejectedValueOnce(new Error('UploadThing unavailable'))

    await expect(migratePetGalleryToUploadThing({ cwd, resume: true }, deps)).rejects.toThrow('UploadThing unavailable')

    const resumeRaw = await fs.readFile(getDefaultPetGalleryMigrationResumeFile(cwd), 'utf8')
    expect(JSON.parse(resumeRaw).completed).toHaveLength(1)

    deps.uploadFiles.mockClear()
    deps.mutation.mockClear()
    deps.uploadFiles.mockImplementation(async (files: File[]) =>
      files.map(file => ({
        key: `uploaded/resumed/${file.name}`,
        url: `https://utfs.io/f/resumed/${file.name}`,
        ufsUrl: `https://utfs.io/f/resumed/${file.name}`,
        name: file.name,
        size: file.size,
        type: file.type,
      })),
    )

    const result = await migratePetGalleryToUploadThing({ cwd, resume: true }, deps)

    expect(result.resumed).toBe(1)
    expect(result.uploaded).toBe(1)
    expect(deps.uploadFiles).toHaveBeenCalledOnce()
    expect(
      deps.mutation.mock.calls.some(
        ([, args]) => args && typeof args === 'object' && 'expectedMinimumPhotoCount' in args,
      ),
    ).toBe(true)
  })

  it('publishes the initial Convex snapshot in non-dry-run migrations', async () => {
    const cwd = await createTempCwd()
    await writeManifest(cwd)
    await writeOriginal(cwd, 'fixture-photo.jpg')
    const deps = createDeps()

    const result = await migratePetGalleryToUploadThing({ cwd }, deps)

    expect(result.uploaded).toBe(1)
    expect(result.published).toBe(true)
    expect(deps.mutation.mock.calls.at(-1)?.[1]).toMatchObject({ expectedMinimumPhotoCount: 1 })
    expect(deps.deleteFiles).not.toHaveBeenCalled()
  })

  it('synthesizes a migration manifest from Blob image files when no local manifest exists', async () => {
    const cwd = await createTempCwd()
    const source = await sharp({
      create: {
        width: 900,
        height: 600,
        channels: 3,
        background: '#8467d7',
      },
    })
      .jpeg()
      .toBuffer()
    const deps = createDeps()
    deps.fetch = vi.fn(async () => new Response(new Uint8Array(source), { status: 200 }))
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'blob-token')
    listBlobs.mockResolvedValue({
      blobs: [
        { pathname: 'pet-gallery/notes.txt', url: 'https://blob.example/notes.txt' },
        { pathname: 'pet-gallery/originals/blob-cat-320.webp', url: 'https://blob.example/blob-cat-320.webp' },
        { pathname: 'pet-gallery/originals/blob-cat-blur.webp', url: 'https://blob.example/blob-cat-blur.webp' },
        { pathname: 'pet-gallery/originals/blob-cat.jpg', url: 'https://blob.example/blob-cat.jpg' },
      ],
    })

    const result = await migratePetGalleryToUploadThing({ cwd, dryRun: true }, deps)

    expect(result.planned).toBe(1)
    expect(deps.fetch).toHaveBeenCalledWith('https://blob.example/blob-cat.jpg', { cache: 'no-store' })
    expect(deps.log).toHaveBeenCalledWith(
      '[pet-gallery:migrate] dry-run would upload blob-cat and create Convex draft metadata',
    )
    expect(deps.log).not.toHaveBeenCalledWith(
      expect.stringContaining('dry-run would upload blob-cat-320 and create Convex draft metadata'),
    )
    expect(deps.log).not.toHaveBeenCalledWith(
      expect.stringContaining('dry-run would upload blob-cat-blur and create Convex draft metadata'),
    )
  })

  it('deletes uploaded UploadThing files when Convex draft creation fails', async () => {
    const cwd = await createTempCwd()
    await writeManifest(cwd)
    await writeOriginal(cwd, 'fixture-photo.jpg')
    const deps = createDeps()
    deps.mutation.mockImplementation(async (_reference: unknown, args: unknown) => {
      if (args && typeof args === 'object' && 'stableId' in args) {
        throw new Error('Convex draft creation failed')
      }
      return null
    })

    await expect(migratePetGalleryToUploadThing({ cwd, resume: true }, deps)).rejects.toThrow(
      'Convex draft creation failed',
    )

    expect(deps.deleteFiles).toHaveBeenCalledWith([
      'uploaded/fixture-photo-thumb.webp',
      'uploaded/fixture-photo-card.webp',
      'uploaded/fixture-photo-display.webp',
      'uploaded/fixture-photo-full.webp',
    ])
    expect(deps.mutation).toHaveBeenCalledWith(expect.anything(), {
      variantKeys: [
        'uploaded/fixture-photo-thumb.webp',
        'uploaded/fixture-photo-card.webp',
        'uploaded/fixture-photo-display.webp',
        'uploaded/fixture-photo-full.webp',
      ],
      ok: true,
    })
    await expect(fs.stat(getDefaultPetGalleryMigrationResumeFile(cwd))).rejects.toThrow()
  })

  it('skips duplicate images already processed earlier in the same migration run', async () => {
    const cwd = await createTempCwd()
    const manifest = {
      generatedAt: fixtureManifest.generatedAt,
      images: [fixtureManifest.images[0]!, fixtureManifest.images[0]!],
    }
    await writeManifest(cwd, manifest)
    await writeOriginal(cwd, 'fixture-photo.jpg')
    const deps = createDeps()

    const result = await migratePetGalleryToUploadThing({ cwd }, deps)

    expect(result.uploaded).toBe(1)
    expect(result.skipped).toBe(1)
    expect(deps.uploadFiles).toHaveBeenCalledOnce()
    expect(deps.mutation.mock.calls.at(-1)?.[1]).toMatchObject({ expectedMinimumPhotoCount: 1 })
  })

  it('preserves the Convex failure reason when cleanup after a failed draft also fails', async () => {
    const cwd = await createTempCwd()
    await writeManifest(cwd)
    await writeOriginal(cwd, 'fixture-photo.jpg')
    const deps = createDeps()
    deps.mutation.mockImplementation(async (_reference: unknown, args: unknown) => {
      if (args && typeof args === 'object' && 'stableId' in args) {
        throw new Error('Convex draft creation failed')
      }
      return null
    })
    deps.deleteFiles.mockRejectedValue(new Error('UploadThing cleanup failed'))

    await expect(migratePetGalleryToUploadThing({ cwd, resume: true }, deps)).rejects.toThrow(
      'Convex draft creation failed; uploaded files for fixture-photo could not be cleaned up: UploadThing cleanup failed',
    )
    expect(deps.mutation).toHaveBeenLastCalledWith(api.petGallery.recordUploadedVariantCleanupResult, {
      variantKeys: [
        'uploaded/fixture-photo-thumb.webp',
        'uploaded/fixture-photo-card.webp',
        'uploaded/fixture-photo-display.webp',
        'uploaded/fixture-photo-full.webp',
      ],
      ok: false,
      error: 'UploadThing cleanup failed',
    })
    await expect(fs.stat(getDefaultPetGalleryMigrationResumeFile(cwd))).rejects.toThrow()
  })

  it('treats partial UploadThing cleanup after failed draft creation as cleanup failure', async () => {
    const cwd = await createTempCwd()
    await writeManifest(cwd)
    await writeOriginal(cwd, 'fixture-photo.jpg')
    const deps = createDeps()
    deps.mutation.mockImplementation(async (_reference: unknown, args: unknown) => {
      if (args && typeof args === 'object' && 'stableId' in args) {
        throw new Error('Convex draft creation failed')
      }
      return null
    })
    deps.deleteFiles.mockResolvedValue({ success: false, deletedCount: 3 })

    await expect(migratePetGalleryToUploadThing({ cwd, resume: true }, deps)).rejects.toThrow(
      'Convex draft creation failed; uploaded files for fixture-photo could not be cleaned up: UploadThing deleted 3 of 4 files',
    )
    await expect(fs.stat(getDefaultPetGalleryMigrationResumeFile(cwd))).rejects.toThrow()
  })

  it('cleans up partial UploadThing upload results before failing count validation', async () => {
    const cwd = await createTempCwd()
    await writeManifest(cwd)
    await writeOriginal(cwd, 'fixture-photo.jpg')
    const deps = createDeps()
    deps.uploadFiles.mockResolvedValue([
      {
        key: 'uploaded/fixture-thumb.webp',
        url: 'https://utfs.io/f/fixture-thumb.webp',
        ufsUrl: 'https://utfs.io/f/fixture-thumb.webp',
        name: 'fixture-thumb.webp',
        size: 1,
        type: 'image/webp',
      },
    ])

    await expect(migratePetGalleryToUploadThing({ cwd, resume: true }, deps)).rejects.toThrow(
      'UploadThing returned 1 files for fixture-photo; expected 4',
    )
    expect(deps.deleteFiles).toHaveBeenCalledWith(['uploaded/fixture-thumb.webp'])
    await expect(fs.stat(getDefaultPetGalleryMigrationResumeFile(cwd))).rejects.toThrow()
  })
})
