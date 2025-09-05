export function Footer() {
  return (
    <footer className="mt-auto w-full bg-background/50 px-10 py-8 border-t border-border">
      <div className="text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} Kilian Tyler. All rights reserved.</p>
      </div>
    </footer>
  )
}
