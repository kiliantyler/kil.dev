import type {
  AdminWorkspaceAnimal,
  AdminWorkspacePhoto,
  AdminWorkspacePhotoPatch,
  PhotoFilter,
  PhotoSort,
  UploadQueueItem,
} from '@/lib/pet-gallery/admin-workspace'
import { animalNamesForPhoto, getPhotoDisplayName } from '@/lib/pet-gallery/admin-workspace'

export function sortByDraftOrder(photos: AdminWorkspacePhoto[]) {
  return photos.toSorted((a, b) => a.draftOrder - b.draftOrder)
}

export function matchesPhotoFilter(photo: AdminWorkspacePhoto, filter: PhotoFilter) {
  if (filter === 'all') return true
  if (filter === 'untagged') return photo.animalIds.length === 0
  if (filter === 'hidden') return !photo.draftVisible
  return photo.animalIds.includes(filter)
}

export function matchesPhotoSearch(photo: AdminWorkspacePhoto, animals: AdminWorkspaceAnimal[], search: string) {
  const query = search.trim().toLowerCase()
  if (!query) return true

  const searchable = [photo.caption, photo.title, photo.filename, photo.altText, ...animalNamesForPhoto(photo, animals)]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return searchable.includes(query)
}

export function sortAdminPhotos(photos: AdminWorkspacePhoto[], animals: AdminWorkspaceAnimal[], sort: PhotoSort) {
  const sorted = sortByDraftOrder(photos)

  if (sort === 'filename') {
    return sorted.toSorted((a, b) => a.filename.localeCompare(b.filename))
  }

  if (sort === 'caption') {
    return sorted.toSorted((a, b) => getPhotoDisplayName(a).localeCompare(getPhotoDisplayName(b)))
  }

  if (sort === 'animal') {
    return sorted.toSorted((a, b) =>
      animalNamesForPhoto(a, animals).join(', ').localeCompare(animalNamesForPhoto(b, animals).join(', ')),
    )
  }

  return sorted
}

export function normalizeDraftOrder(photos: AdminWorkspacePhoto[]) {
  return sortByDraftOrder(photos).map((photo, index) => ({ ...photo, draftOrder: index + 1 }))
}

export function removeCompletedUploadQueueItems(queue: UploadQueueItem[], completedItemIds: string[]) {
  const completed = new Set(completedItemIds)
  return queue.filter(item => !completed.has(item.id))
}

export function reorderPhotosByDropTarget(
  photos: AdminWorkspacePhoto[],
  draggedPhotoId: string,
  targetPhotoId: string,
  position: 'before' | 'after',
) {
  const ordered = sortByDraftOrder(photos)
  if (draggedPhotoId === targetPhotoId) return ordered

  const draggedPhoto = ordered.find(photo => photo.stableId === draggedPhotoId)
  if (!draggedPhoto) return ordered

  const photosWithoutDragged = ordered.filter(photo => photo.stableId !== draggedPhotoId)
  const targetIndex = photosWithoutDragged.findIndex(photo => photo.stableId === targetPhotoId)
  if (targetIndex === -1) return ordered

  const insertIndex = position === 'after' ? targetIndex + 1 : targetIndex
  return photosWithoutDragged.toSpliced(insertIndex, 0, draggedPhoto).map((photo, index) => ({
    ...photo,
    draftOrder: index + 1,
  }))
}

export function applyPhotoPatch(photo: AdminWorkspacePhoto, patch?: AdminWorkspacePhotoPatch): AdminWorkspacePhoto {
  if (!patch) return photo
  const { approximateDate, ...rest } = patch
  if (approximateDate === null) return { ...photo, ...rest, approximateDate: undefined }
  if (approximateDate) return { ...photo, ...rest, approximateDate }
  return { ...photo, ...rest }
}
