import { cn } from '@/utils/utils'

export type LavaIndicatorState = {
  left: number
  width: number
  visible: boolean
  animate: boolean
}

export function LavaIndicator({ indicator }: { indicator: LavaIndicatorState }) {
  return (
    <>
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute top-1 bottom-1 z-0 rounded-md bg-primary/40 shadow-sm blur-[1.5px] will-change-[left,width]',
          indicator.animate && 'transition-[left,width,opacity] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]',
          indicator.visible ? 'opacity-100' : 'opacity-0',
        )}
        style={{
          left: indicator.left,
          width: indicator.width,
        }}
      />
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute top-1 bottom-1 z-10 rounded-md bg-primary shadow-sm backdrop-blur-sm will-change-[left,width]',
          indicator.animate && 'transition-[left,width,opacity] duration-450 ease-[cubic-bezier(0.2,0.8,0.16,1)]',
          indicator.visible ? 'opacity-100' : 'opacity-0',
        )}
        style={{
          left: indicator.left,
          width: indicator.width,
        }}
      />
    </>
  )
}

export function LavaFallbackIndicator() {
  return (
    <>
      <span
        aria-hidden="true"
        className="absolute top-0 right-1 bottom-0 left-1 z-0 rounded-md bg-primary/40 shadow-sm blur-[1.5px]"
      />
      <span
        aria-hidden="true"
        className="absolute top-0 right-1 bottom-0 left-1 z-0 rounded-md bg-primary shadow-sm backdrop-blur-sm"
      />
    </>
  )
}
