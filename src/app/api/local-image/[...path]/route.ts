import { promises as fs } from 'fs'
import type { NextRequest } from 'next/server'
import path from 'path'

export const runtime = 'nodejs'

type PathParts = [segment: 'pet-gallery', ...rest: string[]]

const allowedExtensions = new Set(['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'])

function inferContentType(filePath: string): string | null {
  const ext = filePath.split('.').pop()?.toLowerCase()
  if (!ext) return null
  if (ext === 'svg') return 'image/svg+xml'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'png') return 'image/png'
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'avif') return 'image/avif'
  if (ext === 'gif') return 'image/gif'
  if (ext === 'ico') return 'image/x-icon'
  return null
}

function isSafeFilename(name: string): boolean {
  if (!name) return false
  if (name.includes('..')) return false
  if (name.includes('/') || name.includes('\\')) return false
  const ext = name.split('.').pop()?.toLowerCase()
  if (!ext || !allowedExtensions.has(ext)) return false
  return true
}

async function readLocalImage(parts: PathParts): Promise<{ data: ArrayBuffer; contentType: string } | null> {
  const [segment, ...rest] = parts
  if (!segment || segment !== 'pet-gallery') return null

  const fileName = rest.join('/')
  if (!isSafeFilename(fileName)) return null

  const filePath = path.join(process.cwd(), 'src', 'images', 'pet-gallery', fileName)

  try {
    const stat = await fs.stat(filePath)
    if (!stat.isFile()) return null
    const fileBuffer = await fs.readFile(filePath)
    const data = new ArrayBuffer(fileBuffer.byteLength)
    new Uint8Array(data).set(fileBuffer)
    const contentType = inferContentType(filePath) ?? 'application/octet-stream'
    return { data, contentType }
  } catch {
    return null
  }
}

export async function GET(_request: NextRequest, context: { params: Promise<{ path: string[] }> }): Promise<Response> {
  const { path: pathParam } = await context.params
  const parts = pathParam as PathParts

  const image = await readLocalImage(parts)
  if (!image) {
    return new Response('Not found', { status: 404 })
  }

  const headers = new Headers()
  headers.set('Content-Type', image.contentType)
  headers.set('Content-Disposition', 'inline')
  headers.set('Cache-Control', 'public, max-age=31536000, immutable')

  return new Response(image.data, { headers })
}
