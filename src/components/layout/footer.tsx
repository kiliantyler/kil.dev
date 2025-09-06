export function Footer() {
  return (
    <footer className="w-full bg-background/50 border-t border-border">
      <div className="px-10 py-4">
        <div className="text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Kilian Tyler. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
