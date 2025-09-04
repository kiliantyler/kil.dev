import { Background } from '@/components/layout/background'
import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'
import { LinkButton } from '@/components/ui/link-button'
import { useTheme } from '@/hooks/use-theme'
import { Noto_Sans, Space_Grotesk } from 'next/font/google'

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

function NotFoundContent() {
  const theme = useTheme()

  return (
    <div
      className="bg-example-background text-example-text relative flex min-h-screen flex-col"
      style={{ fontFamily: theme.fontFamily }}>
      <Background />
      <div className="relative z-20 flex size-full flex-1 flex-col overflow-x-hidden">
        <div className="layout-container flex h-full flex-1 flex-col">
          <Header />
          <main className="flex flex-1 items-center justify-center px-10 py-20 md:px-20 lg:px-40">
            <div className="w-full text-center">
              <div className="flex flex-col items-center gap-8">
                {/* 404 Number */}
                <div className="group relative">
                  <h1 className="text-9xl font-black tracking-tight text-white transition-transform duration-500 group-hover:-translate-y-1 group-hover:scale-105 md:text-[12rem] lg:text-[16rem]">
                    404
                  </h1>
                  <div className="border-example-primary absolute -top-4 -left-4 h-full w-full -rotate-3 rounded-lg border-4 transition-transform duration-500 group-hover:rotate-0" />
                </div>

                {/* Error Message */}
                <div className="flex max-w-2xl flex-col gap-4">
                  <h2 className="text-3xl font-bold text-white md:text-4xl lg:text-5xl">Page Not Found</h2>
                  <p className="text-example-primary text-lg font-medium md:text-xl">
                    The page you&apos;re looking for seems to have vanished
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap justify-center gap-4">
                  <LinkButton
                    href="/"
                    className="bg-example-primary hover:bg-example-accent h-12 min-w-[160px] gap-2 rounded-md px-6 text-base font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                    aria-label="Return to home page">
                    <span>Go Home</span>
                  </LinkButton>
                </div>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      </div>
    </div>
  )
}

export default function NotFound() {
  return (
    <div className={`${spaceGrotesk.variable} ${notoSans.variable}`}>
      <NotFoundContent />
    </div>
  )
}
