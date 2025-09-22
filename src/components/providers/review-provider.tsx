'use client'

import ReviewDialog from '@/components/layout/review/review-dialog'
import { useAchievements } from '@/components/providers/achievements-provider'
import { REVIEW_CONFIG } from '@/lib/review'
import { incrementReminderCount, markSubmitted, markTriggered, readReviewState, shouldShowGate } from '@/utils/review'
import React, { useCallback, useEffect, useRef, useState } from 'react'

export function ReviewProvider({ children }: { children: React.ReactNode }) {
  const { unlocked, unlock } = useAchievements()
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState<0 | 1 | 2 | 3 | 4 | 5>(0)
  const reminderShownRef = useRef(false)

  useEffect(() => {
    if (!REVIEW_CONFIG.enabled) return

    const check = () => {
      if (shouldShowGate(unlocked)) {
        const state = readReviewState()
        if (!state.triggeredAt) markTriggered()
        if (!reminderShownRef.current) {
          incrementReminderCount()
          reminderShownRef.current = true
        }
        setOpen(true)
        return
      }
      setOpen(false)
    }

    // Run after the current event loop turn to include any cascading unlocks
    try {
      queueMicrotask(check)
      // Also schedule a fallback macrotask for safety
      const t = setTimeout(check, 0)
      return () => clearTimeout(t)
    } catch {
      const t = setTimeout(check, 0)
      return () => clearTimeout(t)
    }
  }, [unlocked])

  const handleSelect = useCallback((next: 0 | 1 | 2 | 3 | 4 | 5) => setRating(next), [])

  const handleSubmit = useCallback(() => {
    if (rating !== 5) return
    markSubmitted(5)
    unlock(REVIEW_CONFIG.achievementIdOnSubmit)
    setOpen(false)
  }, [rating, unlock])

  return (
    <>
      {children}
      <ReviewDialog
        open={open}
        rating={rating}
        onSelect={handleSelect}
        onSubmit={handleSubmit}
        copy={REVIEW_CONFIG.copy}
      />
    </>
  )
}

export default ReviewProvider
