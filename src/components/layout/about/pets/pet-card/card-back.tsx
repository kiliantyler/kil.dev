'use client'

import { Card } from '@/components/ui/card'
import type { Pet } from '@/types'
import Image from 'next/image'

function formatBirthday(dateString: string) {
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return dateString
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function calculateAgeYears(dateString: string) {
  const birth = new Date(dateString)
  if (isNaN(birth.getTime())) return null
  const now = new Date()
  let years = now.getFullYear() - birth.getFullYear()
  const beforeBirthdayThisYear =
    now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
  if (beforeBirthdayThisYear) years--
  return Math.max(0, years)
}

interface PetCardBackProps {
  pet: Pet
}

export function PetCardBack({ pet }: PetCardBackProps) {
  const ageYears = calculateAgeYears(pet.birthday)

  return (
    <Card className="absolute inset-0 overflow-hidden p-6 [backface-visibility:hidden] transition-shadow bg-transparent group-hover:shadow-md group-hover:ring-2 group-hover:ring-primary group-hover:ring-offset-2 group-hover:ring-offset-background">
      {/* Background image blur layer */}
      <div aria-hidden className="absolute inset-0">
        <div className="relative h-full w-full">
          <Image src={pet.image} alt="" fill priority={false} className="object-cover scale-110 scale-x-[-1] blur-xl" />
          <div className="absolute inset-0 bg-background/40" />
        </div>
      </div>

      <div className="relative z-10 flex h-full flex-col">
        <div className="mb-3 text-sm card-back-shadow">
          <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1">
            <dt className="text-primary font-bold">Breed:</dt>
            <dd className="font-medium">{pet.breed}</dd>
            <dt className="text-primary font-bold">Gender:</dt>
            <dd className="font-medium">{pet.gender}</dd>
            <dt className="text-primary font-bold">Birthday:</dt>
            <dd className="font-medium">
              {formatBirthday(pet.birthday)}
              {ageYears != null ? ` (${ageYears} ${ageYears === 1 ? 'year' : 'years'})` : null}
            </dd>
          </dl>
        </div>
        <p className="text-sm leading-relaxed card-back-shadow">{pet.description}</p>
        <div className="mt-auto pt-6">
          <span aria-hidden className="opacity-0">
            _
          </span>
        </div>
      </div>
    </Card>
  )
}
