import { v } from 'convex/values'
import type { PetGalleryVariantKind } from '../src/lib/pet-gallery/types'

export const petGalleryActorValidator = v.object({
  workosUserId: v.string(),
  workosOrgId: v.optional(v.string()),
  email: v.string(),
  name: v.optional(v.string()),
  timestamp: v.number(),
})

export const petGalleryApproximateDateValidator = v.object({
  year: v.number(),
  month: v.optional(v.number()),
  day: v.optional(v.number()),
})

export const petGalleryAnimalSpeciesValidator = v.union(v.literal('cat'), v.literal('dog'))

function petGalleryVariantValidator<const Kind extends PetGalleryVariantKind>(kind: Kind) {
  return v.object({
    kind: v.literal(kind),
    key: v.string(),
    url: v.string(),
    width: v.number(),
    height: v.number(),
    byteSize: v.number(),
    mimeType: v.union(v.literal('image/webp'), v.literal('image/jpeg')),
    extension: v.union(v.literal('webp'), v.literal('jpg')),
  })
}

const petGalleryVariantValidators = {
  thumb: petGalleryVariantValidator('thumb'),
  card: petGalleryVariantValidator('card'),
  display: petGalleryVariantValidator('display'),
  full: petGalleryVariantValidator('full'),
} satisfies Record<PetGalleryVariantKind, unknown>

export const petGalleryVariantsValidator = v.object(petGalleryVariantValidators)

function petGalleryPublicVariantValidator<const Kind extends PetGalleryVariantKind>(kind: Kind) {
  return v.object({
    kind: v.literal(kind),
    url: v.string(),
    width: v.number(),
    height: v.number(),
  })
}

const petGalleryPublicVariantValidators = {
  thumb: petGalleryPublicVariantValidator('thumb'),
  card: petGalleryPublicVariantValidator('card'),
  display: petGalleryPublicVariantValidator('display'),
  full: petGalleryPublicVariantValidator('full'),
} satisfies Record<PetGalleryVariantKind, unknown>

export const petGalleryPublicVariantsValidator = v.object(petGalleryPublicVariantValidators)

export const petGalleryPublicSnapshotValidator = v.object({
  revision: v.string(),
  publishedAt: v.number(),
  photos: v.array(
    v.object({
      stableId: v.string(),
      title: v.optional(v.string()),
      caption: v.optional(v.string()),
      altText: v.optional(v.string()),
      variants: petGalleryPublicVariantsValidator,
      animalIds: v.array(v.string()),
      favorite: v.boolean(),
      cover: v.boolean(),
      approximateDate: v.optional(petGalleryApproximateDateValidator),
    }),
  ),
  animals: v.array(
    v.object({
      stableId: v.string(),
      name: v.string(),
      species: v.optional(petGalleryAnimalSpeciesValidator),
      order: v.optional(v.number()),
    }),
  ),
})
