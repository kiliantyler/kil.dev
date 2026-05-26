import type { PublicPetGalleryPhoto } from './types'

export const PET_GALLERY_EAGER_IMAGE_COUNT = 4

export function buildPetGallerySrcSet(photo: PublicPetGalleryPhoto) {
  const variants = [photo.variants.thumb, photo.variants.card, photo.variants.display, photo.variants.full]
  const byWidth = new Map<number, string>()

  for (const variant of variants) {
    if (variant.width <= 0 || byWidth.has(variant.width)) continue
    byWidth.set(variant.width, `${variant.url} ${variant.width}w`)
  }

  return [...byWidth.values()].join(', ')
}

export function getPetGalleryImageLoading(index: number): 'eager' | 'lazy' {
  return index < PET_GALLERY_EAGER_IMAGE_COUNT ? 'eager' : 'lazy'
}
