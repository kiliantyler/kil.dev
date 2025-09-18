'use client'

import type { ScoreQualificationResponse, ScoreSubmissionResponse } from '@/types/leaderboard'
import { useEffect, useState } from 'react'
import { NameInputModal } from './name-input-modal'

interface ScoreSubmissionProps {
  score: number
  onComplete: () => void
}

export function ScoreSubmission({ score, onComplete }: ScoreSubmissionProps) {
  const [showNameInput, setShowNameInput] = useState(false)
  const [, setIsSubmitting] = useState(false)

  // Check if score qualifies on mount
  useEffect(() => {
    const checkQualification = async () => {
      try {
        const response = await fetch(`/api/scores/check?score=${score}`)
        const data = (await response.json()) as ScoreQualificationResponse

        if (data.qualifies) {
          setShowNameInput(true)
        }
      } catch (error) {
        console.error('Error checking score qualification:', error)
      }
    }

    void checkQualification()
  }, [score])

  const handleNameSubmit = async (name: string) => {
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, score }),
      })

      const data = (await response.json()) as ScoreSubmissionResponse

      if (data.success) {
        // Score submitted successfully
        // Close name input and show success
        setShowNameInput(false)

        // Wait a moment then complete
        setTimeout(() => {
          onComplete()
        }, 2000)
      } else {
        console.error('Failed to submit score:', data.message)
        // Still close the modal but show error
        setShowNameInput(false)
        onComplete()
      }
    } catch (error) {
      console.error('Error submitting score:', error)
      setShowNameInput(false)
      onComplete()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setShowNameInput(false)
    onComplete()
  }

  return <NameInputModal isOpen={showNameInput} score={score} onSubmit={handleNameSubmit} onClose={handleClose} />
}
