import type { StaticImageData } from 'next/image'

export interface Pet {
  id: string
  name: string
  breed: string
  birthday: string
  gender: string
  description: string
  image: StaticImageData
  imageAlt: string
}
