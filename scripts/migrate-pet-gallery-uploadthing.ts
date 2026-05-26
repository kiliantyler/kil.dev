import { list } from '@vercel/blob'
import { ConvexHttpClient } from 'convex/browser'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import sharp from 'sharp'
import { UTApi } from 'uploadthing/server'
import { api } from '../convex/_generated/api'
import {
  PET_GALLERY_VARIANT_LONG_EDGES,
  PET_GALLERY_VARIANTS,
  type PetGalleryImageVariants,
} from '../src/lib/pet-gallery/types'
import { uploadThingDeleteResultError } from '../src/lib/pet-gallery/uploadthing-delete-result'

type GalleryManifestImage = {
  fileName: string
  url: string
  blobUrl?: string
  alt?: string
  width?: number
  height?: number
}

type GalleryManifest = {
  images: GalleryManifestImage[]
  remoteManifestUrl?: string
}

type BlobListItem = {
  pathname: string
  url: string
}

type ExistingPhoto = {
  stableId: string
  sourceHash: string
}

type UploadedFile = {
  key: string
  url?: string
  ufsUrl?: string
  name: string
  size: number
  type: string
}

type ResumeEntry = {
  stableId: string
  sourceHash: string
}

type ResumeState = {
  completed: ResumeEntry[]
}

export type PetGalleryGeneratedVariant = {
  kind: (typeof PET_GALLERY_VARIANTS)[number]
  longEdge: number
  buffer: Buffer
  width: number
  height: number
  byteSize: number
  mimeType: 'image/webp'
  extension: 'webp'
  name: string
}

export type PetGalleryMigrationDeps = {
  uploadThing: {
    uploadFiles: (files: File[]) => Promise<unknown[] | unknown>
    deleteFiles?: (keys: string[] | string) => Promise<unknown>
  }
  convex: {
    query: (
      reference: unknown,
      args: Record<string, unknown>,
    ) => Promise<{
      photos: ExistingPhoto[]
    }>
    mutation: (reference: unknown, args: Record<string, unknown>) => Promise<unknown>
  }
  fetch?: typeof fetch
  now?: () => number
  log?: (message: string) => void
}

export type PetGalleryMigrationOptions = {
  cwd?: string
  dryRun?: boolean
  resume?: boolean
  manifestPath?: string
  resumeFile?: string
  remoteManifestUrl?: string
}

export type PetGalleryMigrationResult = {
  planned: number
  uploaded: number
  skipped: number
  resumed: number
  published: boolean
}

export function getDefaultPetGalleryMigrationResumeFile(cwd = process.cwd()) {
  return path.join(cwd, '.plans', 'pet-gallery-uploadthing-migration.resume.json')
}

export function getPetGalleryConvexAuthToken(env = process.env) {
  return [env.PET_GALLERY_CONVEX_ACCESS_TOKEN, env.CONVEX_AUTH_TOKEN].map(token => token?.trim()).find(Boolean)
}

