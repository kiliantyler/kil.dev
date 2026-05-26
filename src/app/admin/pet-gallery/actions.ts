'use server'

import { requirePetGalleryAdminEnv } from '@/env'
import {
  ADMIN_TEST_BYPASS_COOKIE,
  ADMIN_TEST_BYPASS_COOKIE_VALUE,
  isAdminTestBypassEnvEnabled,
} from '@/lib/admin-test-bypass'
import {
  createTestBypassPetGalleryAdminState,
  DEFAULT_PET_GALLERY_ANIMAL_COLOR,
  validateNewAnimalName,
  type AdminWorkspaceAnimal,
  type AdminWorkspaceAnimalPatch,
  type AdminWorkspacePhoto,
  type AdminWorkspacePhotoPatch,
  type PetGalleryAdminWorkspaceState,
} from '@/lib/pet-gallery/admin-workspace'
import { normalizePetGalleryApproximateDate } from '@/lib/pet-gallery/approximate-date'
import { createPetGalleryConvexServerClient } from '@/lib/pet-gallery/convex-server-client'
import type {
  PetGalleryAnimalSpecies,
  PetGalleryImageVariants,
  PublicPetGallerySnapshot,
} from '@/lib/pet-gallery/types'
import { uploadThingDeleteResultError } from '@/lib/pet-gallery/uploadthing-delete-result'
import type { ConvexHttpClient } from 'convex/browser'
import { revalidatePath, revalidateTag } from 'next/cache'
import { cookies } from 'next/headers'
import { UTApi } from 'uploadthing/server'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'

type CleanupId = Id<'petGalleryDeletedPhotoFiles'>
type PhotoId = Id<'petGalleryPhotos'>
type AnimalId = Id<'petGalleryAnimals'>

type CleanupResult = {
  cleanupId: CleanupId
  variantKeys: string[]
  ok: boolean
  deletedCount: number
  error?: string
  revalidationError?: string
  state?: PetGalleryAdminWorkspaceState
}

type CleanupResultWithoutState = Omit<CleanupResult, 'state' | 'revalidationError'>

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown pet gallery file cleanup failure'
}

function createUploadThingApi() {
  const { UPLOADTHING_TOKEN } = requirePetGalleryAdminEnv()
  return new UTApi({ token: UPLOADTHING_TOKEN })
}

function filenameFromVariantKey(key: string, fallback: string) {
  const last = key
    .split('/')
    .toReversed()
    .find(part => part.length > 0)
  return last || fallback
}

function toWorkspaceState(
  rawState: {
    animals: Array<{
      _id: AnimalId
      stableId: string
      name: string
      species?: PetGalleryAnimalSpecies
      color: string
      sortOrder: number
      hidden: boolean
    }>
    photos: Array<{
      _id: PhotoId
      stableId: string
      sourceHash: string
      title?: string
      caption?: string
      altText?: string
      internalNotes?: string
      variants: PetGalleryImageVariants
      animalIds: AnimalId[]
      draftVisible: boolean
      draftOrder: number
      favorite: boolean
      cover: boolean
      approximateDate?: AdminWorkspacePhoto['approximateDate']
    }>
    publishHistory: Array<{
      revision: string
      publishedAt: number
      photoCount: number
      animalCount: number
      actor?: {
        email: string
        name?: string
      }
    }>
    draft: {
      updatedAt: number
      lastPublishedRevision?: string
    } | null
  },
  publicSnapshot?: PublicPetGallerySnapshot | null,
): PetGalleryAdminWorkspaceState {
  const animalStableIdsByDocId = new Map(rawState.animals.map(animal => [animal._id, animal.stableId]))
  const animals: AdminWorkspaceAnimal[] = rawState.animals.map(animal => ({
    docId: animal._id,
    stableId: animal.stableId,
    name: animal.name,
    species: animal.species,
    order: animal.sortOrder,
    hidden: animal.hidden,
    color: animal.color,
  }))
  const photos: AdminWorkspacePhoto[] = rawState.photos.map(photo => {
    const filename = filenameFromVariantKey(
      photo.variants.full.key,
      `${photo.stableId}.${photo.variants.full.extension}`,
    )
    return {
      docId: photo._id,
      stableId: photo.stableId,
      sourceHash: photo.sourceHash,
      filename,
      title: photo.title ?? photo.caption ?? filename,
      caption: photo.caption,
      altText: photo.altText ?? photo.caption ?? filename,
      internalNotes: photo.internalNotes,
      variants: photo.variants,
      animalIds: photo.animalIds.flatMap(animalId => {
        const stableId = animalStableIdsByDocId.get(animalId)
        return stableId ? [stableId] : []
      }),
      draftVisible: photo.draftVisible,
      draftOrder: photo.draftOrder,
      favorite: photo.favorite,
      cover: photo.cover,
      approximateDate: photo.approximateDate,
    }
  })

  return {
    mode: 'convex',
    animals,
    photos,
    publishedOrderBaseline: publicSnapshot
      ? publicSnapshot.photos.flatMap(
          publicPhoto => photos.find(photo => photo.stableId === publicPhoto.stableId) ?? [],
        )
      : photos,
    publishHistory: rawState.publishHistory.map(item => ({
      revision: item.revision,
      publishedAt: item.publishedAt,
      photoCount: item.photoCount,
      animalCount: item.animalCount,
      actorEmail: item.actor?.email,
      actorName: item.actor?.name,
    })),
    draftUpdatedAt: rawState.draft?.updatedAt,
    lastPublishedRevision: rawState.draft?.lastPublishedRevision,
  }
}

