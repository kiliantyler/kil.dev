'use client'

import { CheckScoreResponseSchema } from '@/lib/api-schemas'
import type { LeaderboardEntry } from '@/types/leaderboard'
import { computeSha256Hex } from '@/utils/crypto'
import { stableStringify } from '@/utils/stable-stringify'
import { useQuery } from 'convex/react'
import { useCallback, useState } from 'react'
import { api } from '../../convex/_generated/api'

const SUBMIT_HIDE_NAME_TIMEOUT_MS = 1000

export function useLeaderboard() {
  // Use Convex's real-time query hook for leaderboard
  const convexLeaderboard = useQuery(api.scores.getLeaderboard) ?? []

  // Transform Convex data to match LeaderboardEntry interface
  const leaderboard: LeaderboardEntry[] = convexLeaderboard
  const isLoadingLeaderboard = convexLeaderboard === undefined

  const [isSubmittingScore, setIsSubmittingScore] = useState(false)
  const [showNameInput, setShowNameInput] = useState(false)
  const [playerName, setPlayerName] = useState(['A', 'A', 'A'])
  const [nameInputPosition, setNameInputPosition] = useState(0)
  const [optimisticScore, setOptimisticScore] = useState<LeaderboardEntry | null>(null)

  // Check qualification using API route (can be optimized further with useQuery)
  const checkScoreQualification = useCallback(async (currentScore: number): Promise<boolean> => {
    try {
      console.log('Checking qualification for score:', currentScore)
      const response = await fetch(`/api/scores/check/${currentScore}`)
      const jsonData: unknown = await response.json()
      const parsed = CheckScoreResponseSchema.safeParse(jsonData)
      if (!parsed.success) {
        console.error('Failed to parse score qualification response:', parsed.error)
        return false
      }
      return parsed.data.qualifies
    } catch (error) {
      console.error('Error checking score qualification:', error)
      return false
    }
  }, [])

  const submitScore = useCallback(
    async (score: number, sessionId?: string, secret?: string) => {
      if (isSubmittingScore || !sessionId || !secret) return
      setIsSubmittingScore(true)

      // Optimistic update: add score to local leaderboard immediately
      const sanitizedName = playerName
        .join('')
        .toUpperCase()
        .replaceAll(/[^A-Z]/g, '')
        .slice(0, 3)
        .padEnd(3, 'A')
      const optimisticEntry: LeaderboardEntry = {
        id: `optimistic-${Date.now()}`,
        name: sanitizedName,
        score,
        timestamp: Date.now(),
      }
      setOptimisticScore(optimisticEntry)

      try {
        const timestamp = Date.now()
        const signingPayload = { sessionId, name: playerName.join(''), score, timestamp }
        const signature = await computeSha256Hex(`${secret}.${stableStringify(signingPayload)}`)

        const response = await fetch('/api/scores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: playerName.join(''),
            score,
            sessionId,
            timestamp,
            signature,
          }),
        })
        const result = (await response.json()) as { success: boolean; message?: string }

        if (result.success) {
          // Leaderboard will automatically update via Convex subscription
          // Remove optimistic entry - real one will appear
          setOptimisticScore(null)
          setTimeout(() => setShowNameInput(false), SUBMIT_HIDE_NAME_TIMEOUT_MS)
        } else {
          // Remove optimistic entry on failure
          setOptimisticScore(null)
          console.error('Failed to submit score:', result.message)
          setShowNameInput(false)
        }
      } catch (error) {
        // Remove optimistic entry on error
        setOptimisticScore(null)
        console.error('Error submitting score:', error)
        setShowNameInput(false)
      } finally {
        setIsSubmittingScore(false)
      }
    },
    [isSubmittingScore, playerName],
  )

  // Merge optimistic score into leaderboard if present
  const displayLeaderboard = optimisticScore
    ? [...leaderboard, optimisticScore]
        .toSorted((a, b) => {
          if (b.score !== a.score) return b.score - a.score
          return a.timestamp - b.timestamp
        })
        .slice(0, 10)
    : leaderboard

  const handleGameOverFlow = useCallback(
    async (score: number) => {
      console.log('handleGameOverFlow called with score:', score)
      // Check qualification - leaderboard updates automatically via Convex
      const qualifiesResult = await checkScoreQualification(score)
      console.log('Score qualification result:', qualifiesResult, 'type:', typeof qualifiesResult)
      // Ensure we're checking a boolean value
      const qualifies = Boolean(qualifiesResult)
      console.log('Qualifies (boolean):', qualifies)
      if (qualifies) {
        console.log('Score qualifies! Showing name input')
        setShowNameInput(true)
        setPlayerName(['A', 'A', 'A'])
        setNameInputPosition(0)
      } else {
        console.log('Score does not qualify for leaderboard. Score:', score, 'Qualifies result:', qualifiesResult)
      }
    },
    [checkScoreQualification],
  )

  const handleNameInputKey = useCallback(
    (e: KeyboardEvent) => {
      if (!showNameInput) return
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          setPlayerName(prev => {
            const next = [...prev]
            const currentChar = next[nameInputPosition]
            if (currentChar === undefined || nameInputPosition < 0 || nameInputPosition >= next.length) return prev
            const newChar = currentChar === 'Z' ? 'A' : String.fromCodePoint((currentChar.codePointAt(0) ?? 0) + 1)
            next[nameInputPosition] = newChar
            return next
          })
          break
        case 'ArrowDown':
          e.preventDefault()
          setPlayerName(prev => {
            const next = [...prev]
            const currentChar = next[nameInputPosition]
            if (!currentChar) return next
            const newChar = currentChar === 'A' ? 'Z' : String.fromCodePoint((currentChar.codePointAt(0) ?? 0) - 1)
            next[nameInputPosition] = newChar
            return next
          })
          break
        case 'ArrowLeft':
          e.preventDefault()
          setNameInputPosition(prev => Math.max(0, prev - 1))
          break
        case 'ArrowRight':
          e.preventDefault()
          setNameInputPosition(prev => Math.min(2, prev + 1))
          break
      }
    },
    [showNameInput, nameInputPosition],
  )

  return {
    leaderboard: displayLeaderboard,
    isLoadingLeaderboard,
    isSubmittingScore,
    showNameInput,
    playerName,
    nameInputPosition,
    setPlayerName,
    setNameInputPosition,
    setShowNameInput,
    checkScoreQualification,
    submitScore,
    handleGameOverFlow,
    handleNameInputKey,
  }
}
