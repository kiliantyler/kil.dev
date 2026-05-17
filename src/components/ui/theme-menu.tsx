'use client'

import { Button } from '@/components/ui/button'
import type { Theme } from '@/lib/themes'
import type { IconComponent } from '@/types/themes'
import { cn } from '@/utils/utils'
import { motion, stagger } from 'motion/react'
import { useMemo } from 'react'

type ThemeMenuOption = {
  label: string
  value: Theme
  Icon: IconComponent
}

export function ThemeMenu({
  open,
  options,
  optionsWidthCh,
  optionRefs,
  optionsRef,
  onOptionClick,
  onKeyDown,
  leftSlot,
  bottomSlot,
}: Readonly<{
  open: boolean
  options: ThemeMenuOption[]
  optionsWidthCh: number
  optionRefs: React.RefObject<Array<HTMLButtonElement | null>>
  optionsRef: React.RefObject<HTMLDivElement | null>
  onOptionClick: (value: Theme, e: React.MouseEvent<HTMLButtonElement>) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void
  leftSlot?: React.ReactNode
  bottomSlot?: React.ReactNode
}>) {
  const menuVariants = useMemo(
    () => ({
      hidden: { opacity: 0, y: -4 },
      show: { opacity: 1, y: 0, transition: { delayChildren: stagger(0.05) } },
    }),
    [],
  )

  return (
    <div
      id="theme-options"
      ref={optionsRef}
      suppressHydrationWarning
      role="menu"
      aria-label="Select theme"
      aria-hidden={!open}
      inert={!open}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className={cn(
        'absolute top-full left-1/2 z-[120] mt-2 -translate-x-1/2',
        'flex flex-col items-stretch gap-3',
        open ? 'pointer-events-auto' : 'pointer-events-none',
      )}>
      <fieldset
        className={cn(
          'relative p-3 pt-8 transition-all duration-200 ease-out',
          open ? 'visible translate-y-0 scale-100 opacity-100' : 'invisible -translate-y-2 scale-95 opacity-0',
        )}
        style={{ width: `min(92vw, ${optionsWidthCh}ch)` }}>
        <legend className="sr-only">Theme controls</legend>

        <div className="flex items-start gap-2">
          {leftSlot ? <div className="relative shrink-0 pt-1">{leftSlot}</div> : null}
          <div className="max-h-[48vh] flex-1 overflow-hidden">
            <motion.div
              className="flex no-scrollbar flex-col gap-1 overflow-x-hidden overflow-y-auto pr-1"
              initial="hidden"
              animate={open ? 'show' : 'hidden'}
              variants={menuVariants}>
              {options.map((opt, idx) => (
                <motion.div key={opt.value} variants={{ hidden: { opacity: 0, y: -4 }, show: { opacity: 1, y: 0 } }}>
                  <Button
                    ref={el => {
                      optionRefs.current[idx] = el
                    }}
                    onClick={e => onOptionClick(opt.value, e)}
                    role="menuitem"
                    aria-label={opt.label}
                    title={opt.label}
                    variant="ghost"
                    size="sm"
                    className={cn('flex w-full justify-start gap-2 rounded-md hover:bg-accent/70')}>
                    <span className="grid size-7 shrink-0 place-items-center">
                      <opt.Icon className="size-4" />
                    </span>
                    <span className="text-sm font-medium text-foreground/90">{opt.label}</span>
                  </Button>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>

        {bottomSlot}
      </fieldset>
    </div>
  )
}
