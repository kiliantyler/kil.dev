'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PhotoAlbum, { type Photo } from 'react-photo-album'
import InfiniteScroll from 'react-photo-album/scroll'
import type { SlideImage } from 'yet-another-react-lightbox'

import { getPetGalleryPhotoAlt } from '@/lib/pet-gallery/public-data'
import { buildPetGallerySrcSet, getPetGalleryImageLoading } from '@/lib/pet-gallery/srcset'
import type { PublicPetGalleryPhoto } from '@/lib/pet-gallery/types'

// Lazy load lightbox and plugins only when needed
function loadLightbox() {
  return Promise.all([
    import('yet-another-react-lightbox'),
    import('yet-another-react-lightbox/plugins/captions'),
    import('yet-another-react-lightbox/plugins/fullscreen'),
    import('yet-another-react-lightbox/plugins/thumbnails'),
    import('yet-another-react-lightbox/plugins/zoom'),
  ]).then(([lightbox, captions, fullscreen, thumbnails, zoom]) => ({
    Lightbox: lightbox.default,
    plugins: {
      Captions: captions.default,
      Fullscreen: fullscreen.default,
      Thumbnails: thumbnails.default,
      Zoom: zoom.default,
    },
  }))
}

type LightboxModules = Awaited<ReturnType<typeof loadLightbox>>

type GalleryClientProps = {
  photos: PublicPetGalleryPhoto[]
}

type GalleryPhoto = Omit<Photo, 'srcSet'> & {
  galleryPhoto: PublicPetGalleryPhoto
}

function toPhotos(photos: PublicPetGalleryPhoto[]): GalleryPhoto[] {
  return photos.map(photo => ({
    src: photo.variants.card.url,
    width: photo.variants.card.width,
    height: photo.variants.card.height,
    alt: getPetGalleryPhotoAlt(photo),
    galleryPhoto: photo,
  }))
}

function toSlides(photos: PublicPetGalleryPhoto[]): SlideImage[] {
  return photos.map(photo => ({
    src: photo.variants.full.url,
    alt: getPetGalleryPhotoAlt(photo),
    width: photo.variants.full.width,
    height: photo.variants.full.height,
  }))
}

export function GalleryClient({ photos }: GalleryClientProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number>(-1)
  const [lightboxReady, setLightboxReady] = useState(false)
  const [LightboxComponent, setLightboxComponent] = useState<LightboxModules | null>(null)
  const nextIndexRef = useRef<number>(0)

  const allPhotos = useMemo(() => toPhotos(photos), [photos])
  const slides = useMemo(() => toSlides(photos), [photos])

  // Load lightbox when user first opens it
  useEffect(() => {
    if (lightboxIndex >= 0 && !lightboxReady) {
      loadLightbox()
        .then(module => {
          setLightboxReady(true)
          setLightboxComponent(module)
        })
        .catch(() => {
          // Silently fail if lightbox can't load
          setLightboxIndex(-1)
          setLightboxReady(false)
        })
    }
  }, [lightboxIndex, lightboxReady])

  const CHUNK_SIZE = 12
  const initialCount = useMemo(() => Math.min(CHUNK_SIZE, allPhotos.length), [allPhotos])
  useEffect(() => {
    nextIndexRef.current = initialCount
  }, [initialCount])
  const initialPhotos = useMemo(() => allPhotos.slice(0, initialCount), [allPhotos, initialCount])

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
      <InfiniteScroll<GalleryPhoto>
        singleton
        photos={initialPhotos}
        fetch={fetchMore}
        onClick={({ index }) => setLightboxIndex(index)}
        fetchRootMargin="400px"
        offscreenRootMargin="400px"
        retries={1}
        loading={
          <div
            className="mx-auto my-4 h-6 w-6 animate-spin rounded-full border-2 border-border border-t-transparent"
            aria-label="Loading"
          />
        }
        finished={<div className="mx-auto my-4 text-muted-foreground">No more photos</div>}>
        <PhotoAlbum<GalleryPhoto>
          layout="masonry"
          photos={[] as GalleryPhoto[]}
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
            image: (_props, { index, width, height, photo }) => {
              const alt = photo.alt ?? 'Pet photo'
              return (
                <ResponsiveGalleryImage
                  photo={photo}
                  alt={alt}
                  width={Math.max(1, Math.round(width))}
                  height={Math.max(1, Math.round(height))}
                  sizes="(min-width: 1280px) 16vw, (min-width: 1024px) 20vw, (min-width: 768px) 25vw, (min-width: 480px) 33vw, 50vw"
                  className="h-auto w-full rounded-lg bg-muted object-cover shadow-2xl"
                  style={{ width: '100%', height: 'auto' }}
                  loading={getPetGalleryImageLoading(index)}
                />
              )
            },
          }}
        />
      </InfiniteScroll>

      {/* InfiniteScroll handles loading state; no manual sentinel/button */}

      {LightboxComponent && (
        <LightboxComponent.Lightbox
          open={lightboxIndex >= 0}
          close={() => setLightboxIndex(-1)}
          slides={slides}
          index={lightboxIndex}
          plugins={[
            LightboxComponent.plugins.Captions,
            LightboxComponent.plugins.Fullscreen,
            LightboxComponent.plugins.Thumbnails,
            LightboxComponent.plugins.Zoom,
          ]}
          captions={{ descriptionTextAlign: 'center' }}
          controller={{ closeOnBackdropClick: true }}
          carousel={{ finite: false }}
          animation={{ fade: 250 }}
        />
      )}
    </div>
  )
}

import { useIsClient } from '@/hooks/use-is-client'

function ResponsiveGalleryImage({
  alt,
  className,
  height,
  loading,
  photo,
  sizes,
  style,
  width,
}: {
  alt: string
  className?: string
  height: number
  loading: 'eager' | 'lazy'
  photo: GalleryPhoto
  sizes: string
  style: React.CSSProperties
  width: number
}) {
  const variants = photo.galleryPhoto.variants

  return (
    // eslint-disable-next-line next/no-img-element
    <img
      src={variants.card.url}
      srcSet={buildPetGallerySrcSet(photo.galleryPhoto)}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      className={className}
      style={style}
      loading={loading}
      fetchPriority={loading === 'eager' ? 'high' : 'auto'}
    />
  )
}

export function ClientMounted({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const isClient = useIsClient()
  if (!isClient) return <>{fallback ?? null}</>
  return <>{children}</>
}
