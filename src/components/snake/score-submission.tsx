'use client'

// Types are now defined via Zod schemas below
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import { NameInputModal } from './name-input-modal'

// Zod schemas for API response validation
const ScoreQualificationResponseSchema = z.object({
  success: z.boolean(),
  qualifies: z.boolean(),
  currentThreshold: z.number().optional(),
  message: z.string().optional(),
})

const ScoreSubmissionResponseSchema = z.object({
  success: z.boolean(),
  position: z.number().optional(),
  leaderboard: z
    .array(
      z.object({
        name: z.string(),
        score: z.number(),
        timestamp: z.number(),
        id: z.string(),
      }),
    )
    .optional(),
  message: z.string().optional(),
})

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

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const rawData = (await response.json()) as unknown
        const data = ScoreQualificationResponseSchema.parse(rawData)

        if (data.qualifies) {
          setShowNameInput(true)
        }
      } catch (error) {
        console.error('Error checking score qualification:', error)
        // Don't show toast for qualification check failures as it's not user-initiated
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
