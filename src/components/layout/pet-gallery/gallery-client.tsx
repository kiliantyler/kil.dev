'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PhotoAlbum, { type Photo } from 'react-photo-album'
import InfiniteScroll from 'react-photo-album/scroll'
import type { SlideImage } from 'yet-another-react-lightbox'

import type { GalleryImage } from '@/components/layout/pet-gallery/_content'
import NextImage from 'next/image'

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
  images: GalleryImage[]
}

type PhotoWithBlur = Photo & { blurDataURL?: string }

function toPhotos(images: GalleryImage[]): PhotoWithBlur[] {
  return images.map(img => ({
    src: img.url,
    width: img.width,
    height: img.height,
    alt: img.alt || 'Pet photo',
    srcSet: img.srcSet,
    blurDataURL: img.blurDataURL,
  }))
}

type SlideImageWithBlur = SlideImage & { blurDataURL?: string }

function toSlides(images: GalleryImage[]): SlideImageWithBlur[] {
  return images.map(img => ({
    src: img.url,
    alt: img.alt || 'Pet photo',
    width: img.width,
    height: img.height,
    srcSet: img.srcSet,
    blurDataURL: img.blurDataURL,
  }))
}

export function GalleryClient({ images }: GalleryClientProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number>(-1)
  const [lightboxReady, setLightboxReady] = useState(false)
  const [LightboxComponent, setLightboxComponent] = useState<LightboxModules | null>(null)
  const nextIndexRef = useRef<number>(0)

  const allPhotos = useMemo(() => toPhotos(images), [images])
  const slides = useMemo(() => toSlides(images), [images])

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

  const CHUNK_SIZE = 24
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
      <InfiniteScroll<PhotoWithBlur>
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
        <PhotoAlbum<PhotoWithBlur>
          layout="masonry"
          photos={[] as PhotoWithBlur[]}
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
                  placeholder={photo.blurDataURL ? 'blur' : 'empty'}
                  blurDataURL={photo.blurDataURL}
                  priority={index < 6}
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

export function ClientMounted({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const isClient = useIsClient()
  if (!isClient) return <>{fallback ?? null}</>
  return <>{children}</>
}
