import azazelPhoto from '@/images/pets/azazel.webp'
import gozerPhoto from '@/images/pets/gozer.webp'
import lilithPhoto from '@/images/pets/lilith.webp'
import luxPhoto from '@/images/pets/lux.webp'
import milimPhoto from '@/images/pets/milim.webp'
import taliPhoto from '@/images/pets/tali.webp'

export default function Head() {
  return (
    <>
      <link rel="preload" as="image" href={azazelPhoto.src} />
      <link rel="preload" as="image" href={gozerPhoto.src} />
      <link rel="preload" as="image" href={lilithPhoto.src} />
      <link rel="preload" as="image" href={luxPhoto.src} />
      <link rel="preload" as="image" href={milimPhoto.src} />
      <link rel="preload" as="image" href={taliPhoto.src} />
    </>
  )
}
