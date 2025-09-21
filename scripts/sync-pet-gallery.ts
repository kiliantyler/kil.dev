import { list, put } from '@vercel/blob'
import { promises as fs } from 'fs'
import path from 'path'
import sharp from 'sharp'

async function main() {
  const outDir = path.join(process.cwd(), 'public', 'pet-gallery')
  await fs.mkdir(outDir, { recursive: true })

  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    console.warn('BLOB_READ_WRITE_TOKEN missing. Writing empty pet-gallery manifest and skipping sync.')
    const manifestPath = path.join(outDir, 'manifest.json')
    await fs.writeFile(manifestPath, JSON.stringify({ images: [] }, null, 2))
    return
  }

  const { blobs } = await list({ prefix: 'pet-gallery/', token })
  if (!blobs || blobs.length === 0) {
    console.log('No blobs found under pet-gallery/')
    return
  }

  const allowed = new Set(['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'])
  const blobUrlByPath = new Map<string, string>()
  for (const b of blobs) blobUrlByPath.set(b.pathname, b.url)

  // Only treat base/original images as inputs (exclude derived thumbs & blur files)
  const originals = blobs.filter(b => {
    const name = b.pathname.split('/').pop() ?? ''
    const ext = name.split('.').pop()?.toLowerCase()
    if (!ext || !allowed.has(ext)) return false
    if (/-blur\.webp$/i.test(name)) return false
    if (/-\d+\.[a-z0-9]+$/i.test(name)) return false
    return true
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

  let synced = 0
  for (const blob of originals) {
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

      const baseName = name.replace(/\.[^.]+$/, '')
      const ext = (name.split('.').pop() ?? 'webp').toLowerCase()
      const srcSet: Array<{ src: string; width: number; height: number }> = []

      // Ensure responsive thumbs exist in blob; upload if missing; always ensure local copy
      for (const target of sizes) {
        if (target >= width) break
        const h = Math.round((height * target) / width)
        const thumbName = `${baseName}-${target}.${ext}`
        const thumbPathname = `pet-gallery/${thumbName}`
        const localThumbPath = path.join(outDir, thumbName)

        if (blobUrlByPath.has(thumbPathname)) {
          const thumbUrl = blobUrlByPath.get(thumbPathname)!
          const tRes = await fetch(thumbUrl, { cache: 'no-store' })
          if (tRes.ok && tRes.body) {
            const tBuf = Buffer.from(await tRes.arrayBuffer())
            await fs.writeFile(localThumbPath, tBuf)
          }
        } else {
          const resized = await image
            .resize({ width: target })
            .toFormat(ext as keyof sharp.FormatEnum, { quality: 82 })
            .toBuffer()
          await fs.writeFile(localThumbPath, resized)
          await put(thumbPathname, resized, { access: 'public', token })
          // Make it discoverable on subsequent runs without another network list
          blobUrlByPath.set(thumbPathname, '')
        }

        srcSet.push({ src: `/pet-gallery/${thumbName}`, width: target, height: h })
      }

      // Blur placeholder: reuse if exists in blob, otherwise create + upload
      const blurName = `${baseName}-blur.webp`
      const blurPathname = `pet-gallery/${blurName}`
      let blurDataURL = ''
      if (blobUrlByPath.has(blurPathname)) {
        const blurUrl = blobUrlByPath.get(blurPathname)!
        const bRes = await fetch(blurUrl, { cache: 'no-store' })
        if (bRes.ok && bRes.body) {
          const bBuf = Buffer.from(await bRes.arrayBuffer())
          blurDataURL = `data:image/webp;base64,${bBuf.toString('base64')}`
        }
      } else {
        const blur = await image.resize(16).webp({ quality: 40 }).toBuffer()
        blurDataURL = `data:image/webp;base64,${blur.toString('base64')}`
        await put(blurPathname, blur, { access: 'public', token })
        blobUrlByPath.set(blurPathname, '')
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
