import { Background } from '@/components/layout/background'
import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'
import { ProfileImage } from '@/components/layout/hero/profile-image'
import type { Metadata } from 'next'

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
              <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
                <ProfileImage />
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-2 text-center lg:text-left">
                    <p className="text-primary text-lg font-semibold md:text-xl">Hi, I’m Kilian</p>
                  </div>
                  <div className="text-muted-foreground text-base leading-relaxed md:text-lg">
                    <p className="mb-4">
                      I’m a Site Reliability and DevOps Engineer based in Cleveland, Ohio. I focus on building reliable,
                      scalable systems and smooth developer experiences through automation, observability, and platform
                      engineering principles.
                    </p>
                    <p className="mb-4">
                      I enjoy working across infrastructure, CI/CD, and application performance—helping teams ship
                      confidently with strong feedback loops and resilient architectures.
                    </p>
                    <p>
                      Outside of work, you’ll probably find me tinkering with homelab gear, optimizing dotfiles, or
                      experimenting with new tooling and workflows.
                    </p>
                  </div>
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
