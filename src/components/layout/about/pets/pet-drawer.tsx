'use client'

import {
  BottomDrawer,
  BottomDrawerContent,
  BottomDrawerDescription,
  BottomDrawerFooter,
  BottomDrawerHeader,
  BottomDrawerTitle,
} from '@/components/ui/bottom-drawer'
import { Button } from '@/components/ui/button'
import { useEffect, useRef } from 'react'

interface PetDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenGallery: () => void
}

export function PetDrawer({ open, onOpenChange, onOpenGallery }: PetDrawerProps) {
  const dismissButtonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!open) return
    const id = requestAnimationFrame(() => {
      dismissButtonRef.current?.focus()
    })
    return () => cancelAnimationFrame(id)
  }, [open])

  return (
    <BottomDrawer open={open} onOpenChange={onOpenChange}>
      <BottomDrawerContent>
        <BottomDrawerHeader>
          <BottomDrawerTitle>You seem to be a pet lover!</BottomDrawerTitle>
          <BottomDrawerDescription>Here&apos;s a secret pet gallery for you to enjoy.</BottomDrawerDescription>
        </BottomDrawerHeader>
        <BottomDrawerFooter>
          <div className="flex w-full items-center justify-end gap-3">
            <Button
              ref={dismissButtonRef}
              variant="outline"
              onClick={() => onOpenChange(false)}
              aria-label="Dismiss gallery drawer">
              Not now
            </Button>
            <Button onClick={onOpenGallery} aria-label="Open pet gallery">
              View pet gallery
            </Button>
          </div>
        </BottomDrawerFooter>
      </BottomDrawerContent>
    </BottomDrawer>
  )
}
