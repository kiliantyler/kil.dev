'use client'

import confetti from 'canvas-confetti'
import React, { createContext, useCallback, useContext, useMemo, useRef } from 'react'

type ConfettiContextValue = {
  triggerConfetti: () => void
  triggerConfettiFromCorners: () => void
  triggerConfettiFromTop: () => void
  triggerConfettiFromCenter: () => void
}

const ConfettiContext = createContext<ConfettiContextValue | null>(null)

export function ConfettiProvider({ children }: { children: React.ReactNode }) {
  const pendingConfettiRef = useRef<Set<string>>(new Set())

  const triggerConfetti = useCallback(() => {
    void confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    })
  }, [])

  const triggerConfettiFromCorners = useCallback(() => {
    const confettiId = 'corners'

    // Prevent multiple confetti triggers in quick succession
    if (pendingConfettiRef.current.has(confettiId)) return
    pendingConfettiRef.current.add(confettiId)

    // Create confetti from bottom corners
    const leftCorner = {
      x: 0,
      y: 1,
      angle: 45,
      startVelocity: 55,
      spread: 90,
      particleCount: 50,
      origin: { x: 0, y: 1 },
    }

    const rightCorner = {
      x: 1,
      y: 1,
      angle: 135,
      startVelocity: 55,
      spread: 90,
      particleCount: 50,
      origin: { x: 1, y: 1 },
    }

    // Fire from both corners with slight delay
    void confetti(leftCorner)
    void confetti(rightCorner)

    // Clean up the confetti pending flag after animation completes
    setTimeout(() => pendingConfettiRef.current.delete(confettiId), 1000)
  }, [])

  const triggerConfettiFromTop = useCallback(() => {
    const confettiId = 'top'

    if (pendingConfettiRef.current.has(confettiId)) return
    pendingConfettiRef.current.add(confettiId)

    void confetti({
      particleCount: 150,
      spread: 180,
      origin: { y: 0 },
      angle: 270,
      startVelocity: 45,
    })

    setTimeout(() => pendingConfettiRef.current.delete(confettiId), 1000)
  }, [])

  const triggerConfettiFromCenter = useCallback(() => {
    const confettiId = 'center'

    if (pendingConfettiRef.current.has(confettiId)) return
    pendingConfettiRef.current.add(confettiId)

    void confetti({
      particleCount: 200,
      spread: 360,
      origin: { x: 0.5, y: 0.5 },
      startVelocity: 30,
    })

    setTimeout(() => pendingConfettiRef.current.delete(confettiId), 1000)
  }, [])

  const value = useMemo<ConfettiContextValue>(
    () => ({
      triggerConfetti,
      triggerConfettiFromCorners,
      triggerConfettiFromTop,
      triggerConfettiFromCenter,
    }),
    [triggerConfetti, triggerConfettiFromCorners, triggerConfettiFromTop, triggerConfettiFromCenter],
  )

  return <ConfettiContext.Provider value={value}>{children}</ConfettiContext.Provider>
}

export function useConfetti() {
  const ctx = useContext(ConfettiContext)
  if (!ctx) throw new Error('useConfetti must be used within ConfettiProvider')
  return ctx
}
