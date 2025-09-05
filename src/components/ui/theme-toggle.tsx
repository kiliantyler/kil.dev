'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import posthog from 'posthog-js'
import { useCallback } from 'react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function ThemeToggle() {
  const { setTheme } = useTheme()

  const handleSetLight = useCallback(() => {
    setTheme('light')
    posthog.capture('theme_changed', { theme: 'light' })
  }, [setTheme])

  const handleSetDark = useCallback(() => {
    setTheme('dark')
    posthog.capture('theme_changed', { theme: 'dark' })
  }, [setTheme])

  const handleSetSystem = useCallback(() => {
    setTheme('system')
    posthog.capture('theme_changed', { theme: 'system' })
  }, [setTheme])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="hover:ring-accent hover:ring-1 hover:ring-offset-2 ring-offset-background duration-300">
          <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleSetLight}>Light</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSetDark}>Dark</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSetSystem}>System</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
