import { SectionLabel } from '@/components/ui/section-label'
import { cn } from '@/lib/utils'
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

async function getPetGalleryImages(): Promise<GalleryImage[]> {
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
  const images = await getPetGalleryImages()

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
