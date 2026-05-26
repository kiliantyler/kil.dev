import * as Pets from '@/images/pets'
import type { Pet } from '@/types/pets'

export const PETS: Pet[] = [
  {
    id: 'lux',
    name: 'Lux',
    type: 'dog',
    breed: 'Golden Retriever',
    birthday: '2022-06-09',
    gender: 'Female',
    description: 'Lux is a sweet and playful girl who loves to cuddle and sit like a human.',
    image: Pets.Lux,
    imageAlt: 'Lux the Golden Retriever',
  },
  {
    id: 'tali',
    name: 'Tali',
    type: 'dog',
    breed: 'Mixed (Basenji/Australian Shepherd)',
    birthday: '2015-09-24',
    gender: 'Female',
    description:
      "Tali has a spinal cord injury but she doesn't let it slow her down. She loves to chase her sisters around the back yard and bark when they go too fast for her. She also loves to sleep on the couch.",
    image: Pets.Tali,
    imageAlt: 'Tali the Mixed Breed (Basenji/Australian Shepherd)',
  },
  {
    id: 'gwen',
    name: 'Gwen',
    type: 'dog',
    breed: 'Golden Retriever',
    birthday: '2025-10-18',
    gender: 'Female',
    description:
      "A sweet girl who thinks she is a tornado. When she isn't sleeping she is chewing on her big sister, Lux.",
    image: Pets.Gwen,
    imageAlt: 'Gwen the Golden Retriever',
  },
  {
    id: 'gozer',
    name: 'Gozer',
    type: 'cat',
    breed: 'Gozarian',
    birthday: '2016-04-15',
    gender: 'Female',
    description: "When she isn't fighting the Ghostbusters, she loves to lay on laps and yell at anyone who walks by.",
    image: Pets.Gozer,
    imageAlt: 'Gozer the Gozarian',
  },
  {
    id: 'lilith',
    name: 'Lilith',
    type: 'cat',
    breed: 'Witch Familiar',
    birthday: '2021-04-13',
    gender: 'Female',
    description:
      "There is nothing that Lilith wants more than to lay on my wife's lap and touch her face. When she can't do that she is laying with her brother.",
    image: Pets.Lilith,
    imageAlt: 'Lilith the Witch Familiar',
  },
  {
    id: 'azazel',
    name: 'Azazel',
    type: 'cat',
    breed: 'Chonk',
    birthday: '2021-04-13',
    gender: 'Male',
    description:
      'Azazel is a very regal man who loves to sleep on the back of the couch. He regularly gets cleaned by his sister and hates it.',
    image: Pets.Azazel,
    imageAlt: 'Azazel the Chonk',
  },
]

export function formatPetTypeSummary(pets: Pet[]): string {
  const dogCount = pets.filter(pet => pet.type === 'dog').length
  const catCount = pets.filter(pet => pet.type === 'cat').length

  return [formatPetTypeCount(dogCount, 'dog'), formatPetTypeCount(catCount, 'cat')].filter(Boolean).join(', ')
}

function formatPetTypeCount(count: number, type: Pet['type']): string | null {
  if (count === 0) return null
  return `${count} ${type}${count === 1 ? '' : 's'}`
}
