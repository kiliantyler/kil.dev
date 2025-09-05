import { GridLights } from '@/components/layout/grid-lights'
import { LIGHT_GRID } from '@/lib/constants'

function CircuitBackground() {
  return (
    <div
      className="absolute inset-0 z-0 bg-[linear-gradient(to_right,var(--grid-color)_1px,transparent_1px),linear-gradient(to_bottom,var(--grid-color)_1px,transparent_1px)]"
      style={{
        backgroundSize: `${LIGHT_GRID.GRID_SIZE_PX}px ${LIGHT_GRID.GRID_SIZE_PX}px`,
        backgroundPosition: `${LIGHT_GRID.GRID_OFFSET_PX}px ${LIGHT_GRID.GRID_OFFSET_PX}px`,
      }}
      aria-hidden
    >
      <GridLights />
    </div>
  )
}

function GradientOverlay() {
  return (
    <>
      <div className="absolute inset-x-0 top-0 h-50 z-10 bg-linear-to-b from-background to-transparent" aria-hidden />
      <div className="to-background absolute inset-x-0 bottom-0 h-50 z-10 bg-linear-to-b from-transparent" aria-hidden />
    </>
  )
}

function Background() {
  return (
    <>
      <CircuitBackground />
      <GradientOverlay />
    </>
  )
}

export { Background, CircuitBackground, GradientOverlay }
