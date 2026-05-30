import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/images/pets', () => ({
  Azazel: { src: '/pets/azazel.webp' },
  Gozer: { src: '/pets/gozer.webp' },
  Gwen: { src: '/pets/gwen.webp' },
  Lilith: { src: '/pets/lilith.webp' },
  Lux: { src: '/pets/lux.webp' },
  Tali: { src: '/pets/tali.webp' },
}))

import { PETS } from '@/lib/pets'
import Head from './head'

describe('/about head', () => {
  it('preloads every about page pet image', () => {
    const html = renderToStaticMarkup(<Head />)

    for (const pet of PETS) {
      expect(html).toContain(`href="${pet.image.src}"`)
    }
  })
})
