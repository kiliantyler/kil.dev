'use client'

import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Pet } from '@/types/pets'
import { calculateAgeYears, formatDateFull } from '@/utils/utils'

function formatBirthday(dateString: string) {
  return formatDateFull(dateString)
}

interface PetCardBackProps {
  pet: Pet
}

export function PetCardBack({ pet }: PetCardBackProps) {
  const ageYears = calculateAgeYears(pet.birthday)

  return (
    <Card className="absolute inset-0 overflow-hidden p-6 [backface-visibility:hidden] transition-shadow bg-transparent group-hover:shadow-md group-hover:ring-2 group-hover:ring-primary group-hover:ring-offset-2 group-hover:ring-offset-background">
      <div aria-hidden className="absolute inset-0">
        <div className="absolute inset-0 bg-(--card-backdrop) card-back-shadow rounded-[13px]" />
      </div>

      <ScrollArea className="relative z-10 h-full">
        <div className="flex flex-col pr-2">
          <h3
            className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground mb-2"
            aria-label={`Pet name: ${pet.name}`}>
            {pet.name}
          </h3>
          <div className="mb-3 text-sm text-muted-foreground">
            <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1">
              <dt className="text-primary font-bold">Breed:</dt>
              <dd className="font-medium text-foreground">{pet.breed}</dd>
              <dt className="text-primary font-bold">Gender:</dt>
              <dd className="font-medium text-foreground">{pet.gender}</dd>
              <dt className="text-primary font-bold">Birthday:</dt>
              <dd className="font-medium text-foreground">
                {formatBirthday(pet.birthday)}
                {ageYears != null ? ` (${ageYears} ${ageYears === 1 ? 'year' : 'years'})` : null}
              </dd>
            </dl>
          </div>
          <p className="text-sm leading-relaxed text-foreground">{pet.description}</p>
          <div className="pt-6">
            <span aria-hidden className="opacity-0">
              _
            </span>
          </div>
        </div>
      </ScrollArea>
    </Card>
  )
}
