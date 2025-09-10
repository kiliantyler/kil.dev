import { Providers } from '@/components/providers/providers'
import '@/styles/globals.css'

import { Background } from '@/components/layout/background'
import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'
import { buildInitThemeScript, getDefaultThemeForNow } from '@/lib/theme-runtime'
import { KNOWN_THEMES, type ThemeName } from '@/lib/themes'
import { type Metadata } from 'next'
import { Noto_Sans, Space_Grotesk } from 'next/font/google'
import { cookies } from 'next/headers'
import Script from 'next/script'

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

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies()
  const themeCookie = cookieStore.get('theme')?.value
  const systemThemeCookie = cookieStore.get('systemTheme')?.value
  const seasonalDefault = getDefaultThemeForNow()
  const baseSystem = systemThemeCookie === 'dark' || systemThemeCookie === 'light' ? systemThemeCookie : ''
  const initialThemeClass = (() => {
    if (themeCookie && themeCookie !== 'system') return themeCookie
    if (seasonalDefault !== 'system') return `${baseSystem || 'dark'} ${seasonalDefault}`.trim()
    return baseSystem
  })()

  const initialAppliedTheme: ThemeName = (() => {
    if (themeCookie && themeCookie !== 'system') return themeCookie as ThemeName
    if (seasonalDefault !== 'system') return seasonalDefault
    return (baseSystem || 'light') as ThemeName
  })()
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${notoSans.variable} ${initialThemeClass}`}
      suppressHydrationWarning>
      <head>
        <Script id="init-theme" strategy="beforeInteractive">
          {buildInitThemeScript()}
        </Script>
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{var d=document.documentElement;var t=localStorage.getItem("theme");if(t&&t!=="system"){d.classList.add(t);return}var m=document.cookie.match(/(?:^|; )systemTheme=([^;]+)/);var sys=m?decodeURIComponent(m[1]):null;if(sys==="dark"||sys==="light"){d.classList.add(sys)}}catch(e){}})();',
          }}
        />
      </head>
      <body className="font-sans flex min-h-screen flex-col bg-background text-foreground">
        <Providers initialAppliedTheme={initialAppliedTheme}>
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
