import * as Pets from '@/images/pets'

export default function Head() {
  return (
    <>
      <link rel="preload" as="image" href={Pets.Azazel.src} />
      <link rel="preload" as="image" href={Pets.Gozer.src} />
      <link rel="preload" as="image" href={Pets.Lilith.src} />
      <link rel="preload" as="image" href={Pets.Lux.src} />
      <link rel="preload" as="image" href={Pets.Milim.src} />
      <link rel="preload" as="image" href={Pets.Tali.src} />
    </>
  )
}
