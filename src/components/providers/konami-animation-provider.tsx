'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

type KonamiAnimationContextType = {
  isAnimating: boolean
  hasAnimated: boolean
  showSnake: boolean
  triggerAnimation: () => void
}

const KonamiAnimationContext = createContext<KonamiAnimationContextType | undefined>(undefined)

export function KonamiAnimationProvider({ children }: { children: ReactNode }) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [hasAnimated, setHasAnimated] = useState(false)
  const [showSnake, setShowSnake] = useState(false)

  useEffect(() => {
    // Clear the animation state on page load to ensure content is visible
    sessionStorage.removeItem('konami-animated')
    setHasAnimated(false)
    setShowSnake(false)
  }, [])

  const triggerAnimation = () => {
    setIsAnimating(true)
    setHasAnimated(true)
    // Store in session storage so it persists until refresh
    sessionStorage.setItem('konami-animated', 'true')

    // Stop animating after 1.5s but keep hasAnimated true
    setTimeout(() => {
      setIsAnimating(false)
      setShowSnake(true)
    }, 1500)
  }

  return (
    <KonamiAnimationContext.Provider value={{ isAnimating, hasAnimated, showSnake, triggerAnimation }}>
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
