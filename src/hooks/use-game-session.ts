'use client'

import type { ScoreSubmissionResponse } from '@/types/leaderboard'
import { computeSha256Hex } from '@/utils/crypto'
import { stableStringify } from '@/utils/stable-stringify'
import { useCallback, useRef, useState } from 'react'

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
  const gameStartTimeRef = useRef<number>(0) // Track when game actually started (before session)
  const eventsRef = useRef<{ t: number; k: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' }[]>([])
  const foodsRef = useRef<{ t: number; g: boolean }[]>([])
  // Queue food events that happen before session is ready
  const pendingFoodsRef = useRef<{ t: number; g: boolean }[]>([])

  const startGame = useCallback(async () => {
    // Mark game start time immediately (before async session creation)
    // Reset if starting a new game
    gameStartTimeRef.current = Date.now()

    setIsLoading(true)
    setError(null)
    console.log('Starting game session...')

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
        startTimeRef.current = gameStartTimeRef.current // Use game start time, not session start time
        eventsRef.current = []
        foodsRef.current = []
        console.log('Game session started successfully:', { sessionId: data.sessionId })

        // Replay any pending food events that happened before session started
        if (pendingFoodsRef.current.length > 0) {
          console.log('Replaying', pendingFoodsRef.current.length, 'pending food events')
          // Replay with timestamps relative to game start time
          for (const food of pendingFoodsRef.current) {
            foodsRef.current.push(food)
          }
          pendingFoodsRef.current = []
        }
      } else {
        const errorMsg = data?.message ?? 'Failed to start game session'
        setError(errorMsg)
        console.error('Failed to start game session:', errorMsg)
      }
    } catch (err) {
      setError('Failed to start game session')
      console.error('Error starting game session:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const recordMove = useCallback(
    async (direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT', _gameState: GameState) => {
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
    async (_position: { x: number; y: number }, isGolden: boolean, _score: number) => {
      const foodEvent = { t: 0, g: isGolden }

      if (!session) {
        // Queue food events that happen before session is ready
        // Calculate time relative to game start (not session start)
        const gameStartTime = gameStartTimeRef.current || Date.now()
        foodEvent.t = Date.now() - gameStartTime
        console.warn('recordFoodEaten called but no session exists - queuing event', { time: foodEvent.t, isGolden })
        pendingFoodsRef.current.push(foodEvent)
        return
      }

      // Record locally with timestamp relative to session start
      foodEvent.t = Date.now() - startTimeRef.current
      foodsRef.current.push(foodEvent)
      console.log('Recorded food eaten:', {
        isGolden,
        score: _score,
        time: foodEvent.t,
        totalFoods: foodsRef.current.length,
      })
    },
    [session],
  )

  const endGame = useCallback(
    async (finalScoreParam: number) => {
      if (!session) {
        console.error('endGame called but no session exists')
        return { success: false, message: 'No active session' }
      }

      console.log('Ending game session:', { sessionId: session.sessionId, finalScoreParam })
      try {
        // Derive final score from recorded food events for validation
        const computedFinalScore = foodsRef.current.reduce((acc, f) => acc + (f.g ? 50 : 10), 0)
        console.log('Computed final score:', computedFinalScore, 'from', foodsRef.current.length, 'food events')

        // Use the provided score parameter (from game logic) as the primary score
        // The server will validate that this matches the food events
        const finalScore = finalScoreParam
        console.log('Using final score from game:', finalScore, '(computed from events:', computedFinalScore, ')')

        if (computedFinalScore !== finalScore) {
          console.warn(
            `Score mismatch! Game score: ${finalScore}, Computed from events: ${computedFinalScore}. This may cause validation to fail.`,
          )
        }

        // Compute signature: sha256(secret + '.' + stableStringify(payload))
        const payload = {
          sessionId: session.sessionId,
          finalScore,
          events: eventsRef.current,
          foods: foodsRef.current,
          durationMs: Date.now() - startTimeRef.current,
        }
        console.log('End game payload:', {
          ...payload,
          events: eventsRef.current.length,
          foods: foodsRef.current.length,
        })

        const signature = await computeSha256Hex(`${session.secret}.${stableStringify(payload)}`)
        console.log('Computed signature for end game')

        const response = await fetch('/api/game/end', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ...payload, signature }),
        })

        const data = (await response.json()) as GameEndResponse
        console.log('End game response:', data)
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
      const timestamp = Date.now()

      const signingPayload = {
        sessionId: session.sessionId,
        name,
        score,
        timestamp,
      }

      const signature = await computeSha256Hex(`${session.secret}.${stableStringify(signingPayload)}`)

      const response = await fetch('/api/scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...signingPayload, signature }),
      })

      const data = (await response.json()) as ScoreSubmissionResponse
      return data
    },
    [session],
  )

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
