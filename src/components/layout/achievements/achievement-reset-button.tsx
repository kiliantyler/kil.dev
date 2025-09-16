'use client'

import { useAchievements } from '@/components/providers/achievements-provider'
import { Button } from '@/components/ui/button'
import { RotateCcw } from 'lucide-react'

export function AchievementResetButton() {
  const { reset } = useAchievements()

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all achievements? This action cannot be undone.')) {
      reset()
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleReset} className="gap-2" aria-label="Reset all achievements">
      <RotateCcw className="size-4" />
      Reset
    </Button>
  )
}
