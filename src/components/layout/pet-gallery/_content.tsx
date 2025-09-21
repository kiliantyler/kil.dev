import { GalleryClient } from '@/components/layout/pet-gallery/gallery-client'
import { ServerAlbum } from '@/components/layout/pet-gallery/server-album'
import { SectionLabel } from '@/components/ui/section-label'
import { promises as fs } from 'fs'
import sizeOf from 'image-size'
import path from 'path'

export type GalleryImage = {
  fileName: string
  url: string
  alt: string
  width: number
  height: number
  blurDataURL?: string
  srcSet?: Array<{ src: string; width: number; height: number }>
}

const allowedExtensions = new Set(['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'])

// Build-time sync puts files under public/pet-gallery
async function getPetGalleryImagesFromPublic(): Promise<GalleryImage[]> {
  const directoryPath = path.join(process.cwd(), 'public', 'pet-gallery')
  const manifestPath = path.join(directoryPath, 'manifest.json')

  try {
    const manifestRaw = await fs.readFile(manifestPath, 'utf8')
    const data = JSON.parse(manifestRaw) as { images: GalleryImage[] }
    if (Array.isArray(data?.images) && data.images.length > 0) return data.images
  } catch {}
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
      const url = `/pet-gallery/${encodeURIComponent(fileName)}`
      const filePath = path.join(directoryPath, fileName)
      const fileBuffer = await fs.readFile(filePath)
      const dim = sizeOf(fileBuffer)
      const width = typeof dim.width === 'number' ? dim.width : 1200
      const height = typeof dim.height === 'number' ? dim.height : 800
      return { fileName, url, alt, width, height }
    }),
  )

  return images
}

// Deprecated: local dev fallback kept for reference (unused)

export async function PetGalleryContent() {
  const images = await getPetGalleryImagesFromPublic()

  return (
    <div className="px-10 py-16 md:px-20 lg:px-40">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <div className="flex flex-col gap-2">
          <SectionLabel as="p">Pet gallery</SectionLabel>
        </div>

        {images.length === 0 ? (
          <p className="text-muted-foreground">No images found in the pet gallery.</p>
        ) : (
          <>
            <ServerAlbum images={images} />
            <div className="js-pet-album-client hidden">
              <GalleryClient images={images} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
