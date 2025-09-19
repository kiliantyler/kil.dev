'use client'

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'

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
  const timeoutIdsRef = useRef<Array<ReturnType<typeof setTimeout>>>([])

  useEffect(() => {
    // Clear the animation state on page load to ensure content is visible
    sessionStorage.removeItem('konami-animated')
    setHasAnimated(false)
    setShowSnake(false)
    setStartCrtAnimation(false)
    return () => {
      // Cleanup any pending timeouts to avoid memory leaks
      for (const id of timeoutIdsRef.current) {
        clearTimeout(id)
      }
      timeoutIdsRef.current = []
    }
  }, [])

  const triggerAnimation = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 840) {
      // Do not start the Konami animation or load the snake game on small screens
      try {
        toast.info('Viewport too small', {
          description: 'Snake needs at least 840px width. Try a larger screen.',
          position: 'bottom-right',
          duration: 6000,
        })
      } catch {}
      return
    }
    setIsAnimating(true)
    setHasAnimated(true)
    // Store in session storage so it persists until refresh
    sessionStorage.setItem('konami-animated', 'true')

    // Start CRT animation after a delay to let content start moving
    const crtId = setTimeout(() => {
      setStartCrtAnimation(true)
      // Make the game visible while the CRT powers on so it reveals through the mask
      setShowSnake(true)
    }, 600) // 0.6s delay to let content clear the area first
    timeoutIdsRef.current.push(crtId)

    // Stop animating after 1.5s but keep hasAnimated true
    const stopId = setTimeout(() => {
      setIsAnimating(false)
    }, 1500)
    timeoutIdsRef.current.push(stopId)
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
    const returnId = setTimeout(() => {
      setIsReturning(false)
      try {
        sessionStorage.removeItem('konami-animated')
      } catch {}
    }, 1600)
    timeoutIdsRef.current.push(returnId)
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
