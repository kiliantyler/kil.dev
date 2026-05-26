import type { StaticImageData } from 'next/image'

export type PetType = 'cat' | 'dog'

export interface Pet {
  id: string
  name: string
  type: PetType
  breed: string
  birthday: string
  gender: string
  description: string
  image: StaticImageData
  imageAlt: string
}
