'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DEFAULT_PET_GALLERY_ANIMAL_COLOR,
  type AdminWorkspaceAnimal,
  type AdminWorkspaceAnimalPatch,
} from '@/lib/pet-gallery/admin-workspace'
import { PET_GALLERY_ANIMAL_SPECIES_OPTIONS, type PetGalleryAnimalSpecies } from '@/lib/pet-gallery/types'
import { ChevronDown, Eye, EyeOff, GripVertical, MoreHorizontal, X } from 'lucide-react'
import type { ComponentProps, DragEvent, ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { AdminAlert, AdminPanel, adminInputClassName, adminSmallInputClassName } from './admin-panel'

type AnimalRegistryProps = {
  animals: AdminWorkspaceAnimal[]
  error: string | null
  onCreateAnimal: (name: string) => void
  onUpdateAnimal: (animalId: string, patch: AdminWorkspaceAnimalPatch) => void
  onReorderAnimals: (animalIds: string[]) => void
  onHideAnimal: (animalId: string) => void
  onRestoreAnimal: (animalId: string) => void
}

type AnimalRowProps = {
  animal: AdminWorkspaceAnimal
  draggingAnimalId: string | null
  dragOverAnimalId: string | null
  confirmingAnimalId: string | null
  onConfirmingAnimalChange: (animalId: string | null) => void
  onDragStartAnimal: (animalId: string, event: DragEvent<HTMLButtonElement>) => void
  onDragEndAnimal: () => void
  onDragOverAnimal: (animalId: string, event: DragEvent<HTMLLIElement>) => void
  onDropAnimal: (animalId: string, event: DragEvent<HTMLLIElement>) => void
  onUpdateAnimal: (animalId: string, patch: AdminWorkspaceAnimalPatch) => void
  onHideAnimal: (animalId: string) => void
}

type AnimalIconButtonProps = {
  label: string
  onClick: () => void
  children: ReactNode
  variant?: ComponentProps<typeof Button>['variant']
}

function AnimalIconButton({ label, onClick, children, variant = 'outline' }: AnimalIconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant={variant} size="icon" aria-label={label} onClick={onClick}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function AnimalRow({
  animal,
  draggingAnimalId,
  dragOverAnimalId,
  confirmingAnimalId,
  onConfirmingAnimalChange,
  onDragStartAnimal,
  onDragEndAnimal,
  onDragOverAnimal,
  onDropAnimal,
  onHideAnimal,
  onUpdateAnimal,
}: AnimalRowProps) {
  const speciesLabel = `Species for ${animal.name}`
  const isDragging = draggingAnimalId === animal.stableId
  const isDragTarget = dragOverAnimalId === animal.stableId && !isDragging

  return (
    <li
      key={animal.stableId}
      data-testid={`animal-${animal.stableId}`}
      onDragOver={event => onDragOverAnimal(animal.stableId, event)}
      onDrop={event => onDropAnimal(animal.stableId, event)}
      className={[
        'grid grid-cols-[auto_minmax(0,1fr)_minmax(7rem,0.72fr)_auto] items-center gap-x-2 border-t border-border/80 py-2.5 transition-colors sm:grid-cols-[auto_minmax(11rem,1fr)_minmax(8rem,12rem)_auto] sm:items-end sm:gap-x-3 sm:py-3',
        isDragging ? 'opacity-50' : '',
        isDragTarget ? 'bg-accent/35' : '',
      ]
        .filter(Boolean)
        .join(' ')}>
      <div className="flex items-center sm:items-end sm:pb-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Drag ${animal.name}`}
              className="size-8 sm:size-9"
              draggable
              onDragStart={event => onDragStartAnimal(animal.stableId, event)}
              onDragEnd={onDragEndAnimal}>
              <GripVertical aria-hidden="true" className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Drag {animal.name}</TooltipContent>
        </Tooltip>
      </div>
      <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-muted-foreground">
        <span className="sr-only md:not-sr-only">Name</span>
        <input
          aria-label={`Name for ${animal.name}`}
          className={`${adminSmallInputClassName} border-border/70 bg-background/45 text-sm sm:border-primary/50 sm:bg-background`}
          value={animal.name}
          onChange={event => onUpdateAnimal(animal.stableId, { name: event.currentTarget.value })}
        />
      </label>
      <div className="flex min-w-0 flex-col gap-1 text-xs font-medium text-muted-foreground">
        <span className="sr-only md:not-sr-only">Species</span>
        <Select
          value={animal.species === 'dog' ? 'dog' : 'cat'}
          onValueChange={species => onUpdateAnimal(animal.stableId, { species: species as PetGalleryAnimalSpecies })}>
          <SelectTrigger
            aria-label={speciesLabel}
            className="w-full border-border/70 bg-background/45 sm:border-primary/50 sm:bg-background"
            size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {PET_GALLERY_ANIMAL_SPECIES_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center sm:items-end sm:pb-0.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={`Actions for ${animal.name}`}
              className="size-8 border-border/70 bg-background/45 sm:size-9">
              <MoreHorizontal aria-hidden="true" className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-40">
            <DropdownMenuLabel>Color</DropdownMenuLabel>
            <div className="flex items-center gap-2 px-2 py-1.5 text-sm" onClick={event => event.stopPropagation()}>
              <input
                aria-label={`Color for ${animal.name}`}
                className="size-8 rounded-md border border-primary/50 bg-background p-1"
                type="color"
                value={animal.color ?? DEFAULT_PET_GALLERY_ANIMAL_COLOR}
                onChange={event => onUpdateAnimal(animal.stableId, { color: event.currentTarget.value })}
              />
              <span className="text-muted-foreground">{animal.color ?? DEFAULT_PET_GALLERY_ANIMAL_COLOR}</span>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onConfirmingAnimalChange(animal.stableId)}>
              <EyeOff aria-hidden="true" className="size-4" />
              Hide
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {confirmingAnimalId === animal.stableId ? (
        <div
          role="group"
          aria-label={`Confirm hide ${animal.name}`}
          className="col-span-3 flex flex-wrap items-center gap-2 border-l border-border py-1 pl-3 text-sm sm:col-span-4">
          <span className="text-xs text-muted-foreground">
            This keeps existing photo tags attached, but removes {animal.name} from new tagging controls and the public
            animal list.
          </span>
          <AnimalIconButton
            label={`Confirm hide ${animal.name}`}
            onClick={() => {
              onHideAnimal(animal.stableId)
              onConfirmingAnimalChange(null)
            }}>
            <EyeOff aria-hidden="true" className="size-4" />
          </AnimalIconButton>
          <AnimalIconButton
            label={`Cancel hide ${animal.name}`}
            variant="ghost"
            onClick={() => onConfirmingAnimalChange(null)}>
            <X aria-hidden="true" className="size-4" />
          </AnimalIconButton>
        </div>
      ) : null}
    </li>
  )
}

type HiddenAnimalRowProps = {
  animal: AdminWorkspaceAnimal
  onRestoreAnimal: (animalId: string) => void
}

function HiddenAnimalRow({ animal, onRestoreAnimal }: HiddenAnimalRowProps) {
  return (
    <li
      data-testid={`animal-${animal.stableId}`}
      className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 py-2 text-sm text-muted-foreground">
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground/80">{animal.name}</p>
        <p className="text-xs">Hidden from new tagging controls</p>
      </div>
      <AnimalIconButton label={`Restore ${animal.name}`} onClick={() => onRestoreAnimal(animal.stableId)}>
        <Eye aria-hidden="true" className="size-4" />
      </AnimalIconButton>
    </li>
  )
}

function reorderActiveAnimals(
  animals: AdminWorkspaceAnimal[],
  draggedAnimalId: string,
  targetAnimalId: string,
  position: 'before' | 'after',
) {
  if (draggedAnimalId === targetAnimalId) return animals.map(animal => animal.stableId)

  const draggedAnimal = animals.find(animal => animal.stableId === draggedAnimalId)
  if (!draggedAnimal) return animals.map(animal => animal.stableId)

  const animalsWithoutDragged = animals.filter(animal => animal.stableId !== draggedAnimalId)
  const targetIndex = animalsWithoutDragged.findIndex(animal => animal.stableId === targetAnimalId)
  if (targetIndex === -1) return animals.map(animal => animal.stableId)

  const insertIndex = position === 'after' ? targetIndex + 1 : targetIndex
  const reordered = animalsWithoutDragged.toSpliced(insertIndex, 0, draggedAnimal)
  return reordered.map(animal => animal.stableId)
}

export function AnimalRegistry({
  animals,
  error,
  onCreateAnimal,
  onUpdateAnimal,
  onReorderAnimals,
  onHideAnimal,
  onRestoreAnimal,
}: AnimalRegistryProps) {
  const [newAnimalName, setNewAnimalName] = useState('')
  const [confirmingAnimalId, setConfirmingAnimalId] = useState<string | null>(null)
  const [draggingAnimalId, setDraggingAnimalId] = useState<string | null>(null)
  const [dragOverAnimalId, setDragOverAnimalId] = useState<string | null>(null)
  const { activeAnimals, hiddenAnimals } = useMemo(
    () => ({
      activeAnimals: animals.filter(animal => !animal.hidden),
      hiddenAnimals: animals.filter(animal => animal.hidden),
    }),
    [animals],
  )
  const hiddenAnimalIds = useMemo(() => hiddenAnimals.map(animal => animal.stableId), [hiddenAnimals])

  function handleDragStartAnimal(animalId: string, event: DragEvent<HTMLButtonElement>) {
    setDraggingAnimalId(animalId)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', animalId)
  }

  function handleDragEndAnimal() {
    setDraggingAnimalId(null)
    setDragOverAnimalId(null)
  }

  function handleDragOverAnimal(animalId: string, event: DragEvent<HTMLLIElement>) {
    if (!draggingAnimalId || draggingAnimalId === animalId) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDragOverAnimalId(animalId)
  }

  function handleDropAnimal(targetAnimalId: string, event: DragEvent<HTMLLIElement>) {
    event.preventDefault()
    const draggedAnimalId = event.dataTransfer.getData('text/plain') || draggingAnimalId
    setDraggingAnimalId(null)
    setDragOverAnimalId(null)
    if (!draggedAnimalId || draggedAnimalId === targetAnimalId) return

    const targetRect = event.currentTarget.getBoundingClientRect()
    const position = event.clientY > targetRect.top + targetRect.height / 2 ? 'after' : 'before'
    const reorderedActiveIds = reorderActiveAnimals(activeAnimals, draggedAnimalId, targetAnimalId, position)
    if (reorderedActiveIds.join('\0') === activeAnimals.map(animal => animal.stableId).join('\0')) return
    onReorderAnimals([...reorderedActiveIds, ...hiddenAnimalIds])
  }

  return (
    <AdminPanel aria-label="Animal registry">
      <div className="flex flex-col gap-5">
        <div>
          <h2 className="text-base font-semibold">Animal registry</h2>
          <p className="text-sm text-muted-foreground">
            Manage animals available for photo tagging. Hidden animals stay attached to existing photos.
          </p>
        </div>
        <form
          className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
          onSubmit={event => {
            event.preventDefault()
            const name = newAnimalName.trim()
            if (!name) return
            onCreateAnimal(name)
            setNewAnimalName('')
          }}>
          <label className="flex flex-col gap-1 text-sm font-medium">
            New animal
            <input
              className={adminInputClassName}
              value={newAnimalName}
              onChange={event => setNewAnimalName(event.currentTarget.value)}
            />
          </label>
          <Button type="submit">Create animal</Button>
        </form>
        {error ? <AdminAlert>{error}</AdminAlert> : null}
        <section aria-label="Available animals" className="grid gap-2">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">Available for tagging</h3>
              <p className="text-xs text-muted-foreground">{activeAnimals.length} shown in tagging controls</p>
            </div>
          </div>
          {activeAnimals.length === 0 ? (
            <p className="border-l border-border py-2 pl-3 text-sm text-muted-foreground">
              No animals are available for new tags.
            </p>
          ) : (
            <ul className="flex flex-col">
              {activeAnimals.map(animal => (
                <AnimalRow
                  key={animal.stableId}
                  animal={animal}
                  draggingAnimalId={draggingAnimalId}
                  dragOverAnimalId={dragOverAnimalId}
                  confirmingAnimalId={confirmingAnimalId}
                  onConfirmingAnimalChange={setConfirmingAnimalId}
                  onDragStartAnimal={handleDragStartAnimal}
                  onDragEndAnimal={handleDragEndAnimal}
                  onDragOverAnimal={handleDragOverAnimal}
                  onDropAnimal={handleDropAnimal}
                  onUpdateAnimal={onUpdateAnimal}
                  onHideAnimal={onHideAnimal}
                />
              ))}
            </ul>
          )}
        </section>
        {hiddenAnimals.length > 0 ? (
          <details className="group border-t border-border/80 pt-3">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-muted-foreground marker:hidden">
              <ChevronDown aria-hidden="true" className="size-4 transition-transform group-open:rotate-180" />
              Show hidden animals ({hiddenAnimals.length})
            </summary>
            <ul className="mt-2 flex flex-col">
              {hiddenAnimals.map(animal => (
                <HiddenAnimalRow key={animal.stableId} animal={animal} onRestoreAnimal={onRestoreAnimal} />
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    </AdminPanel>
  )
}
