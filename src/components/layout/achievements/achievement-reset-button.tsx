'use client'

import { useAchievements } from '@/components/providers/achievements-provider'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { RotateCcw } from 'lucide-react'

export function AchievementResetButton() {
  const { reset } = useAchievements()

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" aria-label="Reset all achievements">
          <RotateCcw className="size-4" />
          Reset
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent role="alertdialog" aria-label="Confirm reset achievements">
        <AlertDialogHeader>
          <AlertDialogTitle>Reset achievements?</AlertDialogTitle>
          <AlertDialogDescription>
            This will clear all unlocked achievements. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel aria-label="Cancel reset">Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={reset} aria-label="Confirm reset achievements">
            Reset
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
