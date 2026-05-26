'use client'

import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { AdminWorkspaceAnimal } from '@/lib/pet-gallery/admin-workspace'
import { adminStatusClassName } from './admin-panel'

type BulkActionsProps = {
  animals: AdminWorkspaceAnimal[]
  selectedCount: number
  visibleCount: number
  selectedAnimalId: string
  message: string | null
  allVisibleSelected: boolean
  onSelectVisible: () => void
  onClearSelection: () => void
  onSelectedAnimalChange: (animalId: string) => void
  onApplyAnimal: () => void
  onVisibilityChange: (visible: boolean) => void
}

export function BulkActions({
  animals,
  selectedCount,
  visibleCount,
  selectedAnimalId,
  message,
  allVisibleSelected,
  onSelectVisible,
  onClearSelection,
  onSelectedAnimalChange,
  onApplyAnimal,
  onVisibilityChange,
}: BulkActionsProps) {
  const activeAnimals = animals.filter(animal => !animal.hidden)
  const hasActiveAnimal = activeAnimals.length > 0

  return (
    <section aria-label="Bulk actions" className="border-t border-border/80 py-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <span className="font-medium">{selectedCount} selected</span>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-label="Select all visible photos"
              disabled={visibleCount === 0 || allVisibleSelected}
              onClick={onSelectVisible}>
              Select visible
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-label="Clear selected photos"
              disabled={selectedCount === 0}
              onClick={onClearSelection}>
              Clear
            </Button>
          </div>
          <div className="flex min-w-52 flex-1 items-center gap-2 font-medium sm:flex-none">
            <span className="text-muted-foreground">Bulk animal</span>
            <Select disabled={!hasActiveAnimal} value={selectedAnimalId} onValueChange={onSelectedAnimalChange}>
              <SelectTrigger aria-label="Bulk animal" className="h-8 min-w-36 flex-1 border-primary/50 bg-background">
                <SelectValue placeholder="No available animals" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {activeAnimals.map(animal => (
                    <SelectItem key={animal.stableId} value={animal.stableId}>
                      {animal.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            aria-label="Apply animal to selected photos"
            disabled={selectedCount === 0 || !hasActiveAnimal}
            onClick={onApplyAnimal}>
            Tag selected
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={selectedCount === 0}
            onClick={() => onVisibilityChange(true)}>
            Show selected
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={selectedCount === 0}
            onClick={() => onVisibilityChange(false)}>
            Hide selected
          </Button>
        </div>
        {hasActiveAnimal ? null : (
          <p role="status" aria-live="polite" aria-atomic="true" className={adminStatusClassName}>
            No active animals are available for bulk tagging.
          </p>
        )}
        {message ? (
          <p role="status" aria-live="polite" aria-atomic="true" className={adminStatusClassName}>
            {message}
          </p>
        ) : null}
      </div>
    </section>
  )
}
