import { MapTooltip } from '@/components/ui/map-tooltip'
import { QUICK_FACTS } from '@/lib/quickfacts'
import { QuickFact } from './quick-fact'

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
          {QUICK_FACTS.map(fact => (
            <QuickFact key={fact.label} fact={fact} />
          ))}
        </dl>
      </div>
    </div>
  )
}
