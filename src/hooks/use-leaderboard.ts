import { CheckScoreResponseSchema, LeaderboardResponseSchema, SubmitScoreResponseSchema } from '@/lib/api-schemas'
import type { LeaderboardEntry } from '@/types/leaderboard'
import { useCallback, useState } from 'react'

const SUBMIT_HIDE_NAME_TIMEOUT_MS = 1000

export function useLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false)
  const [isSubmittingScore, setIsSubmittingScore] = useState(false)
  const [showNameInput, setShowNameInput] = useState(false)
  const [playerName, setPlayerName] = useState(['A', 'A', 'A'])
  const [nameInputPosition, setNameInputPosition] = useState(0)

  const fetchLeaderboard = useCallback(async () => {
    setIsLoadingLeaderboard(true)
    try {
      const response = await fetch('/api/scores')
      const jsonData: unknown = await response.json()
      const parseResult = LeaderboardResponseSchema.safeParse(jsonData)

      if (!parseResult.success) {
        console.error('Failed to parse leaderboard response:', parseResult.error)
        return
      }

      const data = parseResult.data
      if (data.success) setLeaderboard(data.leaderboard)
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    } finally {
      setIsLoadingLeaderboard(false)
    }
  }, [])

  const checkScoreQualification = useCallback(async (currentScore: number) => {
    try {
      const response = await fetch(`/api/scores/check?score=${currentScore}`)
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
      if (isSubmittingScore) return
      setIsSubmittingScore(true)
      try {
        const response = await fetch('/api/scores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            sessionId && secret
              ? { name: playerName.join(''), score, sessionId, secret }
              : { name: playerName.join(''), score },
          ),
        })
        const jsonData: unknown = await response.json()
        const parseResult = SubmitScoreResponseSchema.safeParse(jsonData)

        if (!parseResult.success) {
          console.error('Failed to parse score submission response:', parseResult.error)
          setShowNameInput(false)
          return
        }

        const data = parseResult.data
        if (data.success) {
          if (data.leaderboard) setLeaderboard(data.leaderboard)
          setTimeout(() => setShowNameInput(false), SUBMIT_HIDE_NAME_TIMEOUT_MS)
        } else {
          console.error('Failed to submit score:', data.message)
          setShowNameInput(false)
        }
      } catch (error) {
        console.error('Error submitting score:', error)
        setShowNameInput(false)
      } finally {
        setIsSubmittingScore(false)
      }
    },
    [isSubmittingScore, playerName],
  )

  const handleGameOverFlow = useCallback(
    async (score: number) => {
      await fetchLeaderboard()
      const qualifies = await checkScoreQualification(score)
      if (qualifies) {
        setShowNameInput(true)
        setPlayerName(['A', 'A', 'A'])
        setNameInputPosition(0)
      }
    },
    [fetchLeaderboard, checkScoreQualification],
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
            if (!currentChar) return next
            const newChar = currentChar === 'Z' ? 'A' : String.fromCharCode(currentChar.charCodeAt(0) + 1)
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
            const newChar = currentChar === 'A' ? 'Z' : String.fromCharCode(currentChar.charCodeAt(0) - 1)
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
    leaderboard,
    isLoadingLeaderboard,
    isSubmittingScore,
    showNameInput,
    playerName,
    nameInputPosition,
    setPlayerName,
    setNameInputPosition,
    setShowNameInput,
    fetchLeaderboard,
    checkScoreQualification,
    submitScore,
    handleGameOverFlow,
    handleNameInputKey,
  }
}
