import { describe, expect, it } from 'vitest'
import { buildPublicPetGallerySnapshot } from '../snapshot'
import type { AdminAnimal, AdminPhoto, PetGalleryImageVariant, PetGalleryImageVariants } from '../types'

function variant<Kind extends PetGalleryImageVariant['kind']>(kind: Kind): PetGalleryImageVariant & { kind: Kind } {
  return {
    kind,
    url: `https://utfs.io/f/${kind}.webp`,
    key: `${kind}-storage-key`,
    width: kind === 'thumb' ? 320 : 768,
    height: kind === 'thumb' ? 214 : 512,
    byteSize: 1234,
    mimeType: 'image/webp',
    extension: 'webp',
  }
}

function variants(): PetGalleryImageVariants {
  return {
    thumb: variant('thumb'),
    card: variant('card'),
    display: variant('display'),
    full: variant('full'),
  }
}

const animals: AdminAnimal[] = [
  {
    stableId: 'fern',
    name: 'Fern',
    species: 'cat',
    hidden: false,
    order: 2,
    internalNotes: 'indoor only',
  },
  {
    stableId: 'moss',
    name: 'Moss',
    species: 'dog',
    hidden: true,
    order: 1,
    internalNotes: 'hidden',
  },
]

const photos: AdminPhoto[] = [
  {
    stableId: 'hidden-photo',
    sourceHash: 'hidden-hash',
    caption: 'Hidden',
    internalNotes: 'draft only',
    variants: variants(),
    animalIds: ['fern'],
    draftVisible: false,
    draftOrder: 0,
    favorite: false,
    cover: false,
  },
  {
    stableId: 'second-photo',
    sourceHash: 'second-hash',
    caption: 'Second',
    internalNotes: 'do not publish',
    variants: variants(),
    animalIds: ['moss', 'fern'],
    draftVisible: true,
    draftOrder: 20,
    favorite: false,
    cover: true,
  },
  {
    stableId: 'first-photo',
    sourceHash: 'first-hash',
    caption: 'First',
    internalNotes: 'also private',
    variants: variants(),
    animalIds: ['fern'],
    draftVisible: true,
    draftOrder: 10,
    favorite: true,
    cover: false,
    approximateDate: {
      year: 2026,
      month: 5,
    },
  },
]

describe('buildPublicPetGallerySnapshot', () => {
  it('publishes visible draft photos in order without internal notes or admin-only metadata', () => {
    const snapshot = buildPublicPetGallerySnapshot({
      photos,
      animals,
      now: 1_800_000_000_000,
      createRevision: () => 'revision-test',
    })

    expect(snapshot).toEqual({
      revision: 'revision-test',
      publishedAt: 1_800_000_000_000,
      animals: [
        {
          stableId: 'fern',
          name: 'Fern',
          species: 'cat',
          order: 2,
        },
      ],
      photos: [
        {
          stableId: 'first-photo',
          caption: 'First',
          variants: {
            thumb: { kind: 'thumb', url: 'https://utfs.io/f/thumb.webp', width: 320, height: 214 },
            card: { kind: 'card', url: 'https://utfs.io/f/card.webp', width: 768, height: 512 },
            display: { kind: 'display', url: 'https://utfs.io/f/display.webp', width: 768, height: 512 },
            full: { kind: 'full', url: 'https://utfs.io/f/full.webp', width: 768, height: 512 },
          },
          animalIds: ['fern'],
          favorite: true,
          cover: false,
          approximateDate: {
            year: 2026,
            month: 5,
          },
        },
        {
          stableId: 'second-photo',
          caption: 'Second',
          variants: {
            thumb: { kind: 'thumb', url: 'https://utfs.io/f/thumb.webp', width: 320, height: 214 },
            card: { kind: 'card', url: 'https://utfs.io/f/card.webp', width: 768, height: 512 },
            display: { kind: 'display', url: 'https://utfs.io/f/display.webp', width: 768, height: 512 },
            full: { kind: 'full', url: 'https://utfs.io/f/full.webp', width: 768, height: 512 },
          },
          animalIds: ['fern'],
          favorite: false,
          cover: true,
        },
      ],
    })
    expect(JSON.stringify(snapshot)).not.toContain('internalNotes')
    expect(JSON.stringify(snapshot)).not.toContain('draftVisible')
    expect(JSON.stringify(snapshot)).not.toContain('hidden-photo')
    expect(JSON.stringify(snapshot)).not.toContain('retired')
    expect(JSON.stringify(snapshot)).not.toContain('publishedBy')
    expect(JSON.stringify(snapshot)).not.toContain('storage-key')
    expect(JSON.stringify(snapshot)).not.toContain('byteSize')
  })

  it('detaches public snapshot fields from mutable admin inputs', () => {
    const mutablePhotos: AdminPhoto[] = [
      {
        stableId: 'photo',
        sourceHash: 'hash',
        variants: variants(),
        animalIds: ['fern'],
        draftVisible: true,
        draftOrder: 1,
        favorite: false,
        cover: false,
        approximateDate: {
          year: 2026,
        },
      },
    ]

    const snapshot = buildPublicPetGallerySnapshot({
      photos: mutablePhotos,
      animals,
      now: 1_800_000_000_000,
      createRevision: () => 'revision-test',
    })

    mutablePhotos[0]?.animalIds.push('late-animal')
    mutablePhotos[0]!.variants.thumb.url = 'https://utfs.io/f/changed.webp'
    mutablePhotos[0]!.approximateDate!.month = 6

    expect(snapshot.photos[0]?.animalIds).toEqual(['fern'])
    expect(snapshot.photos[0]?.variants.thumb.url).toBe('https://utfs.io/f/thumb.webp')
    expect(snapshot.photos[0]?.approximateDate).toEqual({ year: 2026 })
  })

  it('requires every web-ready image variant before publishing', () => {
    const malformedPhoto = {
      ...photos[0],
      draftVisible: true,
      variants: {
        thumb: variant('thumb'),
        card: variant('card'),
        display: variant('display'),
      },
    } as unknown as AdminPhoto

    expect(() =>
      buildPublicPetGallerySnapshot({
        photos: [malformedPhoto],
        animals,
        now: 1_800_000_000_000,
        createRevision: () => 'revision-test',
      }),
    ).toThrow('Missing required pet gallery image variant: full')
  })
})
