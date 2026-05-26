import { Background } from '@/components/layout/background'
import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'
import { Providers } from '@/components/providers/providers'
import { SecretConsoleLoader } from '@/components/secret-console/secret-console-loader'
import { PROFILE_IMAGE_ALT_DOMAINS } from '@/lib/alt-domains'
import '@/styles/globals.css'
import { buildAllAchievementsPresenceScript } from '@/utils/achievements'
import {
  PROFILE_IMAGE_VARIANT_DATA_ATTRIBUTE,
  buildProfileImageVariantScript,
} from '@/utils/profile-image-variant-script'
import { buildThemeScript } from '@/utils/theme-runtime'
import { type Metadata } from 'next'
import { Noto_Sans, Space_Grotesk, VT323 } from 'next/font/google'

export const metadata: Metadata = {
  metadataBase: new URL('https://kil.dev'),
  title: 'Kilian Tyler | Site Reliability Engineer',
  description: 'Kilian Tyler is a Site Reliability Engineer',
  icons: [{ rel: 'icon', url: '/favicon.ico' }],
  openGraph: {
    title: 'Kilian Tyler | Site Reliability Engineer',
    description: 'Check out my website! It has achievements.',
    url: 'https://kil.dev',
  },
}

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
  preload: true,
})

const notoSans = Noto_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '900'],
  variable: '--font-noto-sans',
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'sans-serif'],
})

const vt323 = VT323({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-vt323',
  display: 'swap',
  fallback: ['monospace'],
})

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${notoSans.variable} ${vt323.variable}`}
      suppressHydrationWarning>
      <head>
        <script
          id="pre-achievement-presence"
          dangerouslySetInnerHTML={{ __html: buildAllAchievementsPresenceScript() }}
        />
        <script id="pre-theme" dangerouslySetInnerHTML={{ __html: buildThemeScript() }} />
        <script
          id="pre-profile-image-variant"
          data-attribute={PROFILE_IMAGE_VARIANT_DATA_ATTRIBUTE}
          data-domains={PROFILE_IMAGE_ALT_DOMAINS.join(',')}
          dangerouslySetInnerHTML={{ __html: buildProfileImageVariantScript(PROFILE_IMAGE_ALT_DOMAINS) }}
        />
      </head>
      <body className="flex min-h-screen flex-col bg-background font-sans text-foreground">
        <PrefetchLinks />
        <Providers>
          <div className="relative flex min-h-screen flex-col">
            <Background />
            <div className="relative z-20 flex size-full flex-1 flex-col overflow-x-hidden">
              <div className="layout-container flex h-full flex-1 flex-col">
                <Header />
                <main className="flex-1">{children}</main>
                <Footer />
              </div>
            </div>
          </div>
          <SecretConsoleLoader />
        </Providers>
      </body>
    </html>
  )
}

// Prefetch critical routes for faster navigation
function PrefetchLinks() {
  return (
    <>
      <link rel="prefetch" href="/about" as="document" />
      <link rel="prefetch" href="/experience" as="document" />
      <link rel="prefetch" href="/projects" as="document" />
    </>
  )
}
