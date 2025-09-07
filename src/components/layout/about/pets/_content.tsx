import { PetCard } from '@/components/layout/about/pets/pet-card/_content'
import { SectionLabel } from '@/components/ui/section-label'
import { PETS } from '@/lib/pets'

export function PetsContent() {
  return (
    <div className="mt-12 px-6">
      <SectionLabel className="mb-4">These are my pets</SectionLabel>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {PETS.map(pet => (
          <PetCard key={pet.id} pet={pet} />
        ))}
      </div>
    </div>
  )
}
