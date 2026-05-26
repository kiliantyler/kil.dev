import {
  PET_GALLERY_RESERVED_ANIMAL_STABLE_IDS,
  type AdminAnimal,
  type AdminPhoto,
  type PetGalleryImageVariants,
} from '@/lib/pet-gallery/types'

export const DEFAULT_PET_GALLERY_ANIMAL_COLOR = '#64748b'

export type AdminWorkspacePhoto = AdminPhoto & {
  docId: string
  filename: string
  altText: string
  title: string
}

export type AdminWorkspacePhotoPatch = Partial<
  Pick<
    AdminWorkspacePhoto,
    'title' | 'caption' | 'altText' | 'internalNotes' | 'animalIds' | 'draftVisible' | 'favorite' | 'cover'
  >
> & {
  approximateDate?: AdminWorkspacePhoto['approximateDate'] | null
}

export type AdminWorkspaceAnimal = AdminAnimal & {
  docId: string
  color?: string
}

export type AdminWorkspaceAnimalPatch = Partial<Pick<AdminWorkspaceAnimal, 'name' | 'species' | 'color' | 'order'>>

export type UploadQueueItem = {
  id: string
  filename: string
  status: 'queued' | 'processing' | 'ready' | 'error'
  message: string
}

export type PetGalleryPublishSummary = {
  revision: string
  publishedAt: number
  photoCount: number
  animalCount: number
  actorEmail?: string
  actorName?: string
  revalidationError?: string
}

export type PetGalleryAdminWorkspaceState = {
  mode: 'convex' | 'test-bypass'
  animals: AdminWorkspaceAnimal[]
  photos: AdminWorkspacePhoto[]
  publishedOrderBaseline: AdminWorkspacePhoto[]
  publishHistory: PetGalleryPublishSummary[]
  draftUpdatedAt?: number
  lastPublishedRevision?: string
}

export type PhotoFilter = 'all' | 'untagged' | 'hidden' | string
export type PhotoSort = 'manual' | 'filename' | 'caption' | 'animal'

export const TEST_BYPASS_ANIMALS: AdminWorkspaceAnimal[] = [
  { docId: 'animals:aspen', stableId: 'aspen', name: 'Aspen', species: 'dog', order: 1, hidden: false },
  { docId: 'animals:sunny', stableId: 'sunny', name: 'Sunny', species: 'cat', order: 2, hidden: false },
  { docId: 'animals:mochi', stableId: 'mochi', name: 'Mochi', species: 'cat', order: 3, hidden: false },
]

export const TEST_BYPASS_PHOTOS: AdminWorkspacePhoto[] = [
  {
    docId: 'photos:aspen',
    stableId: 'photo-aspen',
    sourceHash: 'hash-aspen',
    filename: 'aspen-snow.jpg',
    title: 'Aspen portrait',
    caption: 'Aspen portrait',
    altText: 'Aspen sitting in snow',
    internalNotes: 'Imported from draft seed',
    variants: createMockVariants('photo-aspen'),
    animalIds: ['aspen'],
    draftVisible: true,
    draftOrder: 1,
    favorite: true,
    cover: true,
  },
  {
    docId: 'photos:sunny',
    stableId: 'photo-sunny',
    sourceHash: 'hash-sunny',
    filename: 'sunny-window.png',
    title: 'Sunny window',
    caption: 'Sunny window',
    altText: 'Sunny watching the window',
    internalNotes: 'Needs date',
    variants: createMockVariants('photo-sunny'),
    animalIds: ['sunny'],
    draftVisible: true,
    draftOrder: 2,
    favorite: false,
    cover: false,
  },
  {
    docId: 'photos:mochi',
    stableId: 'photo-mochi',
    sourceHash: 'hash-mochi',
    filename: 'mochi-nap.webp',
    title: 'Mochi nap',
    caption: 'Mochi nap',
    altText: 'Mochi asleep on a blanket',
    variants: createMockVariants('photo-mochi'),
    animalIds: ['mochi'],
    draftVisible: true,
    draftOrder: 3,
    favorite: false,
    cover: false,
  },
]

export function createTestBypassPetGalleryAdminState(): PetGalleryAdminWorkspaceState {
  return {
    mode: 'test-bypass',
    animals: TEST_BYPASS_ANIMALS,
    photos: TEST_BYPASS_PHOTOS,
    publishedOrderBaseline: TEST_BYPASS_PHOTOS,
    publishHistory: [],
  }
}

export function slugifyAnimalName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/(^-|-$)/g, '')
}

export function validateNewAnimalName(name: string, animals: AdminWorkspaceAnimal[]): string {
  const stableId = slugifyAnimalName(name)
  const normalizedName = name.trim().replaceAll(/\s+/g, ' ').toLowerCase()

  if (!stableId) {
    throw new Error('Animal name must include at least one letter or number.')
  }

  if (
    PET_GALLERY_RESERVED_ANIMAL_STABLE_IDS.includes(stableId as (typeof PET_GALLERY_RESERVED_ANIMAL_STABLE_IDS)[number])
  ) {
    throw new Error(`"${stableId}" is reserved for gallery filters.`)
  }

  if (
    animals.some(
      animal =>
        animal.stableId === stableId || animal.name.trim().replaceAll(/\s+/g, ' ').toLowerCase() === normalizedName,
    )
  ) {
    throw new Error(`An animal named ${name.trim()} already exists.`)
  }

  return stableId
}

export function createMockVariants(stableId: string): PetGalleryImageVariants {
  const base = {
    url: `/ogi/headshot.jpg?petGalleryMock=${stableId}`,
    key: `pet-gallery/${stableId}.webp`,
    width: 1200,
    height: 900,
    byteSize: 120000,
    mimeType: 'image/webp' as const,
    extension: 'webp' as const,
  }

  return {
    thumb: { ...base, kind: 'thumb', width: 320, height: 240, byteSize: 18000 },
    card: { ...base, kind: 'card', width: 768, height: 576, byteSize: 46000 },
    display: { ...base, kind: 'display', width: 1200, height: 900, byteSize: 120000 },
    full: { ...base, kind: 'full', width: 1600, height: 1200, byteSize: 220000 },
  }
}

export function animalNamesForPhoto(photo: AdminWorkspacePhoto, animals: AdminWorkspaceAnimal[]) {
  return photo.animalIds.flatMap(animalId => {
    const name = animals.find(animal => animal.stableId === animalId)?.name
    return name ? [name] : []
  })
}

export function getPhotoDisplayName(photo: AdminWorkspacePhoto) {
  return photo.title || photo.caption || photo.filename
}
