import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { WorkExperience } from '@/lib/experience'
import type { resolveSkills } from '@/lib/skillicons'
import { ChevronDown } from 'lucide-react'
import { HighlightsList } from './highlights-list'
import { SkillsBlock } from './skills-block'

interface CollapsibleHighlightsProps {
  item: WorkExperience
  skillsEntries: ReturnType<typeof resolveSkills>
}

export function CollapsibleHighlights({ item, skillsEntries }: CollapsibleHighlightsProps) {
  return (
    <Collapsible className="group/collapsible">
      <CollapsibleTrigger asChild>
        <span
          role="button"
          tabIndex={0}
          className="group inline-flex items-center gap-1 text-xs md:text-sm text-muted-foreground hover:text-foreground cursor-pointer select-none -ml-1 mt-1 outline-hidden focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
          aria-label={`Toggle details for ${item.company}`}>
          Highlights and Skills
          <ChevronDown className="size-3 transition-transform group-data-[state=open]:rotate-180" aria-hidden="true" />
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent forceMount className="group overflow-hidden">
        <div className="mt-0 space-y-0 group-data-[state=open]:mt-2 group-data-[state=open]:space-y-3">
          {item.highlights && item.highlights.length > 0 && <HighlightsList items={item.highlights} />}
          {skillsEntries.length > 0 && (
            <SkillsBlock highlightCount={item.highlights?.length ?? 0} skillsEntries={skillsEntries} />
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
