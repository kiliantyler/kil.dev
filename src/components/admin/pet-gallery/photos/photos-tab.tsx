'use client'

import type {
  AdminWorkspaceAnimal,
  AdminWorkspacePhoto,
  AdminWorkspacePhotoPatch,
  PhotoFilter,
  PhotoSort,
  UploadQueueItem,
} from '@/lib/pet-gallery/admin-workspace'
import { useCallback, useState } from 'react'
import { BulkActions } from '../bulk-actions'
import { PhotoEditorDialog } from '../photo-editor-dialog'
import { UploadDropzone } from '../upload-dropzone'
import { PhotoList } from './photo-list'
import { PhotoToolbar } from './photo-toolbar'

export type PhotosTabData = {
  animals: AdminWorkspaceAnimal[]
  selectedPhoto: AdminWorkspacePhoto | null
  selectedPhotoId: string | null
  selectedIds: string[]
  search: string
  filter: PhotoFilter
  sort: PhotoSort
  visiblePhotos: AdminWorkspacePhoto[]
  manualOrderCount: number
  publishedOrderCount: number
  queue: UploadQueueItem[]
  uploadError: string | null
  photoError: string | null
  selectedBulkAnimalId: string
  bulkMessage: string | null
}

export type PhotosTabActions = {
  onFiles: (files: File[]) => void
  onUploadError: (message: string | null) => void
  onSearchChange: (value: string) => void
  onFilterChange: (value: PhotoFilter) => void
  onSortChange: (value: PhotoSort) => void
  onSelectPhoto: (photoId: string) => void
  onToggleSelected: (photoId: string, selected: boolean) => void
  onSelectVisible: () => void
  onClearSelection: () => void
  onReorder: (draggedPhotoId: string, targetPhotoId: string, position: 'before' | 'after') => void
  onUpdatePhoto: (photoId: string, patch: AdminWorkspacePhotoPatch) => void
  onFlushPhoto: () => void
  onDeletePhoto: (photoId: string) => void
  onSelectedBulkAnimalChange: (animalId: string) => void
  onApplyBulkAnimal: () => void
  onBulkVisibilityChange: (visible: boolean) => void
}

type PhotosTabProps = {
  data: PhotosTabData
  actions: PhotosTabActions
}

export function PhotosTab({ data, actions }: PhotosTabProps) {
  const [editorOpen, setEditorOpen] = useState(false)
  const {
    animals,
    selectedPhoto,
    selectedPhotoId,
    selectedIds,
    search,
    filter,
    sort,
    visiblePhotos,
    manualOrderCount,
    publishedOrderCount,
    queue,
    uploadError,
    photoError,
    selectedBulkAnimalId,
    bulkMessage,
  } = data
  const {
    onFiles,
    onUploadError,
    onSearchChange,
    onFilterChange,
    onSortChange,
    onSelectPhoto,
    onToggleSelected,
    onSelectVisible,
    onClearSelection,
    onReorder,
    onUpdatePhoto,
    onFlushPhoto,
    onDeletePhoto,
    onSelectedBulkAnimalChange,
    onApplyBulkAnimal,
    onBulkVisibilityChange,
  } = actions
  const handleEditPhoto = useCallback(
    (photoId: string) => {
      onSelectPhoto(photoId)
      setEditorOpen(true)
    },
    [onSelectPhoto],
  )

  return (
    <>
      <div className="grid gap-5">
        <UploadDropzone queue={queue} error={uploadError} onFiles={onFiles} onError={onUploadError} />
        <PhotoToolbar
          animals={animals}
          search={search}
          filter={filter}
          sort={sort}
          visiblePhotos={visiblePhotos}
          manualOrderCount={manualOrderCount}
          publishedOrderCount={publishedOrderCount}
          onSearchChange={onSearchChange}
          onFilterChange={onFilterChange}
          onSortChange={onSortChange}
        />
        <BulkActions
          animals={animals}
          selectedCount={selectedIds.length}
          visibleCount={visiblePhotos.length}
          allVisibleSelected={
            visiblePhotos.length > 0 &&
            selectedIds.length === visiblePhotos.length &&
            visiblePhotos.every(photo => selectedIds.includes(photo.stableId))
          }
          selectedAnimalId={selectedBulkAnimalId}
          message={bulkMessage}
          onSelectVisible={onSelectVisible}
          onClearSelection={onClearSelection}
          onSelectedAnimalChange={onSelectedBulkAnimalChange}
          onApplyAnimal={onApplyBulkAnimal}
          onVisibilityChange={onBulkVisibilityChange}
        />
        <PhotoList
          animals={animals}
          selectedPhotoId={selectedPhotoId}
          selectedIds={selectedIds}
          visiblePhotos={visiblePhotos}
          onEditPhoto={handleEditPhoto}
          onToggleSelected={onToggleSelected}
          onReorder={onReorder}
          reorderEnabled={sort === 'manual'}
        />
      </div>
      <PhotoEditorDialog
        open={editorOpen && selectedPhoto !== null}
        photo={selectedPhoto}
        animals={animals}
        error={photoError}
        onOpenChange={setEditorOpen}
        onUpdate={onUpdatePhoto}
        onFlush={onFlushPhoto}
        onDelete={onDeletePhoto}
      />
    </>
  )
}
