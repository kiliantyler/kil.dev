'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type KonamiAnimationContextType = {
  isAnimating: boolean
  hasAnimated: boolean
  showSnake: boolean
  startCrtAnimation: boolean
  isReturning: boolean
  triggerAnimation: () => void
  closeAnimation: () => void
  finishCloseAnimation: () => void
}

const KonamiAnimationContext = createContext<KonamiAnimationContextType | undefined>(undefined)

export function KonamiAnimationProvider({ children }: { children: ReactNode }) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [hasAnimated, setHasAnimated] = useState(false)
  const [showSnake, setShowSnake] = useState(false)
  const [startCrtAnimation, setStartCrtAnimation] = useState(false)
  const [isReturning, setIsReturning] = useState(false)

  useEffect(() => {
    // Clear the animation state on page load to ensure content is visible
    sessionStorage.removeItem('konami-animated')
    setHasAnimated(false)
    setShowSnake(false)
    setStartCrtAnimation(false)
  }, [])

  const triggerAnimation = () => {
    setIsAnimating(true)
    setHasAnimated(true)
    // Store in session storage so it persists until refresh
    sessionStorage.setItem('konami-animated', 'true')

    // Start CRT animation after a delay to let content start moving
    setTimeout(() => {
      setStartCrtAnimation(true)
    }, 600) // 0.6s delay to let content clear the area first

    // Stop animating after 1.5s but keep hasAnimated true
    setTimeout(() => {
      setIsAnimating(false)
      setShowSnake(true)
    }, 1500)
  }

  const closeAnimation = () => {
    // Begin reverse animation sequence
    setIsReturning(true)
    // Hide snake gameplay visuals immediately (game can still animate CRT close)
    setShowSnake(false)
  }

  const finishCloseAnimation = () => {
    // Unmount the BackgroundSnakeGame
    setStartCrtAnimation(false)

    // Clear animation flags so content is fully restored
    setHasAnimated(false)
    setIsAnimating(false)

    // Keep isReturning true long enough for the return animation (1.5s) to finish
    setTimeout(() => {
      setIsReturning(false)
      try {
        sessionStorage.removeItem('konami-animated')
      } catch {}
    }, 1600)
  }

  return (
    <KonamiAnimationContext.Provider
      value={{
        isAnimating,
        hasAnimated,
        showSnake,
        startCrtAnimation,
        isReturning,
        triggerAnimation,
        closeAnimation,
        finishCloseAnimation,
      }}>
      {children}
    </KonamiAnimationContext.Provider>
  )
}

export function useKonamiAnimation() {
  const context = useContext(KonamiAnimationContext)
  if (!context) {
    throw new Error('useKonamiAnimation must be used within a KonamiAnimationProvider')
  }
  return context
}