export function hashPetGallerySource(buffer: Buffer | Uint8Array) {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

export function stableIdFromPetGalleryImage(image: Pick<GalleryManifestImage, 'fileName' | 'url'>) {
  const source = image.fileName || image.url.split('/').findLast(Boolean) || 'photo'
  const withoutExtension = source.replace(/\.[^.]+$/, '')
  const stableId = withoutExtension
    .normalize('NFKD')
    .replaceAll(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '')

  return stableId || 'photo'
}

export async function generatePetGalleryUploadThingVariants(
  source: Buffer | Uint8Array,
  stableId: string,
): Promise<PetGalleryGeneratedVariant[]> {
  const variants: PetGalleryGeneratedVariant[] = []

  for (const kind of PET_GALLERY_VARIANTS) {
    const longEdge = PET_GALLERY_VARIANT_LONG_EDGES[kind]
    const buffer = await sharp(source)
      .rotate()
      .resize({ width: longEdge, height: longEdge, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer()
    const metadata = await sharp(buffer).metadata()
    const width = metadata.width
    const height = metadata.height

    if (!width || !height) {
      throw new Error(`Unable to read generated pet gallery ${kind} variant dimensions for ${stableId}`)
    }

    variants.push({
      kind,
      longEdge,
      buffer,
      width,
      height,
      byteSize: buffer.byteLength,
      mimeType: 'image/webp',
      extension: 'webp',
      name: `${stableId}-${kind}.webp`,
    })
  }

  return variants
}

export async function migratePetGalleryToUploadThing(
  options: PetGalleryMigrationOptions = {},
  injectedDeps?: PetGalleryMigrationDeps,
): Promise<PetGalleryMigrationResult> {
  const cwd = options.cwd ?? process.cwd()
  const dryRun = options.dryRun ?? false
  const resumeFile = options.resumeFile ?? getDefaultPetGalleryMigrationResumeFile(cwd)
  const deps = injectedDeps ?? createDefaultDeps({ dryRun })
  const log = deps.log ?? console.log
  const manifest = await readPetGalleryManifest({
    cwd,
    manifestPath: options.manifestPath,
    remoteManifestUrl: options.remoteManifestUrl,
    deps,
  })
  const existingState = await deps.convex.query(api.petGallery.getAdminState, {})
  const existingStableIds = new Set(existingState.photos.map(photo => photo.stableId))
  const existingSourceHashes = new Set(existingState.photos.map(photo => photo.sourceHash))
  const resumeState = options.resume ? await readResumeState(resumeFile) : { completed: [] }
  const completedStableIds = new Set(resumeState.completed.map(entry => entry.stableId))
  const completedSourceHashes = new Set(resumeState.completed.map(entry => entry.sourceHash))
  const seenStableIds = new Set(existingStableIds)
  const seenSourceHashes = new Set(existingSourceHashes)
  const result: PetGalleryMigrationResult = {
    planned: 0,
    uploaded: 0,
    skipped: 0,
    resumed: 0,
    published: false,
  }

  for (const [draftOrder, image] of manifest.images.entries()) {
    const stableId = stableIdFromPetGalleryImage(image)
    const source = await readSourceImage(cwd, image, deps.fetch ?? fetch)
    const sourceHash = hashPetGallerySource(source)

    if (seenStableIds.has(stableId) || seenSourceHashes.has(sourceHash)) {
      result.skipped += 1
      log(`[pet-gallery:migrate] skip ${stableId}: already exists in Convex`)
      continue
    }

    if (options.resume && (completedStableIds.has(stableId) || completedSourceHashes.has(sourceHash))) {
      result.resumed += 1
      seenStableIds.add(stableId)
      seenSourceHashes.add(sourceHash)
      log(`[pet-gallery:migrate] resume skip ${stableId}: already completed`)
      continue
    }

    result.planned += 1

    if (dryRun) {
      seenStableIds.add(stableId)
      seenSourceHashes.add(sourceHash)
      log(`[pet-gallery:migrate] dry-run would upload ${stableId} and create Convex draft metadata`)
      continue
    }

    const generatedVariants = await generatePetGalleryUploadThingVariants(source, stableId)
    const uploaded = normalizeUploadedFiles(await deps.uploadThing.uploadFiles(generatedVariants.map(variantToFile)))

    try {
      if (uploaded.length !== generatedVariants.length) {
        throw new Error(
          `UploadThing returned ${uploaded.length} files for ${stableId}; expected ${generatedVariants.length}`,
        )
      }

      const variants = await recordUploadedVariants(deps, stableId, generatedVariants, uploaded)
      await deps.convex.mutation(api.petGallery.createPhotoDraft, {
        stableId,
        sourceHash,
        caption: image.alt || image.fileName,
        altText: image.alt || undefined,
        internalNotes: undefined,
        variants,
        animalIds: [],
        draftVisible: true,
        draftOrder,
        favorite: false,
        cover: false,
        approximateDate: undefined,
      })
    } catch (error) {
      await cleanupUploadedFilesAfterFailedDraft(deps, stableId, uploaded, error)
    }

    result.uploaded += 1
    seenStableIds.add(stableId)
    seenSourceHashes.add(sourceHash)
    resumeState.completed.push({ stableId, sourceHash })
    await writeResumeState(resumeFile, resumeState)
    log(`[pet-gallery:migrate] uploaded ${stableId}`)
  }

  const expectedMinimumPhotoCount = existingState.photos.length + result.uploaded + result.resumed

  if (!dryRun && expectedMinimumPhotoCount > 0) {
    await deps.convex.mutation(api.petGallery.publishDraft, {
      now: deps.now?.() ?? Date.now(),
      revision: `pet-gallery-uploadthing-migration-${deps.now?.() ?? Date.now()}`,
      expectedMinimumPhotoCount,
    })
    result.published = true
    log(`[pet-gallery:migrate] published initial snapshot for ${expectedMinimumPhotoCount} static photos`)
  }

  return result
}

function createDefaultDeps({ dryRun }: { dryRun: boolean }): PetGalleryMigrationDeps {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
  const convexToken = getPetGalleryConvexAuthToken()
  const uploadThingToken = process.env.UPLOADTHING_TOKEN

  if (dryRun && (!convexUrl || !convexToken)) {
    return {
      uploadThing: {
        uploadFiles: async () => {
          throw new Error('UploadThing writes are disabled during dry-run')
        },
      },
      convex: {
        query: async () => ({ photos: [] }),
        mutation: async () => {
          throw new Error('Convex writes are disabled during dry-run')
        },
      },
    }
  }

  if (!convexUrl) throw new Error('Missing NEXT_PUBLIC_CONVEX_URL for pet gallery migration')
  if (!convexToken) {
    throw new Error('Missing PET_GALLERY_CONVEX_ACCESS_TOKEN or CONVEX_AUTH_TOKEN for pet gallery migration')
  }
  if (!dryRun && !uploadThingToken) throw new Error('Missing UPLOADTHING_TOKEN for pet gallery migration')

  const convex = new ConvexHttpClient(convexUrl)
  convex.setAuth(convexToken)
  const uploadThing = new UTApi({ token: uploadThingToken })

  return {
    uploadThing: {
      uploadFiles: files => uploadThing.uploadFiles(files),
      deleteFiles: keys => uploadThing.deleteFiles(keys),
    },
    convex: {
      query: (reference, args) =>
        (convex.query as (reference: unknown, args: Record<string, unknown>) => Promise<{ photos: ExistingPhoto[] }>)(
          reference,
          args,
        ),
      mutation: (reference, args) =>
        (convex.mutation as (reference: unknown, args: Record<string, unknown>) => Promise<unknown>)(reference, args),
    },
  }
}

async function readPetGalleryManifest({
  cwd,
  manifestPath,
  remoteManifestUrl,
  deps,
}: {
  cwd: string
  manifestPath?: string
  remoteManifestUrl?: string
  deps: PetGalleryMigrationDeps
}): Promise<GalleryManifest> {
  const localManifestPath = manifestPath ?? path.join(cwd, 'public', 'pet-gallery', 'manifest.json')

  try {
    return parseManifest(await fs.readFile(localManifestPath, 'utf8'), localManifestPath)
  } catch (error) {
    if (!isNotFound(error)) throw error
  }

  if (remoteManifestUrl) {
    const response = await (deps.fetch ?? fetch)(remoteManifestUrl, { cache: 'no-store' })
    if (!response.ok)
      throw new Error(`Unable to fetch remote pet gallery manifest: ${response.status} ${response.statusText}`)

    return parseManifest(await response.text(), remoteManifestUrl)
  }

  const remoteManifest = await readRemoteBlobManifest(deps)
  if (!remoteManifest) {
    throw new Error(
      `Pet gallery manifest not found at ${localManifestPath} and no remote manifest fallback is available`,
    )
  }

  return remoteManifest
}

async function readRemoteBlobManifest(deps: PetGalleryMigrationDeps): Promise<GalleryManifest | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) return null

  const { blobs } = await list({ prefix: 'pet-gallery/', token })
  const manifestBlob = blobs.find(blob => blob.pathname === 'pet-gallery/manifest.json')
  if (manifestBlob) {
    const response = await (deps.fetch ?? fetch)(manifestBlob.url, { cache: 'no-store' })
    if (!response.ok)
      throw new Error(`Unable to fetch remote pet gallery manifest: ${response.status} ${response.statusText}`)

    return parseManifest(await response.text(), manifestBlob.url)
  }

  const images = synthesizeManifestImagesFromBlobList(blobs)
  return images.length > 0 ? { images } : null
}

function synthesizeManifestImagesFromBlobList(blobs: BlobListItem[]): GalleryManifestImage[] {
  return blobs
    .filter(blob => isPetGallerySourceImagePath(blob.pathname))
    .toSorted((a, b) => a.pathname.localeCompare(b.pathname))
    .map(blob => {
      const fileName = blob.pathname.split('/').findLast(Boolean) ?? blob.pathname
      return {
        fileName,
        url: blob.url,
        blobUrl: blob.url,
      }
    })
}

function isPetGallerySourceImagePath(pathname: string) {
  if (pathname.endsWith('/')) return false
  if (pathname === 'pet-gallery/manifest.json') return false
  const fileName = pathname.split('/').findLast(Boolean) ?? pathname
  if (/-blur\.webp$/i.test(fileName)) return false
  if (/-\d+\.(?:avif|gif|jpe?g|png|webp)$/i.test(fileName)) return false
  return /\.(?:avif|gif|jpe?g|png|webp)$/i.test(pathname)
}

function parseManifest(raw: string, source: string): GalleryManifest {
  const parsed = JSON.parse(raw) as GalleryManifest
  if (!Array.isArray(parsed.images)) {
    throw new TypeError(`Invalid pet gallery manifest at ${source}: missing images array`)
  }
  return parsed
}

async function readSourceImage(cwd: string, image: GalleryManifestImage, fetchImpl: typeof fetch) {
  const candidates = [
    path.join(cwd, 'public', 'pet-gallery', 'originals', image.fileName),
    image.url.startsWith('/pet-gallery/originals/') ? path.join(cwd, 'public', image.url.replace(/^\//, '')) : null,
  ].filter(Boolean) as string[]

  for (const candidate of candidates) {
    try {
      return await fs.readFile(candidate)
    } catch (error) {
      if (!isNotFound(error)) throw error
    }
  }

  const fallbackUrl = image.blobUrl ?? (isAbsoluteUrl(image.url) ? image.url : null)
  if (!fallbackUrl) throw new Error(`Missing local original and Blob fallback for ${image.fileName}`)

  const response = await fetchImpl(fallbackUrl, { cache: 'no-store' })
  if (!response.ok)
    throw new Error(`Unable to fetch Blob fallback for ${image.fileName}: ${response.status} ${response.statusText}`)
  return Buffer.from(await response.arrayBuffer())
}

function variantToFile(variant: PetGalleryGeneratedVariant) {
  return new File([new Uint8Array(variant.buffer)], variant.name, { type: variant.mimeType })
}

function normalizeUploadedFiles(uploadResult: unknown[] | unknown): UploadedFile[] {
  const results = Array.isArray(uploadResult) ? uploadResult : [uploadResult]

  return results.map(result => {
    const record = result && typeof result === 'object' ? (result as Record<string, unknown>) : {}
    if (record.error) throw new Error(`UploadThing upload failed: ${String(record.error)}`)
    const data = record.data && typeof record.data === 'object' ? (record.data as Record<string, unknown>) : record
    const key = typeof data.key === 'string' ? data.key : ''
    const url = typeof data.ufsUrl === 'string' ? data.ufsUrl : typeof data.url === 'string' ? data.url : ''
    const name = typeof data.name === 'string' ? data.name : key
    const size = typeof data.size === 'number' ? data.size : 0
    const type = typeof data.type === 'string' ? data.type : 'image/webp'

    if (!key || !url) throw new Error('UploadThing upload result is missing a key or URL')

    return { key, url, ufsUrl: url, name, size, type }
  })
}

async function recordUploadedVariants(
  deps: PetGalleryMigrationDeps,
  stableId: string,
  generatedVariants: PetGalleryGeneratedVariant[],
  uploaded: UploadedFile[],
): Promise<PetGalleryImageVariants> {
  const variants = {} as PetGalleryImageVariants

  for (const [index, generated] of generatedVariants.entries()) {
    const file = uploaded[index]
    if (!file) throw new Error(`Missing UploadThing result for ${stableId} ${generated.kind} variant`)

    await deps.convex.mutation(api.petGallery.recordPendingVariantUpload, {
      key: file.key,
      url: file.ufsUrl ?? file.url ?? '',
      name: file.name,
      size: file.size || generated.byteSize,
      mimeType: file.type || generated.mimeType,
    })

    const variant = {
      kind: generated.kind,
      key: file.key,
      url: file.ufsUrl ?? file.url ?? '',
      width: generated.width,
      height: generated.height,
      byteSize: generated.byteSize,
      mimeType: generated.mimeType,
      extension: generated.extension,
    }

    Object.assign(variants, { [generated.kind]: variant })
  }

  if (Object.keys(variants).length !== PET_GALLERY_VARIANTS.length) {
    throw new Error(`Missing generated UploadThing variants for ${stableId}`)
  }

  return variants
}

async function cleanupUploadedFilesAfterFailedDraft(
  deps: PetGalleryMigrationDeps,
  stableId: string,
  uploaded: UploadedFile[],
  originalError: unknown,
): Promise<never> {
  const originalMessage = errorMessage(originalError)
  const keys = uploaded.map(file => file.key).filter(Boolean)

  if (keys.length === 0) throw new Error(originalMessage)
  if (!deps.uploadThing.deleteFiles) {
    throw new Error(`${originalMessage}; uploaded files could not be cleaned up because deleteFiles is unavailable`)
  }

  try {
    const result = await deps.uploadThing.deleteFiles(keys)
    const cleanupError = uploadThingDeleteFailureMessage(result, keys.length)
    if (cleanupError) {
      throw new Error(cleanupError)
    }
    await deps.convex.mutation(api.petGallery.recordUploadedVariantCleanupResult, {
      variantKeys: keys,
      ok: true,
    })
  } catch (cleanupError) {
    const cleanupMessage = errorMessage(cleanupError)
    await deps.convex
      .mutation(api.petGallery.recordUploadedVariantCleanupResult, {
        variantKeys: keys,
        ok: false,
        error: cleanupMessage,
      })
      .catch(() => null)
    throw new Error(`${originalMessage}; uploaded files for ${stableId} could not be cleaned up: ${cleanupMessage}`)
  }

  throw new Error(originalMessage)
}

function uploadThingDeleteFailureMessage(result: unknown, expectedCount: number) {
  if (!result || typeof result !== 'object' || !('success' in result)) return null
  const record = result as { success?: unknown; deletedCount?: unknown }
  if (typeof record.success !== 'boolean') return null

  return uploadThingDeleteResultError(
    {
      success: record.success,
      deletedCount: typeof record.deletedCount === 'number' ? record.deletedCount : 0,
    },
    expectedCount,
  )
}

async function readResumeState(resumeFile: string): Promise<ResumeState> {
  try {
    const parsed = JSON.parse(await fs.readFile(resumeFile, 'utf8')) as ResumeState
    return { completed: Array.isArray(parsed.completed) ? parsed.completed : [] }
  } catch (error) {
    if (isNotFound(error)) return { completed: [] }
    throw error
  }
}

async function writeResumeState(resumeFile: string, resumeState: ResumeState) {
  await fs.mkdir(path.dirname(resumeFile), { recursive: true })
  await fs.writeFile(resumeFile, JSON.stringify(resumeState, null, 2))
}

function isAbsoluteUrl(value: string) {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function isNotFound(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')
}

function parseCliArgs(argv: string[]): PetGalleryMigrationOptions {
  const options: PetGalleryMigrationOptions = {}

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--dry-run') options.dryRun = true
    else if (arg === '--resume') options.resume = true
    else if (arg === '--manifest') options.manifestPath = argv[++index]
    else if (arg === '--resume-file') options.resumeFile = argv[++index]
    else if (arg === '--remote-manifest-url') options.remoteManifestUrl = argv[++index]
    else throw new Error(`Unknown pet gallery migration option: ${arg}`)
  }

  return options
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await migratePetGalleryToUploadThing(parseCliArgs(process.argv.slice(2)))
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}
