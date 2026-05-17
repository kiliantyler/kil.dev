import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

async function loadProvider(convexUrl: string) {
  vi.resetModules()
  vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'test-key')
  vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://app.posthog.com')
  vi.stubEnv('NEXT_PUBLIC_CONVEX_URL', convexUrl)

  const { SnakeGameConvexProvider } = await import('./convex-provider')
  return SnakeGameConvexProvider
}

describe('SnakeGameConvexProvider', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('does not render children when Convex is not configured', async () => {
    const SnakeGameConvexProvider = await loadProvider('')

    const html = renderToStaticMarkup(
      <SnakeGameConvexProvider>
        <span>snake game</span>
      </SnakeGameConvexProvider>,
    )

    expect(html).toBe('')
  })

  it('renders children when Convex is configured', async () => {
    const SnakeGameConvexProvider = await loadProvider('https://example.convex.cloud')

    const html = renderToStaticMarkup(
      <SnakeGameConvexProvider>
        <span>snake game</span>
      </SnakeGameConvexProvider>,
    )

    expect(html).toBe('<span>snake game</span>')
  })
})
