'use client'

import { cn } from '@/lib/utils'
import { RefreshCcwIcon } from 'lucide-react'

interface FlipIndicatorProps {
  labelMobile?: string
  labelDesktop?: string
  className?: string
}

export function FlipIndicator({ labelMobile = 'Tap to flip', labelDesktop = 'Flip', className }: FlipIndicatorProps) {
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute right-2 top-2 z-20 inline-flex items-center gap-1 rounded-md bg-background/70 px-2 py-1 text-[10px] font-medium text-foreground/80 ring-1 ring-border opacity-100 md:opacity-0 transition-opacity md:group-hover:opacity-100 md:group-focus-visible:opacity-100 md:text-xs',
        className,
      )}>
      <RefreshCcwIcon className="opacity-80 size-3" />
      <span className="md:hidden">{labelMobile}</span>
      <span className="hidden md:inline">{labelDesktop}</span>
    </div>
  )
}
