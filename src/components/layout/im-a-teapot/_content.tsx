import Image from 'next/image'
import teapot from '../../../images/teapot.webp'
import { LinkButton } from '../../ui/link-button'

export function ImATeapotContent() {
  return (
    <div className="flex flex-1 items-center justify-center px-10 py-20 md:px-20 lg:px-40">
      <div className="w-full text-center">
        <div className="flex flex-col items-center gap-8">
          {/* Teapot Illustration */}
          <div className="group relative">
            <div className="relative h-52 w-52 transition-transform duration-500 group-hover:-translate-y-1 group-hover:scale-105 md:h-72 md:w-72 lg:h-96 lg:w-96">
              <div className="border-primary absolute inset-0 -rotate-3 rounded-lg border-4 transition-transform duration-500 group-hover:rotate-0" />
              <Image
                src={teapot}
                alt="A playful teapot illustration"
                fill
                sizes="(min-width: 1024px) 24rem, (min-width: 768px) 18rem, 13rem"
                className="object-contain"
                priority={false}
              />
            </div>
          </div>

          {/* Message */}
          <div className="flex max-w-2xl flex-col gap-4">
            <h2 className="text-3xl font-bold text-foreground md:text-4xl lg:text-5xl">I&apos;m a Teapot</h2>
            <p className="text-primary text-lg font-medium md:text-xl">
              This server is a teapot and refuses to brew coffee.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap justify-center gap-4">
            <LinkButton
              href="/"
              className="bg-primary hover:bg-primary/90 h-12 min-w-[160px] gap-2 rounded-md px-6 text-base font-bold text-primary-foreground shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              aria-label="Return to home page">
              <span>Go Home</span>
            </LinkButton>
          </div>
        </div>
      </div>
    </div>
  )
}
