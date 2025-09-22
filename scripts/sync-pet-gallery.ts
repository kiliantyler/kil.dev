import { list, put } from '@vercel/blob'
import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'
import sharp from 'sharp'

type OutputFormat = 'jpeg' | 'png' | 'webp' | 'avif' | 'gif'

function mapOutputFormat(inputExt: string): OutputFormat {
  const e = inputExt.toLowerCase()
  if (e === 'jpg' || e === 'jpeg') return 'jpeg'
  if (e === 'png') return 'png'
  if (e === 'avif') return 'avif'
  if (e === 'webp') return 'webp'
  if (e === 'gif') return 'webp' // convert animated/static GIFs to webp thumbnails
  return 'webp'
}

function getEncoderOptions(
  format: OutputFormat,
): sharp.JpegOptions | sharp.PngOptions | sharp.WebpOptions | sharp.AvifOptions | sharp.GifOptions {
  if (format === 'jpeg') return { quality: 82, mozjpeg: true }
  if (format === 'png') return { compressionLevel: 8 }
  if (format === 'webp') return { quality: 80 }
  if (format === 'avif') return { quality: 50, effort: 4 }
  return { effort: 4 }
}

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

  type ManifestImage = {
    fileName: string
    url: string
    width: number
    height: number
    alt: string
    blurDataURL: string
    srcSet: Array<{ src: string; width: number; height: number }>
  }

  // Reuse previous manifest to avoid fetching originals solely for dimensions/blur
  const manifestPath = path.join(outDir, 'manifest.json')
  let prevByName = new Map<string, ManifestImage>()
  try {
    const prevRaw = await fs.readFile(manifestPath, 'utf8')
    const prev = JSON.parse(prevRaw) as { images?: ManifestImage[] }
    if (Array.isArray(prev.images)) {
      prevByName = new Map(prev.images.map(img => [img.fileName, img]))
    }
  } catch {}

  const manifest: { images: ManifestImage[] } = { images: [] }

  const cpuCount = os.cpus()?.length ?? 4
  const concurrency = Math.min(8, Math.max(2, Math.floor(cpuCount / 2)))

  async function processOriginal(blob: { pathname: string; url: string }): Promise<ManifestImage | null> {
    const name = blob.pathname.split('/').pop()!
    const baseName = name.replace(/\.[^.]+$/, '')
    const ext = (name.split('.').pop() ?? 'webp').toLowerCase()
    const alt = baseName.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
    const prev = prevByName.get(name)

    let width: number | undefined = prev?.width
    let height: number | undefined = prev?.height
    let originalBuf: Buffer | null = null

    const blurPathname = `pet-gallery/${baseName}-blur.webp`
    const blurExists = blobUrlByPath.has(blurPathname)
    const thumbExt = mapOutputFormat(ext)
    const missingAnyThumb = sizes.some(t => !blobUrlByPath.has(`pet-gallery/${baseName}-${t}.${thumbExt}`))

    // Only fetch the original if we need metadata or must generate any derivatives
    if (!width || !height || missingAnyThumb || !blurExists) {
      const res = await fetch(blob.url, { cache: 'no-store' })
      if (!res.ok || !res.body) return null
      const buf = Buffer.from(await res.arrayBuffer())
      originalBuf = buf
      const meta = await sharp(buf).metadata()
      width = meta.width ?? 1200
      height = meta.height ?? 800
    }

    if (!width || !height) return null

    // Ensure responsive thumbs exist in blob; upload if missing, and reference remote URLs
    const srcSet: Array<{ src: string; width: number; height: number }> = []
    for (const target of sizes) {
      if (target >= width) break
      const h = Math.round((height * target) / width)
      const thumbName = `${baseName}-${target}.${thumbExt}`
      const thumbPathname = `pet-gallery/${thumbName}`
      let thumbUrl = blobUrlByPath.get(thumbPathname)
      if (!thumbUrl) {
        if (!originalBuf) {
          const res = await fetch(blob.url, { cache: 'no-store' })
          if (!res.ok || !res.body) return null
          originalBuf = Buffer.from(await res.arrayBuffer())
        }
        const encoderOptions = getEncoderOptions(thumbExt)
        const resized = await sharp(originalBuf)
          .resize({ width: target, withoutEnlargement: true })
          .toFormat(thumbExt as keyof sharp.FormatEnum, encoderOptions)
          .toBuffer()
        const uploaded = await put(thumbPathname, resized, { access: 'public', token })
        thumbUrl = uploaded.url
        blobUrlByPath.set(thumbPathname, thumbUrl)
      }
      srcSet.push({ src: thumbUrl, width: target, height: h })
    }

    // Blur: reuse previous value if present; skip generation for speed
    const blurDataURL = prev?.blurDataURL ?? ''

    return {
      fileName: name,
      url: blob.url,
      width,
      height,
      alt,
      blurDataURL,
      srcSet,
    }
  }

  let synced = 0
  for (let i = 0; i < originals.length; i += concurrency) {
    const slice = originals.slice(i, i + concurrency)
    const results = await Promise.all(slice.map(processOriginal))
    for (const item of results) {
      if (item) {
        manifest.images.push(item)
        synced++
      }
    }
  }

  // Write manifest
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2))

  console.log(`Synced ${synced} images (processed only when missing) and wrote manifest to ${manifestPath}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
