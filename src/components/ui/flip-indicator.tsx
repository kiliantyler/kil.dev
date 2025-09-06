'use client'

import { cn } from '@/lib/utils'

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
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="opacity-80">
        <path
          d="M12 6v3l4-4-4-4v3C7.58 4 4 7.58 4 12c0 1.85.63 3.55 1.68 4.9l1.47-1.47A5.98 5.98 0 0 1 6 12c0-3.31 2.69-6 6-6Zm7.32-4.9-1.47 1.47A5.98 5.98 0 0 1 18 12c0 3.31-2.69 6-6 6v-3l-4 4 4 4v-3c4.42 0 8-3.58 8-8 0-1.85-.63-3.55-1.68-4.9Z"
          fill="currentColor"
        />
      </svg>
      <span className="md:hidden">{labelMobile}</span>
      <span className="hidden md:inline">{labelDesktop}</span>
    </div>
  )
}
