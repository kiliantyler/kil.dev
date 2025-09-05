import { Background } from '@/components/layout/background'
import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'
import { Hero } from '@/components/layout/hero'
import { useTheme } from '@/hooks/use-theme'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Kilian Tyler | Site Reliability Engineer',
}

function HomepageContent() {
  const theme = useTheme()

  return (
    <div
      className="bg-background text-foreground relative flex min-h-screen flex-col"
      style={{ fontFamily: theme.fontFamily }}>
      <Background />
      <div className="relative z-20 flex size-full flex-1 flex-col overflow-x-hidden">
        <div className="layout-container flex h-full flex-1 flex-col">
          <Header />
          <Hero />
          <Footer />
        </div>
      </div>
    </div>
  )
}

export default function Homepage() {
  return <HomepageContent />
}
