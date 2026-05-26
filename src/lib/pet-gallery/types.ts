export const PET_GALLERY_VARIANTS = ['thumb', 'card', 'display', 'full'] as const
export type PetGalleryVariantKind = (typeof PET_GALLERY_VARIANTS)[number]
export const PET_GALLERY_RESERVED_ANIMAL_STABLE_IDS = ['all', 'untagged', 'hidden'] as const
export const PET_GALLERY_ANIMAL_SPECIES = ['cat', 'dog'] as const
export type PetGalleryAnimalSpecies = (typeof PET_GALLERY_ANIMAL_SPECIES)[number]
export const PET_GALLERY_ANIMAL_SPECIES_OPTIONS: ReadonlyArray<{
  label: string
  value: PetGalleryAnimalSpecies
}> = [
  { label: 'Cat', value: 'cat' },
  { label: 'Dog', value: 'dog' },
]

export const PET_GALLERY_VARIANT_LONG_EDGES: Record<PetGalleryVariantKind, number> = {
  thumb: 320,
  card: 768,
  display: 1600,
  full: 2560,
}

export type PetGalleryImageVariant = {
  kind: PetGalleryVariantKind
  url: string
  key: string
  width: number
  height: number
  byteSize: number
  mimeType: 'image/webp' | 'image/jpeg'
  extension: 'webp' | 'jpg'
}

export type PetGalleryImageVariants = {
  [Kind in PetGalleryVariantKind]: PetGalleryImageVariant & { kind: Kind }
}

type PublicPetGalleryImageVariant = {
  kind: PetGalleryVariantKind
  url: string
  width: number
  height: number
}

export type PublicPetGalleryImageVariants = {
  [Kind in PetGalleryVariantKind]: PublicPetGalleryImageVariant & { kind: Kind }
}

export type PetGalleryActor = {
  workosUserId: string
  workosOrgId?: string
  email: string
  name?: string
  timestamp: number
}

export type PetGalleryApproximateDate = {
  year: number
  month?: number
  day?: number
}

export type AdminAnimal = {
  stableId: string
  name: string
  species?: PetGalleryAnimalSpecies
  order?: number
  hidden: boolean
  internalNotes?: string
}

export type AdminPhoto = {
  stableId: string
  sourceHash: string
  title?: string
  caption?: string
  altText?: string
  internalNotes?: string
  variants: PetGalleryImageVariants
  animalIds: string[]
  draftVisible: boolean
  draftOrder: number
  favorite: boolean
  cover: boolean
  approximateDate?: PetGalleryApproximateDate
}

export type PublicPetGalleryAnimal = {
  stableId: string
  name: string
  species?: PetGalleryAnimalSpecies
  order?: number
}

export type PublicPetGalleryPhoto = {
  stableId: string
  title?: string
  caption?: string
  altText?: string
  variants: PublicPetGalleryImageVariants
  animalIds: string[]
  favorite: boolean
  cover: boolean
  approximateDate?: PetGalleryApproximateDate
}

export type PublicPetGallerySnapshot = {
  revision: string
  publishedAt: number
  photos: PublicPetGalleryPhoto[]
  animals: PublicPetGalleryAnimal[]
}
