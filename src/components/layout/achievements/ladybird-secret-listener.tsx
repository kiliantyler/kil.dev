'use client'

import { useAchievements } from '@/components/providers/achievements-provider'
import { type AchievementId } from '@/lib/achievements'
import { useEffect, useRef } from 'react'

export function LadybirdSecretListener() {
  const { has, unlock } = useAchievements()
  const bufferRef = useRef('')
  const target = 'ladybird!'

  useEffect(() => {
    function shouldIgnoreTarget(el: EventTarget | null): boolean {
      if (!el || !(el as Element).closest) return false
      const element = el as Element
      if (element.closest('input, textarea, [contenteditable="true"], [role="textbox"]')) return true
      return false
    }

    function onKeyDown(e: KeyboardEvent) {
      if (shouldIgnoreTarget(e.target)) return
      const key = e.key
      if (!key || key.length !== 1) return

      const normalized = key.toLowerCase()
      bufferRef.current = (bufferRef.current + normalized).slice(-target.length)

      if (bufferRef.current === target) {
        bufferRef.current = ''
        const id = 'LADYBIRD_LANDING' as AchievementId
        if (!has(id)) {
          unlock(id)
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [has, unlock])

  return null
}
