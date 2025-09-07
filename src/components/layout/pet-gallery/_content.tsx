import { SectionLabel } from '@/components/ui/section-label'
import { cn } from '@/lib/utils'
import { list } from '@vercel/blob'
import { promises as fs } from 'fs'
import sizeOf from 'image-size'
import Image from 'next/image'
import path from 'path'

type GalleryImage = {
  fileName: string
  url: string
  alt: string
  width: number
  height: number
}

const allowedExtensions = new Set(['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'])

async function getPetGalleryImagesFromBlob(): Promise<GalleryImage[] | null> {
  try {
    // Try to find the pre-generated manifest first for accurate dimensions
    const { blobs: manifestBlobs } = await list({
      prefix: 'pet-gallery/manifest.json',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })

    const manifestUrl = manifestBlobs[0]?.url
    if (manifestUrl) {
      const res = await fetch(manifestUrl, { cache: 'no-store' })
      if (!res.ok) return null
      const data = (await res.json()) as { images: GalleryImage[] }
      if (Array.isArray(data?.images) && data.images.length > 0) return data.images
    }

    // If no manifest, list blobs under the pet-gallery/ prefix
    const { blobs } = await list({ prefix: 'pet-gallery/', token: process.env.BLOB_READ_WRITE_TOKEN })
    if (!blobs || blobs.length === 0) return null

    const images: GalleryImage[] = blobs
      .filter(b => {
        const name = b.pathname.split('/').pop() ?? ''
        const ext = name.split('.').pop()?.toLowerCase()
        return Boolean(ext && allowedExtensions.has(ext))
      })
      .sort((a, b) => (a.pathname < b.pathname ? -1 : 1))
      .map(b => {
        const name = b.pathname.split('/').pop() ?? ''
        const alt = name
          .replace(/\.[^.]+$/, '')
          .replace(/[-_]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
        // Fallback dimensions if manifest is not available
        return { fileName: name, url: b.url, alt, width: 1200, height: 800 }
      })

    return images
  } catch {
    return null
  }
}

async function getPetGalleryImagesFromLocal(): Promise<GalleryImage[]> {
  const directoryPath = path.join(process.cwd(), 'src', 'images', 'pet-gallery')

  let entries: string[]
  try {
    entries = await fs.readdir(directoryPath)
  } catch {
    return []
  }

  const files = entries
    .filter(name => {
      const ext = name.split('.').pop()?.toLowerCase()
      return Boolean(ext && allowedExtensions.has(ext))
    })
    .sort((a, b) => a.localeCompare(b))

  const images: GalleryImage[] = await Promise.all(
    files.map(async fileName => {
      const alt = fileName
        .replace(/\.[^.]+$/, '')
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      const encoded = encodeURIComponent(fileName)
      const url = `/api/local-image/pet-gallery/${encoded}`
      const localPath = path.join(directoryPath, fileName)
      const fileBuffer = await fs.readFile(localPath)
      const dim = sizeOf(fileBuffer)
      const width = typeof dim.width === 'number' ? dim.width : 1200
      const height = typeof dim.height === 'number' ? dim.height : 800
      return { fileName, url, alt, width, height }
    }),
  )

  return images
}

export async function PetGalleryContent() {
  const imagesFromBlob = await getPetGalleryImagesFromBlob()
  const images = imagesFromBlob ?? (await getPetGalleryImagesFromLocal())

  return (
    <div className="px-10 py-16 md:px-20 lg:px-40">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <div className="flex flex-col gap-2">
          <SectionLabel as="p">Pet gallery</SectionLabel>
        </div>

        {images.length === 0 ? (
          <p className="text-muted-foreground">No images found in the pet gallery.</p>
        ) : (
          <div
            role="list"
            aria-label="Pet gallery grid"
            className={cn('columns-1 sm:columns-2 md:columns-3 lg:columns-4', '[column-gap:1rem]')}>
            {images.map(image => (
              <figure key={image.fileName} role="listitem" className="mb-4 break-inside-avoid">
                <Image
                  src={image.url}
                  alt={image.alt || 'Pet photo'}
                  loading="lazy"
                  width={image.width}
                  height={image.height}
                  sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="h-auto w-full rounded-lg shadow-2xl"
                />
              </figure>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
