import { Background } from '@/components/layout/background'
import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'
import { MapTooltip } from '@/components/layout/hero/map-tooltip'
import { Card } from '@/components/ui/card'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'About | Kilian Tyler',
  description: 'Learn more about Kilian Tyler, a Site Reliability and DevOps Engineer based in Cleveland, Ohio.',
}

export default function AboutPage() {
  return (
    <div className="bg-background text-foreground relative flex min-h-screen flex-col">
      <Background />
      <div className="relative z-20 flex size-full flex-1 flex-col overflow-x-hidden">
        <div className="layout-container flex h-full flex-1 flex-col">
          <Header />
          <main className="flex flex-1 items-center px-10 py-20 md:px-20 lg:px-40">
            <div className="w-full">
              <div className="relative overflow-hidden rounded-3xl bg-transparent p-6 shadow-none backdrop-blur-2xs">
                <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
                  <div className="order-1 flex flex-col gap-6 lg:order-2">
                    <div>
                      <p className="text-sm uppercase tracking-wide text-muted-foreground">Location</p>
                      <MapTooltip />
                    </div>
                    <div>
                      <p className="text-sm uppercase tracking-wide text-muted-foreground">Quick facts</p>
                      <dl className="grid gap-3">
                        <div className="grid grid-cols-[auto_1fr] items-baseline gap-3">
                          <dt className="text-muted-foreground">Mode</dt>
                          <dd className="text-primary font-medium">Dark mode, always</dd>
                        </div>
                        <div className="grid grid-cols-[auto_1fr] items-baseline gap-3">
                          <dt className="text-muted-foreground">Shell</dt>
                          <dd className="text-primary font-medium">
                            <Link href="https://fishshell.com">fish</Link>
                          </dd>
                        </div>
                        <div className="grid grid-cols-[auto_1fr] items-baseline gap-3">
                          <dt className="text-muted-foreground">Terminal</dt>
                          <dd className="text-primary font-medium">
                            <Link href="https://ghostty.app">Ghostty</Link>
                          </dd>
                        </div>
                        <div className="grid grid-cols-[auto_1fr] items-baseline gap-3">
                          <dt className="text-muted-foreground">Editor</dt>
                          <dd className="text-primary font-medium">
                            <Link href="https://cursor.com">Cursor</Link>
                          </dd>
                        </div>
                        <div className="grid grid-cols-[auto_1fr] items-baseline gap-3">
                          <dt className="text-muted-foreground">OS</dt>
                          <dd className="text-primary font-medium">
                            <Link href="https://www.apple.com/macos">macOS</Link>{' '}
                            <span className="text-muted-foreground text-xs font-normal">(Windows for gaming)</span>
                          </dd>
                        </div>
                        <div className="grid grid-cols-[auto_1fr] items-baseline gap-3">
                          <dt className="text-muted-foreground">Pets</dt>
                          <dd className="text-primary font-medium">
                            3 dogs, 3 cats{' '}
                            <span className="text-muted-foreground text-xs font-normal">(Pictured below)</span>
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2 text-center lg:text-left">
                      <p className="text-primary text-lg font-semibold md:text-xl">Hi, I&apos;m Kilian</p>
                    </div>
                    <div className="text-muted-foreground text-base leading-relaxed md:text-lg">
                      <p className="mb-4">
                        I&apos;m a Senior Site Reliability Engineer. I build reliable, scalable platforms and smooth
                        developer experiences for teams shipping to the cloud.
                      </p>
                      <p className="mb-4">
                        I work with infrastructure as code, streamlined CI/CD, and practical observability to keep
                        systems healthy and fast. I value automation, clear feedback loops, and resilient architectures.
                        Lately I&apos;ve been exploring modern frontend with React and Next.js to round out the stack.
                      </p>
                      <p>
                        When I&apos;m not shipping, I&apos;m tinkering in the homelab, refining dotfiles, contributing
                        to open source, or hanging out with my pets.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-12">
                <h2 className="text-foreground mb-4 text-xl font-semibold">Pet Gallery</h2>
                <p className="text-muted-foreground mb-6">Six placeholders for pet photos — coming soon!</p>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {[1, 2, 3, 4, 5, 6].map(num => (
                    <Card key={num} aria-label={`Pet photo placeholder ${num}`} className="overflow-hidden">
                      <div className="bg-muted flex aspect-square items-center justify-center">
                        <span className="text-muted-foreground text-sm">Pet photo {num}</span>
                      </div>
                    </Card>
                  ))}
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
