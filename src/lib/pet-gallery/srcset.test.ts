import type { PublicPetGalleryPhoto } from '@/lib/pet-gallery/types'
import { describe, expect, it } from 'vitest'
import { buildPetGallerySrcSet, getPetGalleryImageLoading, PET_GALLERY_EAGER_IMAGE_COUNT } from './srcset'

function photoWithWidths(widths: {
  thumb: number
  card: number
  display: number
  full: number
}): PublicPetGalleryPhoto {
  return {
    stableId: 'small-photo',
    caption: 'Small photo',
    variants: {
      thumb: { kind: 'thumb', url: 'https://cdn.example/thumb.webp', width: widths.thumb, height: 200 },
      card: { kind: 'card', url: 'https://cdn.example/card.webp', width: widths.card, height: 200 },
      display: { kind: 'display', url: 'https://cdn.example/display.webp', width: widths.display, height: 200 },
      full: { kind: 'full', url: 'https://cdn.example/full.webp', width: widths.full, height: 200 },
    },
    animalIds: [],
    favorite: false,
    cover: false,
  }
}

describe('buildPetGallerySrcSet', () => {
  it('deduplicates width descriptors when small originals produce identical variant sizes', () => {
    expect(buildPetGallerySrcSet(photoWithWidths({ thumb: 320, card: 640, display: 640, full: 640 }))).toBe(
      'https://cdn.example/thumb.webp 320w, https://cdn.example/card.webp 640w',
    )
  })

  it('keeps all descriptors when every generated variant has a distinct width', () => {
    expect(buildPetGallerySrcSet(photoWithWidths({ thumb: 320, card: 768, display: 1600, full: 2560 }))).toBe(
      'https://cdn.example/thumb.webp 320w, https://cdn.example/card.webp 768w, https://cdn.example/display.webp 1600w, https://cdn.example/full.webp 2560w',
    )
  })

  it('only promotes the first few gallery images to eager loading', () => {
    expect(PET_GALLERY_EAGER_IMAGE_COUNT).toBe(4)
    expect(getPetGalleryImageLoading(0)).toBe('eager')
    expect(getPetGalleryImageLoading(3)).toBe('eager')
    expect(getPetGalleryImageLoading(4)).toBe('lazy')
  })
})
