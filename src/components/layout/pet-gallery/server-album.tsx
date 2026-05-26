import type { Photo } from 'react-photo-album'
import ServerPhotoAlbum from 'react-photo-album/server'

import { getPetGalleryPhotoAlt } from '@/lib/pet-gallery/public-data'
import type { PublicPetGalleryPhoto } from '@/lib/pet-gallery/types'

type ServerAlbumProps = {
  photos: PublicPetGalleryPhoto[]
  limit?: number
}

function toPhotos(photos: PublicPetGalleryPhoto[]): Photo[] {
  return photos.map(photo => ({
    src: photo.variants.card.url,
    width: photo.variants.card.width,
    height: photo.variants.card.height,
    alt: getPetGalleryPhotoAlt(photo),
  }))
}

export function ServerAlbum({ photos, limit = 48 }: ServerAlbumProps) {
  const albumPhotos = toPhotos(photos.slice(0, limit))
  return (
    <div className="[&_img]:rounded-lg [&_img]:shadow-2xl">
      <ServerPhotoAlbum
        layout="masonry"
        photos={albumPhotos}
        spacing={8}
        padding={0}
        breakpoints={[480, 768, 1024, 1280]}
        columns={containerWidth => {
          if (containerWidth < 480) return 2
          if (containerWidth < 768) return 3
          if (containerWidth < 1024) return 4
          return 6
        }}
      />
    </div>
  )
}
