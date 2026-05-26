import { PET_GALLERY_VARIANTS } from './types'

export type ExistingPetGalleryUpload = {
  stableId: string
  sourceHash: string
}

export type IncomingPetGalleryUpload = {
  sourceHash?: string | null
}

export const PET_GALLERY_MAX_UPLOAD_BYTES = 30 * 1024 * 1024
export const PET_GALLERY_MAX_UPLOAD_PIXELS = 50_000_000
export const PET_GALLERY_MAX_UPLOAD_EDGE = 10_000
export const PET_GALLERY_UPLOADTHING_MAX_FILE_COUNT = PET_GALLERY_VARIANTS.length
export const PET_GALLERY_UPLOADTHING_MAX_FILE_SIZE = '8MB'

type FileLikeTransfer = {
  files?: Iterable<File> | ArrayLike<File> | null
}

type ClipboardFileItem = {
  kind?: string
  type?: string
  getAsFile?: () => File | null
}

type ClipboardLikeTransfer = {
  items?: Iterable<ClipboardFileItem> | ArrayLike<ClipboardFileItem> | null
  files?: Iterable<File> | ArrayLike<File> | null
}

export function filterImageFiles(files: Iterable<File> | ArrayLike<File>): File[] {
  return Array.from(files).filter(file => file.type.startsWith('image/'))
}

export function getImageFilesFromDataTransfer(dataTransfer: FileLikeTransfer): File[] {
  return filterImageFiles(dataTransfer.files ?? [])
}

export function getImageFilesFromClipboard(clipboard: ClipboardLikeTransfer): File[] {
  const filesFromItems = Array.from(clipboard.items ?? [])
    .filter(item => item.kind === 'file' && item.type?.startsWith('image/'))
    .flatMap(item => {
      const file = item.getAsFile?.()
      return file ? [file] : []
    })

  if (filesFromItems.length > 0) {
    return filterImageFiles(filesFromItems)
  }

  return filterImageFiles(clipboard.files ?? [])
}

export function findDuplicateUpload(
  incoming: IncomingPetGalleryUpload,
  existingUploads: ExistingPetGalleryUpload[],
): ExistingPetGalleryUpload | null {
  if (!incoming.sourceHash) {
    return null
  }

  return existingUploads.find(upload => upload.sourceHash === incoming.sourceHash) ?? null
}

export function validateUploadFileSize(file: File) {
  if (file.size <= PET_GALLERY_MAX_UPLOAD_BYTES) return

  throw new Error('Image is too large. Choose an image under 30 MB.')
}

export function validateUploadDimensions(dimensions: { width: number; height: number }) {
  if (
    dimensions.width > 0 &&
    dimensions.height > 0 &&
    dimensions.width <= PET_GALLERY_MAX_UPLOAD_EDGE &&
    dimensions.height <= PET_GALLERY_MAX_UPLOAD_EDGE &&
    dimensions.width * dimensions.height <= PET_GALLERY_MAX_UPLOAD_PIXELS
  ) {
    return
  }

  throw new Error('Image dimensions are too large. Choose an image under 50 megapixels and 10000 px per side.')
}
