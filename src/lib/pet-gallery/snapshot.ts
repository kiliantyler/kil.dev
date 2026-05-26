import type {
  AdminAnimal,
  AdminPhoto,
  PublicPetGalleryAnimal,
  PublicPetGalleryImageVariants,
  PublicPetGalleryPhoto,
  PublicPetGallerySnapshot,
} from './types'
import { PET_GALLERY_VARIANTS } from './types'

export function buildPublicPetGallerySnapshot(input: {
  photos: AdminPhoto[]
  animals: AdminAnimal[]
  now: number
  createRevision?: () => string
}): PublicPetGallerySnapshot {
  const publicAnimals = input.animals.filter(animal => !animal.hidden).map(toPublicAnimal)
  const publicAnimalIds = new Set(publicAnimals.map(animal => animal.stableId))
  const visiblePhotos = input.photos
    .filter(photo => photo.draftVisible)
    .toSorted((first, second) => first.draftOrder - second.draftOrder)

  return {
    revision: input.createRevision?.() ?? globalThis.crypto.randomUUID(),
    publishedAt: input.now,
    photos: visiblePhotos.map(photo => toPublicPhoto(photo, publicAnimalIds)),
    animals: publicAnimals,
  }
}

function toPublicPhoto(photo: AdminPhoto, publicAnimalIds: ReadonlySet<string>): PublicPetGalleryPhoto {
  return {
    stableId: photo.stableId,
    ...(photo.title ? { title: photo.title } : {}),
    ...(photo.caption ? { caption: photo.caption } : {}),
    ...(photo.altText ? { altText: photo.altText } : {}),
    variants: toPublicVariants(photo.variants),
    animalIds: photo.animalIds.filter(animalId => publicAnimalIds.has(animalId)),
    favorite: photo.favorite,
    cover: photo.cover,
    approximateDate: photo.approximateDate ? { ...photo.approximateDate } : undefined,
  }
}

function toPublicVariants(photoVariants: AdminPhoto['variants']): PublicPetGalleryImageVariants {
  return Object.fromEntries(
    PET_GALLERY_VARIANTS.map(kind => {
      const variant = photoVariants[kind]

      if (!variant) {
        throw new Error(`Missing required pet gallery image variant: ${kind}`)
      }

      const { url, width, height } = variant
      return [
        kind,
        {
          kind,
          url,
          width,
          height,
        },
      ]
    }),
  ) as PublicPetGalleryImageVariants
}

function toPublicAnimal(animal: AdminAnimal): PublicPetGalleryAnimal {
  return {
    stableId: animal.stableId,
    name: animal.name,
    species: animal.species,
    order: animal.order,
  }
}
