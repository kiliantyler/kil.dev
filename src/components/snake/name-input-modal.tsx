'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { playSubmitSound } from '@/utils/arcade-utils'
import { useEffect, useRef, useState } from 'react'

interface NameInputModalProps {
  isOpen: boolean
  score: number
  onSubmit: (name: string) => void
  onClose: () => void
}

export function NameInputModal({ isOpen, score, onSubmit, onClose }: NameInputModalProps) {
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName('')
      setIsSubmitting(false)
    }
  }, [isOpen])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, 3)

    setName(value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (name.length === 0) {
      return
    }

    setIsSubmitting(true)
    playSubmitSound()

    // Pad with 'A' if less than 3 characters
    const paddedName = name.padEnd(3, 'A')
    onSubmit(paddedName)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <Card className="w-full max-w-sm mx-4 p-4 bg-gradient-to-br from-green-900/90 to-green-800/90 border-green-500/50">
        <div className="text-center space-y-3">
          <h2 className="text-xl font-bold text-green-400 font-mono">NEW HIGH SCORE!</h2>

          <div className="text-base text-green-300 font-mono">Score: {score}</div>

          <p className="text-green-200 text-sm">Enter your initials (3 letters):</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              maxLength={3}
              className="w-full px-3 py-2 text-center text-xl font-mono font-bold bg-black/50 border-2 border-green-500/50 rounded text-green-400 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-400/50"
              placeholder="AAA"
              disabled={isSubmitting}
            />

            <div className="flex gap-3 justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="border-green-500/50 text-green-400 hover:bg-green-500/10">
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={name.length === 0 || isSubmitting}
                className="bg-green-600 hover:bg-green-700 text-white font-mono">
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  )
}