async function isTestBypassRequest() {
  if (!isAdminTestBypassEnvEnabled()) return false
  const requestCookies = await cookies()
  return requestCookies.get(ADMIN_TEST_BYPASS_COOKIE)?.value === ADMIN_TEST_BYPASS_COOKIE_VALUE
}

async function getFreshWorkspaceState(convex?: ConvexHttpClient): Promise<PetGalleryAdminWorkspaceState> {
  if (await isTestBypassRequest()) return createTestBypassPetGalleryAdminState()

  const client = convex ?? (await createPetGalleryConvexServerClient())
  const rawState = await client.query(api.petGallery.getAdminState, {})
  const publicSnapshot = await client.query(api.petGallery.getPublicSnapshot, {})
  return toWorkspaceState(rawState as Parameters<typeof toWorkspaceState>[0], publicSnapshot)
}

async function mutateAndRefresh(
  mutation: (convex: ConvexHttpClient) => Promise<unknown>,
): Promise<PetGalleryAdminWorkspaceState> {
  const convex = await createPetGalleryConvexServerClient()
  await mutation(convex)
  return getFreshWorkspaceState(convex)
}

async function recordCleanupResult(
  convex: ConvexHttpClient,
  cleanupId: CleanupId,
  ok: boolean,
  error?: string,
  remainingVariantKeys?: string[],
): Promise<string | null> {
  try {
    await convex.mutation(api.petGallery.recordPhotoFileCleanupResult, { cleanupId, ok, error, remainingVariantKeys })
    return null
  } catch (recordError) {
    return errorMessage(recordError)
  }
}

async function listExistingUploadThingKeys(uploadThing: ReturnType<typeof createUploadThingApi>, keys: string[]) {
  if (keys.length === 0 || !uploadThing.getFileUrls) return keys

  const fileUrls = await uploadThing.getFileUrls(keys)
  const existingKeys = new Set(fileUrls.data.map(file => file.key))
  return keys.filter(key => existingKeys.has(key))
}

