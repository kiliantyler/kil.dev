import Link from 'next/link'
import { ModeToggleLink, ModeToggleNote } from './mode-toggle-link'

export function QuickFact({ fact }: { fact: { label: string; value: string; href?: string; note?: string } }) {
  return (
    <div key={fact.label} className="grid grid-cols-[auto_1fr] items-baseline gap-3">
      <dt className="text-muted-foreground">{fact.label}</dt>
      <dd className="text-primary font-medium">
        {fact.label === 'Mode' ? (
          <>
            <ModeToggleLink /> <ModeToggleNote />
          </>
        ) : typeof fact.value === 'string' && fact.href ? (
          <>
            <Link href={fact.href}>{fact.value}</Link>{' '}
            {fact.note ? <span className="text-muted-foreground text-xs font-normal">{fact.note}</span> : null}
          </>
        ) : (
          <>
            {fact.value}
            {fact.note ? (
              <>
                {' '}
                <span className="text-muted-foreground text-xs font-normal">{fact.note}</span>
              </>
            ) : null}
          </>
        )}
      </dd>
    </div>
  )
}
