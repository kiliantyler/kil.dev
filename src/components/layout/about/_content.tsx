import { Background } from '../background'
import { Footer } from '../footer'
import { Header } from '../header'
import { AboutMeContent } from './aboutme/_content'
import { PetsContent } from './pets/_content'

export function AboutContent() {
  return (
    <div className="bg-background text-foreground relative flex min-h-screen flex-col">
      <Background />
      <div className="relative z-20 flex size-full flex-1 flex-col overflow-x-hidden">
        <div className="layout-container flex h-full flex-1 flex-col">
          <Header />
          <main className="flex flex-1 items-center px-10 py-20 md:px-20 lg:px-40">
            <div className="w-full">
              <AboutMeContent />
              <PetsContent />
            </div>
          </main>
          <Footer />
        </div>
      </div>
    </div>
  )
}
