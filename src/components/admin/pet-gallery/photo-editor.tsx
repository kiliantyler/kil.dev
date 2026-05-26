'use client'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Switch } from '@/components/ui/motion-switch'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type {
  AdminWorkspaceAnimal,
  AdminWorkspacePhoto,
  AdminWorkspacePhotoPatch,
} from '@/lib/pet-gallery/admin-workspace'
import { getPhotoDisplayName } from '@/lib/pet-gallery/admin-workspace'
import { cn } from '@/utils/utils'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AdminAlert, adminInputClassName, adminTextareaClassName } from './admin-panel'

type PhotoEditorProps = {
  photo: AdminWorkspacePhoto | null
  animals: AdminWorkspaceAnimal[]
  error: string | null
  onUpdate: (photoId: string, patch: AdminWorkspacePhotoPatch) => void
  onFlush: () => void
  onDelete: (photoId: string) => void
}

type PhotoEditorSwitchProps = {
  label: string
  checked: boolean
  disabled?: boolean
  onCheckedChange: (checked: boolean) => void
}

function PhotoEditorSwitch({ label, checked, disabled, onCheckedChange }: PhotoEditorSwitchProps) {
  return (
    <div className="flex min-w-36 items-center gap-2 text-sm font-medium">
      <Switch size="sm" aria-label={label} checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
      <span>{label}</span>
    </div>
  )
}

function dateFromPhoto(photo: AdminWorkspacePhoto) {
  const { approximateDate } = photo
  if (!approximateDate?.year || !approximateDate.month || !approximateDate.day) return
  return new Date(approximateDate.year, approximateDate.month - 1, approximateDate.day)
}

function patchFromDate(date: Date | undefined): AdminWorkspacePhotoPatch['approximateDate'] {
  if (!date) return null
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  }
}

export function PhotoEditor({ photo, animals, error, onUpdate, onFlush, onDelete }: PhotoEditorProps) {
  const [confirmingDeletePhotoId, setConfirmingDeletePhotoId] = useState<string | null>(null)
  const [datePickerOpen, setDatePickerOpen] = useState(false)

  useEffect(() => {
    setConfirmingDeletePhotoId(null)
    setDatePickerOpen(false)
  }, [photo?.stableId])

  if (!photo) {
    return null
  }

  const selectedPhoto = photo
  const name = getPhotoDisplayName(selectedPhoto)
  const selectedDate = dateFromPhoto(selectedPhoto)
  const activeOrAttachedAnimals = animals.filter(
    animal => !animal.hidden || selectedPhoto.animalIds.includes(animal.stableId),
  )

  return (
    <div role="region" aria-label="Selected photo editor" className="flex flex-col gap-4">
      <div className="flex flex-col gap-4">
        {error ? <AdminAlert>{error}</AdminAlert> : null}
        <div className="grid gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Title
            <input
              className={adminInputClassName}
              value={photo.title ?? ''}
              onChange={event => onUpdate(photo.stableId, { title: event.currentTarget.value })}
              onBlur={onFlush}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Caption
            <textarea
              className={`${adminTextareaClassName} min-h-20`}
              value={photo.caption ?? ''}
              onChange={event => onUpdate(photo.stableId, { caption: event.currentTarget.value })}
              onBlur={onFlush}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Alt text
            <input
              className={adminInputClassName}
              value={photo.altText ?? ''}
              onChange={event => onUpdate(photo.stableId, { altText: event.currentTarget.value })}
              onBlur={onFlush}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Internal notes
            <textarea
              className={`${adminTextareaClassName} min-h-16`}
              value={photo.internalNotes ?? ''}
              onChange={event => onUpdate(photo.stableId, { internalNotes: event.currentTarget.value })}
              onBlur={onFlush}
            />
          </label>
        </div>
        <fieldset className="grid gap-2 border-t border-border/80 pt-3 text-sm">
          <legend className="px-1 font-medium">Animals in photo</legend>
          {activeOrAttachedAnimals.length === 0 ? (
            <p className="text-xs text-muted-foreground">No animals are registered yet.</p>
          ) : null}
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {activeOrAttachedAnimals.map(animal => {
              const checked = photo.animalIds.includes(animal.stableId)
              const label = `${animal.name}${animal.hidden ? ' (hidden)' : ''}`
              return (
                <PhotoEditorSwitch
                  key={animal.stableId}
                  label={label}
                  checked={checked}
                  disabled={animal.hidden && !checked}
                  onCheckedChange={nextChecked => {
                    const current = new Set(photo.animalIds)
                    if (nextChecked) current.add(animal.stableId)
                    else current.delete(animal.stableId)
                    onUpdate(photo.stableId, { animalIds: [...current] })
                  }}
                />
              )
            })}
          </div>
        </fieldset>
        <fieldset className="grid gap-2 border-t border-border/80 pt-3 text-sm">
          <legend className="px-1 font-medium">Photo options</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <PhotoEditorSwitch
              label="Favorite"
              checked={photo.favorite}
              onCheckedChange={checked => onUpdate(photo.stableId, { favorite: checked })}
            />
            <PhotoEditorSwitch
              label="Cover photo"
              checked={photo.cover}
              onCheckedChange={checked => onUpdate(photo.stableId, { cover: checked })}
            />
            <PhotoEditorSwitch
              label="Visible in draft"
              checked={photo.draftVisible}
              onCheckedChange={checked => onUpdate(photo.stableId, { draftVisible: checked })}
            />
          </div>
        </fieldset>
        <fieldset className="grid gap-2 border-t border-border/80 pt-3 text-sm">
          <legend className="px-1 font-medium">Approximate date</legend>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <span>Date</span>
              <Popover
                open={datePickerOpen}
                onOpenChange={nextOpen => {
                  setDatePickerOpen(nextOpen)
                  if (!nextOpen) onFlush()
                }}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    aria-label="Date"
                    className={cn(
                      'min-w-44 justify-start text-left font-normal',
                      !selectedDate && 'text-muted-foreground',
                    )}>
                    <CalendarIcon aria-hidden="true" />
                    {selectedDate ? format(selectedDate, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0">
                  <Calendar
                    mode="single"
                    captionLayout="dropdown"
                    selected={selectedDate}
                    defaultMonth={selectedDate}
                    startMonth={new Date(1900, 0)}
                    endMonth={new Date(2100, 11)}
                    onSelect={date => {
                      onUpdate(photo.stableId, { approximateDate: patchFromDate(date) })
                      setDatePickerOpen(false)
                      onFlush()
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!photo.approximateDate}
              onClick={() => onUpdate(photo.stableId, { approximateDate: null })}>
              Clear date
            </Button>
          </div>
        </fieldset>
        <div className="border-t border-destructive/50 pt-3">
          <div className="flex flex-col gap-3">
            <Button type="button" variant="destructive" onClick={() => setConfirmingDeletePhotoId(photo.stableId)}>
              Delete selected photo
            </Button>
            {confirmingDeletePhotoId === photo.stableId ? (
              <div role="group" aria-label={`Confirm delete ${name}`} className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  This permanently deletes the draft record, removes it from the public snapshot, and deletes its
                  UploadThing files.
                </span>
                <Button
                  type="button"
                  variant="destructive"
                  aria-label={`Confirm delete ${name}`}
                  onClick={() => onDelete(photo.stableId)}>
                  Confirm delete
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
