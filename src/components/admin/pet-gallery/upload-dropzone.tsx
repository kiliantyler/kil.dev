'use client'

import { Button } from '@/components/ui/button'
import type { UploadQueueItem } from '@/lib/pet-gallery/admin-workspace'
import {
  filterImageFiles,
  getImageFilesFromClipboard,
  getImageFilesFromDataTransfer,
} from '@/lib/pet-gallery/upload-inputs'
import { cn } from '@/utils/utils'
import { UploadCloud } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { AdminAlert, AdminPanel } from './admin-panel'

type UploadDropzoneProps = {
  queue: UploadQueueItem[]
  error: string | null
  onFiles: (files: File[]) => void
  onError: (message: string | null) => void
}

function isEditablePasteTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  return target.closest('input, textarea, [contenteditable="true"]') !== null
}

export function UploadDropzone({ queue, error, onFiles, onError }: UploadDropzoneProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      if (!event.clipboardData) return
      if (isEditablePasteTarget(event.target)) return

      const files = getImageFilesFromClipboard(event.clipboardData)
      const hasFile = Array.from(event.clipboardData.items ?? []).some(item => item.kind === 'file')

      if (files.length > 0) {
        event.preventDefault()
        onFiles(files)
        return
      }

      if (hasFile) {
        event.preventDefault()
        onError('Paste an image file to add it to the upload queue.')
      }
    }

    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [onError, onFiles])

  return (
    <AdminPanel aria-label="Upload entry">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold">Upload entry</h2>
          <p className="text-sm text-muted-foreground">
            Queue image files for UploadThing variant generation, drag/drop, or clipboard paste.
          </p>
        </div>

        <div
          data-testid="pet-gallery-upload-dropzone"
          className={cn(
            'flex min-h-32 flex-col items-center justify-center gap-3 border border-dashed border-border bg-background/35 px-4 py-6 text-center',
            isDragging && 'border-accent bg-accent/15',
          )}
          onDragEnter={event => {
            event.preventDefault()
            setIsDragging(true)
          }}
          onDragOver={event => {
            event.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={event => {
            event.preventDefault()
            setIsDragging(false)
          }}
          onDrop={event => {
            event.preventDefault()
            setIsDragging(false)
            const files = getImageFilesFromDataTransfer(event.dataTransfer)
            if (files.length > 0) {
              onFiles(files)
              return
            }
            onError('Drop image files to add them to the upload queue.')
          }}>
          <UploadCloud aria-hidden="true" className="size-6 text-primary" />
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">Drop images here or paste from the clipboard</span>
            <span className="text-xs text-muted-foreground">Accepted queue items stay local in this slice.</span>
          </div>
          <input
            ref={inputRef}
            id={inputId}
            className="sr-only"
            type="file"
            aria-label="Choose image files"
            accept="image/*"
            multiple
            onChange={event => {
              const files = filterImageFiles(event.currentTarget.files ?? [])
              if (files.length > 0) {
                onFiles(files)
              }
              event.currentTarget.value = ''
            }}
          />
          <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
            Choose image files
          </Button>
        </div>

        {error ? <AdminAlert>{error}</AdminAlert> : null}

        <div role="status" aria-live="polite" aria-atomic="false">
          <ul aria-label="Upload queue" className="flex flex-col gap-2 text-sm">
            {queue.length === 0 ? (
              <li className="border-l border-border py-2 pl-3 text-muted-foreground">No queued uploads.</li>
            ) : (
              queue.map(item => (
                <li
                  key={item.id}
                  className="flex min-w-0 flex-col gap-1 border-l border-border py-2 pl-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <span className="min-w-0 truncate">{item.filename}</span>
                  <span className="min-w-0 text-xs break-words text-muted-foreground sm:text-right">
                    {item.message}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </AdminPanel>
  )
}
