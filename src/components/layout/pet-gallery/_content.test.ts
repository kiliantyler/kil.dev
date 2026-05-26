import type { PublicPetGallerySnapshot } from '@/lib/pet-gallery/types'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getCachedPetGallerySnapshot = vi.fn()

vi.mock('@/lib/pet-gallery/public-data', () => ({
  getCachedPetGallerySnapshot,
  getPetGalleryPhotoAlt: (photo: { altText?: string; caption?: string; title?: string }) =>
    photo.altText || photo.caption || photo.title || 'Pet photo',
}))

function snapshot(): PublicPetGallerySnapshot {
  return {
    revision: 'rev-1',
    publishedAt: Date.UTC(2026, 4, 18),
    animals: [{ stableId: 'aspen', name: 'Aspen', species: 'dog', order: 1 }],
    photos: [
      {
        stableId: 'aspen-snow',
        title: 'Aspen snow day',
        altText: 'Aspen in snow',
        caption: 'Aspen in snow',
        animalIds: ['aspen'],
        favorite: true,
        cover: true,
        variants: {
          thumb: { kind: 'thumb', url: 'https://utfs.io/f/thumb.webp', width: 320, height: 240 },
          card: { kind: 'card', url: 'https://utfs.io/f/card.webp', width: 768, height: 576 },
          display: { kind: 'display', url: 'https://utfs.io/f/display.webp', width: 1600, height: 1200 },
          full: { kind: 'full', url: 'https://utfs.io/f/full.webp', width: 2560, height: 1920 },
        },
      },
    ],
  }
}

describe('PetGalleryContent', () => {
  beforeEach(() => {
    getCachedPetGallerySnapshot.mockReset()
  })

  it('renders the cached Convex public snapshot', async () => {
    getCachedPetGallerySnapshot.mockResolvedValue(snapshot())
    const { PetGalleryContent } = await import('./_content')

    const html = renderToStaticMarkup(await PetGalleryContent())

    expect(html).toContain('Aspen in snow')
    expect(html).toContain('https://utfs.io/f/card.webp')
  })

  it('renders the empty state when no public snapshot is published', async () => {
    getCachedPetGallerySnapshot.mockResolvedValue(null)
    const { PetGalleryContent } = await import('./_content')

    const html = renderToStaticMarkup(await PetGalleryContent())

    expect(html).toContain('No images found in the pet gallery.')
    expect(html).not.toContain('/pet-gallery/originals')
  })
})
