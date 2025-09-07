import { WorkHistoryItem } from '@/components/layout/experience/work-history/work-history-item'
import { SectionLabel } from '@/components/ui/section-label'
import { WORK_HISTORY } from '@/lib/experience'

export function WorkHistory() {
  return (
    <section className="flex-1">
      <div className="flex flex-col gap-4">
        <SectionLabel as="p">Where I’ve been</SectionLabel>
        {(!WORK_HISTORY || WORK_HISTORY.length === 0) && (
          <div className="text-muted-foreground">No experience added yet.</div>
        )}

        <ol className="relative ml-3 border-l border-border" aria-label="Work history timeline">
          {WORK_HISTORY.map(item => (
            <WorkHistoryItem key={item.id} item={item} />
          ))}
        </ol>
      </div>
    </section>
  )
}
