'use client'

import { PetCard } from '@/components/layout/about/pets/pet-card/_content'
import { Button } from '@/components/ui/button'
import { SectionLabel } from '@/components/ui/section-label'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { PETS } from '@/lib/pets'
import { useRouter } from 'next/navigation'
import { useCallback, useMemo, useRef, useState } from 'react'

export function PetsContent() {
  const [, setFlippedPetIds] = useState<Set<string>>(new Set())
  const celebratedRef = useRef(false)
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const requiredPetIds = useMemo(() => new Set(PETS.map(p => p.id)), [])

  const handlePetFlipChange = useCallback(
    (petId: string, flipped: boolean) => {
      setFlippedPetIds(prev => {
        const next = new Set(prev)
        if (flipped) {
          next.add(petId)
        }

        // Check completion only when flipping to back
        if (flipped) {
          let allSeen = true
          for (const id of requiredPetIds) {
            if (!next.has(id)) {
              allSeen = false
              break
            }
          }

          if (allSeen && !celebratedRef.current) {
            celebratedRef.current = true
            setOpen(true)
          }
        }

        return next
      })
    },
    [requiredPetIds],
  )

  return (
    <div className="mt-12 px-6">
      <SectionLabel className="mb-4">These are my pets</SectionLabel>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {PETS.map(pet => (
          <PetCard key={pet.id} pet={pet} onFlipChange={handlePetFlipChange} frontPriority />
        ))}
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="sm:max-w-2xl mx-auto rounded-t-xl border-t">
          <SheetHeader>
            <SheetTitle>You seem to be a pet lover!</SheetTitle>
            <SheetDescription>Here&apos;s a secret pet gallery for you to enjoy.</SheetDescription>
          </SheetHeader>
          <SheetFooter>
            <div className="flex w-full items-center justify-end gap-3">
              <Button variant="outline" onClick={() => setOpen(false)} aria-label="Dismiss gallery drawer">
                Not now
              </Button>
              <Button
                onClick={() => {
                  setOpen(false)
                  router.push('/pet-gallery')
                }}
                aria-label="Open pet gallery">
                View pet gallery
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
