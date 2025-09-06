import { Background } from '../background'
import { Footer } from '../footer'
import { Header } from '../header'
import { Hero } from './hero'

export function HomeContent() {
  return (
    <div className="bg-background text-foreground relative flex min-h-screen flex-col">
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
