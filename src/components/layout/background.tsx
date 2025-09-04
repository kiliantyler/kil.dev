import { GridLights } from '@/components/layout/grid-lights'

function CircuitBackground() {
  return (
    <div
      className="absolute inset-0 z-0 bg-[linear-gradient(to_right,rgba(30,41,59,0.5)_1px,transparent_1px),linear-gradient(to_bottom,rgba(30,41,59,0.5)_1px,transparent_1px)] bg-[length:40px_40px] bg-[position:-1px_-1px]"
      aria-hidden
    >
      <GridLights />
    </div>
  )
}

function GradientOverlay() {
  return <div className="to-example-background absolute inset-0 z-10 bg-linear-to-b from-transparent" aria-hidden />
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
