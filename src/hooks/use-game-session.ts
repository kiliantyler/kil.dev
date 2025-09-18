'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface GameSession {
  sessionId: string
  secret: string
}

interface GameState {
  snake: { x: number; y: number }[]
  food: { x: number; y: number }
  isGoldenApple: boolean
  score: number
  direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
}

export function useGameSession() {
  const [session, setSession] = useState<GameSession | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastMoveTimeRef = useRef<number>(0)

  const startGame = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/game/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (data.success) {
        setSession({
          sessionId: data.sessionId,
          secret: data.secret,
        })
      } else {
        setError(data.message || 'Failed to start game session')
      }
    } catch (err) {
      setError('Failed to start game session')
      console.error('Error starting game session:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const recordMove = useCallback(
    async (direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT', gameState: GameState) => {
      if (!session) return

      // Throttle moves to avoid too many API calls
      const now = Date.now()
      if (now - lastMoveTimeRef.current < 100) return // Max 10 moves per second
      lastMoveTimeRef.current = now

      try {
        await fetch('/api/game/move', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: session.sessionId,
            secret: session.secret,
            direction,
            gameState,
          }),
        })
      } catch (err) {
        console.error('Error recording move:', err)
      }
    },
    [session],
  )

  const recordFoodEaten = useCallback(
    async (position: { x: number; y: number }, isGolden: boolean, score: number) => {
      if (!session) return

      try {
        await fetch('/api/game/food', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: session.sessionId,
            secret: session.secret,
            position,
            isGolden,
            score,
          }),
        })
      } catch (err) {
        console.error('Error recording food eaten:', err)
      }
    },
    [session],
  )

  const endGame = useCallback(
    async (finalScore: number) => {
      if (!session) return { success: false, message: 'No active session' }

      try {
        const response = await fetch('/api/game/end', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: session.sessionId,
            secret: session.secret,
            finalScore,
          }),
        })

        const data = await response.json()

        if (data.success) {
          setSession(null) // Clear session after ending
          return { success: true, validatedScore: data.validatedScore }
        } else {
          return { success: false, message: data.message }
        }
      } catch (err) {
        console.error('Error ending game session:', err)
        return { success: false, message: 'Failed to end game session' }
      }
    },
    [session],
  )

  const submitScore = useCallback(
    async (name: string, score: number) => {
      if (!session) {
        // Fallback to old method if no session
        const response = await fetch('/api/scores', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name, score }),
        })
        return response.json()
      }

      // Use validated score submission
      const response = await fetch('/api/scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          score,
          sessionId: session.sessionId,
          secret: session.secret,
        }),
      })

      return response.json()
    },
    [session],
  )

  // Clean up session on unmount
  useEffect(() => {
    return () => {
      if (session) {
        // Optionally end the session on unmount
        // This is a cleanup, so we don't await it
        fetch('/api/game/end', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: session.sessionId,
            secret: session.secret,
            finalScore: 0, // Use 0 as final score for cleanup
          }),
        }).catch(console.error)
      }
    }
  }, [session])

  return {
    session,
    isLoading,
    error,
    startGame,
    recordMove,
    recordFoodEaten,
    endGame,
    submitScore,
  }
}
