type PathParts = [segment: 'skills' | 'dbi', ...rest: string[]]

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

export async function GET(request: Request, context: { params: { path?: string[] } }): Promise<Response> {
  const parts = (context.params.path ?? []) as PathParts
  const targetUrl = buildTargetUrl(parts)

  if (!targetUrl) {
    return new Response('Invalid image path', { status: 400 })
  }

  try {
    const upstream = await fetch(targetUrl.toString(), {
      cache: 'no-store',
      headers: { Accept: '*/*' },
    })

    if (!upstream.ok || !upstream.body) {
      return new Response('Upstream fetch failed', { status: 502 })
    }

    const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream'
    const contentLength = upstream.headers.get('content-length')
    const etag = upstream.headers.get('etag')
    const lastModified = upstream.headers.get('last-modified')

    const headers = new Headers()
    headers.set('Content-Type', contentType)
    headers.set('Cache-Control', 'public, s-maxage=31536000, stale-while-revalidate=86400')
    headers.set('X-Image-Proxy-Origin', targetUrl.origin)
    if (contentLength) headers.set('Content-Length', contentLength)
    if (etag) headers.set('ETag', etag)
    if (lastModified) headers.set('Last-Modified', lastModified)

    return new Response(upstream.body, { headers })
  } catch {
    return new Response('Unexpected error', { status: 500 })
  }
}
