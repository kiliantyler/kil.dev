import luxPhoto from '@/images/pets/lux.jpg'
import milimPhoto from '@/images/pets/milim.jpg'
import taliPhoto from '@/images/pets/tali.jpg'
import type { Pet } from '@/types'

export const PETS: Pet[] = [
  {
    id: 'lux',
    name: 'Lux',
    breed: 'Golden Retriever',
    birthday: '2022-06-09',
    gender: 'Female',
    description: 'Lux is a sweet and playful girl who loves to cuddle and sit like a human.',
    image: luxPhoto,
    imageAlt: 'Lux the Golden Retriever',
  },
  {
    id: 'milim',
    name: 'Milim',
    breed: 'Golden Retriever',
    birthday: '2024-03-09',
    gender: 'Female',
    description:
      "Milim is a crazy girl who can't sit still. She runs around like a maniac and loves to play with her sisters.",
    image: milimPhoto,
    imageAlt: 'Milim the Golden Retriever',
  },
  {
    id: 'tali',
    name: 'Tali',
    breed: 'Mixed (Basenji/Australian Shepherd)',
    birthday: '2015-09-24',
    gender: 'Female',
    description:
      "Tali has a spinal cord injury but she doesn't let it slow her down. She loves to chase her sisters around the back yard and bark when they go too fast for her. She also loves to sleep on the couch.",
    image: taliPhoto,
    imageAlt: 'Tali the Mixed Breed (Basenji/Australian Shepherd)',
  },
]

// Lilith & Azazel birthday 2021-04-13
// Gozer birthday 2016-04-15
