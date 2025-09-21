'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PhotoAlbum, { type Photo } from 'react-photo-album'
import Lightbox, { type SlideImage } from 'yet-another-react-lightbox'
import Captions from 'yet-another-react-lightbox/plugins/captions'
import Fullscreen from 'yet-another-react-lightbox/plugins/fullscreen'
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'

import { type GalleryImage } from '@/components/layout/pet-gallery/_content'
import { Button } from '@/components/ui/button'

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
  const [visibleCount, setVisibleCount] = useState<number>(Math.min(24, images.length))
  const [lightboxIndex, setLightboxIndex] = useState<number>(-1)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const isLoadingMoreRef = useRef<boolean>(false)
  const [measuredByUrl, setMeasuredByUrl] = useState<Record<string, { width: number; height: number }>>({})

  const adjustedImages = useMemo(() => {
    return images.map(img => {
      const measured = measuredByUrl[img.url]
      if (measured && measured.width > 0 && measured.height > 0) {
        return { ...img, width: measured.width, height: measured.height }
      }
      return img
    })
  }, [images, measuredByUrl])

  const photos = useMemo(() => toPhotos(adjustedImages.slice(0, visibleCount)), [adjustedImages, visibleCount])
  const slides = useMemo(() => toSlides(adjustedImages), [adjustedImages])

  const handleLoadMore = useCallback(() => {
    if (visibleCount >= images.length) return
    if (isLoadingMoreRef.current) return
    isLoadingMoreRef.current = true
    const next = Math.min(visibleCount + 24, images.length)
    setVisibleCount(next)
    // prevent multiple rapid increments while sentinel stays in view
    setTimeout(() => {
      isLoadingMoreRef.current = false
    }, 100)
  }, [images.length, visibleCount])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    if (visibleCount >= images.length) return

    const observer = new IntersectionObserver(entries => {
      const entry = entries[0]
      if (entry?.isIntersecting === true) {
        handleLoadMore()
      }
    })

    observer.observe(el)
    return () => observer.disconnect()
  }, [handleLoadMore, images.length, visibleCount])

  // Client-side measure actual image dimensions for items with fallback dimensions
  useEffect(() => {
    const batch = adjustedImages.slice(0, visibleCount)
    const toMeasure = batch.filter(img => !measuredByUrl[img.url])
    if (toMeasure.length === 0) return

    toMeasure.forEach(img => {
      const probe = new Image()
      probe.decoding = 'async'
      probe.loading = 'eager'
      probe.src = img.url
      probe.onload = () => {
        if (probe.naturalWidth > 0 && probe.naturalHeight > 0) {
          setMeasuredByUrl(prev => {
            if (prev[img.url]) return prev
            return { ...prev, [img.url]: { width: probe.naturalWidth, height: probe.naturalHeight } }
          })
        }
      }
    })
  }, [adjustedImages, measuredByUrl, visibleCount])

  return (
    <div className="flex flex-col gap-4">
      <div className="[&_img]:rounded-lg [&_img]:shadow-2xl">
        <PhotoAlbum
          layout="masonry"
          photos={photos}
          spacing={8}
          padding={0}
          columns={containerWidth => {
            if (containerWidth < 480) return 2
            if (containerWidth < 768) return 3
            if (containerWidth < 1024) return 4
            return 6
          }}
          onClick={({ index }) => setLightboxIndex(index)}
        />
      </div>

      {visibleCount < images.length ? (
        <div className="flex flex-col items-center gap-2">
          <div
            ref={sentinelRef}
            className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-transparent"
            aria-hidden
          />
          <Button
            variant="outline"
            type="button"
            aria-label="Load more images"
            onClick={handleLoadMore}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') handleLoadMore()
            }}>
            Load more
          </Button>
        </div>
      ) : null}

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