async function deleteVariantKeys(
  convex: ConvexHttpClient,
  cleanupId: CleanupId,
  variantKeys: string[],
  uploadThing = createUploadThingApi(),
): Promise<CleanupResultWithoutState> {
  if (variantKeys.length === 0) {
    const recordError = await recordCleanupResult(convex, cleanupId, true)
    return { cleanupId, variantKeys, ok: !recordError, deletedCount: 0, error: recordError ?? undefined }
  }

  let result: Awaited<ReturnType<ReturnType<typeof createUploadThingApi>['deleteFiles']>>
  try {
    result = await uploadThing.deleteFiles(variantKeys)
  } catch (error) {
    const message = errorMessage(error)
    const recordError = await recordCleanupResult(convex, cleanupId, false, message)
    return {
      cleanupId,
      variantKeys,
      ok: false,
      deletedCount: 0,
      error: recordError ? `${message}; cleanup result recording failed: ${recordError}` : message,
    }
  }

  let remainingVariantKeys: string[] | undefined
  let error = uploadThingDeleteResultError(result, variantKeys.length)
  let ok = !error

  if (error) {
    remainingVariantKeys = await listExistingUploadThingKeys(uploadThing, variantKeys)
    ok = remainingVariantKeys.length === 0
    error = ok ? undefined : error
  }

  const recordError = await recordCleanupResult(convex, cleanupId, ok, error, ok ? undefined : remainingVariantKeys)
  return {
    cleanupId,
    variantKeys: ok ? variantKeys : (remainingVariantKeys ?? variantKeys),
    ok: ok && !recordError,
    deletedCount: result.deletedCount,
    error: recordError ?? error,
  }
}

function revalidatePetGalleryStaticRoutes() {
  let failure: string | undefined

  try {
    revalidateTag('pet-gallery', 'max')
  } catch (error) {
    failure ??= errorMessage(error)
  }

  try {
    revalidatePath('/pet-gallery')
  } catch (error) {
    failure ??= errorMessage(error)
  }

  return failure
}

function requireExistingSnapshotForPublish() {
  const convexDeployment = process.env.CONVEX_DEPLOYMENT?.trim()
  if (convexDeployment) return !convexDeployment.startsWith('dev:')
  return true
}

export async function publishPetGalleryAction() {
  const convex = await createPetGalleryConvexServerClient()
  const summary = await convex.mutation(api.petGallery.publishDraft, {
    requireExistingSnapshot: requireExistingSnapshotForPublish(),
  })
  const revalidationError = revalidatePetGalleryStaticRoutes()
  const state = await getFreshWorkspaceState(convex)

  return {
    summary: revalidationError ? { ...summary, revalidationError } : summary,
    state,
  }
}

export async function deletePetGalleryPhotoAction(photoId: string): Promise<CleanupResult> {
  const convex = await createPetGalleryConvexServerClient()
  const uploadThing = createUploadThingApi()
  const cleanup = await convex.mutation(api.petGallery.beginPhotoHardDelete, { photoId: photoId as PhotoId })
  const revalidationError = revalidatePetGalleryStaticRoutes()

  if (revalidationError) {
    try {
      const state = await getFreshWorkspaceState(convex)
      return {
        cleanupId: cleanup.cleanupId,
        variantKeys: cleanup.variantKeys,
        ok: false,
        deletedCount: 0,
        error: 'Photo metadata was deleted, but file cleanup is waiting for public gallery revalidation.',
        revalidationError,
        state,
      }
    } catch (error) {
      return {
        cleanupId: cleanup.cleanupId,
        variantKeys: cleanup.variantKeys,
        ok: false,
        deletedCount: 0,
        error: `Photo metadata was deleted, but file cleanup is waiting for public gallery revalidation; refresh failed: ${errorMessage(error)}`,
        revalidationError,
      }
    }
  }

  const result = await deleteVariantKeys(convex, cleanup.cleanupId, cleanup.variantKeys, uploadThing)

  try {
    const state = await getFreshWorkspaceState(convex)
    return { ...result, state }
  } catch (error) {
    const refreshError = errorMessage(error)
    const mergedError = result.error ? `${result.error}; refresh failed: ${refreshError}` : refreshError
    return { ...result, ok: false, error: mergedError }
  }
}

export async function getPetGalleryAdminWorkspaceStateAction() {
  return getFreshWorkspaceState()
}

