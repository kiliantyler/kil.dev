'use client'

import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Pet } from '@/types/pets'
import { formatAgeLabel, formatDateFull } from '@/utils/utils'
import { useEffect, useState } from 'react'

function formatBirthday(dateString: string) {
  return formatDateFull(dateString)
}

interface PetCardBackProps {
  pet: Pet
}

export function PetCardBack({ pet }: PetCardBackProps) {
  return (
    <Card className="absolute inset-0 overflow-hidden bg-transparent p-6 transition-shadow [backface-visibility:hidden] group-hover:shadow-md group-hover:ring-2 group-hover:ring-primary group-hover:ring-offset-2 group-hover:ring-offset-background">
      <div aria-hidden className="absolute inset-0">
        <div className="absolute inset-0 rounded-[13px] bg-(--card-backdrop) card-back-shadow" />
      </div>

      <ScrollArea className="relative z-10 h-full">
        <div className="flex flex-col pr-2">
          <h3
            className="mb-2 text-2xl font-black tracking-tight text-foreground md:text-3xl"
            aria-label={`Pet name: ${pet.name}`}>
            {pet.name}
          </h3>
          <div className="mb-3 text-sm text-muted-foreground">
            <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1">
              <dt className="font-bold text-primary">Breed:</dt>
              <dd className="font-medium text-foreground">{pet.breed}</dd>
              <dt className="font-bold text-primary">Gender:</dt>
              <dd className="font-medium text-foreground">{pet.gender}</dd>
              <dt className="font-bold text-primary">Birthday:</dt>
              <dd className="font-medium text-foreground">
                <BirthdayWithAge birthday={pet.birthday} />
              </dd>
            </dl>
          </div>
          <p className="text-sm leading-relaxed text-foreground">{pet.description}</p>
        </div>
      </ScrollArea>
    </Card>
  )
}

function BirthdayWithAge({ birthday }: Readonly<{ birthday: string }>) {
  const [ageLabel, setAgeLabel] = useState<string | null>(null)
  useEffect(() => {
    setAgeLabel(formatAgeLabel(birthday))
  }, [birthday])
  return (
    <>
      {formatBirthday(birthday)}
      {ageLabel === null ? null : ` (${ageLabel})`}
    </>
  )
}
