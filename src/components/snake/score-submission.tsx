'use client'

import { ScoreQualificationResponseSchema, ScoreSubmissionResponseSchema } from '@/lib/api-schemas'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import { NameInputModal } from './name-input-modal'

interface ScoreSubmissionProps {
  score: number
  onComplete: () => void
}

export function ScoreSubmission({ score, onComplete }: ScoreSubmissionProps) {
  const [showNameInput, setShowNameInput] = useState(false)
  const timeoutRef = useRef<number | null>(null)

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

  // Cleanup any pending timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [])

  const handleNameSubmit = async (name: string) => {
    try {
      const response = await fetch('/api/scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, score }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const rawData = (await response.json()) as unknown
      const data = ScoreSubmissionResponseSchema.parse(rawData)

      if (data.success) {
        // Score submitted successfully
        toast.success('Score submitted successfully!', {
          description: data.position
            ? `You're ranked #${data.position} on the leaderboard!`
            : 'Your score has been recorded.',
        })

        // Close name input after showing success
        setShowNameInput(false)

        // Wait a moment then complete
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }
        timeoutRef.current = window.setTimeout(() => {
          onComplete()
          timeoutRef.current = null
        }, 2000)
      } else {
        // API returned success: false
        const errorMessage = data.message ?? 'Failed to submit score. Please try again.'
        toast.error('Score submission failed', {
          description: errorMessage,
        })

        // Close modal and complete after showing error
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }
        setShowNameInput(false)
        onComplete()
      }
    } catch (error) {
      console.error('Error submitting score:', error)

      let errorMessage = 'Failed to submit score. Please try again.'

      if (error instanceof z.ZodError) {
        errorMessage = 'Invalid response from server. Please try again.'
        console.error('Zod validation error:', error.issues)
      } else if (error instanceof Error) {
        if (error.message.includes('HTTP error')) {
          errorMessage = 'Server error. Please try again later.'
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = 'Network error. Please check your connection.'
        }
      }

      toast.error('Score submission failed', {
        description: errorMessage,
      })

      // Close modal and complete after showing error
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      setShowNameInput(false)
      onComplete()
    }
  }

  const handleClose = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setShowNameInput(false)
    onComplete()
  }

  return <NameInputModal isOpen={showNameInput} score={score} onSubmit={handleNameSubmit} onClose={handleClose} />
}
