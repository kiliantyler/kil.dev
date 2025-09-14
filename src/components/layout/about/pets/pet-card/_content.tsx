'use client'

import { FlippingCard } from '@/components/ui/flipping-card'
import { capturePetCardFlipped } from '@/hooks/posthog'
import type { Pet } from '@/lib/pets'
import { useCallback } from 'react'
import { PetCardBack } from './card-back'
import { PetCardFront } from './card-front'

interface PetCardProps {
  pet: Pet
  onFlipChange?: (petId: string, flipped: boolean) => void
  frontPriority?: boolean
}

export function PetCard({ pet, onFlipChange, frontPriority = false }: PetCardProps) {
  const handleFlipChange = useCallback(
    (flipped: boolean) => {
      capturePetCardFlipped(pet.id, flipped ? 'back' : 'front')
      onFlipChange?.(pet.id, flipped)
    },
    [pet.id, onFlipChange],
  )

  return (
    <FlippingCard
      ariaLabel={`Toggle details for ${pet.name}`}
      onFlipChange={handleFlipChange}
      backgroundImageSrc={pet.image}
      backgroundImageAlt={pet.imageAlt}
      backgroundPriority={frontPriority}
      backgroundSizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      front={<PetCardFront name={pet.name} />}
      back={<PetCardBack pet={pet} />}
      flipLabelFrontDesktop={`Meet ${pet.name}`}
      flipLabelFrontMobile={`Tap to meet ${pet.name}`}
      flipLabelBackDesktop={`Go back to ${pet.name}`}
      flipLabelBackMobile={`Tap to go back to ${pet.name}`}
    />
  )
}
