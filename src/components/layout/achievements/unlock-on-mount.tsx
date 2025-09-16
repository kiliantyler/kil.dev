'use client'

import { useAchievements } from '@/components/providers/achievements-provider'
import type { AchievementId } from '@/lib/achievements'
import { useEffect } from 'react'

export function UnlockOnMount({ id }: { id: AchievementId }) {
  const { has, unlock } = useAchievements()

  useEffect(() => {
    if (has(id)) return
    unlock(id)
  }, [has, unlock, id])

  return null
}
