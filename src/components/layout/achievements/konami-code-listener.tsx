'use client'

import { useAchievements } from '@/components/providers/achievements-provider'
import { type AchievementId } from '@/lib/achievements'
import { useEffect, useRef } from 'react'

export function KonamiCodeListener() {
  const { has, unlock } = useAchievements()
  const sequenceRef = useRef<string[]>([])

  useEffect(() => {
    const konamiSequence = [
      'ArrowUp',
      'ArrowUp',
      'ArrowDown',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'ArrowLeft',
      'ArrowRight',
      'b',
      'a',
    ]

    function shouldIgnoreTarget(el: EventTarget | null): boolean {
      if (!el || !(el as Element).closest) return false
      const element = el as Element
      if (element.closest('input, textarea, [contenteditable="true"], [role="textbox"]')) return true
      return false
    }

    function onKeyDown(e: KeyboardEvent) {
      if (shouldIgnoreTarget(e.target)) return

      // Handle both 'b'/'B' and 'a'/'A' keys
      let key = e.key
      if (key.toLowerCase() === 'b') key = 'b'
      else if (key.toLowerCase() === 'a') key = 'a'

      sequenceRef.current.push(key)

      // Keep only the last 10 keys (length of Konami sequence)
      if (sequenceRef.current.length > konamiSequence.length) {
        sequenceRef.current = sequenceRef.current.slice(-konamiSequence.length)
      }

      // Check if the current sequence matches the Konami code
      if (sequenceRef.current.length === konamiSequence.length) {
        const isMatch = sequenceRef.current.every((key, index) => key === konamiSequence[index])

        if (isMatch) {
          sequenceRef.current = []
          const id = 'KONAMI_CODE' as AchievementId
          if (!has(id)) {
            unlock(id)
          }
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [has, unlock])

  return null
}
