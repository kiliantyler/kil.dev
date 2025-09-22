import type { Photo } from 'react-photo-album'
import ServerPhotoAlbum from 'react-photo-album/server'

import type { GalleryImage } from '@/components/layout/pet-gallery/_content'

type ServerAlbumProps = {
  images: GalleryImage[]
  limit?: number
}

type ManifestSrcSet = { src: string; width: number; height: number }

function toPhotos(images: GalleryImage[]): Photo[] {
  return images.map(img => {
    const entries = Array.isArray(img.srcSet) ? (img.srcSet as ManifestSrcSet[]) : []
    return {
      src: img.url,
      width: img.width,
      height: img.height,
      alt: img.alt || 'Pet photo',
      srcSet: entries.map(e => ({ src: e.src, width: e.width, height: e.height })),
    }
  })
}

export function ServerAlbum({ images, limit = 48 }: ServerAlbumProps) {
  const photos = toPhotos(images.slice(0, limit))
  return (
    <div className="[&_img]:rounded-lg [&_img]:shadow-2xl">
      <ServerPhotoAlbum
        layout="masonry"
        photos={photos}
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

export { type ServerAlbumProps }
