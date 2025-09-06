import { MapTooltip } from '@/components/ui/map-tooltip'
import Link from 'next/link'

export function AboutMeQuickFacts() {
  return (
    <div className="order-1 flex flex-col gap-6 lg:order-2">
      <div>
        <p className="text-sm uppercase tracking-wide text-muted-foreground">Location</p>
        <MapTooltip />
      </div>
      <div>
        <p className="text-sm uppercase tracking-wide text-muted-foreground">Quick facts</p>
        <dl className="grid gap-3">
          <div className="grid grid-cols-[auto_1fr] items-baseline gap-3">
            <dt className="text-muted-foreground">Mode</dt>
            <dd className="text-primary font-medium">Dark mode, always</dd>
          </div>
          <div className="grid grid-cols-[auto_1fr] items-baseline gap-3">
            <dt className="text-muted-foreground">Shell</dt>
            <dd className="text-primary font-medium">
              <Link href="https://fishshell.com">fish</Link>
            </dd>
          </div>
          <div className="grid grid-cols-[auto_1fr] items-baseline gap-3">
            <dt className="text-muted-foreground">Terminal</dt>
            <dd className="text-primary font-medium">
              <Link href="https://ghostty.app">Ghostty</Link>
            </dd>
          </div>
          <div className="grid grid-cols-[auto_1fr] items-baseline gap-3">
            <dt className="text-muted-foreground">Editor</dt>
            <dd className="text-primary font-medium">
              <Link href="https://cursor.com">Cursor</Link>
            </dd>
          </div>
          <div className="grid grid-cols-[auto_1fr] items-baseline gap-3">
            <dt className="text-muted-foreground">OS</dt>
            <dd className="text-primary font-medium">
              <Link href="https://www.apple.com/macos">macOS</Link>{' '}
              <span className="text-muted-foreground text-xs font-normal">(Windows for gaming)</span>
            </dd>
          </div>
          <div className="grid grid-cols-[auto_1fr] items-baseline gap-3">
            <dt className="text-muted-foreground">Pets</dt>
            <dd className="text-primary font-medium">
              3 dogs, 3 cats <span className="text-muted-foreground text-xs font-normal">(Pictured below)</span>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
