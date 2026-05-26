'use client'

import type { AdminWorkspaceAnimal, AdminWorkspacePhoto } from '@/lib/pet-gallery/admin-workspace'
import type { DragEvent } from 'react'
import { useState } from 'react'
import { PhotoListItem } from './photo-list-item'

type PhotoListProps = {
  animals: AdminWorkspaceAnimal[]
  selectedPhotoId: string | null
  selectedIds: string[]
  visiblePhotos: AdminWorkspacePhoto[]
  reorderEnabled: boolean
  onEditPhoto: (photoId: string) => void
  onToggleSelected: (photoId: string, selected: boolean) => void
  onReorder: (draggedPhotoId: string, targetPhotoId: string, position: 'before' | 'after') => void
}

export function PhotoList({
  animals,
  selectedPhotoId,
  selectedIds,
  visiblePhotos,
  reorderEnabled,
  onEditPhoto,
  onToggleSelected,
  onReorder,
}: PhotoListProps) {
  const [draggingPhotoId, setDraggingPhotoId] = useState<string | null>(null)
  const [dragOverPhotoId, setDragOverPhotoId] = useState<string | null>(null)

  function handleDragStartPhoto(photoId: string, event: DragEvent<HTMLButtonElement>) {
    if (!reorderEnabled) return
    setDraggingPhotoId(photoId)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', photoId)
  }

  function handleDragEndPhoto() {
    setDraggingPhotoId(null)
    setDragOverPhotoId(null)
  }

  function handleDragOverPhoto(photoId: string, event: DragEvent<HTMLLIElement>) {
    if (!reorderEnabled || !draggingPhotoId || draggingPhotoId === photoId) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDragOverPhotoId(photoId)
  }

  function handleDropPhoto(targetPhotoId: string, event: DragEvent<HTMLLIElement>) {
    if (!reorderEnabled) return
    event.preventDefault()
    const draggedPhotoId = event.dataTransfer.getData('text/plain') || draggingPhotoId
    setDraggingPhotoId(null)
    setDragOverPhotoId(null)
    if (!draggedPhotoId || draggedPhotoId === targetPhotoId) return

    const targetRect = event.currentTarget.getBoundingClientRect()
    const position = event.clientY > targetRect.top + targetRect.height / 2 ? 'after' : 'before'
    onReorder(draggedPhotoId, targetPhotoId, position)
  }

  function handleMovePhoto(photoId: string, direction: 'up' | 'down') {
    if (!reorderEnabled) return
    const currentIndex = visiblePhotos.findIndex(photo => photo.stableId === photoId)
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    const targetPhoto = visiblePhotos[targetIndex]
    if (currentIndex === -1 || !targetPhoto) return
    onReorder(photoId, targetPhoto.stableId, direction === 'up' ? 'before' : 'after')
  }

  return (
    <section aria-label="Photo library" className="border-t border-border/80 pt-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Photos</h2>
        <span className="text-xs text-muted-foreground">{visiblePhotos.length} visible</span>
      </div>
      <ul aria-label="Photo grid" className="flex flex-col">
        {visiblePhotos.length === 0 ? (
          <li className="border-l border-border py-3 pl-3 text-sm text-muted-foreground">
            No photos match the current filters.
          </li>
        ) : null}
        {visiblePhotos.map((photo, index) => (
          <PhotoListItem
            key={photo.stableId}
            animals={animals}
            photo={photo}
            active={selectedPhotoId === photo.stableId}
            selected={selectedIds.includes(photo.stableId)}
            dragging={draggingPhotoId === photo.stableId}
            dragTarget={dragOverPhotoId === photo.stableId && draggingPhotoId !== photo.stableId}
            reorderEnabled={reorderEnabled}
            canMoveUp={index > 0}
            canMoveDown={index < visiblePhotos.length - 1}
            onDragStartPhoto={handleDragStartPhoto}
            onDragEndPhoto={handleDragEndPhoto}
            onDragOverPhoto={handleDragOverPhoto}
            onDropPhoto={handleDropPhoto}
            onEditPhoto={onEditPhoto}
            onMovePhoto={handleMovePhoto}
            onToggleSelected={onToggleSelected}
          />
        ))}
      </ul>
    </section>
  )
}
