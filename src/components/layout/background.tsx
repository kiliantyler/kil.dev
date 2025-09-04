function CircuitBackground() {
  return <div className="circuit-bg absolute inset-0 z-0" aria-hidden />;
}

function GradientOverlay() {
  return (
    <div
      className="to-example-background absolute inset-0 z-10 bg-linear-to-b from-transparent"
      aria-hidden
    />
  );
}

function Background() {
  return (
    <>
      <CircuitBackground />
      <GradientOverlay />
    </>
  );
}

export { Background, CircuitBackground, GradientOverlay };
