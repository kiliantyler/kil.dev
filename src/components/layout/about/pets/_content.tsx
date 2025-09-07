import { PetCard } from '@/components/layout/about/pets/pet-card'
import { SectionLabel } from '@/components/ui/section-label'
import { PETS } from '@/lib/pets'

export function PetsContent() {
  return (
    <div className="mt-12">
      <SectionLabel>These are my pets</SectionLabel>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {PETS.map(pet => (
          <PetCard key={pet.id} pet={pet} />
        ))}
      </div>
    </div>
  )
}
