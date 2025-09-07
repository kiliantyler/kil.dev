'use client'

import { FlippingCard } from '@/components/ui/flipping-card'
import type { Pet } from '@/types'
import { PetCardBack } from './card-back'
import { PetCardFront } from './card-front'

interface PetCardProps {
  pet: Pet
}

export function PetCard({ pet }: PetCardProps) {
  return (
    <FlippingCard
      ariaLabel={`Toggle details for ${pet.name}`}
      front={<PetCardFront imageSrc={pet.image} imageAlt={pet.imageAlt} name={pet.name} />}
      back={<PetCardBack pet={pet} />}
    />
  )
}
