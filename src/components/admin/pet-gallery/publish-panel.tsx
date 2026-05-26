'use client'

import { Button } from '@/components/ui/button'
import type {
  AdminWorkspaceAnimal,
  AdminWorkspacePhoto,
  PetGalleryPublishSummary,
} from '@/lib/pet-gallery/admin-workspace'
import { RefreshCw, Send } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { AdminAlert, AdminPanel } from './admin-panel'

type PublishPanelProps = {
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

export function PublishPanel({
  photos,
  animals,
  summary,
  error,
  isPending,
  cleanupMessage,
  isCleaningUp,
  onPublish,
  onRetryCleanup,
}: PublishPanelProps) {
  const visibleCount = photos.filter(photo => photo.draftVisible).length
  const untaggedCount = photos.filter(photo => photo.animalIds.length === 0).length
  const hiddenAnimalCount = animals.filter(animal => animal.hidden).length
  const hiddenCount = photos.filter(photo => !photo.draftVisible).length
  const activeAnimalIds = new Set(animals.filter(animal => !animal.hidden).map(animal => animal.stableId))
  const hiddenAnimalReferencedCount = photos.filter(photo =>
    photo.animalIds.some(animalId => !activeAnimalIds.has(animalId)),
  ).length
  const lastPublishedAt = summary
    ? new Date(summary.publishedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Not published in this session'
  const lastPublishedActor = summary?.actorName ?? summary?.actorEmail

  return (
    <AdminPanel aria-label="Publish panel">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold">Publish panel</h2>
          <p className="text-sm text-muted-foreground">
            Publish the authenticated draft state to the public pet gallery snapshot.
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div className="border-l border-border pl-3">
            <dt className="text-muted-foreground">Visible photos</dt>
            <dd className="text-lg font-semibold">{visibleCount}</dd>
          </div>
          <div className="border-l border-border pl-3">
            <dt className="text-muted-foreground">Animals</dt>
            <dd className="text-lg font-semibold">{animals.length}</dd>
          </div>
          <div className="border-l border-border pl-3">
            <dt className="text-muted-foreground">Untagged</dt>
            <dd className="text-lg font-semibold">{untaggedCount}</dd>
          </div>
          <div className="border-l border-border pl-3">
            <dt className="text-muted-foreground">Hidden animals</dt>
            <dd className="text-lg font-semibold">{hiddenAnimalCount}</dd>
          </div>
        </dl>
        <div className="grid gap-2 text-sm">
          <p className="text-muted-foreground">Last published: {lastPublishedAt}</p>
          {lastPublishedActor ? <p className="text-muted-foreground">Published by: {lastPublishedActor}</p> : null}
          {hiddenCount > 0 || hiddenAnimalReferencedCount > 0 ? (
            <p className="border-l border-border py-2 pl-3 text-muted-foreground">
              {hiddenCount > 0 ? `${hiddenCount} hidden photos will stay out of the public gallery. ` : null}
              {hiddenAnimalReferencedCount > 0
                ? `${hiddenAnimalReferencedCount} photos reference animals hidden from tagging; those tags are hidden publicly.`
                : null}
            </p>
          ) : null}
          {summary ? (
            <p role="status" aria-live="polite" aria-atomic="true" className="border-l border-border py-2 pl-3">
              Published {summary.photoCount} photos and {summary.animalCount} animals.
              {summary.revalidationError ? ` Revalidation warning: ${summary.revalidationError}` : null}
            </p>
          ) : null}
          {cleanupMessage ? (
            <p role="status" aria-live="polite" aria-atomic="true" className="border-l border-border py-2 pl-3">
              {cleanupMessage}
            </p>
          ) : null}
          {error ? <AdminAlert>{error}</AdminAlert> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={isPending} onClick={onPublish}>
            <Send aria-hidden="true" />
            {isPending ? 'Publishing' : 'Publish draft'}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href={'/admin/pet-gallery/preview' as Route}>Open draft preview</Link>
          </Button>
          <Button type="button" variant="outline" disabled={isPending || isCleaningUp} onClick={onRetryCleanup}>
            <RefreshCw aria-hidden="true" />
            {isCleaningUp ? 'Checking cleanup' : 'Retry file cleanup'}
          </Button>
        </div>
      </div>
    </AdminPanel>
  )
}
