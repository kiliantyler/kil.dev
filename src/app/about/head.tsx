import { PETS } from '@/lib/pets'

export default function Head() {
  return (
    <>
      {PETS.map(pet => (
        <link key={pet.id} rel="preload" as="image" href={pet.image.src} />
      ))}
    </>
  )
}
