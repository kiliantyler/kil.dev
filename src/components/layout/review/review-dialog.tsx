'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { buttonVariants } from '@/components/ui/button'
import type { ReviewConfig } from '@/types/review'
import { cn } from '@/utils/utils'
import React, { useCallback, useEffect, useMemo, useRef } from 'react'

type StarValue = 1 | 2 | 3 | 4 | 5

export type ReviewDialogProps = {
  open: boolean
  rating: 0 | StarValue
  onSelect: (next: 0 | StarValue) => void
  onSubmit: () => void
  copy: ReviewConfig['copy']
}

function Star({ value, active, onSelect }: { value: StarValue; active: boolean; onSelect: (v: StarValue) => void }) {
  const handleClick = useCallback(() => onSelect(value), [onSelect, value])
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onSelect(value)
      }
    },
    [onSelect, value],
  )
  return (
    <button
      type="button"
      aria-label={`Rate ${value} ${value === 1 ? 'star' : 'stars'}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        buttonVariants({ variant: 'ghost', size: 'icon' }),
        'h-10 w-10 text-2xl focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
        active ? 'text-yellow-500' : 'text-muted-foreground',
      )}>
      {active ? '★' : '☆'}
    </button>
  )
}

export function ReviewDialog({ open, rating, onSelect, onSubmit, copy }: ReviewDialogProps) {
  const starsRef = useRef<Array<HTMLButtonElement | null>>([])

  const hint = useMemo(() => {
    const key = (rating === 0 ? 0 : rating) as 0 | StarValue
    return copy.ratingText[key]
  }, [copy.ratingText, rating])

  const handleKeyDownOnGroup = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      e.preventDefault()
      const dir = e.key === 'ArrowRight' ? 1 : -1
      const current = rating === 0 ? 0 : rating
      let next = (current + dir) as 0 | StarValue
      if (next < 0) next = 0
      if (next > 5) next = 5
      onSelect(next)
      const idx = next === 0 ? 0 : (next as number) - 1
      if (idx >= 0) starsRef.current[idx]?.focus()
    },
    [onSelect, rating],
  )

  // Prevent closing via keyboard/mouse interactions outside
  const handleEscape = React.useCallback((e: Event) => {
    e.preventDefault()
  }, [])
  const handleInteractOutside = React.useCallback((e: Event) => {
    e.preventDefault()
  }, [])

  // Keep focus within dialog when opened (AlertDialog already traps focus)
  useEffect(() => {
    if (!open) return
  }, [open])

  const canSubmit = rating === 5

  return (
    <AlertDialog open={open}>
      <AlertDialogContent onEscapeKeyDown={handleEscape as never} onInteractOutside={handleInteractOutside as never}>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.title}</AlertDialogTitle>
          <AlertDialogDescription>{copy.intro}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-4">
          <div
            role="group"
            aria-label="Star rating"
            className="flex items-center justify-center gap-1"
            onKeyDown={handleKeyDownOnGroup}>
            {[1, 2, 3, 4, 5].map((v, i) => (
              <Star
                key={v}
                value={v as StarValue}
                active={rating >= v}
                onSelect={onSelect}
                // @ts-expect-error Assigning ref to array index
                ref={(el: HTMLButtonElement | null) => (starsRef.current[i] = el)}
              />
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground">{hint}</p>
        </div>

        <AlertDialogFooter>
          <AlertDialogAction aria-label="Submit 5-star rating" onClick={onSubmit} disabled={!canSubmit}>
            {copy.submitCta}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default ReviewDialog
