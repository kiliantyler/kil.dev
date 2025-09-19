'use client'

import type { GameBoxDimensions } from '@/utils/grid'
import { useCallback, useEffect } from 'react'

type GameOverlayProps = {
  isPlaying: boolean
  gameOver: boolean
  score: number
  showNameInput: boolean
  playerName: string[]
  nameInputPosition: number
  isSubmittingScore: boolean
  dimensions: GameBoxDimensions
  onRestart: () => void
  onEsc: () => void
  onNameInputKey: (e: KeyboardEvent) => void
}

export function GameOverlay({
  isPlaying,
  gameOver,
  showNameInput,
  onRestart,
  onEsc,
  onNameInputKey,
}: GameOverlayProps) {
  const handleKeyPress = useCallback(
    (e: KeyboardEvent) => {
      if (showNameInput) return onNameInputKey(e)
      if (e.key === 'Escape') {
        e.preventDefault()
        onEsc()
        return
      }
      if (e.key === ' ') {
        if (showNameInput) return
        if (gameOver || !isPlaying) onRestart()
      }
    },
    [showNameInput, onNameInputKey, onEsc, onRestart, gameOver, isPlaying],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [handleKeyPress])

  return null
}
