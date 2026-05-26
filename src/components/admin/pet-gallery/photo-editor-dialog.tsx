'use client'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type {
  AdminWorkspaceAnimal,
  AdminWorkspacePhoto,
  AdminWorkspacePhotoPatch,
} from '@/lib/pet-gallery/admin-workspace'
import { animalNamesForPhoto, getPhotoDisplayName } from '@/lib/pet-gallery/admin-workspace'
import { PhotoEditor } from './photo-editor'

type PhotoEditorDialogProps = {
  open: boolean
  photo: AdminWorkspacePhoto | null
  animals: AdminWorkspaceAnimal[]
  error: string | null
  onOpenChange: (open: boolean) => void
  onUpdate: (photoId: string, patch: AdminWorkspacePhotoPatch) => void
  onFlush: () => void
  onDelete: (photoId: string) => void
}

export function PhotoEditorDialog({
  open,
  photo,
  animals,
  error,
  onOpenChange,
  onUpdate,
  onFlush,
  onDelete,
}: PhotoEditorDialogProps) {
  const name = photo ? getPhotoDisplayName(photo) : 'photo'
  const animalNames = photo ? animalNamesForPhoto(photo, animals) : []

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) onFlush()
    onOpenChange(nextOpen)
  }

  function handleDelete(photoId: string) {
    onDelete(photoId)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[min(90vh,56rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit {name}</DialogTitle>
          <DialogDescription>{animalNames.join(', ') || 'No animal tags'}</DialogDescription>
        </DialogHeader>
        <PhotoEditor
          photo={photo}
          animals={animals}
          error={error}
          onUpdate={onUpdate}
          onFlush={onFlush}
          onDelete={handleDelete}
        />
      </DialogContent>
    </Dialog>
  )
}
