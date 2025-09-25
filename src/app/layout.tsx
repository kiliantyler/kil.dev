import { Providers } from '@/components/providers/providers'
import '@/styles/globals.css'

import { Background } from '@/components/layout/background'
import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'
import { PROFILE_IMAGE_ALT_DOMAINS } from '@/lib/alt-domains'
import { buildPresenceScript } from '@/utils/achievements'
import {
  PROFILE_IMAGE_VARIANT_DATA_ATTRIBUTE,
  buildProfileImageVariantScript,
} from '@/utils/profile-image-variant-script'
import { buildThemeScript } from '@/utils/theme-runtime'
import { type Metadata } from 'next'
import { Noto_Sans, Space_Grotesk, VT323 } from 'next/font/google'

export const metadata: Metadata = {
  title: 'Kilian Tyler | Site Reliability Engineer',
  description: 'Kilian Tyler is a Site Reliability Engineer',
  icons: [{ rel: 'icon', url: '/favicon.ico' }],
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

const vt323 = VT323({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-vt323',
})

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${notoSans.variable} ${vt323.variable}`}
      suppressHydrationWarning>
      <head>
        <script id="pre-theme" dangerouslySetInnerHTML={{ __html: buildThemeScript() }} />
        <script
          id="pre-profile-image-variant"
          data-attribute={PROFILE_IMAGE_VARIANT_DATA_ATTRIBUTE}
          data-domains={PROFILE_IMAGE_ALT_DOMAINS.join(',')}
          dangerouslySetInnerHTML={{ __html: buildProfileImageVariantScript(PROFILE_IMAGE_ALT_DOMAINS) }}
        />
        <script
          id="pre-achievements"
          dangerouslySetInnerHTML={{
            __html: buildPresenceScript({
              key: 'RECURSIVE_REWARD',
              attribute: 'data-has-achievements',
            }),
          }}
        />
        <script
          id="pre-pet-gallery"
          dangerouslySetInnerHTML={{
            __html: buildPresenceScript({
              key: 'PET_PARADE',
              attribute: 'data-has-pet-gallery',
            }),
          }}
        />
        <script
          id="pre-theme-tapdance"
          dangerouslySetInnerHTML={{
            __html: buildPresenceScript({
              key: 'THEME_TAPDANCE',
              attribute: 'data-has-theme-tapdance',
            }),
          }}
        />
      </head>
      <body className="font-sans flex min-h-screen flex-col bg-background text-foreground">
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
        </Providers>
      </body>
    </html>
  )
}
