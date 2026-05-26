'use client'

import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type {
  AdminWorkspaceAnimal,
  AdminWorkspacePhoto,
  PhotoFilter,
  PhotoSort,
} from '@/lib/pet-gallery/admin-workspace'
import { adminInputClassName } from '../admin-panel'

type PhotoToolbarProps = {
  animals: AdminWorkspaceAnimal[]
  search: string
  filter: PhotoFilter
  sort: PhotoSort
  visiblePhotos: AdminWorkspacePhoto[]
  manualOrderCount: number
  publishedOrderCount: number
  onSearchChange: (value: string) => void
  onFilterChange: (value: PhotoFilter) => void
  onSortChange: (value: PhotoSort) => void
}

export function PhotoToolbar({
  animals,
  search,
  filter,
  sort,
  visiblePhotos,
  manualOrderCount,
  publishedOrderCount,
  onSearchChange,
  onFilterChange,
  onSortChange,
}: PhotoToolbarProps) {
  return (
    <section aria-label="Filter and sort controls" className="border-t border-border/80 pt-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(16rem,1fr)_12rem_12rem]">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Search photos
          <input
            className={adminInputClassName}
            value={search}
            onChange={event => onSearchChange(event.currentTarget.value)}
            placeholder="Caption, filename, or animal"
          />
        </label>
        <div className="flex flex-col gap-1 text-sm font-medium">
          <span>Animal filter</span>
          <Select value={filter} onValueChange={onFilterChange}>
            <SelectTrigger aria-label="Animal filter" className="w-full border-primary/50 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All photos</SelectItem>
                <SelectItem value="untagged">Untagged</SelectItem>
                <SelectItem value="hidden">Hidden</SelectItem>
                {animals.map(animal => (
                  <SelectItem key={animal.stableId} value={animal.stableId}>
                    {animal.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1 text-sm font-medium">
          <span>Sort photos</span>
          <Select value={sort} onValueChange={value => onSortChange(value as PhotoSort)}>
            <SelectTrigger aria-label="Sort photos" className="w-full border-primary/50 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="manual">Manual order</SelectItem>
                <SelectItem value="filename">Filename</SelectItem>
                <SelectItem value="caption">Caption</SelectItem>
                <SelectItem value="animal">Animal</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>{visiblePhotos.length} visible in current view</span>
        <span data-testid="manual-order-baseline">{manualOrderCount} photos in manual order</span>
        <span data-testid="published-order-baseline">{publishedOrderCount} photos in published baseline</span>
      </div>
    </section>
  )
}
