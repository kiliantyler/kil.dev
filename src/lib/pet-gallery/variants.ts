import { PET_GALLERY_VARIANT_LONG_EDGES, PET_GALLERY_VARIANTS, type PetGalleryVariantKind } from './types'

export type PetGalleryVariantPlan = {
  kind: PetGalleryVariantKind
  width: number
  height: number
}

type DecodedPetGalleryImage = {
  image: unknown
  width: number
  height: number
  close?: () => void
}

export type PetGalleryVariantEncoder = (input: {
  image: unknown
  width: number
  height: number
  mimeType: 'image/webp' | 'image/jpeg'
  quality: number
}) => Promise<Blob | null>

export type PetGalleryVariantDecoder = (file: File) => Promise<DecodedPetGalleryImage>

export type EncodedPetGalleryVariant = PetGalleryVariantPlan & {
  blob: Blob
  byteSize: number
  mimeType: 'image/webp' | 'image/jpeg'
  extension: 'webp' | 'jpg'
}

export class PetGalleryVariantDecodeError extends Error {
  file: File
  override cause: unknown

  constructor(file: File, cause: unknown) {
    super(`Unable to decode pet gallery image: ${file.name}`)
    this.name = 'PetGalleryVariantDecodeError'
    this.file = file
    this.cause = cause
  }
}

export class PetGalleryVariantEncodeError extends Error {
  file: File
  plan: PetGalleryVariantPlan
  override cause: unknown

  constructor(file: File, plan: PetGalleryVariantPlan, cause?: unknown) {
    super(`Unable to encode pet gallery ${plan.kind} image: ${file.name}`)
    this.name = 'PetGalleryVariantEncodeError'
    this.file = file
    this.plan = plan
    this.cause = cause
  }
}

export function fitWithinLongEdge(input: { width: number; height: number }, longEdge: number) {
  const currentLongEdge = Math.max(input.width, input.height)

  if (currentLongEdge <= longEdge) {
    return input
  }

  const scale = longEdge / currentLongEdge

  return {
    width: Math.max(1, Math.round(input.width * scale)),
    height: Math.max(1, Math.round(input.height * scale)),
  }
}

export function planPetGalleryVariants(dimensions: { width: number; height: number }): PetGalleryVariantPlan[] {
  return PET_GALLERY_VARIANTS.map(kind => ({
    kind,
    ...fitWithinLongEdge(dimensions, PET_GALLERY_VARIANT_LONG_EDGES[kind]),
  }))
}

export async function encodePetGalleryVariant(
  file: File,
  plan: PetGalleryVariantPlan,
  options: {
    decodeImage?: PetGalleryVariantDecoder
    encodeImage?: PetGalleryVariantEncoder
    webpQuality?: number
    jpegQuality?: number
  } = {},
): Promise<EncodedPetGalleryVariant> {
  const decodeImage = options.decodeImage ?? decodeImageWithBrowser
  const encodeImage = options.encodeImage ?? encodeImageWithBrowserCanvas
  let decoded: DecodedPetGalleryImage

  try {
    decoded = await decodeImage(file)
  } catch (error) {
    throw new PetGalleryVariantDecodeError(file, error)
  }

  try {
    const webpBlob = await attemptEncode(() =>
      encodeImage({
        image: decoded.image,
        width: plan.width,
        height: plan.height,
        mimeType: 'image/webp',
        quality: options.webpQuality ?? 0.82,
      }),
    )

    if (webpBlob) {
      return toEncodedVariant(plan, webpBlob, 'image/webp', 'webp')
    }

    const jpegBlob = await attemptEncode(() =>
      encodeImage({
        image: decoded.image,
        width: plan.width,
        height: plan.height,
        mimeType: 'image/jpeg',
        quality: options.jpegQuality ?? 0.86,
      }),
    )

    if (jpegBlob) {
      return toEncodedVariant(plan, jpegBlob, 'image/jpeg', 'jpg')
    }

    throw new PetGalleryVariantEncodeError(file, plan)
  } finally {
    decoded.close?.()
  }
}

async function attemptEncode(encode: () => Promise<Blob | null>) {
  try {
    return await encode()
  } catch {
    return null
  }
}

function toEncodedVariant(
  plan: PetGalleryVariantPlan,
  blob: Blob,
  mimeType: 'image/webp' | 'image/jpeg',
  extension: 'webp' | 'jpg',
): EncodedPetGalleryVariant {
  return {
    ...plan,
    blob,
    byteSize: blob.size,
    mimeType,
    extension,
  }
}

async function decodeImageWithBrowser(file: File): Promise<DecodedPetGalleryImage> {
  if (!globalThis.createImageBitmap) {
    throw new Error('createImageBitmap is not available')
  }

  const image = await globalThis.createImageBitmap(file)

  return {
    image,
    width: image.width,
    height: image.height,
    close: () => image.close(),
  }
}

async function encodeImageWithBrowserCanvas({
  image,
  width,
  height,
  mimeType,
  quality,
}: Parameters<PetGalleryVariantEncoder>[0]) {
  if (!globalThis.document) {
    throw new Error('document is not available')
  }

  const canvas = globalThis.document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('2d canvas context is not available')
  }

  context.drawImage(image as CanvasImageSource, 0, 0, width, height)

  return new Promise<Blob | null>(resolve => {
    canvas.toBlob(resolve, mimeType, quality)
  })
}
