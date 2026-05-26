import { describe, expect, it, vi } from 'vitest'
import { PET_GALLERY_VARIANTS } from '../types'
import {
  PetGalleryVariantDecodeError,
  PetGalleryVariantEncodeError,
  encodePetGalleryVariant,
  fitWithinLongEdge,
  planPetGalleryVariants,
} from '../variants'

describe('planPetGalleryVariants', () => {
  it('plans every gallery variant in display order', () => {
    expect(planPetGalleryVariants({ width: 5000, height: 3000 }).map(variant => variant.kind)).toEqual(
      PET_GALLERY_VARIANTS,
    )
  })

  it('caps full-size photos at a 2560px long edge', () => {
    expect(
      planPetGalleryVariants({ width: 5000, height: 3000 }).find(variant => variant.kind === 'full'),
    ).toMatchObject({
      width: 2560,
      height: 1536,
    })
  })

  it('does not upscale smaller source images', () => {
    expect(planPetGalleryVariants({ width: 640, height: 480 }).find(variant => variant.kind === 'full')).toMatchObject({
      width: 640,
      height: 480,
    })
  })

  it('fits portrait images by long edge without changing orientation', () => {
    expect(fitWithinLongEdge({ width: 1200, height: 3000 }, 768)).toEqual({
      width: 307,
      height: 768,
    })
  })
})

describe('encodePetGalleryVariant', () => {
  const source = new File(['source'], 'pet.png', { type: 'image/png' })

  it('prefers WebP when the browser encoder returns one', async () => {
    const result = await encodePetGalleryVariant(
      source,
      { kind: 'card', width: 768, height: 512 },
      {
        decodeImage: async () => ({ image: Symbol('decoded-image'), width: 1200, height: 800 }),
        encodeImage: async ({ mimeType }) => new Blob([mimeType], { type: mimeType }),
      },
    )

    expect(result).toMatchObject({
      kind: 'card',
      width: 768,
      height: 512,
      mimeType: 'image/webp',
      extension: 'webp',
    })
    expect(await result.blob.text()).toBe('image/webp')
  })

  it('falls back to JPEG when WebP encoding returns null', async () => {
    const attemptedMimeTypes: string[] = []

    const result = await encodePetGalleryVariant(
      source,
      { kind: 'display', width: 1200, height: 800 },
      {
        decodeImage: async () => ({ image: Symbol('decoded-image'), width: 1200, height: 800 }),
        encodeImage: async ({ mimeType }) => {
          attemptedMimeTypes.push(mimeType)
          return mimeType === 'image/webp' ? null : new Blob(['jpeg'], { type: mimeType })
        },
      },
    )

    expect(attemptedMimeTypes).toEqual(['image/webp', 'image/jpeg'])
    expect(result).toMatchObject({
      mimeType: 'image/jpeg',
      extension: 'jpg',
    })
    expect(await result.blob.text()).toBe('jpeg')
  })

  it('falls back to JPEG when WebP encoding throws', async () => {
    const attemptedMimeTypes: string[] = []

    const result = await encodePetGalleryVariant(
      source,
      { kind: 'display', width: 1200, height: 800 },
      {
        decodeImage: async () => ({ image: Symbol('decoded-image'), width: 1200, height: 800 }),
        encodeImage: async ({ mimeType }) => {
          attemptedMimeTypes.push(mimeType)
          if (mimeType === 'image/webp') throw new Error('webp unsupported')
          return new Blob(['jpeg'], { type: mimeType })
        },
      },
    )

    expect(attemptedMimeTypes).toEqual(['image/webp', 'image/jpeg'])
    expect(result).toMatchObject({
      mimeType: 'image/jpeg',
      extension: 'jpg',
    })
  })

  it('throws a typed decode error before upload when the source cannot be decoded', async () => {
    await expect(
      encodePetGalleryVariant(
        source,
        { kind: 'thumb', width: 320, height: 214 },
        {
          decodeImage: async () => {
            throw new Error('bad source')
          },
          encodeImage: async () => new Blob(),
        },
      ),
    ).rejects.toMatchObject({
      name: PetGalleryVariantDecodeError.name,
      file: source,
      cause: expect.any(Error),
    })
  })

  it('throws a typed encode error when both encoders fail and still closes the decoded image', async () => {
    const close = vi.fn()

    await expect(
      encodePetGalleryVariant(
        source,
        { kind: 'thumb', width: 320, height: 214 },
        {
          decodeImage: async () => ({ image: Symbol('decoded-image'), width: 1200, height: 800, close }),
          encodeImage: async () => null,
        },
      ),
    ).rejects.toMatchObject({
      name: PetGalleryVariantEncodeError.name,
      file: source,
      plan: { kind: 'thumb', width: 320, height: 214 },
    })
    expect(close).toHaveBeenCalledOnce()
  })
})
