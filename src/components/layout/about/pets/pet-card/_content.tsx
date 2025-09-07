'use client'

import { FlippingCard } from '@/components/ui/flipping-card'
import { capturePetCardFlipped } from '@/hooks/posthog'
import type { Pet } from '@/types'
import { useCallback } from 'react'
import { PetCardBack } from './card-back'
import { PetCardFront } from './card-front'

interface PetCardProps {
  pet: Pet
}

export function PetCard({ pet }: PetCardProps) {
  const handleFlipChange = useCallback(
    (flipped: boolean) => {
      capturePetCardFlipped(pet.id, flipped ? 'back' : 'front')
    },
    [pet.id],
  )

  return (
    <FlippingCard
      ariaLabel={`Toggle details for ${pet.name}`}
      onFlipChange={handleFlipChange}
      front={<PetCardFront imageSrc={pet.image} imageAlt={pet.imageAlt} name={pet.name} />}
      back={<PetCardBack pet={pet} />}
    />
  )
}
