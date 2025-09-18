'use client'

import { useConfetti } from '../providers/confetti-provider'
export function Footer() {
  const { triggerConfettiFromCorners } = useConfetti()

  return (
    <footer className="w-full bg-background/50 border-t border-border">
      <div className="px-10 py-4">
        <div className="text-center text-sm text-muted-foreground">
          <p>
            © {new Date().getFullYear()}{' '}
            <button
              onClick={() => {
                triggerConfettiFromCorners()
              }}>
              Kilian Tyler
            </button>
            . All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
