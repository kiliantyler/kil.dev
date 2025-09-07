import { FlippingCard } from '@/components/ui/flipping-card'
import type { Pet } from '@/types'
import Image from 'next/image'

export function PetCard({ pet }: { pet: Pet }) {
  return (
    <FlippingCard
      ariaLabel={pet.name}
      front={<Image src={pet.image} alt={pet.imageAlt} />}
      back={<div>{pet.description}</div>}
    />
  )
}
