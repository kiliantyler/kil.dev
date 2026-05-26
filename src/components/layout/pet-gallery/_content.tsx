import { ClientMounted, GalleryClient } from '@/components/layout/pet-gallery/gallery-client'
import { ServerAlbum } from '@/components/layout/pet-gallery/server-album'
import { getCachedPetGallerySnapshot } from '@/lib/pet-gallery/public-data'

export async function PetGalleryContent() {
  const snapshot = await getCachedPetGallerySnapshot()
  const photos = snapshot?.photos ?? []

  if (photos.length === 0) {
    return <p className="text-muted-foreground">No images found in the pet gallery.</p>
  }

  return (
    <div className="animate-in duration-500 fade-in">
      <ClientMounted fallback={<ServerAlbum photos={photos} />}>
        <GalleryClient photos={photos} />
      </ClientMounted>
    </div>
  )
}
