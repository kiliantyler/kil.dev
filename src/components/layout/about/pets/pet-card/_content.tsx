'use client'

import { FlippingCard } from '@/components/ui/flipping-card'
import { capturePetCardFlipped } from '@/hooks/posthog'
import type { Pet } from '@/types'
import { useCallback } from 'react'
import { PetCardBack } from './card-back'
import { PetCardFront } from './card-front'

interface PetCardProps {
  pet: Pet
  onFlipChange?: (petId: string, flipped: boolean) => void
}

export function PetCard({ pet, onFlipChange }: PetCardProps) {
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
      front={<PetCardFront imageSrc={pet.image} imageAlt={pet.imageAlt} name={pet.name} />}
      back={<PetCardBack pet={pet} />}
      flipLabelFrontDesktop={`Meet ${pet.name}`}
      flipLabelFrontMobile={`Tap to meet ${pet.name}`}
      flipLabelBackDesktop={`Go back to ${pet.name}`}
      flipLabelBackMobile={`Tap to go back to ${pet.name}`}
    />
  )
}
