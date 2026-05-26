import type { createPetGalleryPhotoDraftAction } from '@/app/admin/pet-gallery/actions'
import type {
  AdminWorkspacePhoto,
  PetGalleryAdminWorkspaceState,
  UploadQueueItem,
} from '@/lib/pet-gallery/admin-workspace'
import { slugifyAnimalName } from '@/lib/pet-gallery/admin-workspace'
import { readPetGalleryImageDate } from '@/lib/pet-gallery/image-date'
import type { PetGalleryApproximateDate } from '@/lib/pet-gallery/types'
import {
  findDuplicateUpload,
  validateUploadDimensions,
  validateUploadFileSize,
  type ExistingPetGalleryUpload,
} from '@/lib/pet-gallery/upload-inputs'
import type { uploadFiles } from '@/lib/pet-gallery/uploadthing-client'
import {
  encodePetGalleryVariant,
  planPetGalleryVariants,
  type EncodedPetGalleryVariant,
} from '@/lib/pet-gallery/variants'

type UploadFiles = typeof uploadFiles
type CreatePhotoDraft = typeof createPetGalleryPhotoDraftAction

export type PetGalleryUploadWorkflowDeps = {
  uploadFiles: UploadFiles
  createPhotoDraft: CreatePhotoDraft
  cleanupFiles: (variantKeys: string[]) => Promise<unknown>
  digestFile?: (file: File) => Promise<string>
  readDimensions?: (file: File) => Promise<{ width: number; height: number }>
  readApproximateDate?: (file: File) => Promise<PetGalleryApproximateDate | undefined>
  encodeVariant?: typeof encodePetGalleryVariant
}

export type PetGalleryUploadWorkflowInput = {
  file: File
  draftOrder: number
  existingUploads?: ExistingPetGalleryUpload[]
  deps: PetGalleryUploadWorkflowDeps
}

export type PetGalleryUploadWorkflowResult = {
  stableId: string
  sourceHash: string
  uploadedKeys: string[]
  state?: PetGalleryAdminWorkspaceState
}

export type PetGalleryUploadBatchInput = {
  files: File[]
  queuedItems: UploadQueueItem[]
  photos: AdminWorkspacePhoto[]
  deps: PetGalleryUploadWorkflowDeps & {
    refreshState: () => Promise<PetGalleryAdminWorkspaceState>
  }
  onQueueItemChange: (itemId: string, patch: Pick<UploadQueueItem, 'status' | 'message'>) => void
  onQueueItemsComplete?: (itemIds: string[]) => void
  onUploadError: (message: string) => void
  onState: (state: PetGalleryAdminWorkspaceState) => void
}

function cleanupFailureMessage(result: unknown): string | null {
  if (!result || typeof result !== 'object' || !('ok' in result) || result.ok !== false) return null
  const error = 'error' in result && typeof result.error === 'string' ? result.error : 'cleanup failed'
  return error
}

export async function sha256Hex(file: File) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function readImageDimensions(file: File) {
  const decoded = await createImageBitmap(file)
  const dimensions = { width: decoded.width, height: decoded.height }
  decoded.close()
  return dimensions
}

export function filenameStem(filename: string) {
  return filename.replace(/\.[^.]+$/, '')
}

export function toUploadFile(file: File, encoded: EncodedPetGalleryVariant) {
  return new File([encoded.blob], `${filenameStem(file.name)}-${encoded.kind}.${encoded.extension}`, {
    type: encoded.mimeType,
    lastModified: file.lastModified,
  })
}

