'use client'

import { PetCard } from '@/components/layout/about/pets/pet-card/_content'
import { PetDrawer } from '@/components/layout/about/pets/pet-drawer'
import { useAchievements } from '@/components/providers/achievements-provider'
import { SectionLabel } from '@/components/ui/section-label'
import type { AchievementId } from '@/lib/achievements'
import { PETS } from '@/lib/pets'
import { useRouter } from 'next/navigation'
import { useCallback, useMemo, useRef, useState } from 'react'

export function PetsContent() {
  const { unlock, has } = useAchievements()
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
            if (!has('PET_PARADE')) {
              unlock('PET_PARADE' as AchievementId)
            }
            setOpen(true)
          }
        }

        return next
      })
    },
    [requiredPetIds, has, unlock],
  )

  return (
    <div className="mt-12 px-6">
      <SectionLabel className="mb-4">These are my pets</SectionLabel>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {PETS.map(pet => (
          <PetCard key={pet.id} pet={pet} onFlipChange={handlePetFlipChange} frontPriority />
        ))}
      </div>

      <PetDrawer
        open={open}
        onOpenChange={setOpen}
        onOpenGallery={() => {
          setOpen(false)
          router.push('/pet-gallery')
        }}
      />
    </div>
  )
}
