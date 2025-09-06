export function GradientOverlay() {
  return (
    <>
      <div className="absolute inset-x-0 top-0 h-50 z-10 bg-linear-to-b from-background to-transparent" aria-hidden />
      <div
        className="to-background absolute inset-x-0 bottom-0 h-50 z-10 bg-linear-to-b from-transparent"
        aria-hidden
      />
    </>
  )
}
