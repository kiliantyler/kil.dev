import { Providers } from '@/components/providers/providers'
import '@/styles/globals.css'

import { type Metadata } from 'next'
import { Noto_Sans, Space_Grotesk } from 'next/font/google'

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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${notoSans.variable}`} suppressHydrationWarning>
      <body className="font-sans flex min-h-screen flex-col">
        <Providers>
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  )
}
