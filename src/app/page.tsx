import { Background } from '@/components/layout/background'
import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'
import { Hero } from '@/components/layout/hero'
import { useTheme } from '@/hooks/use-theme'
import type { Metadata } from 'next'
import { Noto_Sans, Space_Grotesk } from 'next/font/google'

export const metadata: Metadata = {
  title: 'Kilian Tyler | Site Reliability Engineer',
}

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-space-grotesk',
})

const notoSans = Noto_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
  variable: '--font-noto-sans',
})

function HomepageContent() {
  const theme = useTheme()

  return (
    <div
      className="bg-example-background text-example-text relative flex min-h-screen flex-col"
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
  return (
    <div className={`${spaceGrotesk.variable} ${notoSans.variable}`}>
      <HomepageContent />
    </div>
  )
}
