'use client'

import type { AdminWorkspaceAnimal, AdminWorkspacePhoto } from '@/lib/pet-gallery/admin-workspace'

type PetGalleryStatusStripProps = {
  photos: AdminWorkspacePhoto[]
  animals: AdminWorkspaceAnimal[]
  selectedCount: number
}

export function PetGalleryStatusStrip({ photos, animals, selectedCount }: PetGalleryStatusStripProps) {
  const visibleCount = photos.filter(photo => photo.draftVisible).length
  const hiddenCount = photos.length - visibleCount
  const activeAnimalCount = animals.filter(animal => !animal.hidden).length
  const untaggedCount = photos.filter(photo => photo.animalIds.length === 0).length

  return (
    <dl className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-5" aria-label="Pet gallery draft summary">
      <div className="border-l border-border py-1 pl-3">
        <dt className="text-muted-foreground">Photos</dt>
        <dd className="font-semibold">{photos.length}</dd>
      </div>
      <div className="border-l border-border py-1 pl-3">
        <dt className="text-muted-foreground">Visible</dt>
        <dd className="font-semibold">{visibleCount}</dd>
      </div>
      <div className="border-l border-border py-1 pl-3">
        <dt className="text-muted-foreground">Hidden</dt>
        <dd className="font-semibold">{hiddenCount}</dd>
      </div>
      <div className="border-l border-border py-1 pl-3">
        <dt className="text-muted-foreground">Animals</dt>
        <dd className="font-semibold">{activeAnimalCount}</dd>
      </div>
      <div className="border-l border-border py-1 pl-3">
        <dt className="text-muted-foreground">{selectedCount > 0 ? 'Selected' : 'Untagged'}</dt>
        <dd className="font-semibold">{selectedCount > 0 ? selectedCount : untaggedCount}</dd>
      </div>
    </dl>
  )
}