export async function createPetGalleryAnimalAction(name: string) {
  return mutateAndRefresh(async convex => {
    const state = await getFreshWorkspaceState(convex)
    const stableId = validateNewAnimalName(name, state.animals)
    const sortOrder = Math.max(0, ...state.animals.map(animal => animal.order ?? 0)) + 1
    await convex.mutation(api.petGallery.createAnimal, {
      stableId,
      name: name.trim(),
      species: 'cat',
      color: DEFAULT_PET_GALLERY_ANIMAL_COLOR,
      sortOrder,
    })
  })
}

export async function updatePetGalleryAnimalAction(animalId: string, patch: AdminWorkspaceAnimalPatch) {
  return mutateAndRefresh(async convex => {
    const state = await getFreshWorkspaceState(convex)
    const animal = state.animals.find(item => item.docId === animalId)
    if (!animal) throw new Error('Pet gallery animal not found')
    await convex.mutation(api.petGallery.updateAnimal, {
      animalId: animalId as AnimalId,
      name: (patch.name ?? animal.name).trim(),
      species: patch.species ?? animal.species,
      color: patch.color ?? animal.color ?? DEFAULT_PET_GALLERY_ANIMAL_COLOR,
      sortOrder: patch.order ?? animal.order ?? 0,
    })
  })
}

export async function reorderPetGalleryAnimalsAction(orderedStableIds: string[]) {
  return mutateAndRefresh(async convex => {
    const state = await getFreshWorkspaceState(convex)
    const animalsByStableId = new Map(state.animals.map(animal => [animal.stableId, animal]))

    for (const [index, stableId] of orderedStableIds.entries()) {
      const animal = animalsByStableId.get(stableId)
      if (!animal) throw new Error(`Pet gallery animal not found: ${stableId}`)
      await convex.mutation(api.petGallery.updateAnimal, {
        animalId: animal.docId as AnimalId,
        name: animal.name.trim(),
        species: animal.species,
        color: animal.color ?? DEFAULT_PET_GALLERY_ANIMAL_COLOR,
        sortOrder: index + 1,
      })
    }
  })
}

export async function hidePetGalleryAnimalAction(animalId: string) {
  return mutateAndRefresh(convex =>
    convex.mutation(api.petGallery.hideAnimal, {
      animalId: animalId as AnimalId,
    }),
  )
}

export async function restorePetGalleryAnimalAction(animalId: string) {
  return mutateAndRefresh(convex =>
    convex.mutation(api.petGallery.restoreAnimal, {
      animalId: animalId as AnimalId,
    }),
  )
}

export async function updatePetGalleryPhotoDraftAction(photoId: string, patch: AdminWorkspacePhotoPatch) {
  return mutateAndRefresh(async convex => {
    let animalIds: AnimalId[] | undefined

    if (patch.animalIds) {
      const state = await getFreshWorkspaceState(convex)
      const animalDocIdByStableId = new Map(state.animals.map(animal => [animal.stableId, animal.docId as AnimalId]))
      animalIds = patch.animalIds.map(animalId => {
        const docId = animalDocIdByStableId.get(animalId)
        if (!docId) throw new Error(`Pet gallery animal not found: ${animalId}`)
        return docId
      })
    }

    await convex.mutation(api.petGallery.updatePhotoDraft, {
      photoId: photoId as PhotoId,
      title: patch.title,
      caption: patch.caption,
      altText: patch.altText,
      internalNotes: patch.internalNotes,
      animalIds,
      draftVisible: patch.draftVisible,
      favorite: patch.favorite,
      cover: patch.cover,
      approximateDate: normalizePetGalleryApproximateDate(patch.approximateDate),
    })
  })
}

export async function bulkTagPetGalleryPhotosAction(
  photoIds: string[],
  animalIds: string[],
  mode: 'add' | 'remove' | 'replace',
) {
  return mutateAndRefresh(convex =>
    convex.mutation(api.petGallery.bulkTagPhotos, {
      photoIds: photoIds as PhotoId[],
      animalIds: animalIds as AnimalId[],
      mode,
    }),
  )
}

export async function reorderPetGalleryPhotosAction(photoIds: string[]) {
  return mutateAndRefresh(convex =>
    convex.mutation(api.petGallery.reorderPhotos, {
      photoIds: photoIds as PhotoId[],
    }),
  )
}

