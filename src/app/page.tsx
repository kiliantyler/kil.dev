import { KonamiCodeListener } from '@/components/layout/achievements/konami-code-listener'
import { HomeContent } from '@/components/layout/home/_content'
import { KonamiAnimationProvider } from '@/components/providers/konami-animation-provider'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Kilian Tyler | Site Reliability Engineer',
}

export default function Homepage() {
  return (
    <KonamiAnimationProvider>
      <HomeContent />
      <KonamiCodeListener />
    </KonamiAnimationProvider>
  )
}
