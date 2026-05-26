'use client'

import type { AdminWorkspaceAnimal, AdminWorkspaceAnimalPatch } from '@/lib/pet-gallery/admin-workspace'
import { AnimalRegistry } from '../animal-registry'

export type AnimalsTabProps = {
  animals: AdminWorkspaceAnimal[]
  error: string | null
  onCreateAnimal: (name: string) => void
  onUpdateAnimal: (animalId: string, patch: AdminWorkspaceAnimalPatch) => void
  onReorderAnimals: (animalIds: string[]) => void
  onHideAnimal: (animalId: string) => void
  onRestoreAnimal: (animalId: string) => void
}

export function AnimalsTab({
  animals,
  error,
  onCreateAnimal,
  onUpdateAnimal,
  onReorderAnimals,
  onHideAnimal,
  onRestoreAnimal,
}: AnimalsTabProps) {
  return (
    <div className="max-w-4xl">
      <AnimalRegistry
        animals={animals}
        error={error}
        onCreateAnimal={onCreateAnimal}
        onUpdateAnimal={onUpdateAnimal}
        onReorderAnimals={onReorderAnimals}
        onHideAnimal={onHideAnimal}
        onRestoreAnimal={onRestoreAnimal}
      />
    </div>
  )
}