export async function createPetGalleryPhotoDraftAction(input: {
  stableId: string
  sourceHash: string
  filename: string
  variants: PetGalleryImageVariants
  animalIds: string[]
  draftOrder: number
  approximateDate?: AdminWorkspacePhoto['approximateDate']
}) {
  const convex = await createPetGalleryConvexServerClient()
  const photoId = await convex.mutation(api.petGallery.createPhotoDraft, {
    stableId: input.stableId,
    sourceHash: input.sourceHash,
    title: input.filename,
    caption: input.filename,
    altText: input.filename,
    internalNotes: undefined,
    variants: input.variants,
    animalIds: input.animalIds as AnimalId[],
    draftVisible: true,
    draftOrder: input.draftOrder,
    favorite: false,
    cover: false,
    approximateDate: normalizePetGalleryApproximateDate(input.approximateDate) ?? undefined,
  })
  let state: PetGalleryAdminWorkspaceState | undefined
  try {
    state = await getFreshWorkspaceState(convex)
  } catch {}
  return { photoId, state }
}

export async function cleanupUploadedPetGalleryVariantFilesAction(variantKeys: string[]) {
  if (variantKeys.length === 0) {
    return { ok: true, deletedCount: 0, variantKeys }
  }
  const convex = await createPetGalleryConvexServerClient()
  const uploadThing = createUploadThingApi()
  const pendingCleanup = await convex.mutation(api.petGallery.beginUploadedVariantCleanup, { variantKeys })

  let result: Awaited<ReturnType<ReturnType<typeof createUploadThingApi>['deleteFiles']>>
  try {
    result = await uploadThing.deleteFiles(pendingCleanup.variantKeys)
  } catch (error) {
    const message = errorMessage(error)
    await convex.mutation(api.petGallery.recordUploadedVariantCleanupResult, {
      variantKeys: pendingCleanup.variantKeys,
      ok: false,
      error: message,
    })
    return { ok: false, deletedCount: 0, variantKeys: pendingCleanup.variantKeys, error: message }
  }

  const error = uploadThingDeleteResultError(result, pendingCleanup.variantKeys.length)
  const ok = !error
  try {
    await convex.mutation(api.petGallery.recordUploadedVariantCleanupResult, {
      variantKeys: pendingCleanup.variantKeys,
      ok,
      error,
    })
  } catch (recordError) {
    const message = errorMessage(recordError)
    return {
      ok: false,
      deletedCount: result.deletedCount,
      variantKeys: pendingCleanup.variantKeys,
      error: error ? `${error}; cleanup result recording failed: ${message}` : message,
    }
  }

  return {
    ok,
    deletedCount: result.deletedCount,
    variantKeys: pendingCleanup.variantKeys,
    error,
  }
}

export async function cleanupUploadThingFilesAction() {
  const convex = await createPetGalleryConvexServerClient()
  const cleanups = await convex.query(api.petGallery.listPendingPhotoFileCleanups, {})
  const revalidationError = cleanups.length > 0 ? revalidatePetGalleryStaticRoutes() : undefined

  if (revalidationError) {
    const results = cleanups.map(cleanup => ({
      cleanupId: cleanup._id as CleanupId,
      variantKeys: cleanup.variantKeys,
      ok: false,
      deletedCount: 0,
      error: 'File cleanup is waiting for public gallery revalidation.',
      revalidationError,
    }))
    return {
      checked: cleanups.length,
      complete: 0,
      failed: cleanups.length,
      deletedCount: 0,
      revalidationError,
      results,
    }
  }

  const results: CleanupResult[] = []

  for (const cleanup of cleanups) {
    results.push(await deleteVariantKeys(convex, cleanup._id, cleanup.variantKeys))
  }

  return {
    checked: cleanups.length,
    complete: results.filter(result => result.ok).length,
    failed: results.filter(result => !result.ok).length,
    deletedCount: results.reduce((total, result) => total + result.deletedCount, 0),
    results,
  }
}
