'use client'

import type {
  AdminWorkspaceAnimal,
  AdminWorkspacePhoto,
  PetGalleryPublishSummary,
} from '@/lib/pet-gallery/admin-workspace'
import { PublishPanel } from '../publish-panel'

export type PublishTabProps = {
  photos: AdminWorkspacePhoto[]
  animals: AdminWorkspaceAnimal[]
  summary: PetGalleryPublishSummary | null
  error: string | null
  isPending: boolean
  cleanupMessage: string | null
  isCleaningUp: boolean
  onPublish: () => void
  onRetryCleanup: () => void
}

export function PublishTab({
  photos,
  animals,
  summary,
  error,
  isPending,
  cleanupMessage,
  isCleaningUp,
  onPublish,
  onRetryCleanup,
}: PublishTabProps) {
  return (
    <div className="max-w-4xl">
      <PublishPanel
        photos={photos}
        animals={animals}
        summary={summary}
        error={error}
        isPending={isPending}
        cleanupMessage={cleanupMessage}
        isCleaningUp={isCleaningUp}
        onPublish={onPublish}
        onRetryCleanup={onRetryCleanup}
      />
    </div>
  )
}
