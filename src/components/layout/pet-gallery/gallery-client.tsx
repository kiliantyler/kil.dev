'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PhotoAlbum, { type Photo } from 'react-photo-album'
import InfiniteScroll from 'react-photo-album/scroll'
import Lightbox, { type SlideImage } from 'yet-another-react-lightbox'
import Captions from 'yet-another-react-lightbox/plugins/captions'
import Fullscreen from 'yet-another-react-lightbox/plugins/fullscreen'
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'

import { type GalleryImage } from '@/components/layout/pet-gallery/_content'
import NextImage from 'next/image'

type GalleryClientProps = {
  images: GalleryImage[]
}

function toPhotos(images: GalleryImage[]): Photo[] {
  return images.map(img => ({
    src: img.url,
    width: img.width,
    height: img.height,
    alt: img.alt || 'Pet photo',
  }))
}

function toSlides(images: GalleryImage[]): SlideImage[] {
  return images.map(img => ({
    src: img.url,
    alt: img.alt || 'Pet photo',
    width: img.width,
    height: img.height,
  }))
}

export function GalleryClient({ images }: GalleryClientProps) {
  // Reveal client album and hide SSR album when mounted (no layout jump)
  useEffect(() => {
    const ssr = document.querySelector('.js-pet-album-ssr')
    const client = document.querySelector('.js-pet-album-client')
    if (client) client.classList.remove('hidden')
    if (ssr) ssr.classList.add('hidden')
  }, [])
  const [lightboxIndex, setLightboxIndex] = useState<number>(-1)
  const nextIndexRef = useRef<number>(0)

  const allPhotos = useMemo(() => toPhotos(images), [images])
  const slides = useMemo(() => toSlides(images), [images])

  const CHUNK_SIZE = 24
  const initialPhotos = useMemo(() => {
    nextIndexRef.current = Math.min(CHUNK_SIZE, allPhotos.length)
    return allPhotos.slice(0, nextIndexRef.current)
  }, [allPhotos])

  const fetchMore = useCallback(async () => {
    const start = nextIndexRef.current
    if (start >= allPhotos.length) return null
    const end = Math.min(start + CHUNK_SIZE, allPhotos.length)
    const batch = allPhotos.slice(start, end)
    nextIndexRef.current = end
    return batch
  }, [allPhotos])

  return (
    <div className="flex flex-col gap-4">
      <InfiniteScroll
        singleton
        photos={initialPhotos}
        fetch={fetchMore}
        onClick={({ index }) => setLightboxIndex(index)}
        fetchRootMargin="2000px"
        offscreenRootMargin="12000px"
        retries={1}
        loading={
          <div
            className="mx-auto my-4 h-6 w-6 animate-spin rounded-full border-2 border-border border-t-transparent"
            aria-label="Loading"
          />
        }
        finished={<div className="mx-auto my-4 text-muted-foreground">No more photos</div>}>
        <PhotoAlbum
          layout="masonry"
          photos={[] as Photo[]}
          spacing={8}
          padding={0}
          breakpoints={[480, 768, 1024, 1280]}
          columns={containerWidth => {
            if (containerWidth < 480) return 2
            if (containerWidth < 768) return 3
            if (containerWidth < 1024) return 4
            return 6
          }}
          sizes={{
            size: '100vw',
            sizes: [
              { viewport: '(max-width: 479px)', size: 'calc(100vw - 40px)' },
              { viewport: '(max-width: 767px)', size: 'calc(100vw - 40px)' },
              { viewport: '(max-width: 1023px)', size: 'calc(100vw - 80px)' },
              { viewport: '(max-width: 1279px)', size: 'calc(100vw - 160px)' },
            ],
          }}
          componentsProps={containerWidth =>
            containerWidth === undefined ? { container: { style: { visibility: 'hidden' } } } : {}
          }
          render={{
            image: (props, { index, width, height, photo }) => {
              const alt = photo.alt ?? 'Pet photo'
              const src = typeof props.src === 'string' ? props.src : photo.src
              return (
                <NextImage
                  src={src}
                  alt={alt}
                  width={Math.max(1, Math.round(width))}
                  height={Math.max(1, Math.round(height))}
                  sizes="(min-width: 1280px) 16vw, (min-width: 1024px) 20vw, (min-width: 768px) 25vw, (min-width: 480px) 33vw, 50vw"
                  className="h-auto w-full rounded-lg shadow-2xl"
                  style={{ width: '100%', height: 'auto' }}
                  priority={index < 6}
                />
              )
            },
          }}
        />
      </InfiniteScroll>

      {/* InfiniteScroll handles loading state; no manual sentinel/button */}

      <Lightbox
        open={lightboxIndex >= 0}
        close={() => setLightboxIndex(-1)}
        slides={slides}
        index={lightboxIndex}
        plugins={[Captions, Fullscreen, Thumbnails, Zoom]}
        captions={{ descriptionTextAlign: 'center' }}
        controller={{ closeOnBackdropClick: true }}
        carousel={{ finite: false }}
        animation={{ fade: 250 }}
      />
    </div>
  )
}

export { type GalleryClientProps }

// A small client-only wrapper to switch from SSR fallback to client UI after mount
// Parent can use:
// <ClientMounted fallback={<ServerAlbum images={images} />}>
//   <GalleryClient images={images} />
// </ClientMounted>
export function ClientMounted({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false)
  useEffect(() => {
    setIsClient(true)
  }, [])
  if (!isClient) return <>{fallback ?? null}</>
  return <>{children}</>
}
