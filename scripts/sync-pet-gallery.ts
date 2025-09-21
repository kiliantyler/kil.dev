import { list } from '@vercel/blob'
import { promises as fs } from 'fs'
import path from 'path'
import sharp from 'sharp'

async function main() {
  const outDir = path.join(process.cwd(), 'public', 'pet-gallery')
  await fs.mkdir(outDir, { recursive: true })

  const { blobs } = await list({ prefix: 'pet-gallery/', token: process.env.BLOB_READ_WRITE_TOKEN })
  if (!blobs || blobs.length === 0) {
    console.log('No blobs found under pet-gallery/')
    return
  }

  const allowed = new Set(['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'])
  const images = blobs.filter(b => {
    const name = b.pathname.split('/').pop() ?? ''
    const ext = name.split('.').pop()?.toLowerCase()
    return Boolean(ext && allowed.has(ext))
  })

  const sizes = [320, 640, 960]
  const manifest: {
    images: Array<{
      fileName: string
      url: string
      width: number
      height: number
      alt: string
      blurDataURL: string
      srcSet: Array<{ src: string; width: number; height: number }>
    }>
  } = { images: [] }

  let downloaded = 0
  for (const blob of images) {
    const name = blob.pathname.split('/').pop()!
    const filePath = path.join(outDir, name)
    try {
      const res = await fetch(blob.url, { cache: 'no-store' })
      if (!res.ok || !res.body) continue
      const buf = Buffer.from(await res.arrayBuffer())
      await fs.writeFile(filePath, buf)

      const image = sharp(buf)
      const meta = await image.metadata()
      const width = meta.width ?? 1200
      const height = meta.height ?? 800

      // Generate blur placeholder
      const blur = await image.resize(16).webp({ quality: 40 }).toBuffer()
      const blurDataURL = `data:image/webp;base64,${blur.toString('base64')}`

      // Generate responsive thumbs
      const baseName = name.replace(/\.[^.]+$/, '')
      const ext = (name.split('.').pop() ?? 'webp').toLowerCase()
      const srcSet: Array<{ src: string; width: number; height: number }> = []
      for (const target of sizes) {
        if (target >= width) break
        const resized = await image
          .resize({ width: target })
          .toFormat(ext as keyof sharp.FormatEnum, { quality: 82 } as any)
          .toBuffer()
        const thumbName = `${baseName}-${target}.${ext}`
        await fs.writeFile(path.join(outDir, thumbName), resized)
        const h = Math.round((height * target) / width)
        srcSet.push({ src: `/pet-gallery/${thumbName}`, width: target, height: h })
      }

      const alt = baseName.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()

      manifest.images.push({
        fileName: name,
        url: `/pet-gallery/${encodeURIComponent(name)}`,
        width,
        height,
        alt,
        blurDataURL,
        srcSet,
      })
      downloaded++
    } catch {
      // skip on error
    }
  }

  // Write manifest
  const manifestPath = path.join(outDir, 'manifest.json')
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2))

  console.log(`Synced ${downloaded} images to ${outDir} and wrote manifest with thumbs`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
