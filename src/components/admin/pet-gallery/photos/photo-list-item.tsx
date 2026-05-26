'use client'

import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { AdminWorkspaceAnimal, AdminWorkspacePhoto } from '@/lib/pet-gallery/admin-workspace'
import { animalNamesForPhoto, getPhotoDisplayName } from '@/lib/pet-gallery/admin-workspace'
import { cn } from '@/utils/utils'
import { ArrowDown, ArrowUp, Check, GripVertical, MoreHorizontal } from 'lucide-react'
import Image from 'next/image'
import type { DragEvent } from 'react'

type PhotoListItemProps = {
  animals: AdminWorkspaceAnimal[]
  photo: AdminWorkspacePhoto
  selected: boolean
  active: boolean
  dragging: boolean
  dragTarget: boolean
  reorderEnabled: boolean
  canMoveUp: boolean
  canMoveDown: boolean
  onDragStartPhoto: (photoId: string, event: DragEvent<HTMLButtonElement>) => void
  onDragEndPhoto: () => void
  onDragOverPhoto: (photoId: string, event: DragEvent<HTMLLIElement>) => void
  onDropPhoto: (photoId: string, event: DragEvent<HTMLLIElement>) => void
  onEditPhoto: (photoId: string) => void
  onMovePhoto: (photoId: string, direction: 'up' | 'down') => void
  onToggleSelected: (photoId: string, selected: boolean) => void
}

export function PhotoListItem({
  animals,
  photo,
  selected,
  active,
  dragging,
  dragTarget,
  reorderEnabled,
  canMoveUp,
  canMoveDown,
  onDragStartPhoto,
  onDragEndPhoto,
  onDragOverPhoto,
  onDropPhoto,
  onEditPhoto,
  onMovePhoto,
  onToggleSelected,
}: PhotoListItemProps) {
  const name = getPhotoDisplayName(photo)
  const animalNames = animalNamesForPhoto(photo, animals)

  return (
    <li
      aria-label={`${name} ${photo.filename} ${animalNames.join(' ')}`}
      onDragOver={event => onDragOverPhoto(photo.stableId, event)}
      onDrop={event => onDropPhoto(photo.stableId, event)}
      className={cn(
        'grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-t border-border/80 py-3 transition-colors sm:gap-3',
        active && 'bg-primary/5',
        selected && 'bg-accent/20',
        dragging && 'opacity-50',
        dragTarget && 'bg-accent/35',
      )}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={reorderEnabled ? `Drag ${name}` : `Drag disabled for ${name}`}
            className="size-8 sm:size-9"
            draggable={reorderEnabled}
            onDragStart={event => onDragStartPhoto(photo.stableId, event)}
            onDragEnd={onDragEndPhoto}>
            <GripVertical aria-hidden="true" className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{reorderEnabled ? `Drag ${name}` : 'Switch to manual order to drag'}</TooltipContent>
      </Tooltip>
      <button
        type="button"
        className="group grid min-w-0 grid-cols-[5rem_minmax(0,1fr)] gap-3 rounded-sm text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:grid-cols-[7rem_minmax(0,1fr)]"
        onClick={() => {
          onToggleSelected(photo.stableId, !selected)
        }}
        aria-label={`${selected ? 'Deselect' : 'Select'} ${name}`}
        aria-pressed={selected}>
        <span className="relative block overflow-hidden bg-muted/50 sm:w-28">
          <Image
            src={photo.variants.thumb.url || photo.variants.card.url}
            alt={name}
            width={photo.variants.thumb.width || photo.variants.card.width}
            height={photo.variants.thumb.height || photo.variants.card.height}
            className="aspect-[4/3] w-full object-cover"
            sizes="7rem"
            loading="lazy"
          />
          <span
            aria-hidden="true"
            className={cn(
              'absolute top-1 right-1 grid size-6 place-items-center rounded-full border border-border bg-background/85 text-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100',
              selected && 'border-primary bg-primary text-primary-foreground opacity-100',
            )}>
            <Check className="size-4" />
          </span>
        </span>
        <span className="flex min-w-0 flex-col justify-center gap-1">
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="truncate text-sm font-semibold group-hover:text-primary">{name}</span>
            <span className="border-l border-border pl-2 text-[0.7rem] text-muted-foreground">
              {photo.draftVisible ? 'Draft' : 'Hidden'}
            </span>
            {photo.favorite ? <span className="text-[0.7rem] text-muted-foreground">Favorite</span> : null}
            {photo.cover ? <span className="text-[0.7rem] text-muted-foreground">Cover</span> : null}
          </span>
          <span className="truncate text-xs text-muted-foreground">{photo.filename}</span>
          <span className="text-xs">
            {animalNames.length > 0 ? animalNames.join(', ') : <span className="text-muted-foreground">Untagged</span>}
          </span>
        </span>
      </button>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant={active ? 'secondary' : 'outline'}
          aria-label={`Edit ${name}`}
          onClick={() => onEditPhoto(photo.stableId)}>
          Edit
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8 sm:size-9"
              aria-label={`Actions for ${name}`}>
              <MoreHorizontal aria-hidden="true" className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              disabled={!reorderEnabled || !canMoveUp}
              onSelect={() => onMovePhoto(photo.stableId, 'up')}>
              <ArrowUp aria-hidden="true" className="size-4" />
              Move up
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!reorderEnabled || !canMoveDown}
              onSelect={() => onMovePhoto(photo.stableId, 'down')}>
              <ArrowDown aria-hidden="true" className="size-4" />
              Move down
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  )
}
