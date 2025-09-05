import type { NextRequest } from 'next/server'
type PathParts = [segment: 'skills' | 'dbi', ...rest: string[]]

function inferContentType(pathname: string): string | null {
  const ext = pathname.split('.').pop()?.toLowerCase()
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

function buildTargetUrl(parts: PathParts): URL | null {
  const [segment, ...rest] = parts
  if (!segment) return null

  if (segment === 'skills') {
    const icon = rest[0]
    if (!icon) return null
    return new URL(`https://skills.syvixor.com/api/icons?i=${encodeURIComponent(icon)}`)
  }

  if (segment === 'dbi') {
    const nameWithMaybeExt = rest.join('/')
    if (!nameWithMaybeExt) return null
    // If no extension provided, default to webp
    const hasExt = /\.[a-zA-Z0-9]+$/.test(nameWithMaybeExt)
    const path = hasExt ? nameWithMaybeExt : `${nameWithMaybeExt}.webp`
    return new URL(`https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/${path}`)
  }

  return null
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }): Promise<Response> {
  const { path } = await context.params
  const parts = path as PathParts
  const targetUrl = buildTargetUrl(parts)

  if (!targetUrl) {
    return new Response('Invalid image path', { status: 400 })
  }

  try {
    const upstream = await fetch(targetUrl.toString(), {
      cache: 'no-store',
      headers: {
        // Prefer image content-types; some CDNs respond with application/octet-stream
        Accept: 'image/avif,image/webp,image/png,image/svg+xml,image/*;q=0.8,*/*;q=0.1',
      },
    })

    if (!upstream.ok || !upstream.body) {
      return new Response('Upstream fetch failed', { status: 502 })
    }

    const upstreamType = upstream.headers.get('content-type') ?? ''
    const inferredType = inferContentType(targetUrl.pathname) ?? null
    const isUpstreamImage = upstreamType.startsWith('image/') || upstreamType.includes('svg')

    // If the upstream doesn't look like an image and we can't infer a valid image type, treat as not found
    if (!isUpstreamImage && !inferredType) {
      return new Response('Not an image', { status: 404 })
    }

    const contentType = isUpstreamImage ? upstreamType : (inferredType ?? 'application/octet-stream')
    const contentLength = upstream.headers.get('content-length')
    const etag = upstream.headers.get('etag')
    const lastModified = upstream.headers.get('last-modified')

    const headers = new Headers()
    headers.set('Content-Type', contentType)
    headers.set('Content-Disposition', 'inline')
    headers.set('Cache-Control', 'public, s-maxage=31536000, stale-while-revalidate=86400')
    headers.set('X-Image-Proxy-Origin', targetUrl.origin)
    headers.set('X-Image-Proxy-Target', targetUrl.pathname)
    if (contentLength) headers.set('Content-Length', contentLength)
    if (etag) headers.set('ETag', etag)
    if (lastModified) headers.set('Last-Modified', lastModified)

    return new Response(upstream.body, { headers })
  } catch {
    return new Response('Unexpected error', { status: 500 })
  }
}