export async function processPetGalleryUploadFile({
  deps,
  draftOrder,
  existingUploads = [],
  file,
}: PetGalleryUploadWorkflowInput): Promise<PetGalleryUploadWorkflowResult> {
  const digestFile = deps.digestFile ?? sha256Hex
  const readDimensions = deps.readDimensions ?? readImageDimensions
  const readApproximateDate = deps.readApproximateDate ?? readPetGalleryImageDate
  const encodeVariant = deps.encodeVariant ?? encodePetGalleryVariant
  validateUploadFileSize(file)
  const sourceHash = await digestFile(file)
  const duplicateUpload = findDuplicateUpload({ sourceHash }, existingUploads)
  if (duplicateUpload) {
    throw new Error(`Upload already exists as ${duplicateUpload.stableId}`)
  }
  const dimensions = await readDimensions(file)
  validateUploadDimensions(dimensions)
  const approximateDate = await readApproximateDate(file)
  const encodedVariants: EncodedPetGalleryVariant[] = []
  for (const plan of planPetGalleryVariants(dimensions)) {
    encodedVariants.push(await encodeVariant(file, plan))
  }
  const uploaded = await deps.uploadFiles('generatedImageVariant', {
    files: encodedVariants.map(encoded => toUploadFile(file, encoded)),
  })
  const uploadedKeys = uploaded.map(fileData => fileData.key)

  try {
    const variants = Object.fromEntries(
      encodedVariants.map((encoded, variantIndex) => {
        const uploadedFile = uploaded[variantIndex]
        if (!uploadedFile) throw new Error(`Missing UploadThing response for ${encoded.kind}`)
        return [
          encoded.kind,
          {
            kind: encoded.kind,
            url: uploadedFile.ufsUrl,
            key: uploadedFile.key,
            width: encoded.width,
            height: encoded.height,
            byteSize: encoded.byteSize,
            mimeType: encoded.mimeType,
            extension: encoded.extension,
          },
        ]
      }),
    ) as AdminWorkspacePhoto['variants']
    const baseStableId = slugifyAnimalName(filenameStem(file.name)) || 'photo'
    const stableId = `${baseStableId}-${sourceHash.slice(0, 12)}`
    const { state } = await deps.createPhotoDraft({
      stableId,
      sourceHash,
      filename: file.name,
      variants,
      animalIds: [],
      draftOrder,
      approximateDate,
    })

    return { stableId, sourceHash, uploadedKeys, state }
  } catch (error) {
    if (uploadedKeys.length > 0) {
      let cleanupMessage: string | null = null
      try {
        const cleanup = await deps.cleanupFiles(uploadedKeys)
        cleanupMessage = cleanupFailureMessage(cleanup)
      } catch (cleanupError) {
        cleanupMessage = cleanupError instanceof Error ? cleanupError.message : 'cleanup failed'
      }
      if (cleanupMessage) {
        const uploadMessage = error instanceof Error ? error.message : 'Upload failed'
        throw new Error(`${uploadMessage}; cleanup failed: ${cleanupMessage}`)
      }
    }
    throw error
  }
}

export async function processPetGalleryUploadBatch({
  deps,
  files,
  onQueueItemChange,
  onQueueItemsComplete,
  onState,
  onUploadError,
  photos,
  queuedItems,
}: PetGalleryUploadBatchInput): Promise<void> {
  let createdDraft = false
  const completedQueueItemIds: string[] = []
  const existingUploads = photos.map(photo => ({
    stableId: photo.stableId,
    sourceHash: photo.sourceHash,
  }))

  for (const [index, file] of files.entries()) {
    const queuedItem = queuedItems[index]
    if (!queuedItem) continue

    onQueueItemChange(queuedItem.id, { status: 'processing', message: 'Generating variants' })

    try {
      const result = await processPetGalleryUploadFile({
        file,
        draftOrder: photos.length + index + 1,
        existingUploads,
        deps,
      })
      existingUploads.push({ stableId: result.stableId, sourceHash: result.sourceHash })
      createdDraft = true
      onQueueItemChange(queuedItem.id, { status: 'ready', message: 'Draft photo created' })
      completedQueueItemIds.push(queuedItem.id)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed'
      onUploadError(message)
      onQueueItemChange(queuedItem.id, { status: 'error', message })
    }
  }

  if (!createdDraft) return

  try {
    onState(await deps.refreshState())
    onQueueItemsComplete?.(completedQueueItemIds)
  } catch (error) {
    onUploadError(error instanceof Error ? error.message : 'Unable to refresh uploaded photos')
  }
}
