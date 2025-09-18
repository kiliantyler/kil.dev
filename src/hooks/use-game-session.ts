'use client'

import type { ScoreSubmissionResponse } from '@/types/leaderboard'
import { useCallback, useEffect, useRef, useState } from 'react'

interface GameSession {
  sessionId: string
  secret: string
  seed: number
}

interface GameState {
  snake: { x: number; y: number }[]
  food: { x: number; y: number }
  isGoldenApple: boolean
  score: number
  direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
}

interface GameStartResponse {
  success: boolean
  sessionId?: string
  secret?: string
  seed?: number
  message?: string
}

interface GameEndResponse {
  success: boolean
  validatedScore?: number
  message?: string
}

export function useGameSession() {
  const [session, setSession] = useState<GameSession | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastMoveTimeRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)
  const eventsRef = useRef<{ t: number; k: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' }[]>([])
  const foodsRef = useRef<{ t: number; g: boolean }[]>([])

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

      const data = (await response.json()) as GameStartResponse
      if (data.success && data.sessionId && data.secret && typeof data.seed === 'number') {
        setSession({ sessionId: data.sessionId, secret: data.secret, seed: data.seed })
        startTimeRef.current = Date.now()
        eventsRef.current = []
        foodsRef.current = []
      } else {
        setError(data?.message ?? 'Failed to start game session')
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

      // Record locally for end-only validation
      const t = Date.now() - startTimeRef.current
      eventsRef.current.push({ t, k: direction })
    },
    [session],
  )

  const recordFoodEaten = useCallback(
    async (position: { x: number; y: number }, isGolden: boolean, score: number) => {
      if (!session) return

      // Record locally
      const t = Date.now() - startTimeRef.current
      foodsRef.current.push({ t, g: isGolden })
    },
    [session],
  )

  const endGame = useCallback(
    async (finalScore: number) => {
      if (!session) return { success: false, message: 'No active session' }

      try {
        async function computeSha256Hex(input: string): Promise<string> {
          const encoder = new TextEncoder()
          const data = encoder.encode(input)
          const hashBuffer = await crypto.subtle.digest('SHA-256', data)
          const bytes = Array.from(new Uint8Array(hashBuffer))
          return bytes.map(b => b.toString(16).padStart(2, '0')).join('')
        }

        // Compute signature: sha256(secret + '.' + JSON.stringify(payload))
        const payload = {
          sessionId: session.sessionId,
          finalScore,
          events: eventsRef.current,
          foods: foodsRef.current,
          durationMs: Date.now() - startTimeRef.current,
        }

        const signature = await computeSha256Hex(`${session.secret}.${JSON.stringify(payload)}`)

        const response = await fetch('/api/game/end', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ...payload, signature }),
        })

        const data = (await response.json()) as GameEndResponse
        if (data.success) {
          return { success: true, validatedScore: data.validatedScore }
        }
        return { success: false, message: data.message ?? 'Failed to end game session' }
      } catch (err) {
        console.error('Error ending game session:', err)
        return { success: false, message: 'Failed to end game session' }
      }
    },
    [session],
  )

  const submitScore = useCallback(
    async (name: string, score: number) => {
      if (!session) return { success: false, message: 'No active session' }

      // Validated score submission
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

      const data = (await response.json()) as ScoreSubmissionResponse
      return data
    },
    [session],
  )

  // Removed noisy cleanup POST on unmount to avoid spurious 400 errors
  useEffect(() => {
    return undefined
  }, [])

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
